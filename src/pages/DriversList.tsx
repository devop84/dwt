import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { driversApi, locationsApi } from '../lib/api'
import type { Driver, Location } from '../types'
import { DriverForm } from '../components/DriverForm'

type FilterColumn = 'all' | 'name' | 'locationName' | 'languages' | 'contactNumber' | 'email' | 'vehicle'
type SortColumn = 'name' | 'locationName' | 'languages' | 'contactNumber' | 'email' | 'vehicle'
type SortDirection = 'asc' | 'desc' | null

interface DriverWithLocation extends Driver {
  locationName?: string
}

export function DriversList() {
  const navigate = useNavigate()
  const [drivers, setDrivers] = useState<DriverWithLocation[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterColumn, setFilterColumn] = useState<FilterColumn>('all')
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingDriver, setEditingDriver] = useState<DriverWithLocation | null>(null)

  useEffect(() => {
    loadDrivers()
    loadLocations()
  }, [])

  const loadDrivers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await driversApi.getAll() as DriverWithLocation[]
      setDrivers(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load drivers')
      setDrivers([]) // Ensure drivers is always an array
      console.error('Error loading drivers:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadLocations = async () => {
    try {
      const data = await locationsApi.getAll()
      setLocations(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setLocations([]) // Ensure locations is always an array
      console.error('Error loading locations:', err)
    }
  }

  // Filter and sort drivers
  const filteredDrivers = useMemo(() => {
    let result = [...drivers]

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim()

      result = result.filter((driver) => {
        if (filterColumn === 'all') {
          return (
            driver.name.toLowerCase().includes(search) ||
            (driver.locationName && driver.locationName.toLowerCase().includes(search)) ||
            (driver.languages && driver.languages.toLowerCase().includes(search)) ||
            (driver.contactNumber && driver.contactNumber.toLowerCase().includes(search)) ||
            (driver.email && driver.email.toLowerCase().includes(search)) ||
            (driver.vehicle && driver.vehicle.toLowerCase().includes(search))
          )
        } else {
          switch (filterColumn) {
            case 'name':
              return driver.name.toLowerCase().includes(search)
            case 'locationName':
              return driver.locationName?.toLowerCase().includes(search) ?? false
            case 'languages':
              return driver.languages?.toLowerCase().includes(search) ?? false
            case 'contactNumber':
              return driver.contactNumber?.toLowerCase().includes(search) ?? false
            case 'email':
              return driver.email?.toLowerCase().includes(search) ?? false
            case 'vehicle':
              return driver.vehicle?.toLowerCase().includes(search) ?? false
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
          case 'locationName':
            aValue = a.locationName?.toLowerCase() || ''
            bValue = b.locationName?.toLowerCase() || ''
            break
          case 'languages':
            aValue = a.languages?.toLowerCase() || ''
            bValue = b.languages?.toLowerCase() || ''
            break
          case 'contactNumber':
            aValue = a.contactNumber?.toLowerCase() || ''
            bValue = b.contactNumber?.toLowerCase() || ''
            break
          case 'email':
            aValue = a.email?.toLowerCase() || ''
            bValue = b.email?.toLowerCase() || ''
            break
          case 'vehicle':
            aValue = a.vehicle?.toLowerCase() || ''
            bValue = b.vehicle?.toLowerCase() || ''
            break
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [drivers, searchTerm, filterColumn, sortColumn, sortDirection])

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

  const handleRowClick = (driverId: string) => {
    navigate(`/drivers/${driverId}`)
  }

  const handleAdd = () => {
    setEditingDriver(null)
    setShowForm(true)
  }

  const handleSave = async () => {
    await loadDrivers()
    setShowForm(false)
    setEditingDriver(null)
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
            Drivers
          </h1>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#6b7280', margin: 0 }}>Loading drivers...</p>
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
            Drivers
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
            onClick={loadDrivers}
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
          Drivers
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
            {searchTerm ? filteredDrivers.length : drivers.length} {filteredDrivers.length === 1 ? 'driver' : 'drivers'}
            {searchTerm && filteredDrivers.length !== drivers.length && (
              <span style={{ color: '#9ca3af' }}> of {drivers.length}</span>
            )}
          </div>
          <button
            onClick={handleAdd}
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
            <span>+</span> Add Driver
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
          placeholder="Search drivers..."
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
          <option value="contactNumber">Contact Number</option>
          <option value="email">Email</option>
          <option value="locationName">Location</option>
          <option value="languages">Languages</option>
          <option value="vehicle">Vehicle</option>
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
      {filteredDrivers.length === 0 && searchTerm ? (
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
            No drivers match your search criteria.
          </p>
        </div>
      ) : filteredDrivers.length === 0 ? (
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
            No drivers found. Drivers will appear here once added.
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
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                      }
                    }}
                  >
                    Name{getSortIndicator('name')}
                  </th>
                  <th
                    onClick={() => handleSort('contactNumber')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: sortColumn === 'contactNumber' ? '#3b82f6' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'contactNumber') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortColumn !== 'contactNumber') {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                      }
                    }}
                  >
                    Contact{getSortIndicator('contactNumber')}
                  </th>
                  <th
                    onClick={() => handleSort('email')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: sortColumn === 'email' ? '#3b82f6' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'email') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortColumn !== 'email') {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                      }
                    }}
                  >
                    Email{getSortIndicator('email')}
                  </th>
                  <th
                    onClick={() => handleSort('locationName')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: sortColumn === 'locationName' ? '#3b82f6' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'locationName') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortColumn !== 'locationName') {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                      }
                    }}
                  >
                    Location{getSortIndicator('locationName')}
                  </th>
                  <th
                    onClick={() => handleSort('languages')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: sortColumn === 'languages' ? '#3b82f6' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'languages') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortColumn !== 'languages') {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                      }
                    }}
                  >
                    Languages{getSortIndicator('languages')}
                  </th>
                  <th
                    onClick={() => handleSort('vehicle')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: sortColumn === 'vehicle' ? '#3b82f6' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'vehicle') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortColumn !== 'vehicle') {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                      }
                    }}
                  >
                    Vehicle{getSortIndicator('vehicle')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => (
                  <tr
                    key={driver.id}
                    onClick={() => handleRowClick(driver.id)}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white'
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>
                      {driver.name}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>
                      {driver.contactNumber || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>
                      {driver.email || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>
                      {driver.locationName || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>
                      {driver.languages || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>
                      {driver.vehicle || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <DriverForm
          driver={editingDriver}
          locations={locations}
          onClose={() => {
            setShowForm(false)
            setEditingDriver(null)
          }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
