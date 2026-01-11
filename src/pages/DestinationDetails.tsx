import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { destinationsApi, hotelsApi } from '../lib/api'
import type { Destination, Hotel } from '../types'
import { DestinationForm } from '../components/DestinationForm'

export function DestinationDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [destination, setDestination] = useState<Destination | null>(null)
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      loadDestination()
      loadHotels()
    }
  }, [id])

  const loadDestination = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await destinationsApi.getById(id!)
      setDestination(data)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load destination')
      console.error('Error loading destination:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadHotels = async () => {
    try {
      const allHotels = await hotelsApi.getAll()
      // Filter hotels for this destination
      const destinationHotels = allHotels.filter(hotel => hotel.destinationId === id)
      setHotels(destinationHotels)
    } catch (err: any) {
      console.error('Error loading hotels:', err)
    }
  }

  const handleDelete = async () => {
    if (!destination) return
    
    if (!confirm('Are you sure you want to delete this destination? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      await destinationsApi.delete(destination.id)
      navigate('/destinations')
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete destination')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async (destinationData: Omit<Destination, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!destination) return
    await destinationsApi.update(destination.id, destinationData)
    await loadDestination()
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
            Destination Details
          </h1>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#6b7280', margin: 0 }}>Loading destination details...</p>
        </div>
      </div>
    )
  }

  if (error || !destination) {
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
            Destination Details
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
            <p style={{ margin: 0 }}>Error: {error || 'Destination not found'}</p>
          </div>
          <button
            onClick={() => navigate('/destinations')}
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
            Back to Destinations
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
          Destination Details
        </h1>
        <div style={{
          display: 'flex',
          gap: '0.75rem'
        }}>
          <button
            onClick={() => navigate('/destinations')}
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
        {/* Top section: Details on left, Map on right */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '2rem',
          padding: '2rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          {/* Left column: Destination Details */}
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827',
              margin: '0 0 1.5rem 0'
            }}>
              {destination.name}
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
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
                  Prefeitura
                </label>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#111827',
                  margin: 0
                }}>
                  {destination.prefeitura || '-'}
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
                  State
                </label>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#111827',
                  margin: 0
                }}>
                  {destination.state || '-'}
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
                  CEP
                </label>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#111827',
                  margin: 0
                }}>
                  {destination.cep || '-'}
                </p>
              </div>
            </div>

            {/* Description */}
            {destination.description && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1.5rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.75rem'
                }}>
                  Description
                </label>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#111827',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6'
                }}>
                  {destination.description}
                </p>
              </div>
            )}
          </div>

          {/* Right column: Map */}
          {destination.coordinates && (() => {
            // Parse coordinates (format: "lat, lng" or "lat,lng")
            const coords = destination.coordinates.replace(/\s+/g, '').split(',')
            const lat = coords[0]
            const lng = coords[1]
            
            if (lat && lng) {
              return (
                <div>
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
                    height: '300px',
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    backgroundColor: '#f3f4f6'
                  }}>
                    <iframe
                      width="100%"
                      height="100%"
                      style={{
                        border: 0,
                        borderRadius: '0.5rem'
                      }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=14&output=embed`}
                      title={`Map showing ${destination.name}`}
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
            return (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                color: '#6b7280',
                fontSize: '0.875rem'
              }}>
                No coordinates available
              </div>
            )
          })()}
        </div>

        {/* Hotels Section */}
        <div style={{
          padding: '2rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#111827',
              margin: 0
            }}>
              Hotels at {destination.name}
            </h3>
            <div style={{
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              {hotels.length} {hotels.length === 1 ? 'hotel' : 'hotels'}
            </div>
          </div>

          {hotels.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: '#f9fafb',
              borderRadius: '0.5rem',
              border: '1px dashed #d1d5db'
            }}>
              <p style={{
                color: '#6b7280',
                margin: 0,
                fontSize: '0.875rem'
              }}>
                No hotels found for this destination.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem'
            }}>
              {hotels.map((hotel) => (
                <div
                  key={hotel.id}
                  onClick={() => navigate(`/hotels/${hotel.id}`)}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6'
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <h4 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#111827',
                    margin: '0 0 0.5rem 0'
                  }}>
                    {hotel.name}
                  </h4>
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '0.75rem',
                    flexWrap: 'wrap'
                  }}>
                    {hotel.rating && (
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#f59e0b',
                        fontWeight: '500'
                      }}>
                        {'★'.repeat(hotel.rating)}{'☆'.repeat(5 - hotel.rating)}
                      </div>
                    )}
                    {hotel.priceRange && (
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#6b7280'
                      }}>
                        {hotel.priceRange}
                      </div>
                    )}
                  </div>
                  {hotel.contactNumber && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginBottom: '0.25rem'
                    }}>
                      📞 {hotel.contactNumber}
                    </div>
                  )}
                  {hotel.email && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginBottom: '0.5rem'
                    }}>
                      ✉️ {hotel.email}
                    </div>
                  )}
                  {hotel.address && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginBottom: '0.5rem'
                    }}>
                      📍 {hotel.address}
                    </div>
                  )}
                  {hotel.description && (
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      margin: '0.5rem 0 0 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {hotel.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

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
            <span style={{ fontWeight: '600' }}>Created:</span> {formatDateTime(destination.createdAt)}
          </div>
          <div>
            <span style={{ fontWeight: '600' }}>Last Updated:</span> {formatDateTime(destination.updatedAt)}
          </div>
        </div>
      </div>

      {showEditForm && (
        <DestinationForm
          destination={destination}
          onClose={() => setShowEditForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
