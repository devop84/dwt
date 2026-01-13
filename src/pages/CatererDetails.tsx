import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { caterersApi, locationsApi } from '../lib/api'
import type { Caterer, Location } from '../types'
import { CatererForm } from '../components/CatererForm'
import { AccountsCards } from '../components/AccountsCards'

interface CatererWithLocation extends Caterer {
  locationName?: string
}

export function CatererDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [caterer, setCaterer] = useState<CatererWithLocation | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      loadCaterer()
      loadLocations()
    }
  }, [id])

  const loadCaterer = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await caterersApi.getById(id!) as CatererWithLocation
      setCaterer(data)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load caterer')
      console.error('Error loading caterer:', err)
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

  const handleDelete = async () => {
    if (!caterer) return
    
    if (!confirm('Are you sure you want to delete this caterer? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      await caterersApi.delete(caterer.id)
      navigate('/caterers')
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete caterer')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!caterer) return
    await loadCaterer()
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
    switch (type) {
      case 'restaurant':
        return 'Restaurant'
      case 'hotel':
        return 'Hotel'
      case 'particular':
        return 'Particular'
      default:
        return type
    }
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
            Caterer Details
          </h1>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#6b7280', margin: 0 }}>Loading caterer...</p>
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
            Caterer Details
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
            onClick={() => navigate('/caterers')}
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
            Back to Caterers
          </button>
        </div>
      </div>
    )
  }

  if (!caterer) {
    return null
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
          {caterer.name}
        </h1>
        <div style={{
          display: 'flex',
          gap: '0.75rem'
        }}>
          <button
            onClick={() => setShowEditForm(true)}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: deleting ? '#9ca3af' : '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: deleting ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!deleting) {
                e.currentTarget.style.backgroundColor = '#dc2626'
              }
            }}
            onMouseLeave={(e) => {
              if (!deleting) {
                e.currentTarget.style.backgroundColor = '#ef4444'
              }
            }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '2rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem'
              }}>
                Name
              </label>
              <p style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                {caterer.name}
              </p>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem'
              }}>
                Type
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#111827',
                margin: 0
              }}>
                {getTypeLabel(caterer.type)}
              </p>
            </div>

            {caterer.contactNumber && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem'
                }}>
                  Contact Number
                </label>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#111827',
                  margin: 0
                }}>
                  {caterer.contactNumber}
                </p>
              </div>
            )}

            {caterer.email && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem'
                }}>
                  Email
                </label>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#111827',
                  margin: 0
                }}>
                  {caterer.email}
                </p>
              </div>
            )}

            {caterer.locationName && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem'
                }}>
                  Location
                </label>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#111827',
                  margin: 0
                }}>
                  {caterer.locationName}
                </p>
              </div>
            )}
          </div>
        </div>

        {caterer.note && (
          <div style={{
            padding: '2rem',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
          }}>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem'
            }}>
              Note
            </label>
            <p style={{
              fontSize: '0.875rem',
              color: '#111827',
              margin: 0,
              whiteSpace: 'pre-wrap'
            }}>
              {caterer.note}
            </p>
          </div>
        )}

        <AccountsCards entityType="caterer" entityId={caterer.id} />

        <div style={{
          padding: '1.5rem 2rem',
          backgroundColor: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          <div>
            <span style={{ fontWeight: '600' }}>Created:</span> {formatDateTime(caterer.createdAt)}
          </div>
          <div>
            <span style={{ fontWeight: '600' }}>Last Updated:</span> {formatDateTime(caterer.updatedAt)}
          </div>
        </div>
      </div>

      {showEditForm && (
        <CatererForm
          caterer={caterer}
          locations={locations}
          onClose={() => setShowEditForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
