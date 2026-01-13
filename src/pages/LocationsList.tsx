import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { locationsApi } from '../lib/api'
import type { Location } from '../types'
import { LocationForm } from '../components/LocationForm'

type FilterColumn = 'all' | 'name' | 'prefeitura' | 'state' | 'cep' | 'note'
type SortColumn = 'name' | 'prefeitura' | 'state' | 'cep' | 'note'
type SortDirection = 'asc' | 'desc' | null

export function LocationsList() {
  const navigate = useNavigate()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterColumn, setFilterColumn] = useState<FilterColumn>('all')
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)

  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await locationsApi.getAll()
      setLocations(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load locations')
      setLocations([]) // Ensure locations is always an array
      console.error('Error loading locations:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort locations
  const filteredLocations = useMemo(() => {
    let result = [...locations]

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim()

      result = result.filter((location) => {
        if (filterColumn === 'all') {
          return (
            location.name.toLowerCase().includes(search) ||
            (location.prefeitura && location.prefeitura.toLowerCase().includes(search)) ||
            (location.state && location.state.toLowerCase().includes(search)) ||
            (location.cep && location.cep.toLowerCase().includes(search)) ||
            (location.note && location.note.toLowerCase().includes(search))
          )
        } else {
          switch (filterColumn) {
            case 'name':
              return location.name.toLowerCase().includes(search)
            case 'prefeitura':
              return location.prefeitura?.toLowerCase().includes(search) ?? false
            case 'state':
              return location.state?.toLowerCase().includes(search) ?? false
            case 'cep':
              return location.cep?.toLowerCase().includes(search) ?? false
            case 'note':
              return location.note?.toLowerCase().includes(search) ?? false
            default:
              return true
          }
        }
      })
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let aValue: string = ''
        let bValue: string = ''

        switch (sortColumn) {
          case 'name':
            aValue = a.name.toLowerCase()
            bValue = b.name.toLowerCase()
            break
          case 'prefeitura':
            aValue = a.prefeitura?.toLowerCase() || ''
            bValue = b.prefeitura?.toLowerCase() || ''
            break
          case 'state':
            aValue = a.state?.toLowerCase() || ''
            bValue = b.state?.toLowerCase() || ''
            break
          case 'cep':
            aValue = a.cep?.toLowerCase() || ''
            bValue = b.cep?.toLowerCase() || ''
            break
          case 'note':
            aValue = a.note?.toLowerCase() || ''
            bValue = b.note?.toLowerCase() || ''
            break
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [locations, searchTerm, filterColumn, sortColumn, sortDirection])

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortColumn(null)
        setSortDirection(null)
      }
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) return null
    if (sortDirection === 'asc') return ' ↑'
    if (sortDirection === 'desc') return ' ↓'
    return null
  }

  const handleAddLocation = () => {
    setEditingLocation(null)
    setShowForm(true)
  }

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location)
    setShowForm(true)
  }

  const handleRowClick = (locationId: string) => {
    navigate(`/locations/${locationId}`)
  }

  const handleSaveLocation = async (locationData: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingLocation) {
      await locationsApi.update(editingLocation.id, locationData)
    } else {
      await locationsApi.create(locationData)
    }
    await loadLocations()
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingLocation(null)
  }

  if (loading) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#111827',
            margin: 0
          }}>
            Locations
          </h1>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#6b7280', margin: 0 }}>Loading locations...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#111827',
            margin: 0
          }}>
            Locations
          </h1>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem'
          }}>
            <p style={{ margin: 0 }}>Error: {error}</p>
          </div>
          <button
            onClick={loadLocations}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: '#111827',
          margin: 0
        }}>
          Locations
        </h1>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            {searchTerm ? filteredLocations.length : locations.length} {filteredLocations.length === 1 ? 'location' : 'locations'}
            {searchTerm && filteredLocations.length !== locations.length && (
              <span style={{ color: '#9ca3af' }}> of {locations.length}</span>
            )}
          </div>
          <button
            onClick={handleAddLocation}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            <span>+</span> Add Location
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="Search locations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: '1 1 200px',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
        <select
          value={filterColumn}
          onChange={(e) => setFilterColumn(e.target.value as FilterColumn)}
          style={{
            flex: '0 0 auto',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            backgroundColor: 'white'
          }}
        >
          <option value="all">All Columns</option>
          <option value="name">Name</option>
          <option value="prefeitura">Prefeitura</option>
          <option value="state">State</option>
          <option value="cep">CEP</option>
          <option value="note">Note</option>
        </select>
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('')
              setFilterColumn('all')
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
          >
            Clear
          </button>
        )}
      </div>

      {/* Content Card */}
      {filteredLocations.length === 0 && searchTerm ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{
            color: '#6b7280',
            fontSize: '1rem',
            margin: 0
          }}>
            No locations match your search criteria.
          </p>
        </div>
      ) : filteredLocations.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{
            color: '#6b7280',
            fontSize: '1rem',
            margin: 0
          }}>
            No locations found. Locations will appear here once added.
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            overflowX: 'auto'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#f9fafb',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <th
                    onClick={() => handleSort('name')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: sortColumn === 'name' ? '#3b82f6' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'name') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortColumn !== 'name') {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    Name{getSortIndicator('name')}
                  </th>
                  <th
                    onClick={() => handleSort('prefeitura')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: sortColumn === 'prefeitura' ? '#3b82f6' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'prefeitura') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortColumn !== 'prefeitura') {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    Prefeitura{getSortIndicator('prefeitura')}
                  </th>
                  <th
                    onClick={() => handleSort('state')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: sortColumn === 'state' ? '#3b82f6' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'state') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortColumn !== 'state') {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    State{getSortIndicator('state')}
                  </th>
                  <th
                    onClick={() => handleSort('cep')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: sortColumn === 'cep' ? '#3b82f6' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'cep') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortColumn !== 'cep') {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    CEP{getSortIndicator('cep')}
                  </th>
                  <th
                    onClick={() => handleSort('note')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: sortColumn === 'note' ? '#3b82f6' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'note') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortColumn !== 'note') {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    Note{getSortIndicator('note')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map((location, index) => (
                  <tr
                    key={location.id}
                    onClick={() => handleRowClick(location.id)}
                    style={{
                      borderBottom: index < filteredLocations.length - 1 ? '1px solid #e5e7eb' : 'none',
                      transition: 'background-color 0.15s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#111827',
                      fontWeight: '500'
                    }}>
                      {location.name}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {location.prefeitura || '-'}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {location.state || '-'}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {location.cep || '-'}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {location.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showForm && (
        <LocationForm
          location={editingLocation}
          onClose={handleCloseForm}
          onSave={handleSaveLocation}
        />
      )}
    </div>
  )
}
