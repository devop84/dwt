import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { vehiclesApi, destinationsApi, thirdPartiesApi } from '../lib/api'
import type { Vehicle, Destination, ThirdParty } from '../types'
import { VehicleForm } from '../components/VehicleForm'

type FilterColumn = 'all' | 'type' | 'vehicleOwner' | 'destinationName' | 'thirdPartyName'
type SortColumn = 'type' | 'vehicleOwner' | 'destinationName' | 'thirdPartyName'

interface VehicleWithRelations extends Vehicle {
  destinationName?: string
  thirdPartyName?: string
}

export function VehiclesList() {
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<VehicleWithRelations[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterColumn, setFilterColumn] = useState<FilterColumn>('all')
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<VehicleWithRelations | null>(null)

  useEffect(() => {
    loadVehicles()
    loadDestinations()
    loadThirdParties()
  }, [])

  const loadVehicles = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await vehiclesApi.getAll() as VehicleWithRelations[]
      setVehicles(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load vehicles')
      setVehicles([])
      console.error('Error loading vehicles:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadDestinations = async () => {
    try {
      const data = await destinationsApi.getAll()
      setDestinations(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setDestinations([])
      console.error('Error loading destinations:', err)
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

  const filteredVehicles = useMemo(() => {
    let result = [...vehicles]

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim()

      result = result.filter((vehicle) => {
        if (filterColumn === 'all') {
          return (
            vehicle.type.toLowerCase().includes(search) ||
            vehicle.vehicleOwner.toLowerCase().includes(search) ||
            (vehicle.destinationName && vehicle.destinationName.toLowerCase().includes(search)) ||
            (vehicle.thirdPartyName && vehicle.thirdPartyName.toLowerCase().includes(search))
          )
        } else {
          switch (filterColumn) {
            case 'type':
              return vehicle.type.toLowerCase().includes(search)
            case 'vehicleOwner':
              return vehicle.vehicleOwner.toLowerCase().includes(search)
            case 'destinationName':
              return vehicle.destinationName?.toLowerCase().includes(search) ?? false
            case 'thirdPartyName':
              return vehicle.thirdPartyName?.toLowerCase().includes(search) ?? false
            default:
              return true
          }
        }
      })
    }

    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let aValue: string = ''
        let bValue: string = ''

        switch (sortColumn) {
          case 'type':
            aValue = a.type.toLowerCase()
            bValue = b.type.toLowerCase()
            break
          case 'vehicleOwner':
            aValue = a.vehicleOwner.toLowerCase()
            bValue = b.vehicleOwner.toLowerCase()
            break
          case 'destinationName':
            aValue = a.destinationName?.toLowerCase() || ''
            bValue = b.destinationName?.toLowerCase() || ''
            break
          case 'thirdPartyName':
            aValue = a.thirdPartyName?.toLowerCase() || ''
            bValue = b.thirdPartyName?.toLowerCase() || ''
            break
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [vehicles, searchTerm, filterColumn, sortColumn, sortDirection])

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortColumn(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) return ''
    if (sortDirection === 'asc') return ' ↑'
    if (sortDirection === 'desc') return ' ↓'
    return ''
  }

  const handleRowClick = (vehicleId: string) => {
    navigate(`/vehicles/${vehicleId}`)
  }

  const handleAdd = () => {
    setEditingVehicle(null)
    setShowForm(true)
  }

  const handleSave = async () => {
    await loadVehicles()
    setShowForm(false)
    setEditingVehicle(null)
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
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>Vehicles</h1>
        </div>
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', margin: 0 }}>Loading vehicles...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>Vehicles</h1>
        </div>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            <p style={{ margin: 0 }}>Error: {error}</p>
          </div>
          <button onClick={loadVehicles} style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>Vehicles</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {searchTerm ? filteredVehicles.length : vehicles.length} {filteredVehicles.length === 1 ? 'vehicle' : 'vehicles'}
            {searchTerm && filteredVehicles.length !== vehicles.length && <span style={{ color: '#9ca3af' }}> of {vehicles.length}</span>}
          </div>
          <button onClick={handleAdd} style={{ padding: '0.625rem 1.25rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}>
            <span>+</span> Add Vehicle
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search vehicles..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: '1 1 200px', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
        <select value={filterColumn} onChange={(e) => setFilterColumn(e.target.value as FilterColumn)} style={{ flex: '0 0 auto', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', backgroundColor: 'white' }}>
          <option value="all">All Columns</option>
          <option value="type">Type</option>
          <option value="vehicleOwner">Owner</option>
          <option value="destinationName">Destination</option>
          <option value="thirdPartyName">Third Party</option>
        </select>
        {searchTerm && <button onClick={() => { setSearchTerm(''); setFilterColumn('all') }} style={{ padding: '0.5rem 1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}>Clear</button>}
      </div>

      {filteredVehicles.length === 0 && searchTerm ? (
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>No vehicles match your search criteria.</p>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>No vehicles found. Vehicles will appear here once added.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th onClick={() => handleSort('type')} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: sortColumn === 'type' ? '#3b82f6' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none', transition: 'color 0.2s, background-color 0.2s' }} onMouseEnter={(e) => { if (sortColumn !== 'type') e.currentTarget.style.backgroundColor = '#f3f4f6' }} onMouseLeave={(e) => { if (sortColumn !== 'type') e.currentTarget.style.backgroundColor = '#f9fafb' }}>Type{getSortIndicator('type')}</th>
                  <th onClick={() => handleSort('vehicleOwner')} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: sortColumn === 'vehicleOwner' ? '#3b82f6' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none', transition: 'color 0.2s, background-color 0.2s' }} onMouseEnter={(e) => { if (sortColumn !== 'vehicleOwner') e.currentTarget.style.backgroundColor = '#f3f4f6' }} onMouseLeave={(e) => { if (sortColumn !== 'vehicleOwner') e.currentTarget.style.backgroundColor = '#f9fafb' }}>Owner{getSortIndicator('vehicleOwner')}</th>
                  <th onClick={() => handleSort('destinationName')} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: sortColumn === 'destinationName' ? '#3b82f6' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none', transition: 'color 0.2s, background-color 0.2s' }} onMouseEnter={(e) => { if (sortColumn !== 'destinationName') e.currentTarget.style.backgroundColor = '#f3f4f6' }} onMouseLeave={(e) => { if (sortColumn !== 'destinationName') e.currentTarget.style.backgroundColor = '#f9fafb' }}>Destination{getSortIndicator('destinationName')}</th>
                  <th onClick={() => handleSort('thirdPartyName')} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: sortColumn === 'thirdPartyName' ? '#3b82f6' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none', transition: 'color 0.2s, background-color 0.2s' }} onMouseEnter={(e) => { if (sortColumn !== 'thirdPartyName') e.currentTarget.style.backgroundColor = '#f3f4f6' }} onMouseLeave={(e) => { if (sortColumn !== 'thirdPartyName') e.currentTarget.style.backgroundColor = '#f9fafb' }}>Third Party{getSortIndicator('thirdPartyName')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} onClick={() => handleRowClick(vehicle.id)} style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer', transition: 'background-color 0.15s' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white' }}>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>{getTypeLabel(vehicle.type)}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>{getOwnerLabel(vehicle.vehicleOwner)}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>{vehicle.destinationName || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>{vehicle.thirdPartyName || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && <VehicleForm vehicle={editingVehicle} destinations={destinations} thirdParties={thirdParties} onClose={() => { setShowForm(false); setEditingVehicle(null) }} onSave={handleSave} />}
    </div>
  )
}
