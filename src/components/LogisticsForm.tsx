import { useState, useEffect } from 'react'
import type { RouteLogistics, Hotel, Vehicle, ThirdParty, Location } from '../types'

interface LogisticsFormProps {
  logisticsType: RouteLogistics['logisticsType']
  hotels: Hotel[]
  vehicles: Vehicle[]
  thirdParties: ThirdParty[]
  locations: Location[]
  onSave: (logistics: Omit<RouteLogistics, 'id' | 'routeId' | 'createdAt' | 'updatedAt' | 'entityName'>) => Promise<void>
  onClose: () => void
  initialData?: Partial<RouteLogistics>
  mode?: 'add' | 'edit'
}

export function LogisticsForm({ logisticsType, hotels, vehicles, thirdParties, locations, onSave, onClose, initialData, mode = 'add' }: LogisticsFormProps) {
  const [formData, setFormData] = useState({
    entityId: '',
    entityType: 'hotel' as RouteLogistics['entityType'],
    itemName: '',
    quantity: 1,
    cost: 0,
    driverPilotName: '',
    isOwnVehicle: false,
    vehicleType: null as RouteLogistics['vehicleType'],
    notes: ''
  })
  const [lunchProviderType, setLunchProviderType] = useState<'self' | 'hotel' | 'third-party'>('self')
  const [extraProviderType, setExtraProviderType] = useState<'none' | 'hotel' | 'third-party'>('none')
  const [saving, setSaving] = useState(false)

  // Determine entity type based on logistics type
  useEffect(() => {
    if (initialData?.entityType) {
      setFormData(prev => ({ ...prev, entityType: initialData.entityType as RouteLogistics['entityType'] }))
      return
    }
    if (logisticsType === 'support-vehicle') {
      setFormData(prev => ({ ...prev, entityType: 'vehicle' }))
    } else if (logisticsType === 'hotel-client' || logisticsType === 'hotel-staff') {
      setFormData(prev => ({ ...prev, entityType: 'hotel' }))
    } else if (logisticsType === 'lunch') {
      setFormData(prev => ({ ...prev, entityType: 'third-party' }))
    } else if (logisticsType === 'third-party') {
      setFormData(prev => ({ ...prev, entityType: 'third-party' }))
    } else if (logisticsType === 'airport-transfer') {
      setFormData(prev => ({ ...prev, entityType: 'location' }))
    }
  }, [logisticsType, initialData?.entityType])

  useEffect(() => {
    if (!initialData) return
    setFormData(prev => ({
      ...prev,
      entityId: initialData.entityId ?? '',
      entityType: (initialData.entityType as RouteLogistics['entityType']) ?? prev.entityType,
      itemName: initialData.itemName ?? prev.itemName,
      quantity: initialData.quantity ?? prev.quantity,
      cost: initialData.cost ?? prev.cost,
      driverPilotName: initialData.driverPilotName ?? prev.driverPilotName,
      isOwnVehicle: initialData.isOwnVehicle ?? prev.isOwnVehicle,
      vehicleType: initialData.vehicleType ?? prev.vehicleType,
      notes: initialData.notes ?? prev.notes
    }))
    if (logisticsType === 'lunch') {
      if (initialData.entityType === 'hotel') {
        setLunchProviderType('hotel')
      } else if (initialData.entityId) {
        setLunchProviderType('third-party')
      } else {
        setLunchProviderType('self')
      }
    }
    if (logisticsType === 'extra-cost') {
      if (initialData.entityType === 'hotel') {
        setExtraProviderType('hotel')
      } else if (initialData.entityId) {
        setExtraProviderType('third-party')
      } else {
        setExtraProviderType('none')
      }
    }
  }, [initialData])

  useEffect(() => {
    if (logisticsType !== 'lunch') return
    const nextEntityType = lunchProviderType === 'hotel' ? 'hotel' : 'third-party'
    setFormData(prev => ({
      ...prev,
      entityType: nextEntityType,
      entityId: lunchProviderType === 'self' ? '' : prev.entityId
    }))
  }, [lunchProviderType, logisticsType])

  useEffect(() => {
    if (logisticsType !== 'extra-cost') return
    const nextEntityType = extraProviderType === 'hotel' ? 'hotel' : 'third-party'
    setFormData(prev => ({
      ...prev,
      entityType: nextEntityType,
      entityId: extraProviderType === 'none' ? '' : prev.entityId
    }))
  }, [extraProviderType, logisticsType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (logisticsType !== 'lunch' && logisticsType !== 'extra-cost' && !formData.entityId) {
      alert('Please select an entity')
      return
    }
    if (logisticsType === 'lunch' && !formData.itemName.trim()) {
      alert('Please enter an item name')
      return
    }
    if (logisticsType === 'extra-cost' && !formData.itemName.trim()) {
      alert('Please enter a title')
      return
    }
    if (logisticsType === 'lunch' && lunchProviderType !== 'self' && !formData.entityId) {
      alert('Please select a provider')
      return
    }
    if (logisticsType === 'extra-cost' && extraProviderType !== 'none' && !formData.entityId) {
      alert('Please select a provider')
      return
    }
    setSaving(true)
    try {
      await onSave({
        segmentId: null, // Will be set by parent
        logisticsType,
        entityId: formData.entityId || null,
        entityType: logisticsType === 'lunch'
          ? (lunchProviderType === 'hotel' ? 'hotel' : 'third-party')
          : logisticsType === 'extra-cost'
            ? (extraProviderType === 'hotel' ? 'hotel' : 'third-party')
            : formData.entityType,
        itemName: logisticsType === 'lunch' || logisticsType === 'extra-cost' ? formData.itemName.trim() : null,
        quantity: logisticsType === 'support-vehicle' ? 1 : formData.quantity,
        cost: formData.cost,
        date: null,
        driverPilotName: logisticsType === 'support-vehicle' ? formData.driverPilotName || null : null,
        isOwnVehicle: false,
        vehicleType: logisticsType === 'support-vehicle' ? formData.vehicleType : null,
        notes: formData.notes || null
      })
    } finally {
      setSaving(false)
    }
  }

  const getEntityOptions = () => {
    if (logisticsType === 'lunch') {
      if (lunchProviderType === 'hotel') {
        return hotels.map(h => ({ id: h.id, name: h.name }))
      }
      if (lunchProviderType === 'third-party') {
        return thirdParties.map(tp => ({ id: tp.id, name: tp.name }))
      }
      return []
    }
    if (logisticsType === 'extra-cost') {
      if (extraProviderType === 'hotel') {
        return hotels.map(h => ({ id: h.id, name: h.name }))
      }
      if (extraProviderType === 'third-party') {
        return thirdParties.map(tp => ({ id: tp.id, name: tp.name }))
      }
      return []
    }

    switch (formData.entityType) {
      case 'hotel':
        return hotels.map(h => ({ id: h.id, name: h.name }))
      case 'vehicle':
        return vehicles.map(v => ({ 
          id: v.id, 
          name: `${v.type} - ${
            v.vehicleOwner === 'company' 
              ? 'Company' 
              : v.vehicleOwner === 'hotel'
                ? (v.hotelName || 'Hotel')
                : (v.thirdPartyName || 'Third Party')
          }` 
        }))
      case 'third-party':
        return thirdParties.map(tp => ({ id: tp.id, name: tp.name }))
      case 'location':
        return locations.map(l => ({ id: l.id, name: l.name }))
      default:
        return []
    }
  }

  return (
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
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: '0 0 1.5rem 0' }}>
          {mode === 'edit'
            ? (logisticsType === 'support-vehicle' ? 'Edit Vehicle' : `Edit ${logisticsType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`)
            : (logisticsType === 'support-vehicle' ? 'Add Vehicle' : `Add ${logisticsType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`)}
        </h3>
        <form onSubmit={handleSubmit}>
          {logisticsType === 'lunch' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                Provider
              </label>
              <select
                value={lunchProviderType}
                onChange={(e) => setLunchProviderType(e.target.value as 'self' | 'hotel' | 'third-party')}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              >
                <option value="self">Self purchase</option>
                <option value="hotel">Hotel</option>
                <option value="third-party">Third party</option>
              </select>
            </div>
          )}
          {logisticsType === 'extra-cost' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                Provider
              </label>
              <select
                value={extraProviderType}
                onChange={(e) => setExtraProviderType(e.target.value as 'none' | 'hotel' | 'third-party')}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              >
                <option value="none">No provider</option>
                <option value="hotel">Hotel</option>
                <option value="third-party">Third party</option>
              </select>
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              {logisticsType === 'lunch' || logisticsType === 'extra-cost'
                ? 'Provider (optional)'
                : formData.entityType === 'hotel'
                  ? 'Hotel'
                  : formData.entityType === 'vehicle'
                    ? 'Vehicle'
                    : formData.entityType === 'third-party'
                      ? 'Third Party'
                      : 'Location'}
            </label>
            <select
              value={formData.entityId}
              onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
              required={logisticsType === 'lunch'
                ? lunchProviderType !== 'self'
                : logisticsType === 'extra-cost'
                  ? extraProviderType !== 'none'
                  : true}
              disabled={(logisticsType === 'lunch' && lunchProviderType === 'self') || (logisticsType === 'extra-cost' && extraProviderType === 'none')}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                outline: 'none',
                backgroundColor: (logisticsType === 'lunch' && lunchProviderType === 'self') || (logisticsType === 'extra-cost' && extraProviderType === 'none') ? '#f9fafb' : 'white'
              }}
            >
              <option value="">{logisticsType === 'lunch' ? 'Self purchase' : logisticsType === 'extra-cost' ? 'No provider' : 'Select...'}</option>
              {getEntityOptions().map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>

          {(logisticsType === 'lunch' || logisticsType === 'extra-cost') && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                {logisticsType === 'extra-cost' ? 'Title' : 'Item'}
              </label>
              <input
                type="text"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {logisticsType === 'support-vehicle' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                Driver/Pilot Name
              </label>
              <input
                type="text"
                value={formData.driverPilotName}
                onChange={(e) => setFormData({ ...formData, driverPilotName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {logisticsType !== 'support-vehicle' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                Quantity
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                min="1"
                required
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  outline: 'none'
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Cost{logisticsType !== 'support-vehicle' ? ' (per unit)' : ''}
            </label>
            <input
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
              min="0"
              step="0.01"
              required
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              {logisticsType === 'extra-cost' ? 'Description' : 'Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                outline: 'none',
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
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'white',
                backgroundColor: saving ? '#9ca3af' : '#3b82f6',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              {saving ? (mode === 'edit' ? 'Saving...' : 'Adding...') : (mode === 'edit' ? 'Save' : 'Add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
