import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { hotelsApi, locationsApi } from '../lib/api'
import type { Hotel, Location } from '../types'
import { HotelForm } from '../components/HotelForm'

type FilterColumn = 'all' | 'name' | 'locationName' | 'rating' | 'priceRange' | 'description'
type SortColumn = 'name' | 'locationName' | 'rating' | 'priceRange' | 'description'
type SortDirection = 'asc' | 'desc' | null

interface HotelWithLocation extends Hotel {
  locationName?: string
}

export function HotelsList() {
  const navigate = useNavigate()
  const [hotels, setHotels] = useState<HotelWithLocation[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterColumn, setFilterColumn] = useState<FilterColumn>('all')
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingHotel, setEditingHotel] = useState<HotelWithLocation | null>(null)

  useEffect(() => {
    loadHotels()
    loadLocations()
  }, [])

  const loadHotels = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await hotelsApi.getAll() as HotelWithLocation[]
      setHotels(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load hotels')
      setHotels([]) // Ensure hotels is always an array
      console.error('Error loading hotels:', err)
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

  // Filter and sort hotels
  const filteredHotels = useMemo(() => {
    let result = [...hotels]

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim()

      result = result.filter((hotel) => {
        if (filterColumn === 'all') {
          return (
            hotel.name.toLowerCase().includes(search) ||
            (hotel.locationName && hotel.locationName.toLowerCase().includes(search)) ||
            (hotel.priceRange && hotel.priceRange.toLowerCase().includes(search)) ||
            (hotel.description && hotel.description.toLowerCase().includes(search))
          )
        } else {
          switch (filterColumn) {
            case 'name':
              return hotel.name.toLowerCase().includes(search)
            case 'locationName':
              return hotel.locationName?.toLowerCase().includes(search) ?? false
            case 'rating':
              return hotel.rating?.toString().includes(search) ?? false
            case 'priceRange':
              return hotel.priceRange?.toLowerCase().includes(search) ?? false
            case 'description':
              return hotel.description?.toLowerCase().includes(search) ?? false
            default:
              return true
          }
        }
      })
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let aValue: string | number = ''
        let bValue: string | number = ''

        switch (sortColumn) {
          case 'name':
            aValue = a.name.toLowerCase()
            bValue = b.name.toLowerCase()
            break
          case 'locationName':
            aValue = a.locationName?.toLowerCase() || ''
            bValue = b.locationName?.toLowerCase() || ''
            break
          case 'rating':
            aValue = a.rating || 0
            bValue = b.rating || 0
            break
          case 'priceRange':
            aValue = a.priceRange?.toLowerCase() || ''
            bValue = b.priceRange?.toLowerCase() || ''
            break
          case 'description':
            aValue = a.description?.toLowerCase() || ''
            bValue = b.description?.toLowerCase() || ''
            break
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        }
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [hotels, searchTerm, filterColumn, sortColumn, sortDirection])

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

  const handleAddHotel = () => {
    setEditingHotel(null)
    setShowForm(true)
  }

  const handleRowClick = (hotelId: string) => {
    navigate(`/hotels/${hotelId}`)
  }

  const handleSaveHotel = async (hotelData: Omit<Hotel, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingHotel) {
      await hotelsApi.update(editingHotel.id, hotelData)
    } else {
      await hotelsApi.create(hotelData)
    }
    await loadHotels()
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingHotel(null)
  }

  const renderStars = (rating: number | null) => {
    if (!rating) return '-'
    return '★'.repeat(rating) + '☆'.repeat(5 - rating)
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
            Hotels
          </h1>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#6b7280', margin: 0 }}>Loading hotels...</p>
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
            Hotels
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
            onClick={loadHotels}
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
          Hotels
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
            {searchTerm ? filteredHotels.length : hotels.length} {filteredHotels.length === 1 ? 'hotel' : 'hotels'}
            {searchTerm && filteredHotels.length !== hotels.length && (
              <span style={{ color: '#9ca3af' }}> of {hotels.length}</span>
            )}
          </div>
          <button
            onClick={handleAddHotel}
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
            <span>+</span> Add Hotel
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
          placeholder="Search hotels..."
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
          <option value="locationName">Location</option>
          <option value="rating">Rating</option>
          <option value="priceRange">Price Range</option>
          <option value="description">Description</option>
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
      {filteredHotels.length === 0 && searchTerm ? (
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
            No hotels match your search criteria.
          </p>
        </div>
      ) : filteredHotels.length === 0 ? (
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
            No hotels found. Hotels will appear here once added.
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
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    Location{getSortIndicator('locationName')}
                  </th>
                  <th
                    onClick={() => handleSort('rating')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: sortColumn === 'rating' ? '#3b82f6' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'rating') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortColumn !== 'rating') {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    Rating{getSortIndicator('rating')}
                  </th>
                  <th
                    onClick={() => handleSort('priceRange')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: sortColumn === 'priceRange' ? '#3b82f6' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'priceRange') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortColumn !== 'priceRange') {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    Price Range{getSortIndicator('priceRange')}
                  </th>
                  <th
                    onClick={() => handleSort('description')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: sortColumn === 'description' ? '#3b82f6' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'description') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortColumn !== 'description') {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    Description{getSortIndicator('description')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredHotels.map((hotel, index) => (
                  <tr
                    key={hotel.id}
                    onClick={() => handleRowClick(hotel.id)}
                    style={{
                      borderBottom: index < filteredHotels.length - 1 ? '1px solid #e5e7eb' : 'none',
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
                      {hotel.name}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {hotel.locationName || '-'}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {renderStars(hotel.rating)}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {hotel.priceRange || '-'}
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
                      {hotel.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showForm && (
        <HotelForm
          hotel={editingHotel}
          locations={locations}
          onClose={handleCloseForm}
          onSave={handleSaveHotel}
        />
      )}
    </div>
  )
}
