import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { clientsApi } from '../lib/api'
import type { Client } from '../types'
import { ClientForm } from '../components/ClientForm'
import { BankAccountsSection } from '../components/BankAccountsSection'

export function ClientDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      loadClient()
    }
  }, [id])

  const loadClient = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await clientsApi.getById(id!)
      setClient(data)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load client')
      console.error('Error loading client:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!client) return
    
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      await clientsApi.delete(client.id)
      navigate('/clients')
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete client')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!client) return
    await clientsApi.update(client.id, clientData)
    await loadClient()
    setShowEditForm(false)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
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
            Client Details
          </h1>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#6b7280', margin: 0 }}>Loading client details...</p>
        </div>
      </div>
    )
  }

  if (error || !client) {
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
            Client Details
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
            <p style={{ margin: 0 }}>Error: {error || 'Client not found'}</p>
          </div>
          <button
            onClick={() => navigate('/clients')}
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
            Back to Clients
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
          Client Details
        </h1>
        <div style={{
          display: 'flex',
          gap: '0.75rem'
        }}>
          <button
            onClick={() => navigate('/clients')}
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
            {client.name}
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
                Contact Number
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#111827',
                margin: 0
              }}>
                {client.contactNumber || '-'}
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
                {client.email || '-'}
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
                Date of Birth
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#111827',
                margin: 0
              }}>
                {formatDate(client.dateOfBirth)}
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
                Nationality
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#111827',
                margin: 0
              }}>
                {client.nationality || '-'}
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
                ID Number
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#111827',
                margin: 0
              }}>
                {client.IDNumber || '-'}
              </p>
            </div>
          </div>
        </div>

        {client.note && (
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
              {client.note}
            </p>
          </div>
        )}

        <BankAccountsSection entityType="client" entityId={client.id} />

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
            <span style={{ fontWeight: '600' }}>Created:</span> {formatDateTime(client.createdAt)}
          </div>
          <div>
            <span style={{ fontWeight: '600' }}>Last Updated:</span> {formatDateTime(client.updatedAt)}
          </div>
        </div>
      </div>

      {showEditForm && (
        <ClientForm
          client={client}
          onClose={() => setShowEditForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
