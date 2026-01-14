import { useState, useEffect } from 'react'
import type { RouteSegment, Location, RouteSegmentStop } from '../types'
import { routeSegmentStopsApi } from '../lib/api'

interface SegmentFormProps {
  segment: RouteSegment | null
  locations: Location[]
  segments: RouteSegment[]
  routeId: string
  onSave: (segment: Omit<RouteSegment, 'id' | 'routeId' | 'segmentDate' | 'createdAt' | 'updatedAt' | 'fromDestinationName' | 'toDestinationName' | 'stops'>) => Promise<void>
  onClose: () => void
}

interface StopFormData {
  id?: string // For existing stops
  locationId: string
  stopOrder: number
  notes: string
}

export function SegmentForm({ segment, locations, segments, routeId, onSave, onClose }: SegmentFormProps) {
  const [formData, setFormData] = useState({
    dayNumber: segment?.dayNumber || segments.length + 1,
    fromDestinationId: segment?.fromDestinationId || '',
    toDestinationId: segment?.toDestinationId || '',
    distance: segment?.distance || 0,
    segmentOrder: segment?.segmentOrder !== undefined ? segment.segmentOrder : segments.length,
    notes: segment?.notes || ''
  })
  const [stops, setStops] = useState<StopFormData[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingStops, setLoadingStops] = useState(false)

  // Load existing stops when editing
  useEffect(() => {
    if (segment?.id) {
      loadStops()
    } else {
      setStops([])
    }
  }, [segment?.id])

  const loadStops = async () => {
    if (!segment?.id) return
    try {
      setLoadingStops(true)
      const stopsData = await routeSegmentStopsApi.getAll(routeId, segment.id)
      setStops(stopsData.map(stop => ({
        id: stop.id,
        locationId: stop.locationId,
        stopOrder: stop.stopOrder,
        notes: stop.notes || ''
      })))
    } catch (err) {
      console.error('Error loading stops:', err)
    } finally {
      setLoadingStops(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Save the segment first
      await onSave({
        dayNumber: formData.dayNumber,
        fromDestinationId: formData.fromDestinationId || null,
        toDestinationId: formData.toDestinationId || null,
        distance: formData.distance,
        segmentOrder: formData.segmentOrder,
        notes: formData.notes || null
      })
      
      // Then save stops if segment already exists (editing mode)
      // For new segments, stops will need to be added after the segment is created
      if (segment?.id) {
        // Get current stops from API to compare
        const currentStops = await routeSegmentStopsApi.getAll(routeId, segment.id)
        const currentStopIds = new Set(currentStops.map(s => s.id))
        const newStopIds = new Set(stops.filter(s => s.id).map(s => s.id!))
        
        // Delete stops that were removed
        for (const currentStop of currentStops) {
          if (!newStopIds.has(currentStop.id)) {
            try {
              await routeSegmentStopsApi.delete(routeId, segment.id, currentStop.id)
            } catch (err) {
              console.error('Error deleting stop:', err)
            }
          }
        }
        
        // Add or update stops
        for (const stop of stops) {
          if (stop.locationId) {
            if (stop.id && currentStopIds.has(stop.id)) {
              // Stop exists, would need update endpoint - for now, delete and recreate
              try {
                await routeSegmentStopsApi.delete(routeId, segment.id, stop.id)
              } catch (err) {
                console.error('Error deleting stop for update:', err)
              }
            }
            // Add the stop (new or recreated)
            try {
              await routeSegmentStopsApi.add(routeId, segment.id, {
                locationId: stop.locationId,
                stopOrder: stop.stopOrder,
                notes: stop.notes || null
              })
            } catch (err) {
              console.error('Error adding stop:', err)
            }
          }
        }
      }
    } catch (err) {
      // Error handled by parent
    } finally {
      setSaving(false)
    }
  }

  const handleAddStop = () => {
    const maxOrder = stops.length > 0 ? Math.max(...stops.map(s => s.stopOrder)) : 0
    setStops([...stops, {
      locationId: '',
      stopOrder: maxOrder + 1,
      notes: ''
    }])
  }

  const handleRemoveStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index).map((stop, i) => ({
      ...stop,
      stopOrder: i + 1
    })))
  }

  const handleStopChange = (index: number, field: keyof StopFormData, value: any) => {
    const newStops = [...stops]
    newStops[index] = { ...newStops[index], [field]: value }
    setStops(newStops)
  }

  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === stops.length - 1) return
    
    const newStops = [...stops]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const temp = newStops[index]
    newStops[index] = { ...newStops[targetIndex], stopOrder: index + 1 }
    newStops[targetIndex] = { ...temp, stopOrder: targetIndex + 1 }
    setStops(newStops)
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
          maxWidth: '800px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            {segment ? 'Edit Segment' : 'Add Segment'}
          </h2>
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

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.25rem' }}>Day Number</label>
              <input
                type="number"
                value={formData.dayNumber}
                onChange={(e) => setFormData({ ...formData, dayNumber: parseInt(e.target.value) || 1 })}
                min="1"
                required
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
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
          </div>

          {/* Stops Section */}
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Intermediate Stops</label>
              <button
                type="button"
                onClick={handleAddStop}
                style={{
                  padding: '0.375rem 0.75rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}
              >
                + Add Stop
              </button>
            </div>
            {loadingStops ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>Loading stops...</div>
            ) : stops.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                No stops added. Click "Add Stop" to add intermediate locations.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stops.map((stop, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
                    <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <select
                          value={stop.locationId}
                          onChange={(e) => handleStopChange(index, 'locationId', e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                        >
                          <option value="">Select stop location...</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ width: '200px' }}>
                        <input
                          type="text"
                          value={stop.notes}
                          onChange={(e) => handleStopChange(index, 'notes', e.target.value)}
                          placeholder="Notes (optional)"
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => handleMoveStop(index, 'up')}
                        disabled={index === 0}
                        style={{
                          padding: '0.375rem',
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
                        type="button"
                        onClick={() => handleMoveStop(index, 'down')}
                        disabled={index === stops.length - 1}
                        style={{
                          padding: '0.375rem',
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
                        type="button"
                        onClick={() => handleRemoveStop(index)}
                        style={{
                          padding: '0.375rem 0.5rem',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
