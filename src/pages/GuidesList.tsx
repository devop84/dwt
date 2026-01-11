import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { guidesApi, destinationsApi } from '../lib/api'
import type { Guide, Destination } from '../types'
import { GuideForm } from '../components/GuideForm'

type FilterColumn = 'all' | 'name' | 'destinationName' | 'languages' | 'contactNumber' | 'email'
type SortColumn = 'name' | 'destinationName' | 'languages' | 'contactNumber' | 'email'
type SortDirection = 'asc' | 'desc' | null

interface GuideWithDestination extends Guide {
  destinationName?: string
}

export function GuidesList() {
  const navigate = useNavigate()
  const [guides, setGuides] = useState<GuideWithDestination[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterColumn, setFilterColumn] = useState<FilterColumn>('all')
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingGuide, setEditingGuide] = useState<GuideWithDestination | null>(null)

  useEffect(() => {
    loadGuides()
    loadDestinations()
  }, [])

  const loadGuides = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await guidesApi.getAll() as GuideWithDestination[]
      setGuides(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load guides')
      console.error('Error loading guides:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadDestinations = async () => {
    try {
      const data = await destinationsApi.getAll()
      setDestinations(data)
    } catch (err: any) {
      console.error('Error loading destinations:', err)
    }
  }

  // Filter and sort guides
  const filteredGuides = useMemo(() => {
    let result = [...guides]

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim()

      result = result.filter((guide) => {
        if (filterColumn === 'all') {
          return (
            guide.name.toLowerCase().includes(search) ||
            (guide.destinationName && guide.destinationName.toLowerCase().includes(search)) ||
            (guide.languages && guide.languages.toLowerCase().includes(search)) ||
            (guide.contactNumber && guide.contactNumber.toLowerCase().includes(search)) ||
            (guide.email && guide.email.toLowerCase().includes(search))
          )
        } else {
          switch (filterColumn) {
            case 'name':
              return guide.name.toLowerCase().includes(search)
            case 'destinationName':
              return guide.destinationName?.toLowerCase().includes(search) ?? false
            case 'languages':
              return guide.languages?.toLowerCase().includes(search) ?? false
            case 'contactNumber':
              return guide.contactNumber?.toLowerCase().includes(search) ?? false
            case 'email':
              return guide.email?.toLowerCase().includes(search) ?? false
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
          case 'destinationName':
            aValue = a.destinationName?.toLowerCase() || ''
            bValue = b.destinationName?.toLowerCase() || ''
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
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [guides, searchTerm, filterColumn, sortColumn, sortDirection])

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

  const handleRowClick = (guideId: string) => {
    navigate(`/guides/${guideId}`)
  }

  const handleEdit = (e: React.MouseEvent, guide: GuideWithDestination) => {
    e.stopPropagation()
    setEditingGuide(guide)
    setShowForm(true)
  }

  const handleAdd = () => {
    setEditingGuide(null)
    setShowForm(true)
  }

  const handleSave = async () => {
    await loadGuides()
    setShowForm(false)
    setEditingGuide(null)
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <p style={{ color: '#6b7280' }}>Loading guides...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
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
          onClick={loadGuides}
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
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
          Guides
        </h1>
        <button
          onClick={handleAdd}
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          Add Guide
        </button>
      </div>

      {/* Search and Filter */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="Search guides..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '0.625rem 0.875rem',
            fontSize: '0.875rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            outline: 'none'
          }}
        />
        <select
          value={filterColumn}
          onChange={(e) => setFilterColumn(e.target.value as FilterColumn)}
          style={{
            padding: '0.625rem 0.875rem',
            fontSize: '0.875rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            outline: 'none',
            backgroundColor: 'white'
          }}
        >
          <option value="all">All Columns</option>
          <option value="name">Name</option>
          <option value="destinationName">Destination</option>
          <option value="languages">Languages</option>
          <option value="contactNumber">Contact Number</option>
          <option value="email">Email</option>
        </select>
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th
                  onClick={() => handleSort('name')}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  Name{getSortIndicator('name')}
                </th>
                <th
                  onClick={() => handleSort('destinationName')}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  Destination{getSortIndicator('destinationName')}
                </th>
                <th
                  onClick={() => handleSort('languages')}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  Languages{getSortIndicator('languages')}
                </th>
                <th
                  onClick={() => handleSort('contactNumber')}
                  style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    userSelect: 'none'
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
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  Email{getSortIndicator('email')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredGuides.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{
                    padding: '3rem',
                    textAlign: 'center',
                    color: '#6b7280'
                  }}>
                    {searchTerm ? 'No guides found matching your search.' : 'No guides found.'}
                  </td>
                </tr>
              ) : (
                filteredGuides.map((guide) => (
                  <tr
                    key={guide.id}
                    onClick={() => handleRowClick(guide.id)}
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
                      {guide.name}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>
                      {guide.destinationName || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>
                      {guide.languages || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>
                      {guide.contactNumber || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>
                      {guide.email || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <GuideForm
          guide={editingGuide}
          destinations={destinations}
          onClose={() => {
            setShowForm(false)
            setEditingGuide(null)
          }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
