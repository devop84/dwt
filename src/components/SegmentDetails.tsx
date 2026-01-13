import { useState, useEffect } from 'react'
import { routeLogisticsApi, hotelsApi, vehiclesApi, caterersApi, thirdPartiesApi, locationsApi } from '../lib/api'
import type { RouteSegment, RouteLogistics, Hotel, Vehicle, Caterer, ThirdParty, Location } from '../types'

interface SegmentDetailsProps {
  segment: RouteSegment
  routeId: string
  onClose: () => void
  onSegmentUpdated: () => Promise<void>
}

export function SegmentDetails({ segment, routeId, onClose, onSegmentUpdated }: SegmentDetailsProps) {
  const [logistics, setLogistics] = useState<RouteLogistics[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [caterers, setCaterers] = useState<Caterer[]>([])
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showLogisticsForm, setShowLogisticsForm] = useState(false)
  const [logisticsType, setLogisticsType] = useState<RouteLogistics['logisticsType'] | null>(null)

  useEffect(() => {
    loadData()
  }, [segment.id])

  const loadData = async () => {
    try {
      setLoading(true)
      const [logisticsData, hotelsData, vehiclesData, caterersData, thirdPartiesData, locationsData] = await Promise.all([
        routeLogisticsApi.getAll(routeId),
        hotelsApi.getAll(),
        vehiclesApi.getAll(),
        caterersApi.getAll(),
        thirdPartiesApi.getAll(),
        locationsApi.getAll()
      ])
      // Filter logistics for this segment
      setLogistics(logisticsData.filter(l => l.segmentId === segment.id))
      setHotels(hotelsData)
      setVehicles(vehiclesData)
      setCaterers(caterersData)
      setThirdParties(thirdPartiesData)
      setLocations(locationsData)
    } catch (err) {
      console.error('Error loading segment data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLogistics = async (logisticsId: string) => {
    if (!confirm('Are you sure you want to remove this logistics item?')) return
    try {
      await routeLogisticsApi.delete(routeId, logisticsId)
      await loadData()
      await onSegmentUpdated()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete logistics')
    }
  }

  const handleAddLogistics = async (logisticsData: Omit<RouteLogistics, 'id' | 'routeId' | 'createdAt' | 'updatedAt' | 'entityName'>) => {
    try {
      await routeLogisticsApi.create(routeId, {
        ...logisticsData,
        segmentId: segment.id
      })
      await loadData()
      await onSegmentUpdated()
      setShowLogisticsForm(false)
      setLogisticsType(null)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add logistics')
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBD'
    try {
      return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateString
    }
  }

  const getLocationName = (field: 'from' | 'to' | 'overnight') => {
    // First try to use the location name from the segment (from API)
    if (field === 'from' && segment.fromDestinationName) return segment.fromDestinationName
    if (field === 'to' && segment.toDestinationName) return segment.toDestinationName
    if (field === 'overnight' && segment.overnightLocationName) return segment.overnightLocationName
    
    // Fall back to looking up by ID
    const locationId = field === 'from' ? segment.fromDestinationId : field === 'to' ? segment.toDestinationId : segment.overnightLocationId
    if (!locationId) return 'Not set'
    return locations.find(l => l.id === locationId)?.name || 'Unknown'
  }

  const logisticsByType = {
    'support-vehicle': logistics.filter(l => l.logisticsType === 'support-vehicle'),
    'hotel-client': logistics.filter(l => l.logisticsType === 'hotel-client'),
    'hotel-staff': logistics.filter(l => l.logisticsType === 'hotel-staff'),
    'lunch': logistics.filter(l => l.logisticsType === 'lunch'),
    'third-party': logistics.filter(l => l.logisticsType === 'third-party'),
    'airport-transfer': logistics.filter(l => l.logisticsType === 'airport-transfer'),
    'extra-cost': logistics.filter(l => l.logisticsType === 'extra-cost')
  }

  if (loading) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem' }}>
          <p>Loading...</p>
        </div>
      </div>
    )
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
        zIndex: 1000,
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
          maxWidth: '900px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0 0 0.5rem 0' }}>
              Day {segment.dayNumber} - {formatDate(segment.segmentDate)}
            </h2>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              <p style={{ margin: '0.25rem 0' }}><strong>From:</strong> {getLocationName('from')}</p>
              <p style={{ margin: '0.25rem 0' }}><strong>To:</strong> {getLocationName('to')}</p>
              <p style={{ margin: '0.25rem 0' }}><strong>Overnight:</strong> {getLocationName('overnight')}</p>
              <p style={{ margin: '0.25rem 0' }}><strong>Distance:</strong> {segment.distance} km | <strong>Type:</strong> {segment.segmentType}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Logistics Section */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>Logistics</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setLogisticsType('support-vehicle'); setShowLogisticsForm(true) }}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                + Vehicle
              </button>
              <button
                onClick={() => { setLogisticsType('hotel-client'); setShowLogisticsForm(true) }}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                + Hotel (Client)
              </button>
              <button
                onClick={() => { setLogisticsType('hotel-staff'); setShowLogisticsForm(true) }}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                + Hotel (Staff)
              </button>
              <button
                onClick={() => { setLogisticsType('lunch'); setShowLogisticsForm(true) }}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                + Lunch
              </button>
              <button
                onClick={() => { setLogisticsType('third-party'); setShowLogisticsForm(true) }}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                + Third Party
              </button>
              <button
                onClick={() => { setLogisticsType('extra-cost'); setShowLogisticsForm(true) }}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                + Extra Cost
              </button>
            </div>
          </div>

          {/* Vehicles */}
          {logisticsByType['support-vehicle'].length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Vehicles</h4>
              {logisticsByType['support-vehicle'].map(log => (
                <div key={log.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.75rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>{log.entityName}</p>
                    {log.driverPilotName && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Driver/Pilot: {log.driverPilotName}</p>}
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Quantity: {log.quantity} | Cost: {formatCurrency(log.cost * log.quantity)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteLogistics(log.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Hotels Client */}
          {logisticsByType['hotel-client'].length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Hotels (Client)</h4>
              {logisticsByType['hotel-client'].map(log => (
                <div key={log.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.75rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>{log.entityName}</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Rooms: {log.quantity} | Cost: {formatCurrency(log.cost * log.quantity)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteLogistics(log.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Hotels Staff */}
          {logisticsByType['hotel-staff'].length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Hotels (Staff)</h4>
              {logisticsByType['hotel-staff'].map(log => (
                <div key={log.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.75rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>{log.entityName}</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Rooms: {log.quantity} | Cost: {formatCurrency(log.cost * log.quantity)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteLogistics(log.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Lunch */}
          {logisticsByType['lunch'].length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Lunch</h4>
              {logisticsByType['lunch'].map(log => (
                <div key={log.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.75rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>{log.entityName}</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Cost: {formatCurrency(log.cost * log.quantity)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteLogistics(log.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Third Parties */}
          {logisticsByType['third-party'].length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Third Parties</h4>
              {logisticsByType['third-party'].map(log => (
                <div key={log.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.75rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>{log.entityName}</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Cost: {formatCurrency(log.cost * log.quantity)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteLogistics(log.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Extra Costs */}
          {logisticsByType['extra-cost'].length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Extra Costs</h4>
              {logisticsByType['extra-cost'].map(log => (
                <div key={log.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.75rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>{log.entityName || 'Extra Cost'}</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Cost: {formatCurrency(log.cost * log.quantity)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteLogistics(log.id)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {logistics.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <p>No logistics added yet. Use the buttons above to add vehicles, hotels, lunch, etc.</p>
            </div>
          )}
        </div>

        {/* Logistics Form Modal */}
        {showLogisticsForm && logisticsType && (
          <LogisticsForm
            logisticsType={logisticsType}
            hotels={hotels}
            vehicles={vehicles}
            caterers={caterers}
            thirdParties={thirdParties}
            locations={locations}
            onSave={handleAddLogistics}
            onClose={() => {
              setShowLogisticsForm(false)
              setLogisticsType(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

// Logistics Form Component
interface LogisticsFormProps {
  logisticsType: RouteLogistics['logisticsType']
  hotels: Hotel[]
  vehicles: Vehicle[]
  caterers: Caterer[]
  thirdParties: ThirdParty[]
  locations: Location[]
  onSave: (logistics: Omit<RouteLogistics, 'id' | 'routeId' | 'createdAt' | 'updatedAt' | 'entityName'>) => Promise<void>
  onClose: () => void
}

function LogisticsForm({ logisticsType, hotels, vehicles, caterers, thirdParties, locations, onSave, onClose }: LogisticsFormProps) {
  const [formData, setFormData] = useState({
    entityId: '',
    entityType: 'hotel' as RouteLogistics['entityType'],
    quantity: 1,
    cost: 0,
    driverPilotName: '',
    isOwnVehicle: false,
    vehicleType: null as RouteLogistics['vehicleType'],
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  // Determine entity type based on logistics type
  useEffect(() => {
    if (logisticsType === 'support-vehicle') {
      setFormData(prev => ({ ...prev, entityType: 'vehicle' }))
    } else if (logisticsType === 'hotel-client' || logisticsType === 'hotel-staff') {
      setFormData(prev => ({ ...prev, entityType: 'hotel' }))
    } else if (logisticsType === 'lunch') {
      setFormData(prev => ({ ...prev, entityType: 'caterer' }))
    } else if (logisticsType === 'third-party') {
      setFormData(prev => ({ ...prev, entityType: 'third-party' }))
    } else if (logisticsType === 'airport-transfer') {
      setFormData(prev => ({ ...prev, entityType: 'location' }))
    }
  }, [logisticsType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.entityId) {
      alert('Please select an entity')
      return
    }
    setSaving(true)
    try {
      await onSave({
        segmentId: null, // Will be set by parent
        logisticsType,
        entityId: formData.entityId,
        entityType: formData.entityType,
        quantity: formData.quantity,
        cost: formData.cost,
        date: null,
        driverPilotName: logisticsType === 'support-vehicle' ? formData.driverPilotName || null : null,
        isOwnVehicle: logisticsType === 'support-vehicle' ? formData.isOwnVehicle : false,
        vehicleType: logisticsType === 'support-vehicle' ? formData.vehicleType : null,
        notes: formData.notes || null
      })
    } finally {
      setSaving(false)
    }
  }

  const getEntityOptions = () => {
    switch (formData.entityType) {
      case 'hotel':
        return hotels.map(h => ({ id: h.id, name: h.name }))
      case 'vehicle':
        return vehicles.map(v => ({ id: v.id, name: `${v.type} - ${v.vehicleOwner === 'company' ? 'Company' : 'Third Party'}` }))
      case 'caterer':
        return caterers.map(c => ({ id: c.id, name: c.name }))
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
          Add {logisticsType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              {formData.entityType === 'hotel' ? 'Hotel' : formData.entityType === 'vehicle' ? 'Vehicle' : formData.entityType === 'caterer' ? 'Caterer' : formData.entityType === 'third-party' ? 'Third Party' : 'Location'}
            </label>
            <select
              value={formData.entityId}
              onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                outline: 'none'
              }}
            >
              <option value="">Select...</option>
              {getEntityOptions().map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>

          {logisticsType === 'support-vehicle' && (
            <>
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
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="isOwnVehicle"
                  checked={formData.isOwnVehicle}
                  onChange={(e) => setFormData({ ...formData, isOwnVehicle: e.target.checked })}
                />
                <label htmlFor="isOwnVehicle" style={{ fontSize: '0.875rem', color: '#374151' }}>
                  Own Vehicle
                </label>
              </div>
            </>
          )}

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

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Cost (per unit)
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
              Notes
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
              {saving ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
