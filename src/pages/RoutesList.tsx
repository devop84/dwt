import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { routesApi } from '../lib/api'
import type { Route } from '../types'

type SortColumn = 'name' | 'startDate' | 'endDate' | 'duration' | 'status' | 'estimatedCost'
type SortDirection = 'asc' | 'desc' | null

export function RoutesList() {
  const navigate = useNavigate()
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  useEffect(() => {
    loadRoutes()
  }, [statusFilter])

  const loadRoutes = async () => {
    try {
      setLoading(true)
      setError(null)
      const params: any = {}
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      const data = await routesApi.getAll(params)
      setRoutes(Array.isArray(data) ? data : [])
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load routes'
      setError(errorMessage)
      setRoutes([])
      console.error('Error loading routes:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBD'
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
  }

  const getStatusColor = (status: Route['status']) => {
    switch (status) {
      case 'draft': return '#6b7280'
      case 'confirmed': return '#3b82f6'
      case 'in-progress': return '#10b981'
      case 'completed': return '#059669'
      case 'cancelled': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const filteredRoutes = useMemo(() => {
    let result = [...routes]

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim()
      result = result.filter((route) =>
        route.name.toLowerCase().includes(search) ||
        (route.description && route.description.toLowerCase().includes(search))
      )
    }

    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let aValue: any = null
        let bValue: any = null

        switch (sortColumn) {
          case 'name':
            aValue = a.name.toLowerCase()
            bValue = b.name.toLowerCase()
            break
          case 'startDate':
            aValue = a.startDate ? new Date(a.startDate).getTime() : 0
            bValue = b.startDate ? new Date(b.startDate).getTime() : 0
            break
          case 'endDate':
            aValue = a.endDate ? new Date(a.endDate).getTime() : 0
            bValue = b.endDate ? new Date(b.endDate).getTime() : 0
            break
          case 'duration':
            aValue = a.duration || 0
            bValue = b.duration || 0
            break
          case 'status':
            aValue = a.status
            bValue = b.status
            break
          case 'estimatedCost':
            aValue = a.estimatedCost || 0
            bValue = b.estimatedCost || 0
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
  }, [routes, searchTerm, sortColumn, sortDirection])

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

  const handleRowClick = (routeId: string) => {
    navigate(`/routes/${routeId}`)
  }

  const handleCreateRoute = () => {
    navigate('/routes/new')
  }

  const handleDuplicate = async (e: React.MouseEvent, routeId: string) => {
    e.stopPropagation()
    try {
      const newRoute = await routesApi.duplicate(routeId)
      navigate(`/routes/${newRoute.id}`)
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to duplicate route')
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>Routes</h1>
        </div>
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', margin: 0 }}>Loading routes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>Routes</h1>
        </div>
        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            <p style={{ margin: 0 }}>Error: {error}</p>
          </div>
          <button
            onClick={loadRoutes}
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
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#111827', margin: 0 }}>Routes</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {searchTerm ? filteredRoutes.length : routes.length} {filteredRoutes.length === 1 ? 'route' : 'routes'}
          </div>
          <button
            onClick={handleCreateRoute}
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
            <span>+</span> Create Route
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Search routes..."
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
        <div style={{ minWidth: '180px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              fontSize: '0.875rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              backgroundColor: 'white',
              color: '#111827',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {filteredRoutes.length === 0 ? (
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>
            {searchTerm ? `No routes found matching "${searchTerm}".` : 'No routes found. Routes will appear here once added.'}
          </p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th onClick={() => handleSort('name')} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: sortColumn === 'name' ? '#3b82f6' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' }}>
                    Name{getSortIndicator('name')}
                  </th>
                  <th onClick={() => handleSort('startDate')} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: sortColumn === 'startDate' ? '#3b82f6' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' }}>
                    Start Date{getSortIndicator('startDate')}
                  </th>
                  <th onClick={() => handleSort('endDate')} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: sortColumn === 'endDate' ? '#3b82f6' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' }}>
                    End Date{getSortIndicator('endDate')}
                  </th>
                  <th onClick={() => handleSort('duration')} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: sortColumn === 'duration' ? '#3b82f6' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' }}>
                    Duration{getSortIndicator('duration')}
                  </th>
                  <th onClick={() => handleSort('status')} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: sortColumn === 'status' ? '#3b82f6' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' }}>
                    Status{getSortIndicator('status')}
                  </th>
                  <th onClick={() => handleSort('estimatedCost')} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: sortColumn === 'estimatedCost' ? '#3b82f6' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' }}>
                    Estimated Cost{getSortIndicator('estimatedCost')}
                  </th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map((route, index) => (
                  <tr
                    key={route.id}
                    onClick={() => handleRowClick(route.id)}
                    style={{
                      borderBottom: index < filteredRoutes.length - 1 ? '1px solid #e5e7eb' : 'none',
                      transition: 'background-color 0.15s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827', fontWeight: '500' }}>
                      {route.name}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatDate(route.startDate)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatDate(route.endDate)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {route.duration ? `${route.duration} days` : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: getStatusColor(route.status) + '20',
                        color: getStatusColor(route.status)
                      }}>
                        {route.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      {formatCurrency(route.estimatedCost)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleDuplicate(e, route.id)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.75rem',
                          color: '#3b82f6',
                          backgroundColor: 'transparent',
                          border: '1px solid #3b82f6',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#3b82f6'
                          e.currentTarget.style.color = 'white'
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                          e.currentTarget.style.color = '#3b82f6'
                        }}
                      >
                        Duplicate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
