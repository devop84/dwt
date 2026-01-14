import { useState, useEffect } from 'react'
import type { RouteTransfer, RouteTransferVehicle, Location, Vehicle, RouteParticipant } from '../types'

interface TransferFormProps {
  transfer?: RouteTransfer | null
  locations: Location[]
  vehicles: Vehicle[]
  participants: RouteParticipant[]
  onSave: (transfer: Omit<RouteTransfer, 'id' | 'routeId' | 'totalCost' | 'createdAt' | 'updatedAt' | 'fromLocationName' | 'toLocationName' | 'vehicles' | 'participants'> & { vehicles?: Omit<RouteTransferVehicle, 'id' | 'transferId' | 'createdAt' | 'updatedAt' | 'vehicleName' | 'vehicleType'>[], participants?: string[] }) => Promise<void>
  onClose: () => void
}

export function TransferForm({ transfer, locations, vehicles, participants, onSave, onClose }: TransferFormProps) {
  // Helper function to convert ISO date string to yyyy-MM-dd format for date input
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return ''
    // If it's already in yyyy-MM-dd format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString
    // Otherwise, extract the date part from ISO string
    return dateString.split('T')[0]
  }

  const [formData, setFormData] = useState({
    transferDate: formatDateForInput(transfer?.transferDate),
    fromLocationId: transfer?.fromLocationId || '',
    toLocationId: transfer?.toLocationId || '',
    notes: transfer?.notes || ''
  })
  const [transferVehicles, setTransferVehicles] = useState<Array<Omit<RouteTransferVehicle, 'id' | 'transferId' | 'createdAt' | 'updatedAt' | 'vehicleName' | 'vehicleType' | 'isOwnVehicle'> & { isOwnVehicle?: boolean }>>(() => {
    if (transfer?.vehicles && transfer.vehicles.length > 0) {
      return transfer.vehicles.map(v => ({
        vehicleId: v.vehicleId,
        driverPilotName: v.driverPilotName || '',
        quantity: v.quantity,
        cost: typeof v.cost === 'number' ? v.cost : parseFloat(String(v.cost || '0')),
        isOwnVehicle: v.isOwnVehicle,
        notes: v.notes || ''
      }))
    }
    return []
  })
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(() => {
    if (transfer?.participants && transfer.participants.length > 0) {
      return transfer.participants.map(p => p.participantId)
    }
    return []
  })

  // Update form data when transfer prop changes (for editing)
  useEffect(() => {
    if (transfer) {
      setFormData({
        transferDate: formatDateForInput(transfer.transferDate),
        fromLocationId: transfer.fromLocationId || '',
        toLocationId: transfer.toLocationId || '',
        notes: transfer.notes || ''
      })
      
      if (transfer.vehicles && transfer.vehicles.length > 0) {
        setTransferVehicles(transfer.vehicles.map(v => ({
          vehicleId: v.vehicleId,
          driverPilotName: v.driverPilotName || '',
          quantity: v.quantity,
          cost: typeof v.cost === 'number' ? v.cost : parseFloat(String(v.cost || '0')),
          isOwnVehicle: v.isOwnVehicle,
          notes: v.notes || ''
        })))
      } else {
        setTransferVehicles([])
      }
      
      if (transfer.participants && transfer.participants.length > 0) {
        setSelectedParticipants(transfer.participants.map(p => p.participantId))
      } else {
        setSelectedParticipants([])
      }
    } else {
      // Reset form when creating new transfer
      setFormData({
        transferDate: '',
        fromLocationId: '',
        toLocationId: '',
        notes: ''
      })
      setTransferVehicles([])
      setSelectedParticipants([])
    }
  }, [transfer?.id]) // Update when transfer ID changes
  const [saving, setSaving] = useState(false)
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [editingVehicleIndex, setEditingVehicleIndex] = useState<number | null>(null)
  const [vehicleFormData, setVehicleFormData] = useState({
    vehicleId: '',
    driverPilotName: '',
    cost: 0,
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.transferDate || !formData.fromLocationId || !formData.toLocationId) {
      alert('Please fill in all required fields')
      return
    }
    if (formData.fromLocationId === formData.toLocationId) {
      alert('Origin and destination must be different')
      return
    }
    if (transferVehicles.length === 0) {
      alert('Please add at least one vehicle')
      return
    }
    setSaving(true)
    try {
      await onSave({
        transferDate: formData.transferDate,
        fromLocationId: formData.fromLocationId,
        toLocationId: formData.toLocationId,
        notes: formData.notes || null,
        vehicles: transferVehicles,
        participants: selectedParticipants.length > 0 ? selectedParticipants : undefined
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAddVehicle = () => {
    setVehicleFormData({
      vehicleId: '',
      driverPilotName: '',
      cost: 0,
      notes: ''
    })
    setEditingVehicleIndex(null)
    setShowVehicleForm(true)
  }

  const handleEditVehicle = (index: number) => {
    const vehicle = transferVehicles[index]
    setVehicleFormData({
      vehicleId: vehicle.vehicleId,
      driverPilotName: vehicle.driverPilotName || '',
      cost: typeof vehicle.cost === 'number' ? vehicle.cost : parseFloat(String(vehicle.cost || '0')),
      notes: vehicle.notes || ''
    })
    setEditingVehicleIndex(index)
    setShowVehicleForm(true)
  }

  const handleSaveVehicle = () => {
    if (!vehicleFormData.vehicleId) {
      alert('Please select a vehicle')
      return
    }
    // Automatically determine isOwnVehicle based on selected vehicle
    const selectedVehicle = vehicles.find(v => v.id === vehicleFormData.vehicleId)
    const isOwnVehicle = selectedVehicle?.vehicleOwner === 'company'
    
    const vehicleData = {
      ...vehicleFormData,
      quantity: 1, // Always 1 - if you need more, add the vehicle multiple times
      isOwnVehicle
    }
    
    if (editingVehicleIndex !== null) {
      const updated = [...transferVehicles]
      updated[editingVehicleIndex] = vehicleData
      setTransferVehicles(updated)
    } else {
      setTransferVehicles([...transferVehicles, vehicleData])
    }
    setShowVehicleForm(false)
    setEditingVehicleIndex(null)
  }

  const handleRemoveVehicle = (index: number) => {
    if (confirm('Remove this vehicle from the transfer?')) {
      setTransferVehicles(transferVehicles.filter((_, i) => i !== index))
    }
  }

  const handleToggleParticipant = (participantId: string) => {
    if (selectedParticipants.includes(participantId)) {
      setSelectedParticipants(selectedParticipants.filter(id => id !== participantId))
    } else {
      setSelectedParticipants([...selectedParticipants, participantId])
    }
  }

  const getParticipantName = (participant: RouteParticipant) => {
    if (participant.role === 'client' && participant.clientName) {
      return participant.clientName
    }
    if ((participant.role === 'guide-captain' || participant.role === 'guide-tail') && participant.guideName) {
      return participant.guideName
    }
    return 'Staff Member'
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1rem'
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0 0 1.5rem 0' }}>
            {transfer ? 'Edit Transfer' : 'Add Transfer'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Transfer Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                value={formData.transferDate}
                onChange={(e) => setFormData({ ...formData, transferDate: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                From Location <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={formData.fromLocationId}
                onChange={(e) => setFormData({ ...formData, fromLocationId: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">Select origin...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                To Location <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={formData.toLocationId}
                onChange={(e) => setFormData({ ...formData, toLocationId: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">Select destination...</option>
                {locations.filter(loc => loc.id !== formData.fromLocationId).map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Vehicles <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddVehicle}
                  style={{
                    padding: '0.375rem 0.75rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  + Add Vehicle
                </button>
              </div>
              {transferVehicles.length === 0 ? (
                <div style={{ padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.375rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                  No vehicles added yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {transferVehicles.map((vehicle, index) => {
                    const vehicleInfo = vehicles.find(v => v.id === vehicle.vehicleId)
                    return (
                      <div
                        key={index}
                        style={{
                          padding: '0.75rem',
                          backgroundColor: '#f9fafb',
                          borderRadius: '0.375rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                            {vehicleInfo 
                              ? `${vehicleInfo.type} - ${
                                  vehicleInfo.vehicleOwner === 'company' 
                                    ? 'Company' 
                                    : vehicleInfo.vehicleOwner === 'hotel'
                                      ? (vehicleInfo.hotelName || 'Hotel')
                                      : (vehicleInfo.thirdPartyName || 'Third Party')
                                }`
                              : 'Unknown Vehicle'}
                          </div>
                          {vehicle.driverPilotName && (
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Driver/Pilot: {vehicle.driverPilotName}</div>
                          )}
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            Cost: R$ {typeof vehicle.cost === 'number' ? vehicle.cost.toFixed(2) : parseFloat(vehicle.cost || '0').toFixed(2)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleEditVehicle(index)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveVehicle(index)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Participants (optional)
              </label>
              {participants.length === 0 ? (
                <div style={{ padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.375rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                  No participants available. Add participants to the route first.
                </div>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem' }}>
                  {participants.map(participant => (
                    <label
                      key={participant.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        borderRadius: '0.25rem',
                        backgroundColor: selectedParticipants.includes(participant.id) ? '#eff6ff' : 'transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(participant.id)}
                        onChange={() => handleToggleParticipant(participant.id)}
                        style={{ marginRight: '0.5rem' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                          {getParticipantName(participant)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{participant.role}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Saving...' : transfer ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showVehicleForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2100,
            padding: '1rem'
          }}
          onClick={() => {
            setShowVehicleForm(false)
            setEditingVehicleIndex(null)
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '1.5rem',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: '0 0 1rem 0' }}>
              {editingVehicleIndex !== null ? 'Edit Vehicle' : 'Add Vehicle'}
            </h4>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Vehicle <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={vehicleFormData.vehicleId}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, vehicleId: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">Select vehicle...</option>
                {vehicles.map(v => {
                  const ownerName = v.vehicleOwner === 'company' 
                    ? 'Company' 
                    : v.vehicleOwner === 'hotel'
                      ? (v.hotelName || 'Hotel')
                      : (v.thirdPartyName || 'Third Party')
                  return (
                    <option key={v.id} value={v.id}>
                      {v.type} - {ownerName}
                    </option>
                  )
                })}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Driver/Pilot Name
              </label>
              <input
                type="text"
                value={vehicleFormData.driverPilotName}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, driverPilotName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Cost (per unit)
              </label>
              <input
                type="number"
                value={vehicleFormData.cost}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, cost: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Notes
              </label>
              <textarea
                value={vehicleFormData.notes}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, notes: e.target.value })}
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowVehicleForm(false)
                  setEditingVehicleIndex(null)
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveVehicle}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {editingVehicleIndex !== null ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
