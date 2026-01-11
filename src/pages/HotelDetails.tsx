import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { hotelsApi, destinationsApi } from '../lib/api'
import type { Hotel, Destination } from '../types'
import { HotelForm } from '../components/HotelForm'

interface HotelWithDestination extends Hotel {
  destinationName?: string
}

export function HotelDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [hotel, setHotel] = useState<HotelWithDestination | null>(null)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      loadHotel()
      loadDestinations()
    }
  }, [id])

  const loadHotel = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await hotelsApi.getById(id!) as HotelWithDestination
      setHotel(data)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load hotel')
      console.error('Error loading hotel:', err)
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

  const handleDelete = async () => {
    if (!hotel) return
    
    if (!confirm('Are you sure you want to delete this hotel? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      await hotelsApi.delete(hotel.id)
      navigate('/hotels')
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete hotel')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async (hotelData: Omit<Hotel, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!hotel) return
    await hotelsApi.update(hotel.id, hotelData)
    await loadHotel()
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
            Hotel Details
          </h1>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#6b7280', margin: 0 }}>Loading hotel details...</p>
        </div>
      </div>
    )
  }

  if (error || !hotel) {
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
            Hotel Details
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
            <p style={{ margin: 0 }}>Error: {error || 'Hotel not found'}</p>
          </div>
          <button
            onClick={() => navigate('/hotels')}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Back to Hotels
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
          Hotel Details
        </h1>
        <div style={{
          display: 'flex',
          gap: '0.75rem'
        }}>
          <button
            onClick={() => navigate('/hotels')}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            Back
          </button>
          <button
            onClick={() => setShowEditForm(true)}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
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
              cursor: deleting ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
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
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#111827',
            margin: '0 0 1.5rem 0'
          }}>
            {hotel.name}
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
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
                Destination
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#111827',
                margin: 0
              }}>
                {hotel.destinationName || '-'}
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
                Rating
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#111827',
                margin: 0
              }}>
                {renderStars(hotel.rating)}
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
                Price Range
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#111827',
                margin: 0
              }}>
                {hotel.priceRange || '-'}
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
                Contact Number
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#111827',
                margin: 0
              }}>
                {hotel.contactNumber || '-'}
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
                Email
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#111827',
                margin: 0
              }}>
                {hotel.email || '-'}
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
                Address
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#111827',
                margin: 0
              }}>
                {hotel.address || '-'}
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
                Coordinates
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#111827',
                margin: 0
              }}>
                {hotel.coordinates || '-'}
              </p>
            </div>
          </div>
        </div>

        {hotel.note && (
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
              {hotel.note}
            </p>
          </div>
        )}

        {hotel.coordinates && (() => {
          const coords = hotel.coordinates.replace(/\s+/g, '').split(',')
          const lat = coords[0]
          const lng = coords[1]
          
          if (lat && lng) {
            return (
              <div style={{
                padding: '2rem',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '1rem'
                }}>
                  Location on Map
                </label>
                <div style={{
                  width: '100%',
                  height: '400px',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  backgroundColor: '#f3f4f6'
                }}>
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0, borderRadius: '0.5rem' }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=14&output=embed`}
                    title={`Map showing ${hotel.name}`}
                  />
                </div>
                <div style={{
                  marginTop: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#6b7280'
                }}>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#3b82f6',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >
                    Open in Google Maps →
                  </a>
                </div>
              </div>
            )
          }
          return null
        })()}

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
            <span style={{ fontWeight: '600' }}>Created:</span> {formatDateTime(hotel.createdAt)}
          </div>
          <div>
            <span style={{ fontWeight: '600' }}>Last Updated:</span> {formatDateTime(hotel.updatedAt)}
          </div>
        </div>
      </div>

      {showEditForm && (
        <HotelForm
          hotel={hotel}
          destinations={destinations}
          onClose={() => setShowEditForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
