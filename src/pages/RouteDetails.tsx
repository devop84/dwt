import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { routesApi, routeSegmentsApi, routeParticipantsApi, routeTransactionsApi, routeTransfersApi, locationsApi, staffApi, clientsApi, vehiclesApi } from '../lib/api'
import type { Route, RouteSegment, RouteParticipant, RouteTransaction, RouteTransfer, Location, Staff, Client, Vehicle } from '../types'
import { RouteForm } from '../components/RouteForm'
import { SegmentForm } from '../components/SegmentForm'
import { TransferForm } from '../components/TransferForm'

type TabType = 'segments' | 'participants' | 'transactions' | 'airport-transfers'

export function RouteDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [route, setRoute] = useState<Route | null>(null)
  const [segments, setSegments] = useState<RouteSegment[]>([])
  const [participants, setParticipants] = useState<RouteParticipant[]>([])
  const [transactions, setTransactions] = useState<RouteTransaction[]>([])
  const [transfers, setTransfers] = useState<RouteTransfer[]>([])
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [editingTransfer, setEditingTransfer] = useState<RouteTransfer | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('segments')
  const [showRouteForm, setShowRouteForm] = useState(false)
  const [showSegmentForm, setShowSegmentForm] = useState(false)
  const [editingSegment, setEditingSegment] = useState<RouteSegment | null>(null)
  const [showParticipantForm, setShowParticipantForm] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<RouteParticipant | null>(null)

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
      const [locs, vhcs, gds, clis] = await Promise.all([
        locationsApi.getAll(),
        vehiclesApi.getAll(),
        staffApi.getAll(),
        clientsApi.getAll()
      ])
      setLocations(locs)
      setVehicles(vhcs)
      setStaff(gds)
      setClients(clis)
    } catch (err) {
      // Error loading initial data
    }
  }

  const loadRoute = async () => {
    if (!id) return
    try {
      setLoading(true)
      const [data, transactionsData, transfersData] = await Promise.all([
        routesApi.getById(id),
        routeTransactionsApi.getAll(id).catch(() => []), // Transactions might not exist yet
        routeTransfersApi.getAll(id).catch(() => []) // Transfers might not exist yet
      ])
      setRoute(data)
      setSegments(data.segments || [])
      setParticipants(data.participants || [])
      setTransactions(transactionsData || [])
      setTransfers(transfersData || [])
      
    } catch (err: any) {
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
        notes: null,
        estimatedCost: 0,
        actualCost: 0
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

  const handleDeleteRoute = async () => {
    if (!route) return
    if (!confirm(`Are you sure you want to delete "${route.name}"? This action cannot be undone.`)) return
    try {
      await routesApi.delete(route.id)
      navigate('/routes')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete route')
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

  const handleViewSegment = (segment: RouteSegment) => {
    navigate(`/routes/${route?.id}/segments/${segment.id}`)
  }

  const handleSaveSegment = async (segmentData: Omit<RouteSegment, 'id' | 'routeId' | 'segmentDate' | 'createdAt' | 'updatedAt' | 'fromDestinationName' | 'toDestinationName' | 'stops'>) => {
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

  const handleSaveParticipant = async (participantId: string | null, role: 'client' | 'staff', clientId?: string, guideId?: string, segmentIds?: string[], notes?: string | null) => {
    if (!route) return
    try {
      if (participantId) {
        await routeParticipantsApi.update(route.id, participantId, {
          clientId: role === 'client' ? clientId || null : null,
          guideId: role === 'staff' ? guideId || null : null,
          role,
          notes: notes || null,
          segmentIds: segmentIds || []
        })
      } else {
        await routeParticipantsApi.create(route.id, {
          clientId: role === 'client' ? clientId || null : null,
          guideId: role === 'staff' ? guideId || null : null,
          role,
          notes: notes || null,
          segmentIds: segmentIds || undefined
        })
      }
      await loadRoute()
      setShowParticipantForm(false)
      setEditingParticipant(null)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save participant')
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

  const [editingParticipantSegments, setEditingParticipantSegments] = useState<RouteParticipant | null>(null)

  const handleEditParticipant = (participant: RouteParticipant) => {
    setEditingParticipant(participant)
    setShowParticipantForm(true)
  }

  const handleSaveParticipantSegments = async (participantId: string, segmentIds: string[]) => {
    if (!route) return
    try {
      await routeParticipantsApi.updateSegments(route.id, participantId, segmentIds)
      await loadRoute()
      setEditingParticipantSegments(null)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update participant segments')
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

  const handleAddTransfer = () => {
    setEditingTransfer(null)
    setShowTransferForm(true)
  }

  const handleEditTransfer = (transfer: RouteTransfer) => {
    setEditingTransfer(transfer)
    setShowTransferForm(true)
  }

  const handleSaveTransfer = async (transferData: Omit<RouteTransfer, 'id' | 'routeId' | 'totalCost' | 'createdAt' | 'updatedAt' | 'fromLocationName' | 'toLocationName' | 'vehicles' | 'participants'> & { vehicles?: Omit<import('../types').RouteTransferVehicle, 'id' | 'transferId' | 'createdAt' | 'updatedAt' | 'vehicleName' | 'vehicleType'>[], participants?: string[] }) => {
    if (!route) return
    try {
      if (editingTransfer) {
        await routeTransfersApi.update(route.id, editingTransfer.id, transferData)
      } else {
        await routeTransfersApi.create(route.id, transferData)
      }
      await loadRoute()
      setShowTransferForm(false)
      setEditingTransfer(null)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save transfer')
    }
  }

  const handleDeleteTransfer = async (transferId: string) => {
    if (!route) return
    if (!confirm('Are you sure you want to remove this transfer?')) return
    try {
      await routeTransfersApi.delete(route.id, transferId)
      await loadRoute()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete transfer')
    }
  }

  const getLocationName = (segment: RouteSegment, field: 'from' | 'to') => {
    // First try to use the location name from the segment (from API)
    if (field === 'from' && segment.fromDestinationName) return segment.fromDestinationName
    if (field === 'to' && segment.toDestinationName) return segment.toDestinationName
    
    // Fall back to looking up by ID
    const locationId = field === 'from' ? segment.fromDestinationId : segment.toDestinationId
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
            Edit
          </button>
          <button
            onClick={handleDeleteRoute}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: 'white',
              color: '#dc2626',
              border: '1px solid #dc2626',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Delete
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

      {/* Tabs */}
      <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setActiveTab('segments')}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'segments' ? '#3b82f6' : '#6b7280',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'segments' ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {`Segments (${sortedSegments.length})`}
          </button>
          <button
            onClick={() => setActiveTab('participants')}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'participants' ? '#3b82f6' : '#6b7280',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'participants' ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {`Participants (${participants.length})`}
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'transactions' ? '#3b82f6' : '#6b7280',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'transactions' ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {`Transactions (${transactions.length})`}
          </button>
          <button
            onClick={() => setActiveTab('airport-transfers')}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'airport-transfers' ? '#3b82f6' : '#6b7280',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'airport-transfers' ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {`Transfers (${transfers.length})`}
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '1.5rem' }}>
          {activeTab === 'segments' && (
            <div>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {sortedSegments.map((segment) => (
                    <div
                      key={segment.id}
                      onClick={() => handleViewSegment(segment)}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e5e7eb'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#111827' }}>
                          Day {segment.dayNumber} - {formatDate(segment.segmentDate)}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {segment.distance} km
                        </div>
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        {getLocationName(segment, 'from')} → {getLocationName(segment, 'to')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'participants' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>Participants</h2>
                <button
                  onClick={() => { setEditingParticipant(null); setShowParticipantForm(true) }}
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
                  <p>No participants yet. Click "Add Participant" to add clients, staff, or other members.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Participant Rows */}
                  {participants.map((participant) => {
                    // Filter out any segmentIds that don't exist in current segments
                    const validSegmentIds = participant.segmentIds && Array.isArray(participant.segmentIds)
                      ? participant.segmentIds.filter(segmentId => segments.some(s => s.id === segmentId))
                      : []
                    
                    // Simplified logic: 
                    // - Empty array [] or undefined/null → participant is on NO segments (default state)
                    // - Non-empty array → participant is on those specific segments only
                    const hasSegmentAssignments = validSegmentIds.length > 0
                    
                    return (
                      <div
                        key={participant.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 2fr 1fr',
                          gap: '1rem',
                          padding: '1rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.375rem',
                          backgroundColor: 'white',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                            {participant.role === 'client' 
                              ? participant.clientName || 'Client'
                              : participant.guideName || 'Staff Member'}
                          </div>
                        </div>
                        
                        <div>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            backgroundColor: participant.role === 'client' ? '#dbeafe' : '#f3f4f6',
                            color: participant.role === 'client' ? '#1e40af' : '#6b7280',
                            display: 'inline-block'
                          }}>
                            {participant.role === 'client' 
                              ? 'Client'
                              : participant.role === 'guide-captain' 
                                ? 'Guide (Captain)' 
                                : participant.role === 'guide-tail' 
                                  ? 'Guide (Tail)' 
                                  : participant.notes
                                    ? `Staff (${participant.notes})`
                                    : 'Staff'}
                          </span>
                        </div>
                        
                        <div>
                          {hasSegmentAssignments ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                              {validSegmentIds
                                .map(segmentId => segments.find(s => s.id === segmentId))
                                .filter(Boolean)
                                .sort((a, b) => (a?.dayNumber || 0) - (b?.dayNumber || 0))
                                .map(segment => (
                                  <span 
                                    key={segment!.id} 
                                    style={{ 
                                      padding: '0.25rem 0.5rem', 
                                      backgroundColor: '#f3f4f6', 
                                      borderRadius: '0.25rem',
                                      fontSize: '0.75rem',
                                      color: '#374151',
                                      fontWeight: '500'
                                    }}
                                  >
                                    Day {segment!.dayNumber}
                                  </span>
                                ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.875rem', color: '#9ca3af', fontStyle: 'italic' }}>
                              No segments assigned
                            </div>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleEditParticipant(participant)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              fontSize: '0.75rem',
                              backgroundColor: '#f3f4f6',
                              color: '#374151',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteParticipant(participant.id)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              fontSize: '0.75rem',
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontWeight: '500'
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
          )}

          {activeTab === 'transactions' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: '0 0 1.5rem 0' }}>Transactions</h2>
              {transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  <p>No transactions yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        padding: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', margin: '0 0 0.25rem 0' }}>
                            {transaction.transactionType} - {transaction.category}
                          </h4>
                          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0' }}>
                            {formatDate(transaction.transactionDate)} | {formatCurrency(transaction.amount)} {transaction.currency}
                          </p>
                          {transaction.description && (
                            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0' }}>
                              {transaction.description}
                            </p>
                          )}
                          {(transaction.fromAccountName || transaction.toAccountName) && (
                            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0' }}>
                              {transaction.fromAccountName && `From: ${transaction.fromAccountName}`}
                              {transaction.fromAccountName && transaction.toAccountName && ' | '}
                              {transaction.toAccountName && `To: ${transaction.toAccountName}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'airport-transfers' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>Transfers</h2>
                <button
                  onClick={handleAddTransfer}
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
                  <span>+</span> Add Transfer
                </button>
              </div>
              {transfers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  <p>No transfers added yet. Click "Add Transfer" to add one.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {transfers.map((transfer) => (
                    <div
                      key={transfer.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                            {transfer.fromLocationName || 'Unknown'} → {transfer.toLocationName || 'Unknown'}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {formatDate(transfer.transferDate)}
                          </span>
                        </div>
                        {transfer.vehicles && transfer.vehicles.length > 0 && (
                          <div style={{ marginBottom: '0.5rem' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: '500', color: '#374151', margin: '0 0 0.25rem 0' }}>Vehicles:</p>
                            {transfer.vehicles.map((vehicle, idx) => {
                              const ownerName = vehicle.isOwnVehicle 
                                ? 'Company' 
                                : vehicle.vehicleOwner === 'hotel'
                                  ? (vehicle.hotelName || 'Hotel')
                                  : (vehicle.thirdPartyName || 'Third Party')
                              const vehicleDisplayName = vehicle.vehicleType 
                                ? `${vehicle.vehicleType} - ${ownerName}`
                                : (vehicle.vehicleName || 'Unknown')
                              return (
                                <p key={idx} style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.125rem 0', paddingLeft: '1rem' }}>
                                  • {vehicleDisplayName} (Qty: {vehicle.quantity}, Cost: {formatCurrency(vehicle.cost * vehicle.quantity)})
                                  {vehicle.driverPilotName && ` - Driver/Pilot: ${vehicle.driverPilotName}`}
                                </p>
                              )
                            })}
                          </div>
                        )}
                        {transfer.participants && transfer.participants.length > 0 && (
                          <div style={{ marginBottom: '0.5rem' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: '500', color: '#374151', margin: '0 0 0.25rem 0' }}>Participants:</p>
                            {transfer.participants.map((participant, idx) => (
                              <p key={idx} style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.125rem 0', paddingLeft: '1rem' }}>
                                • {participant.participantName || 'Unknown'} ({participant.participantRole || 'Unknown'})
                              </p>
                            ))}
                          </div>
                        )}
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0' }}>
                          <strong>Total Cost:</strong> {formatCurrency(transfer.totalCost)}
                        </p>
                        {transfer.notes && (
                          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0' }}>
                            <strong>Notes:</strong> {transfer.notes}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEditTransfer(transfer)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTransfer(transfer.id)}
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
          )}
        </div>
      </div>

      {/* Modals */}
      {showRouteForm && (
        <RouteForm
          route={route}
          onClose={() => setShowRouteForm(false)}
          onSave={handleSaveRoute}
        />
      )}

      {showSegmentForm && route && (
        <SegmentForm
          segment={editingSegment}
          locations={locations}
          segments={segments}
          routeId={route.id}
          onSave={handleSaveSegment}
          onClose={() => {
            setShowSegmentForm(false)
            setEditingSegment(null)
          }}
        />
      )}

      {showParticipantForm && (
        <ParticipantForm
          guides={staff}
          clients={clients}
          segments={segments}
          initialParticipant={editingParticipant}
          onSave={handleSaveParticipant}
          onClose={() => {
            setShowParticipantForm(false)
            setEditingParticipant(null)
          }}
        />
      )}

      {showTransferForm && (
        <TransferForm
          transfer={editingTransfer}
          locations={locations}
          vehicles={vehicles}
          participants={participants}
          onSave={handleSaveTransfer}
          onClose={() => {
            setShowTransferForm(false)
            setEditingTransfer(null)
          }}
        />
      )}

      {editingParticipantSegments && (
        <ParticipantSegmentsForm
          participant={editingParticipantSegments}
          segments={segments}
          onSave={handleSaveParticipantSegments}
          onClose={() => setEditingParticipantSegments(null)}
        />
      )}
    </div>
  )
}

// Participant Segments Management Form Component
interface ParticipantSegmentsFormProps {
  participant: RouteParticipant
  segments: RouteSegment[]
  onSave: (participantId: string, segmentIds: string[]) => Promise<void>
  onClose: () => void
}

function ParticipantSegmentsForm({ participant, segments, onSave, onClose }: ParticipantSegmentsFormProps) {
  const [selectedSegments, setSelectedSegments] = useState<string[]>(participant.segmentIds || [])
  const [saving, setSaving] = useState(false)
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null)

  // Initialize selectedSegments when participant changes
  useEffect(() => {
    if (participant.segmentIds && participant.segmentIds.length > 0) {
      setSelectedSegments(participant.segmentIds)
    } else {
      setSelectedSegments([])
    }
  }, [participant.id])

  // Check if all segments are selected
  const allSelected = segments.length > 0 && selectedSegments.length === segments.length
  const someSelected = selectedSegments.length > 0 && selectedSegments.length < segments.length

  // Set indeterminate state on select all checkbox
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSegments(segments.map(s => s.id))
    } else {
      setSelectedSegments([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      // Send selected segments (empty array means no segments assigned)
      await onSave(participant.id, selectedSegments)
      onClose()
    } catch (error) {
      // Error is already handled in onSave
    } finally {
      setSaving(false)
    }
  }

  const handleToggleSegment = (segmentId: string) => {
    if (selectedSegments.includes(segmentId)) {
      setSelectedSegments(selectedSegments.filter(id => id !== segmentId))
    } else {
      setSelectedSegments([...selectedSegments, segmentId])
    }
  }

  const participantName = participant.role === 'client' 
    ? participant.clientName || 'Client'
    : participant.guideName || 'Staff Member'

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
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0 0 1.5rem 0' }}>
          Manage Segments for {participantName}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            {segments.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  ref={selectAllCheckboxRef}
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  style={{ width: '1rem', height: '1rem' }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Select all ({selectedSegments.length} of {segments.length})
                </span>
              </label>
            )}

            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem' }}>
              {segments.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                  No segments available
                </div>
              ) : (
                segments.map((segment) => (
                  <label
                    key={segment.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem',
                      cursor: 'pointer',
                      borderRadius: '0.25rem',
                      backgroundColor: selectedSegments.includes(segment.id) ? '#eff6ff' : 'transparent',
                      marginBottom: '0.25rem',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedSegments.includes(segment.id)) {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedSegments.includes(segment.id)) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSegments.includes(segment.id)}
                      onChange={() => handleToggleSegment(segment.id)}
                      style={{ marginRight: '0.75rem', width: '1rem', height: '1rem' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                        Day {segment.dayNumber}
                        {segment.segmentDate && (
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                            ({new Date(segment.segmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {segment.fromDestinationName || 'Unknown'} → {segment.toDestinationName || 'Unknown'}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
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
                backgroundColor: saving ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Participant Form Component
interface ParticipantFormProps {
  guides: Staff[] // Note: variable name kept as 'guides' for participant context, but type is Staff
  clients: Client[]
  segments: RouteSegment[]
  initialParticipant?: RouteParticipant | null
  onSave: (participantId: string | null, role: 'client' | 'staff', clientId?: string, guideId?: string, segmentIds?: string[], notes?: string | null) => Promise<void>
  onClose: () => void
}

function ParticipantForm({ guides, clients, segments, initialParticipant, onSave, onClose }: ParticipantFormProps) {
  const staffList = guides
  const [participantType, setParticipantType] = useState<'client' | 'staff'>(initialParticipant?.role === 'client' ? 'client' : 'staff')
  const [clientId, setClientId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [staffRole, setStaffRole] = useState('')
  const [selectedSegments, setSelectedSegments] = useState<string[]>([])
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!initialParticipant) {
      setParticipantType('client')
      setClientId('')
      setStaffId('')
      setStaffRole('')
      setSelectedSegments([])
      return
    }
    const isClient = initialParticipant.role === 'client'
    setParticipantType(isClient ? 'client' : 'staff')
    setClientId(initialParticipant.clientId || '')
    setStaffId(initialParticipant.guideId || '')
    setStaffRole(
      initialParticipant.notes ||
      (initialParticipant.role === 'guide-captain' ? 'Guide (Captain)' : initialParticipant.role === 'guide-tail' ? 'Guide (Tail)' : '')
    )
    setSelectedSegments(initialParticipant.segmentIds || [])
  }, [initialParticipant])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (participantType === 'client' && !clientId) {
      alert('Please select a client')
      return
    }
    if (participantType === 'staff' && !staffId) {
      alert('Please select a staff member')
      return
    }
    if (participantType === 'staff' && !staffRole.trim()) {
      alert('Please enter the staff role')
      return
    }
    setAdding(true)
    try {
      // Send selected segments (empty array means no segments assigned)
      await onSave(
        initialParticipant ? initialParticipant.id : null,
        participantType,
        participantType === 'client' ? clientId : undefined,
        participantType === 'staff' ? staffId : undefined,
        selectedSegments,
        participantType === 'staff' ? staffRole.trim() : null
      )
    } finally {
      setAdding(false)
    }
  }

  const handleToggleSegment = (segmentId: string) => {
    if (selectedSegments.includes(segmentId)) {
      setSelectedSegments(selectedSegments.filter(id => id !== segmentId))
    } else {
      setSelectedSegments([...selectedSegments, segmentId])
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
              Participant Type
            </label>
            <select
              value={participantType}
              onChange={(e) => setParticipantType(e.target.value as 'client' | 'staff')}
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
              <option value="staff">Staff</option>
            </select>
          </div>
          {participantType === 'client' && (
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
          {participantType === 'staff' && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Staff
                </label>
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
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
                  <option value="">Select staff...</option>
                  {staffList.map((staffMember) => (
                    <option key={staffMember.id} value={staffMember.id}>{staffMember.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Staff Role (for this route)
                </label>
                <input
                  type="text"
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value)}
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
            </>
          )}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Segment Assignment
            </label>
            {segments.length > 0 && (
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem' }}>
                {segments.map(segment => (
                  <label
                    key={segment.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      borderRadius: '0.25rem',
                      backgroundColor: selectedSegments.includes(segment.id) ? '#eff6ff' : 'transparent'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSegments.includes(segment.id)}
                      onChange={() => handleToggleSegment(segment.id)}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                        Day {segment.dayNumber} - {segment.segmentDate ? new Date(segment.segmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {segment.fromDestinationName || 'Unknown'} → {segment.toDestinationName || 'Unknown'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {segments.length === 0 && (
              <div style={{ padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.375rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                No segments available. Add segments to the route first.
              </div>
            )}
          </div>
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
