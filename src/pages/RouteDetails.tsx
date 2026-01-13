import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { routesApi, routeSegmentsApi, routeParticipantsApi, locationsApi, guidesApi, clientsApi } from '../lib/api'
import type { Route, RouteSegment, RouteParticipant, Location, Guide, Client } from '../types'
import { RouteForm } from '../components/RouteForm'
import { SegmentForm } from '../components/SegmentForm'
import { SegmentDetails } from '../components/SegmentDetails'

export function RouteDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [route, setRoute] = useState<Route | null>(null)
  const [segments, setSegments] = useState<RouteSegment[]>([])
  const [participants, setParticipants] = useState<RouteParticipant[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [guides, setGuides] = useState<Guide[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showRouteForm, setShowRouteForm] = useState(false)
  const [showSegmentForm, setShowSegmentForm] = useState(false)
  const [editingSegment, setEditingSegment] = useState<RouteSegment | null>(null)
  const [viewingSegment, setViewingSegment] = useState<RouteSegment | null>(null)
  const [showParticipantForm, setShowParticipantForm] = useState(false)

  useEffect(() => {
    if (id && id !== 'new') {
      loadRoute()
      loadInitialData()
    } else if (id === 'new') {
      // Create new route immediately
      handleCreateNewRoute()
    }
  }, [id])

  const loadInitialData = async () => {
    try {
      const [locs, gds, clis] = await Promise.all([
        locationsApi.getAll(),
        guidesApi.getAll(),
        clientsApi.getAll()
      ])
      setLocations(locs)
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
      setParticipants(data.participants || [])
    } catch (err: any) {
      console.error('Error loading route:', err)
      alert(err.response?.data?.message || 'Failed to load route')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNewRoute = async () => {
    try {
      const newRoute = await routesApi.create({
        name: 'New Route',
        description: null,
        startDate: null,
        status: 'draft',
        currency: 'BRL',
        notes: null
      })
      navigate(`/routes/${newRoute.id}`, { replace: true })
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create route')
      navigate('/routes')
    }
  }

  const handleSaveRoute = async (routeData: Omit<Route, 'id' | 'endDate' | 'duration' | 'totalDistance' | 'createdAt' | 'updatedAt'>) => {
    if (!route) return
    try {
      const updated = await routesApi.update(route.id, routeData)
      setRoute(updated)
      setShowRouteForm(false)
      await loadRoute()
    } catch (err: any) {
      throw err
    }
  }

  const handleAddSegment = () => {
    if (!route) {
      alert('Route not loaded')
      return
    }
    setEditingSegment(null)
    setShowSegmentForm(true)
  }

  const handleEditSegment = (segment: RouteSegment) => {
    setEditingSegment(segment)
    setShowSegmentForm(true)
  }

  const handleViewSegment = (segment: RouteSegment) => {
    setViewingSegment(segment)
  }

  const handleSaveSegment = async (segmentData: Omit<RouteSegment, 'id' | 'routeId' | 'segmentDate' | 'createdAt' | 'updatedAt' | 'fromDestinationName' | 'toDestinationName' | 'overnightLocationName'>) => {
    if (!route) return
    try {
      if (editingSegment) {
        await routeSegmentsApi.update(route.id, editingSegment.id, segmentData)
      } else {
        await routeSegmentsApi.create(route.id, {
          ...segmentData,
          dayNumber: segmentData.dayNumber || segments.length + 1,
          segmentOrder: segmentData.segmentOrder !== undefined ? segmentData.segmentOrder : segments.length
        })
      }
      setShowSegmentForm(false)
      setEditingSegment(null)
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
      await loadRoute()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete segment')
    }
  }

  const handleAddParticipant = async (role: 'client' | 'guide-captain' | 'guide-tail' | 'staff', clientId?: string, guideId?: string) => {
    if (!route) return
    try {
      await routeParticipantsApi.create(route.id, {
        clientId: role === 'client' ? clientId || null : null,
        guideId: role === 'guide-captain' || role === 'guide-tail' ? guideId || null : null,
        role,
        notes: null
      })
      await loadRoute()
      setShowParticipantForm(false)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add participant')
    }
  }

  const handleDeleteParticipant = async (participantId: string) => {
    if (!route) return
    if (!confirm('Are you sure you want to remove this participant?')) return
    try {
      await routeParticipantsApi.delete(route.id, participantId)
      await loadRoute()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove participant')
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

  const getLocationName = (segment: RouteSegment, field: 'from' | 'to' | 'overnight') => {
    // First try to use the location name from the segment (from API)
    if (field === 'from' && segment.fromDestinationName) return segment.fromDestinationName
    if (field === 'to' && segment.toDestinationName) return segment.toDestinationName
    if (field === 'overnight' && segment.overnightLocationName) return segment.overnightLocationName
    
    // Fall back to looking up by ID
    const locationId = field === 'from' ? segment.fromDestinationId : field === 'to' ? segment.toDestinationId : segment.overnightLocationId
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

  if (!route) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <p>Route not found</p>
        <button onClick={() => navigate('/routes')}>Back to Routes</button>
      </div>
    )
  }

  const sortedSegments = [...segments].sort((a, b) => a.segmentOrder - b.segmentOrder || a.dayNumber - b.dayNumber)

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: '0 0 0.5rem 0' }}>
            {route.name}
          </h1>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280', flexWrap: 'wrap' }}>
            <span>Status: <strong style={{ color: '#111827' }}>{route.status}</strong></span>
            {route.startDate && <span>Start: {formatDate(route.startDate)}</span>}
            {route.endDate && <span>End: {formatDate(route.endDate)}</span>}
            {route.duration && <span>Duration: {route.duration} days</span>}
            {route.totalDistance && <span>Distance: {route.totalDistance} km</span>}
            <span>Estimated Cost: <strong style={{ color: '#111827' }}>{formatCurrency(route.estimatedCost)}</strong></span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowRouteForm(true)}
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
            Edit Route
          </button>
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
      </div>

      {/* Route Info Card */}
      {route.description && (
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Description</h3>
          <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0, whiteSpace: 'pre-wrap' }}>{route.description}</p>
        </div>
      )}

      {/* Segments Section */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>Segments</h2>
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
        </div>
        {sortedSegments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <p>No segments yet. Click "Add Segment" to create the first one.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sortedSegments.map((segment) => (
              <div
                key={segment.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb'
                  e.currentTarget.style.borderColor = '#3b82f6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.borderColor = '#e5e7eb'
                }}
                onClick={() => handleViewSegment(segment)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                        Day {segment.dayNumber} - {formatDate(segment.segmentDate)}
                      </h3>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: '#eff6ff',
                        color: '#3b82f6'
                      }}>
                        {segment.segmentType}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <span><strong>From:</strong> {getLocationName(segment, 'from')}</span>
                      <span>→</span>
                      <span><strong>To:</strong> {getLocationName(segment, 'to')}</span>
                      <span>→</span>
                      <span><strong>Overnight:</strong> {getLocationName(segment, 'overnight')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      <span><strong>Distance:</strong> {segment.distance} km</span>
                      {segment.estimatedDuration && <span><strong>Duration:</strong> {segment.estimatedDuration} hours</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEditSegment(segment)}
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Participants Section */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>Participants</h2>
          <button
            onClick={() => setShowParticipantForm(true)}
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
            <span>+</span> Add Participant
          </button>
        </div>
        {participants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <p>No participants yet. Click "Add Participant" to add clients, guides, or staff.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {participants.map((participant) => (
              <div
                key={participant.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', margin: '0 0 0.25rem 0' }}>
                      {participant.clientName || participant.guideName || 'Staff Member'}
                    </h4>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: '#f3f4f6',
                      color: '#6b7280'
                    }}>
                      {participant.role}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteParticipant(participant.id)}
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showRouteForm && (
        <RouteForm
          route={route}
          onClose={() => setShowRouteForm(false)}
          onSave={handleSaveRoute}
        />
      )}

      {showSegmentForm && (
        <SegmentForm
          segment={editingSegment}
          locations={locations}
          segments={segments}
          onSave={handleSaveSegment}
          onClose={() => {
            setShowSegmentForm(false)
            setEditingSegment(null)
          }}
        />
      )}

      {viewingSegment && (
        <SegmentDetails
          segment={viewingSegment}
          routeId={route.id}
          onClose={() => setViewingSegment(null)}
          onSegmentUpdated={loadRoute}
        />
      )}

      {showParticipantForm && (
        <ParticipantForm
          guides={guides}
          clients={clients}
          onAdd={handleAddParticipant}
          onClose={() => setShowParticipantForm(false)}
        />
      )}
    </div>
  )
}

// Participant Form Component
interface ParticipantFormProps {
  guides: Guide[]
  clients: Client[]
  onAdd: (role: 'client' | 'guide-captain' | 'guide-tail' | 'staff', clientId?: string, guideId?: string) => Promise<void>
  onClose: () => void
}

function ParticipantForm({ guides, clients, onAdd, onClose }: ParticipantFormProps) {
  const [role, setRole] = useState<'client' | 'guide-captain' | 'guide-tail' | 'staff'>('client')
  const [clientId, setClientId] = useState('')
  const [guideId, setGuideId] = useState('')
  const [adding, setAdding] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    try {
      await onAdd(role, role === 'client' ? clientId : undefined, role === 'guide-captain' || role === 'guide-tail' ? guideId : undefined)
    } finally {
      setAdding(false)
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
          maxWidth: '500px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0 0 1.5rem 0' }}>Add Participant</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                outline: 'none'
              }}
            >
              <option value="client">Client</option>
              <option value="guide-captain">Guide (Captain)</option>
              <option value="guide-tail">Guide (Tail)</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          {role === 'client' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                Client
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
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
                <option value="">Select client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
          )}
          {(role === 'guide-captain' || role === 'guide-tail') && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                Guide
              </label>
              <select
                value={guideId}
                onChange={(e) => setGuideId(e.target.value)}
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
                <option value="">Select guide...</option>
                {guides.map(guide => (
                  <option key={guide.id} value={guide.id}>{guide.name}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={adding}
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
              disabled={adding}
              style={{
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'white',
                backgroundColor: adding ? '#9ca3af' : '#3b82f6',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              {adding ? 'Adding...' : 'Add Participant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
