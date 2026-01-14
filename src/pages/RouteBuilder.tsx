import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { routesApi, routeSegmentsApi, routeLogisticsApi, routeParticipantsApi, locationsApi, hotelsApi, vehiclesApi, staffApi, clientsApi } from '../lib/api'
import type { Route, RouteSegment, RouteLogistics, RouteParticipant, Location, Hotel, Vehicle, Staff, Client } from '../types'
import { RouteForm } from '../components/RouteForm'

type Step = 'info' | 'segments' | 'logistics' | 'participants' | 'review'

export function RouteBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [route, setRoute] = useState<Route | null>(null)
  const [segments, setSegments] = useState<RouteSegment[]>([])
  const [logistics, setLogistics] = useState<RouteLogistics[]>([])
  const [participants, setParticipants] = useState<RouteParticipant[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState<Step>('info')
  const [showRouteForm, setShowRouteForm] = useState(false)
  const [editingSegment, setEditingSegment] = useState<RouteSegment | null>(null)

  useEffect(() => {
    loadInitialData()
    if (id && id !== 'new') {
      loadRoute()
    } else {
      setLoading(false)
    }
  }, [id])

  const loadInitialData = async () => {
    try {
      const [locs, hots, vehs, gds, clis] = await Promise.all([
        locationsApi.getAll(),
        hotelsApi.getAll(),
        vehiclesApi.getAll(),
        staffApi.getAll(),
        clientsApi.getAll()
      ])
      setLocations(locs)
      setHotels(hots)
      setVehicles(vehs)
      setGuides(gds)
      setClients(clis)
    } catch (err) {
      console.error('Error loading initial data:', err)
    }
  }

  const loadRoute = async () => {
    try {
      setLoading(true)
      const data = await routesApi.getById(id!)
      setRoute(data)
      setSegments(data.segments || [])
      setLogistics(data.logistics || [])
      setParticipants(data.participants || [])
    } catch (err: any) {
      console.error('Error loading route:', err)
      alert(err.response?.data?.message || 'Failed to load route')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRoute = async (routeData: Omit<Route, 'id' | 'endDate' | 'duration' | 'totalDistance' | 'createdAt' | 'updatedAt'>) => {
    try {
      let savedRoute: Route
      if (id && id !== 'new') {
        savedRoute = await routesApi.update(id, routeData)
      } else {
        savedRoute = await routesApi.create(routeData)
        navigate(`/routes/${savedRoute.id}/edit`, { replace: true })
      }
      setRoute(savedRoute)
      setShowRouteForm(false)
      if (currentStep === 'info') {
        setCurrentStep('segments')
      }
    } catch (err: any) {
      throw err
    }
  }

  const handleAddSegment = async () => {
    if (!route) {
      alert('Please save route information first')
      return
    }
    try {
      const newSegment = await routeSegmentsApi.create(route.id, {
        dayNumber: segments.length + 1,
        fromDestinationId: null,
        toDestinationId: null,
        overnightLocationId: null,
        distance: 0,
        segmentOrder: segments.length,
        notes: null
      })
      setSegments([...segments, newSegment])
      setEditingSegment(newSegment)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add segment')
    }
  }

  const handleSaveSegment = async (segment: RouteSegment) => {
    if (!route) return
    try {
      const updated = await routeSegmentsApi.update(route.id, segment.id, {
        dayNumber: segment.dayNumber,
        fromDestinationId: segment.fromDestinationId,
        toDestinationId: segment.toDestinationId,
        overnightLocationId: segment.overnightLocationId,
        distance: segment.distance,
        segmentOrder: segment.segmentOrder,
        notes: segment.notes
      })
      setSegments(segments.map(s => s.id === segment.id ? updated : s))
      setEditingSegment(null)
      // Reload route to get updated dates
      await loadRoute()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save segment')
    }
  }

  const handleDeleteSegment = async (segmentId: string) => {
    if (!route) return
    if (!confirm('Are you sure you want to delete this segment?')) return
    try {
      await routeSegmentsApi.delete(route.id, segmentId)
      setSegments(segments.filter(s => s.id !== segmentId))
      await loadRoute()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete segment')
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBD'
    try {
      return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
  }

  const getLocationName = (locationId: string | null) => {
    if (!locationId) return 'Not set'
    return locations.find(l => l.id === locationId)?.name || 'Unknown'
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <p>Loading route...</p>
      </div>
    )
  }

  const steps: { key: Step; label: string }[] = [
    { key: 'info', label: 'Route Info' },
    { key: 'segments', label: 'Segments' },
    { key: 'logistics', label: 'Logistics' },
    { key: 'participants', label: 'Participants' },
    { key: 'review', label: 'Review' }
  ]

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: '0 0 0.5rem 0' }}>
            {route ? route.name : 'New Route'}
          </h1>
          {route && (
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
              <span>Status: <strong>{route.status}</strong></span>
              {route.startDate && <span>Start: {formatDate(route.startDate)}</span>}
              {route.endDate && <span>End: {formatDate(route.endDate)}</span>}
              {route.duration && <span>Duration: {route.duration} days</span>}
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/routes')}
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          Back to Routes
        </button>
      </div>

      {/* Steps Navigation */}
      <div style={{
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: '2rem',
        display: 'flex',
        gap: '0.5rem'
      }}>
        {steps.map((step, index) => (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setCurrentStep(step.key)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: currentStep === step.key ? '#3b82f6' : 'transparent',
                color: currentStep === step.key ? 'white' : '#6b7280',
                border: `1px solid ${currentStep === step.key ? '#3b82f6' : '#d1d5db'}`,
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: currentStep === step.key ? '600' : '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (currentStep !== step.key) {
                  e.currentTarget.style.backgroundColor = '#f3f4f6'
                }
              }}
              onMouseLeave={(e) => {
                if (currentStep !== step.key) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              {index + 1}. {step.label}
            </button>
            {index < steps.length - 1 && (
              <span style={{ color: '#d1d5db', fontSize: '1.25rem' }}>→</span>
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
        {currentStep === 'info' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>Route Information</h2>
              <button
                onClick={() => setShowRouteForm(true)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                {route ? 'Edit Route' : 'Create Route'}
              </button>
            </div>
            {route ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Name</label>
                  <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>{route.name}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Status</label>
                  <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>{route.status}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Start Date</label>
                  <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>{formatDate(route.startDate)}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>End Date</label>
                  <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>{formatDate(route.endDate)}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Duration</label>
                  <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>{route.duration ? `${route.duration} days` : 'TBD'}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Estimated Cost</label>
                  <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>{formatCurrency(route.estimatedCost)}</p>
                </div>
                {route.description && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Description</label>
                    <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0, whiteSpace: 'pre-wrap' }}>{route.description}</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <p>Click "Create Route" to get started</p>
              </div>
            )}
          </div>
        )}

        {currentStep === 'segments' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>Route Segments</h2>
              {route && (
                <button
                  onClick={handleAddSegment}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <span>+</span> Add Segment
                </button>
              )}
            </div>
            {!route ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <p>Please create the route first in the Route Info step</p>
              </div>
            ) : segments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                <p>No segments yet. Click "Add Segment" to create the first one.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {segments
                  .sort((a, b) => a.segmentOrder - b.segmentOrder || a.dayNumber - b.dayNumber)
                  .map((segment) => (
                    <div
                      key={segment.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        padding: '1.5rem',
                        backgroundColor: editingSegment?.id === segment.id ? '#f9fafb' : 'white'
                      }}
                    >
                      {editingSegment?.id === segment.id ? (
                        <SegmentForm
                          segment={editingSegment}
                          locations={locations}
                          onSave={handleSaveSegment}
                          onCancel={() => setEditingSegment(null)}
                        />
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                            <div>
                              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: '0 0 0.5rem 0' }}>
                                Day {segment.dayNumber} - {formatDate(segment.segmentDate)}
                              </h3>
                              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                <span><strong>From:</strong> {getLocationName(segment.fromDestinationId)}</span>
                                <span>→</span>
                                <span><strong>To:</strong> {getLocationName(segment.toDestinationId)}</span>
                                <span>→</span>
                                <span><strong>Overnight:</strong> {getLocationName(segment.overnightLocationId)}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                                <span><strong>Distance:</strong> {segment.distance} km</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => setEditingSegment(segment)}
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
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSegment(segment.id)}
                                style={{
                                  padding: '0.375rem 0.75rem',
                                  fontSize: '0.75rem',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          {segment.notes && (
                            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, fontStyle: 'italic' }}>{segment.notes}</p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {currentStep === 'logistics' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0 0 1.5rem 0' }}>Logistics</h2>
            <p style={{ color: '#6b7280' }}>Logistics management coming soon...</p>
          </div>
        )}

        {currentStep === 'participants' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0 0 1.5rem 0' }}>Participants</h2>
            <p style={{ color: '#6b7280' }}>Participants management coming soon...</p>
          </div>
        )}

        {currentStep === 'review' && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0 0 1.5rem 0' }}>Review</h2>
            {route && (
              <div>
                <p><strong>Route:</strong> {route.name}</p>
                <p><strong>Segments:</strong> {segments.length}</p>
                <p><strong>Estimated Cost:</strong> {formatCurrency(route.estimatedCost)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {route && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
          <button
            onClick={() => {
              const currentIndex = steps.findIndex(s => s.key === currentStep)
              if (currentIndex > 0) {
                setCurrentStep(steps[currentIndex - 1].key)
              }
            }}
            disabled={currentStep === 'info'}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: currentStep === 'info' ? '#f3f4f6' : 'white',
              color: currentStep === 'info' ? '#9ca3af' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: currentStep === 'info' ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Previous
          </button>
          <button
            onClick={() => {
              const currentIndex = steps.findIndex(s => s.key === currentStep)
              if (currentIndex < steps.length - 1) {
                setCurrentStep(steps[currentIndex + 1].key)
              } else {
                navigate(`/routes/${route.id}`)
              }
            }}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            {currentStep === 'review' ? 'View Route' : 'Next'}
          </button>
        </div>
      )}

      {showRouteForm && (
        <RouteForm
          route={route}
          onClose={() => setShowRouteForm(false)}
          onSave={handleSaveRoute}
        />
      )}
    </div>
  )
}

// Segment Form Component
interface SegmentFormProps {
  segment: RouteSegment
  locations: Location[]
  onSave: (segment: RouteSegment) => Promise<void>
  onCancel: () => void
}

function SegmentForm({ segment, locations, onSave, onCancel }: SegmentFormProps) {
  const [formData, setFormData] = useState({
    dayNumber: segment.dayNumber,
    fromDestinationId: segment.fromDestinationId || '',
    toDestinationId: segment.toDestinationId || '',
    overnightLocationId: segment.overnightLocationId || '',
    distance: segment.distance,
    notes: segment.notes || ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        ...segment,
        fromDestinationId: formData.fromDestinationId || null,
        toDestinationId: formData.toDestinationId || null,
        overnightLocationId: formData.overnightLocationId || null,
        distance: formData.distance,
        notes: formData.notes || null
      })
    } catch (err) {
      // Error handled by parent
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>Day Number</label>
          <input
            type="number"
            value={formData.dayNumber}
            onChange={(e) => setFormData({ ...formData, dayNumber: parseInt(e.target.value) || 1 })}
            min="1"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>Distance (km)</label>
          <input
            type="number"
            value={formData.distance}
            onChange={(e) => setFormData({ ...formData, distance: parseFloat(e.target.value) || 0 })}
            min="0"
            max="60"
            step="0.1"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>From Location</label>
          <select
            value={formData.fromDestinationId}
            onChange={(e) => setFormData({ ...formData, fromDestinationId: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
          >
            <option value="">Select location...</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>To Location</label>
          <select
            value={formData.toDestinationId}
            onChange={(e) => setFormData({ ...formData, toDestinationId: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
          >
            <option value="">Select location...</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>Overnight Location</label>
          <select
            value={formData.overnightLocationId}
            onChange={(e) => setFormData({ ...formData, overnightLocationId: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
          >
            <option value="">Select location...</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'inherit' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: saving ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem'
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}
