import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { vehiclesApi, locationsApi, thirdPartiesApi } from '../lib/api'
import type { Vehicle, Location, ThirdParty } from '../types'
import { VehicleForm } from '../components/VehicleForm'

interface VehicleWithRelations extends Vehicle {
  locationName?: string
  thirdPartyName?: string
}

export function VehicleDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState<VehicleWithRelations | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      loadVehicle()
      loadLocations()
      loadThirdParties()
    }
  }, [id])

  const loadVehicle = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await vehiclesApi.getById(id!) as VehicleWithRelations
      setVehicle(data)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load vehicle')
      console.error('Error loading vehicle:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadLocations = async () => {
    try {
      const data = await locationsApi.getAll()
      setLocations(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setLocations([])
      console.error('Error loading locations:', err)
    }
  }

  const loadThirdParties = async () => {
    try {
      const data = await thirdPartiesApi.getAll()
      setThirdParties(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setThirdParties([])
      console.error('Error loading third parties:', err)
    }
  }

  const handleDelete = async () => {
    if (!vehicle) return
    
    if (!confirm('Are you sure you want to delete this vehicle? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      await vehiclesApi.delete(vehicle.id)
      navigate('/vehicles')
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete vehicle')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!vehicle) return
    await loadVehicle()
    setShowEditForm(false)
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      car4x4: 'Car 4x4',
      boat: 'Boat',
      quadbike: 'Quadbike',
      carSedan: 'Car Sedan',
      outro: 'Other'
    }
    return labels[type] || type
  }

  const getOwnerLabel = (owner: string) => {
    return owner === 'company' ? 'Company Vehicle' : 'Third Party Vehicle'
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>Vehicle Details</h1>
        </div>
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', margin: 0 }}>Loading vehicle details...</p>
        </div>
      </div>
    )
  }

  if (error || !vehicle) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>Vehicle Details</h1>
        </div>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            <p style={{ margin: 0 }}>Error: {error || 'Vehicle not found'}</p>
          </div>
          <button onClick={() => navigate('/vehicles')} style={{ padding: '0.625rem 1.25rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}>Back to Vehicles</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>Vehicle Details</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => navigate('/vehicles')} style={{ padding: '0.625rem 1.25rem', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}>Back</button>
          <button onClick={() => setShowEditForm(true)} style={{ padding: '0.625rem 1.25rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}>Edit</button>
          <button onClick={handleDelete} disabled={deleting} style={{ padding: '0.625rem 1.25rem', backgroundColor: deleting ? '#9ca3af' : '#ef4444', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'background-color 0.2s' }} onMouseEnter={(e) => { if (!deleting) e.currentTarget.style.backgroundColor = '#dc2626' }} onMouseLeave={(e) => { if (!deleting) e.currentTarget.style.backgroundColor = '#ef4444' }}>{deleting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '2rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0 0 1.5rem 0' }}>
            {getTypeLabel(vehicle.type)}
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Type</label>
              <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>{getTypeLabel(vehicle.type)}</p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Owner</label>
              <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>{getOwnerLabel(vehicle.vehicleOwner)}</p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Location</label>
              <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>{vehicle.locationName || '-'}</p>
            </div>

            {vehicle.vehicleOwner === 'third-party' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Third Party</label>
                <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0 }}>{vehicle.thirdPartyName || '-'}</p>
              </div>
            )}
          </div>
        </div>

        {vehicle.note && (
          <div style={{ padding: '2rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Note</label>
            <p style={{ fontSize: '0.875rem', color: '#111827', margin: 0, whiteSpace: 'pre-wrap' }}>{vehicle.note}</p>
          </div>
        )}

        <div style={{ padding: '1.5rem 2rem', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#6b7280' }}>
          <div><span style={{ fontWeight: '600' }}>Created:</span> {formatDateTime(vehicle.createdAt)}</div>
          <div><span style={{ fontWeight: '600' }}>Last Updated:</span> {formatDateTime(vehicle.updatedAt)}</div>
        </div>
      </div>

      {showEditForm && (
        <VehicleForm
          vehicle={vehicle}
          locations={locations}
          thirdParties={thirdParties}
          onClose={() => setShowEditForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
