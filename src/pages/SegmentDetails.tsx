import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { routesApi, routeSegmentsApi, routeLogisticsApi, routeSegmentParticipantsApi, routeSegmentStopsApi, routeSegmentAccommodationsApi, hotelsApi, vehiclesApi, thirdPartiesApi, locationsApi } from '../lib/api'
import type { Route, RouteSegment, RouteSegmentStop, RouteLogistics, RouteParticipant, Hotel, Vehicle, ThirdParty, Location, RouteSegmentAccommodation, RoomType } from '../types'
import { LogisticsForm } from '../components/LogisticsForm'
import { SegmentForm } from '../components/SegmentForm'

export function SegmentDetails() {
  const { routeId, segmentId } = useParams<{ routeId: string, segmentId: string }>()
  const navigate = useNavigate()
  const [route, setRoute] = useState<Route | null>(null)
  const [segment, setSegment] = useState<RouteSegment | null>(null)
  const [logistics, setLogistics] = useState<RouteLogistics[]>([])
  const [participants, setParticipants] = useState<RouteParticipant[]>([])
  const [stops, setStops] = useState<RouteSegmentStop[]>([])
  const [accommodations, setAccommodations] = useState<RouteSegmentAccommodation[]>([])
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'vehicles' | 'accommodations' | 'catering' | 'extras' | 'participants' | 'stops' | 'tasks'>('vehicles')
  const [showLogisticsForm, setShowLogisticsForm] = useState(false)
  const [logisticsType, setLogisticsType] = useState<RouteLogistics['logisticsType'] | null>(null)
  const [logisticsFormMode, setLogisticsFormMode] = useState<'add' | 'edit'>('add')
  const [editingLogistics, setEditingLogistics] = useState<RouteLogistics | null>(null)
  const [showSegmentForm, setShowSegmentForm] = useState(false)
  const [showStopForm, setShowStopForm] = useState(false)
  const [allSegments, setAllSegments] = useState<RouteSegment[]>([])
  const [showAddHotel, setShowAddHotel] = useState(false)
  const [selectedHotelId, setSelectedHotelId] = useState('')
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [roomFormAccommodation, setRoomFormAccommodation] = useState<RouteSegmentAccommodation | null>(null)
  const [roomFormMode, setRoomFormMode] = useState<'add' | 'edit'>('add')
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [roomFormData, setRoomFormData] = useState<{
    roomType: RoomType
    roomLabel: string
    participantIds: string[]
    isCouple: boolean
  }>({
    roomType: 'double',
    roomLabel: '',
    participantIds: [],
    isCouple: false
  })

  useEffect(() => {
    if (routeId && segmentId) {
      loadData()
    }
  }, [routeId, segmentId])

  const loadData = async () => {
    if (!routeId || !segmentId) return
    try {
      setLoading(true)
      const [routeData, segmentsData, logisticsData, participantsData, stopsData, accommodationsData, hotelsData, vehiclesData, thirdPartiesData, locationsData] = await Promise.all([
        routesApi.getById(routeId).catch(() => null),
        routeSegmentsApi.getAll(routeId),
        routeLogisticsApi.getAll(routeId),
        routeSegmentParticipantsApi.getBySegment(routeId, segmentId).catch(() => []),
        routeSegmentStopsApi.getAll(routeId, segmentId).catch(() => []),
        routeSegmentAccommodationsApi.getBySegment(routeId, segmentId).catch(() => []),
        hotelsApi.getAll(),
        vehiclesApi.getAll(),
        thirdPartiesApi.getAll(),
        locationsApi.getAll()
      ])
      const foundSegment = segmentsData.find(s => s.id === segmentId)
      if (!foundSegment) {
        alert('Segment not found')
        navigate(`/routes/${routeId}`)
        return
      }
      if (routeData) {
        setRoute(routeData)
      }
      setSegment(foundSegment)
      setAllSegments(segmentsData)
      setLogistics(logisticsData.filter(l => l.segmentId === segmentId))
      setParticipants(participantsData || [])
      setStops(stopsData || [])
      setAccommodations(accommodationsData || [])
      setHotels(hotelsData)
      setVehicles(vehiclesData)
      setThirdParties(thirdPartiesData)
      setLocations(locationsData)
    } catch (err: any) {
      console.error('Error loading segment data:', err)
      alert(err.response?.data?.message || 'Failed to load segment')
      navigate(`/routes/${routeId}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLogistics = async (logisticsId: string) => {
    if (!routeId) return
    if (!confirm('Are you sure you want to remove this logistics item?')) return
    try {
      await routeLogisticsApi.delete(routeId, logisticsId)
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete logistics')
    }
  }

  const handleAddLogistics = async (logisticsData: Omit<RouteLogistics, 'id' | 'routeId' | 'createdAt' | 'updatedAt' | 'entityName'>) => {
    if (!routeId || !segmentId) return
    try {
      await routeLogisticsApi.create(routeId, {
        ...logisticsData,
        segmentId: segmentId
      })
      await loadData()
      setShowLogisticsForm(false)
      setLogisticsType(null)
      setEditingLogistics(null)
      setLogisticsFormMode('add')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add logistics')
    }
  }

  const handleUpdateLogistics = async (logisticsData: Omit<RouteLogistics, 'id' | 'routeId' | 'createdAt' | 'updatedAt' | 'entityName'>) => {
    if (!routeId || !editingLogistics) return
    try {
      await routeLogisticsApi.update(routeId, editingLogistics.id, {
        ...logisticsData,
        segmentId: editingLogistics.segmentId
      })
      await loadData()
      setShowLogisticsForm(false)
      setLogisticsType(null)
      setEditingLogistics(null)
      setLogisticsFormMode('add')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update logistics')
    }
  }

  const openAddLogistics = (type: RouteLogistics['logisticsType']) => {
    setLogisticsType(type)
    setEditingLogistics(null)
    setLogisticsFormMode('add')
    setShowLogisticsForm(true)
  }

  const openEditLogistics = (log: RouteLogistics) => {
    setLogisticsType(log.logisticsType)
    setEditingLogistics(log)
    setLogisticsFormMode('edit')
    setShowLogisticsForm(true)
  }

  const handleEditSegment = () => {
    setShowSegmentForm(true)
  }

  const handleSaveSegment = async (segmentData: Omit<RouteSegment, 'id' | 'routeId' | 'segmentDate' | 'createdAt' | 'updatedAt' | 'fromDestinationName' | 'toDestinationName' | 'stops'>) => {
    if (!routeId || !segmentId) return
    try {
      await routeSegmentsApi.update(routeId, segmentId, segmentData)
      await loadData()
      setShowSegmentForm(false)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save segment')
    }
  }

  const handleDeleteSegment = async () => {
    if (!routeId || !segmentId) return
    if (!confirm('Are you sure you want to delete this segment? This action cannot be undone.')) return
    try {
      await routeSegmentsApi.delete(routeId, segmentId)
      navigate(`/routes/${routeId}`)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete segment')
    }
  }

  const handleAddStop = () => {
    setShowStopForm(true)
  }

  const handleSaveStop = async (locationId: string, notes: string | null) => {
    if (!routeId || !segmentId || !locationId) return
    try {
      const maxOrder = stops.length > 0 ? Math.max(...stops.map(s => s.stopOrder)) : 0
      await routeSegmentStopsApi.add(routeId, segmentId, {
        locationId,
        stopOrder: maxOrder + 1,
        notes: notes || null
      })
      await loadData()
      setShowStopForm(false)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add stop')
    }
  }

  const handleDeleteStop = async (stopId: string) => {
    if (!routeId || !segmentId) return
    if (!confirm('Are you sure you want to remove this stop?')) return
    try {
      await routeSegmentStopsApi.delete(routeId, segmentId, stopId)
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete stop')
    }
  }

  const handleMoveStop = async (stopId: string, direction: 'up' | 'down') => {
    if (!routeId || !segmentId) return
    const stopIndex = stops.findIndex(s => s.id === stopId)
    if (stopIndex === -1) return
    
    if (direction === 'up' && stopIndex === 0) return
    if (direction === 'down' && stopIndex === stops.length - 1) return
    
    const newStops = [...stops]
    const targetIndex = direction === 'up' ? stopIndex - 1 : stopIndex + 1
    
    // Swap stop orders
    const tempOrder = newStops[stopIndex].stopOrder
    newStops[stopIndex].stopOrder = newStops[targetIndex].stopOrder
    newStops[targetIndex].stopOrder = tempOrder
    
    try {
      await routeSegmentStopsApi.reorder(routeId, segmentId, newStops.map(s => ({
        id: s.id,
        stopOrder: s.stopOrder
      })))
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reorder stops')
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

  const getLocationName = (field: 'from' | 'to') => {
    if (!segment) return 'Not set'
    // First try to use the location name from the segment (from API)
    if (field === 'from' && segment.fromDestinationName) return segment.fromDestinationName
    if (field === 'to' && segment.toDestinationName) return segment.toDestinationName
    
    // Fall back to looking up by ID
    const locationId = field === 'from' ? segment.fromDestinationId : segment.toDestinationId
    if (!locationId) return 'Not set'
    return locations.find(l => l.id === locationId)?.name || 'Unknown'
  }

  const getParticipantName = (participant: RouteParticipant) => {
    return participant.role === 'client'
      ? participant.clientName || 'Client'
      : participant.guideName || 'Staff Member'
  }

  const getGroupParticipants = () => participants

  const openAddHotel = () => {
    setSelectedHotelId('')
    setShowAddHotel(true)
  }

  const handleSaveHotel = async () => {
    if (!routeId || !segmentId || !selectedHotelId) {
      alert('Please select a hotel')
      return
    }
    try {
      await routeSegmentAccommodationsApi.addHotel(routeId, segmentId, {
        hotelId: selectedHotelId,
        groupType: 'client'
      })
      await loadData()
      setShowAddHotel(false)
      setSelectedHotelId('')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add hotel')
    }
  }

  const handleDeleteAccommodation = async (accommodationId: string) => {
    if (!routeId || !segmentId) return
    if (!confirm('Are you sure you want to remove this hotel and its rooms?')) return
    try {
      await routeSegmentAccommodationsApi.removeHotel(routeId, segmentId, accommodationId)
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove hotel')
    }
  }

  const openAddRoom = (accommodation: RouteSegmentAccommodation) => {
    setRoomFormMode('add')
    setEditingRoomId(null)
    setRoomFormAccommodation(accommodation)
    setRoomFormData({
      roomType: 'double',
      roomLabel: '',
      participantIds: [],
      isCouple: false
    })
    setShowRoomForm(true)
  }

  const openEditRoom = (accommodation: RouteSegmentAccommodation, room: RouteSegmentAccommodation['rooms'][number]) => {
    setRoomFormMode('edit')
    setEditingRoomId(room.id)
    setRoomFormAccommodation(accommodation)
    setRoomFormData({
      roomType: room.roomType,
      roomLabel: room.roomLabel || '',
      participantIds: room.participants.map(p => p.id),
      isCouple: room.isCouple
    })
    setShowRoomForm(true)
  }

  const handleSaveRoom = async () => {
    if (!routeId || !segmentId || !roomFormAccommodation) return
    if (!roomFormData.roomType) {
      alert('Please select a room type')
      return
    }
    try {
      if (roomFormMode === 'add') {
        await routeSegmentAccommodationsApi.addRoom(routeId, segmentId, roomFormAccommodation.id, {
          roomType: roomFormData.roomType,
          roomLabel: roomFormData.roomLabel || null,
          isCouple: roomFormData.isCouple,
          participantIds: roomFormData.participantIds
        })
      } else if (editingRoomId) {
        await routeSegmentAccommodationsApi.updateRoom(routeId, segmentId, roomFormAccommodation.id, editingRoomId, {
          roomType: roomFormData.roomType,
          roomLabel: roomFormData.roomLabel || null,
          isCouple: roomFormData.isCouple,
          participantIds: roomFormData.participantIds
        })
      }
      await loadData()
      setShowRoomForm(false)
      setRoomFormAccommodation(null)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save room')
    }
  }

  const handleDeleteRoom = async (accommodationId: string, roomId: string) => {
    if (!routeId || !segmentId) return
    if (!confirm('Are you sure you want to remove this room?')) return
    try {
      await routeSegmentAccommodationsApi.removeRoom(routeId, segmentId, accommodationId, roomId)
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove room')
    }
  }

  const toggleRoomParticipant = (participantId: string) => {
    setRoomFormData(prev => {
      const exists = prev.participantIds.includes(participantId)
      const nextIds = exists
        ? prev.participantIds.filter(id => id !== participantId)
        : [...prev.participantIds, participantId]
      return {
        ...prev,
        participantIds: nextIds,
        isCouple: nextIds.length < 2 ? false : prev.isCouple
      }
    })
  }

  // Group logistics by category
  const logisticsByCategory = {
    vehicles: logistics.filter(l => l.logisticsType === 'support-vehicle'),
    catering: logistics.filter(l => l.logisticsType === 'lunch'),
    extras: logistics.filter(l => l.logisticsType === 'third-party' || l.logisticsType === 'extra-cost')
  }


  if (loading) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <p>Loading segment...</p>
      </div>
    )
  }

  if (!segment) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <p>Segment not found</p>
        <button onClick={() => navigate(`/routes/${routeId}`)}>Back to Route</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {route && (
              <>
                <span style={{ fontSize: '2rem', fontWeight: '700', color: '#111827' }}>
                  {route.name}
                </span>
                <span style={{ fontSize: '2rem', fontWeight: '700', color: '#d1d5db' }}>•</span>
              </>
            )}
            <span>Day {segment.dayNumber} - {formatDate(segment.segmentDate)}</span>
          </h1>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            <p style={{ margin: '0.25rem 0' }}><strong>From:</strong> {getLocationName('from')}</p>
            <p style={{ margin: '0.25rem 0' }}><strong>To:</strong> {getLocationName('to')}</p>
            <p style={{ margin: '0.25rem 0' }}><strong>Distance:</strong> {segment.distance} km</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => navigate(`/routes/${routeId}`)}
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
            Back to Route
          </button>
          <button
            onClick={handleEditSegment}
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
            onClick={handleDeleteSegment}
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

      {/* Logistics Section with Tabs */}
      <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setActiveTab('vehicles')}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'vehicles' ? '#3b82f6' : '#6b7280',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'vehicles' ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Vehicles
          </button>
          <button
            onClick={() => setActiveTab('accommodations')}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'accommodations' ? '#3b82f6' : '#6b7280',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'accommodations' ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Accommodations
          </button>
          <button
            onClick={() => setActiveTab('catering')}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'catering' ? '#3b82f6' : '#6b7280',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'catering' ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Food and Beverages
          </button>
          <button
            onClick={() => setActiveTab('extras')}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'extras' ? '#3b82f6' : '#6b7280',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'extras' ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Extras
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
            Participants
          </button>
          <button
            onClick={() => setActiveTab('stops')}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'stops' ? '#3b82f6' : '#6b7280',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'stops' ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Stops
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            style={{
              padding: '1rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'tasks' ? '#3b82f6' : '#6b7280',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'tasks' ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Tasks
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '1.5rem' }}>
          {/* Vehicles Tab */}
          {activeTab === 'vehicles' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>Vehicles</h3>
                <button
                  onClick={() => openAddLogistics('support-vehicle')}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Add Vehicle
                </button>
              </div>
              {logisticsByCategory.vehicles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  <p>No vehicles added yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {logisticsByCategory.vehicles.map(log => (
                    <div key={log.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                          {log.entityName}
                        </p>
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
            </div>
          )}

          {/* Accommodations Tab */}
          {activeTab === 'accommodations' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>Accommodations</h3>
                <button
                  onClick={openAddHotel}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Add Hotel
                </button>
              </div>
              {accommodations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  <p>No accommodations added yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {accommodations.map(accommodation => (
                    <div key={accommodation.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: '#111827' }}>
                            {accommodation.hotelName || 'Hotel'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => openAddRoom(accommodation)}
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
                            Add Room
                          </button>
                          <button
                            onClick={() => handleDeleteAccommodation(accommodation.id)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              fontSize: '0.75rem',
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer'
                            }}
                          >
                            Remove Hotel
                          </button>
                        </div>
                      </div>
                      {accommodation.rooms.length === 0 ? (
                        <div style={{ padding: '0.75rem', color: '#6b7280', border: '1px dashed #e5e7eb', borderRadius: '0.375rem' }}>
                          <p style={{ margin: 0 }}>No rooms added yet.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {accommodation.rooms.map((room, index) => (
                            <div key={room.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                              <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                                  {room.roomLabel || `Room ${index + 1}`}
                                </p>
                                <p style={{ margin: '0.25rem 0', fontSize: '0.75rem', color: '#6b7280' }}>
                                  Type: {room.roomType.toUpperCase()}
                                  {room.isCouple ? ' • Couple' : ''}
                                </p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                                  {room.participants.length > 0
                                    ? `Participants: ${room.participants.map(getParticipantName).join(', ')}`
                                    : 'No participants assigned'}
                                </p>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button
                                  onClick={() => openEditRoom(accommodation, room)}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.75rem',
                                    backgroundColor: '#f3f4f6',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteRoom(accommodation.id, room.id)}
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
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Catering Tab */}
          {activeTab === 'catering' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>Food and Beverages</h3>
                <button
                  onClick={() => openAddLogistics('lunch')}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Add Item
                </button>
              </div>
              {logisticsByCategory.catering.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  <p>No food or beverages added yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {logisticsByCategory.catering.map(log => (
                    <div key={log.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                          {log.itemName || 'Item'}
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                          Provider: {log.entityName || 'Self purchase'}
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                          Quantity: {log.quantity} | Cost: {formatCurrency(log.cost * log.quantity)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => openEditLogistics(log)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Extras Tab */}
          {activeTab === 'extras' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>Extras</h3>
                <button
                  onClick={() => openAddLogistics('extra-cost')}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Add Extra
                </button>
              </div>
              {logisticsByCategory.extras.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  <p>No extras added yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {logisticsByCategory.extras.map(log => (
                    <div key={log.id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                          {log.itemName || log.entityName || 'Extra'}
                        </p>
                        {log.notes && (
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>{log.notes}</p>
                        )}
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                          Provider: {log.entityName || 'No provider'} | Quantity: {log.quantity} | Cost: {formatCurrency(log.cost * log.quantity)}
                        </p>
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
            </div>
          )}

          {activeTab === 'participants' && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: '0 0 1.5rem 0' }}>Participants on This Segment</h3>
              {participants.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  <p>No participants assigned to this segment yet.</p>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Go to the route's Participants tab to assign participants to segments.</p>
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
                      <div>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', margin: '0 0 0.25rem 0' }}>
                          {participant.role === 'client' 
                            ? participant.clientName || 'Client'
                            : participant.guideName || 'Staff Member'}
                        </h4>
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
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
                                : 'Staff'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'stops' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>Intermediate Stops</h3>
                <button
                  onClick={handleAddStop}
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
                  <span>+</span> Add Stop
                </button>
              </div>
              {stops.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  <p>No intermediate stops added yet.</p>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Click "Add Stop" to add intermediate locations between the start and end destinations.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {stops.map((stop, index) => (
                    <div
                      key={stop.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'white'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: '#eff6ff',
                            color: '#1e40af'
                          }}>
                            Stop {index + 1}
                          </span>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                            {stop.locationName || 'Unknown Location'}
                          </h4>
                        </div>
                        {stop.notes && (
                          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                            {stop.notes}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleMoveStop(stop.id, 'up')}
                          disabled={index === 0}
                          style={{
                            padding: '0.375rem 0.5rem',
                            backgroundColor: index === 0 ? '#e5e7eb' : '#f3f4f6',
                            color: index === 0 ? '#9ca3af' : '#374151',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.25rem',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveStop(stop.id, 'down')}
                          disabled={index === stops.length - 1}
                          style={{
                            padding: '0.375rem 0.5rem',
                            backgroundColor: index === stops.length - 1 ? '#e5e7eb' : '#f3f4f6',
                            color: index === stops.length - 1 ? '#9ca3af' : '#374151',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.25rem',
                            cursor: index === stops.length - 1 ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => handleDeleteStop(stop.id)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '500'
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

          {activeTab === 'tasks' && (
            <div>
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <p>Tasks will be added here.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Segment Form Modal */}
      {showSegmentForm && segment && routeId && (
        <SegmentForm
          segment={segment}
          locations={locations}
          segments={allSegments}
          routeId={routeId}
          onSave={handleSaveSegment}
          onClose={() => setShowSegmentForm(false)}
        />
      )}

      {/* Logistics Form Modal */}
      {showLogisticsForm && logisticsType && (
        <LogisticsForm
          logisticsType={logisticsType}
          hotels={hotels}
          vehicles={vehicles}
          thirdParties={thirdParties}
          locations={locations}
          onSave={logisticsFormMode === 'edit' ? handleUpdateLogistics : handleAddLogistics}
          initialData={editingLogistics || undefined}
          mode={logisticsFormMode}
          onClose={() => {
            setShowLogisticsForm(false)
            setLogisticsType(null)
            setEditingLogistics(null)
            setLogisticsFormMode('add')
          }}
        />
      )}

      {/* Add Hotel Modal */}
      {showAddHotel && (
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
          onClick={() => setShowAddHotel(false)}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                Add Hotel
              </h2>
              <button
                onClick={() => setShowAddHotel(false)}
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
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>
                Hotel
              </label>
              <select
                value={selectedHotelId}
                onChange={(e) => setSelectedHotelId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
              >
                <option value="">Select hotel...</option>
                {hotels.map(hotel => (
                  <option key={hotel.id} value={hotel.id}>{hotel.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowAddHotel(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveHotel}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Add Hotel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Form Modal */}
      {showRoomForm && roomFormAccommodation && (
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
          onClick={() => setShowRoomForm(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              padding: '2rem',
              width: '100%',
              maxWidth: '600px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                {roomFormMode === 'add' ? 'Add Room' : 'Edit Room'}
              </h2>
              <button
                onClick={() => setShowRoomForm(false)}
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

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>
                Room Type
              </label>
              <select
                value={roomFormData.roomType}
                onChange={(e) => setRoomFormData(prev => ({ ...prev, roomType: e.target.value as RoomType }))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
              >
                <option value="single">Single</option>
                <option value="double">Double</option>
                <option value="twin">Twin</option>
                <option value="triple">Triple</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>
                Room Label (optional)
              </label>
              <input
                type="text"
                value={roomFormData.roomLabel}
                onChange={(e) => setRoomFormData(prev => ({ ...prev, roomLabel: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
              />
            </div>

            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="roomIsCouple"
                checked={roomFormData.isCouple}
                disabled={roomFormData.participantIds.length < 2}
                onChange={(e) => setRoomFormData(prev => ({ ...prev, isCouple: e.target.checked }))}
              />
              <label htmlFor="roomIsCouple" style={{ fontSize: '0.875rem', color: '#374151' }}>
                Couple sharing the same bed
              </label>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                Participants
              </label>
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.5rem' }}>
                {getGroupParticipants().length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>No participants available for this group.</p>
                ) : (
                  getGroupParticipants().map(participant => (
                    <label key={participant.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
                      <input
                        type="checkbox"
                        checked={roomFormData.participantIds.includes(participant.id)}
                        onChange={() => toggleRoomParticipant(participant.id)}
                      />
                      <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                        {getParticipantName(participant)}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowRoomForm(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRoom}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {roomFormMode === 'add' ? 'Add Room' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stop Form Modal */}
      {showStopForm && (
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
          onClick={() => setShowStopForm(false)}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>Add Stop</h2>
              <button
                onClick={() => setShowStopForm(false)}
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

            <StopForm
              locations={locations}
              onSave={handleSaveStop}
              onClose={() => setShowStopForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Stop Form Component
interface StopFormProps {
  locations: Location[]
  onSave: (locationId: string, notes: string | null) => Promise<void>
  onClose: () => void
}

function StopForm({ locations, onSave, onClose }: StopFormProps) {
  const [locationId, setLocationId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!locationId) {
      alert('Please select a location')
      return
    }
    setSaving(true)
    try {
      await onSave(locationId, notes || null)
    } catch (err) {
      // Error handled by parent
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>
          Location *
        </label>
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          required
          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
        >
          <option value="">Select location...</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'inherit' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onClose}
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
          {saving ? 'Adding...' : 'Add Stop'}
        </button>
      </div>
    </form>
  )
}
