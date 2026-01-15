import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { thirdPartiesApi, locationsApi } from '../lib/api'
import type { ThirdParty, Location } from '../types'
import { ThirdPartyForm } from '../components/ThirdPartyForm'

type FilterColumn = 'all' | 'name' | 'locationName' | 'contactNumber' | 'email' | 'note'
type SortColumn = 'name' | 'locationName' | 'contactNumber' | 'email' | 'note'
type SortDirection = 'asc' | 'desc' | null

export function ThirdPartiesList() {
  const navigate = useNavigate()
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterColumn, setFilterColumn] = useState<FilterColumn>('all')
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingThirdParty, setEditingThirdParty] = useState<ThirdParty | null>(null)

  useEffect(() => {
    loadThirdParties()
    loadLocations()
  }, [])

  const loadThirdParties = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await thirdPartiesApi.getAll()
      setThirdParties(Array.isArray(data) ? data : [])
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load third parties'
      setError(errorMessage)
      setThirdParties([])
      console.error('Error loading third parties:', {
        message: errorMessage,
        status: err.response?.status,
        data: err.response?.data,
        error: err
      })
    } finally {
      setLoading(false)
    }
  }

  const loadLocations = async () => {
    try {
      const data = await locationsApi.getAll()
      setLocations(Array.isArray(data) ? data : [])
    } catch {
      setLocations([])
    }
  }

  // Filter and sort third parties
  const filteredThirdParties = useMemo(() => {
    let result = [...thirdParties]

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim()

      result = result.filter((thirdParty) => {
        if (filterColumn === 'all') {
          return (
            thirdParty.name.toLowerCase().includes(search) ||
            (thirdParty.locationName && thirdParty.locationName.toLowerCase().includes(search)) ||
            (thirdParty.contactNumber && thirdParty.contactNumber.toLowerCase().includes(search)) ||
            (thirdParty.email && thirdParty.email.toLowerCase().includes(search)) ||
            (thirdParty.note && thirdParty.note.toLowerCase().includes(search))
          )
        } else {
          switch (filterColumn) {
            case 'name':
              return thirdParty.name.toLowerCase().includes(search)
            case 'contactNumber':
              return thirdParty.contactNumber?.toLowerCase().includes(search) ?? false
            case 'locationName':
              return thirdParty.locationName?.toLowerCase().includes(search) ?? false
            case 'email':
              return thirdParty.email?.toLowerCase().includes(search) ?? false
            case 'note':
              return thirdParty.note?.toLowerCase().includes(search) ?? false
            default:
              return true
          }
        }
      })
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let aValue: string | null = null
        let bValue: string | null = null

        switch (sortColumn) {
          case 'name':
            aValue = a.name.toLowerCase()
            bValue = b.name.toLowerCase()
            break
          case 'contactNumber':
            aValue = a.contactNumber?.toLowerCase() || ''
            bValue = b.contactNumber?.toLowerCase() || ''
            break
          case 'locationName':
            aValue = a.locationName?.toLowerCase() || ''
            bValue = b.locationName?.toLowerCase() || ''
            break
          case 'email':
            aValue = a.email?.toLowerCase() || ''
            bValue = b.email?.toLowerCase() || ''
            break
          case 'note':
            aValue = a.note?.toLowerCase() || ''
            bValue = b.note?.toLowerCase() || ''
            break
        }

        if (aValue === null || aValue === '') return 1
        if (bValue === null || bValue === '') return -1

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [thirdParties, searchTerm, filterColumn, sortColumn, sortDirection])

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

  const handleAddThirdParty = () => {
    setEditingThirdParty(null)
    setShowForm(true)
  }

  const handleEditThirdParty = (thirdParty: ThirdParty) => {
    setEditingThirdParty(thirdParty)
    setShowForm(true)
  }

  const handleRowClick = (thirdPartyId: string) => {
    navigate(`/third-parties/${thirdPartyId}`)
  }

  const handleSaveThirdParty = async (thirdPartyData: Omit<ThirdParty, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingThirdParty) {
      await thirdPartiesApi.update(editingThirdParty.id, thirdPartyData)
    } else {
      await thirdPartiesApi.create(thirdPartyData)
    }
    await loadThirdParties()
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingThirdParty(null)
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
            Third Parties
          </h1>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#6b7280', margin: 0 }}>Loading third parties...</p>
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
            Third Parties
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
            onClick={loadThirdParties}
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
          Third Parties
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
            {searchTerm ? filteredThirdParties.length : thirdParties.length} {filteredThirdParties.length === 1 ? 'third party' : 'third parties'}
            {searchTerm && filteredThirdParties.length !== thirdParties.length && (
              <span style={{ color: '#9ca3af' }}> of {thirdParties.length}</span>
            )}
          </div>
          <button
            onClick={handleAddThirdParty}
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
            <span>+</span> Add Third Party
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
        <div style={{
          flex: '1',
          minWidth: '200px'
        }}>
          <input
            type="text"
            placeholder="Search third parties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              fontSize: '0.875rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>
        <div style={{
          minWidth: '180px'
        }}>
          <select
            value={filterColumn}
            onChange={(e) => setFilterColumn(e.target.value as FilterColumn)}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              fontSize: '0.875rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              backgroundColor: 'white',
              color: '#111827',
              outline: 'none',
              cursor: 'pointer',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <option value="all">All Columns</option>
            <option value="name">Name</option>
            <option value="locationName">Location</option>
            <option value="contactNumber">Contact Number</option>
            <option value="email">Email</option>
            <option value="note">Note</option>
          </select>
        </div>
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('')
              setFilterColumn('all')
            }}
            style={{
              padding: '0.625rem 1rem',
              fontSize: '0.875rem',
              color: '#6b7280',
              backgroundColor: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb'
              e.currentTarget.style.borderColor = '#9ca3af'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = '#d1d5db'
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Content Card */}
      {filteredThirdParties.length === 0 ? (
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
            {searchTerm 
              ? `No third parties found matching "${searchTerm}" in ${filterColumn === 'all' ? 'any column' : filterColumn}.`
              : 'No third parties found. Third parties will appear here once added.'}
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
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    Contact Number{getSortIndicator('contactNumber')}
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
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    Email{getSortIndicator('email')}
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
                {filteredThirdParties.map((thirdParty, index) => (
                  <tr
                    key={thirdParty.id}
                    onClick={() => handleRowClick(thirdParty.id)}
                    style={{
                      borderBottom: index < filteredThirdParties.length - 1 ? '1px solid #e5e7eb' : 'none',
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
                      {thirdParty.name}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {thirdParty.locationName || '-'}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {thirdParty.contactNumber || '-'}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {thirdParty.email || '-'}
                    </td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {thirdParty.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showForm && (
        <ThirdPartyForm
          thirdParty={editingThirdParty}
          locations={locations}
          onClose={handleCloseForm}
          onSave={handleSaveThirdParty}
        />
      )}
    </div>
  )
}
