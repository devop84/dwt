import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { accountsApi } from '../lib/api'
import type { Account } from '../types'
import { CompanyAccountForm } from '../components/CompanyAccountForm'

export function CompanyAccountDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      loadAccount()
    }
  }, [id])

  const loadAccount = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await accountsApi.getById(id!)
      setAccount(data)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load company account')
      console.error('Error loading company account:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!account) return
    
    if (!confirm('Are you sure you want to delete this company account? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      await accountsApi.delete(account.id)
      navigate('/company-accounts')
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete company account')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!account) return
    await loadAccount()
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
            Company Account Details
          </h1>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#6b7280', margin: 0 }}>Loading company account...</p>
        </div>
      </div>
    )
  }

  if (error || !account) {
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
            Company Account Details
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
            <p style={{ margin: 0 }}>Error: {error || 'Company account not found'}</p>
          </div>
          <button
            onClick={() => navigate('/company-accounts')}
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
            Back to Company Accounts
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
          Company Account Details
        </h1>
        <div style={{
          display: 'flex',
          gap: '0.75rem'
        }}>
          <button
            onClick={() => navigate('/company-accounts')}
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
                Account Holder Name
              </label>
              <p style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                {account.accountHolderName}
                {account.isPrimary && (
                  <span style={{
                    marginLeft: '0.5rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    PRIMARY
                  </span>
                )}
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
                Account Type
              </label>
              <p style={{
                fontSize: '0.875rem',
                color: '#111827',
                margin: 0,
                textTransform: 'capitalize',
                fontWeight: '500'
              }}>
                {account.accountType}
                {account.accountType === 'online' && (
                  <span style={{
                    marginLeft: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}>
                    Online
                  </span>
                )}
                {account.accountType === 'cash' && (
                  <span style={{
                    marginLeft: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#f0fdf4',
                    color: '#16a34a',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}>
                    💵 Cash
                  </span>
                )}
                {account.accountType === 'other' && (
                  <span style={{
                    marginLeft: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}>
                    Other
                  </span>
                )}
              </p>
            </div>

            {account.bankName && (
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
                  {account.accountType === 'other' ? 'Account Name/Description' : 'Bank Name'}
                </label>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#111827',
                  margin: 0
                }}>
                  {account.bankName}
                </p>
              </div>
            )}

            {account.serviceName && (
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
                  Online Service Name
                </label>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#111827',
                  margin: 0
                }}>
                  {account.serviceName}
                </p>
              </div>
            )}

            {account.accountNumber && (
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
                  {account.accountType === 'online' ? 'Tag / Username' : 'Account Number'}
                </label>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#111827',
                  margin: 0,
                  fontFamily: account.accountType === 'online' ? 'monospace' : 'inherit'
                }}>
                  {account.accountNumber}
                </p>
              </div>
            )}

            {account.iban && (
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
                  IBAN
                </label>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#111827',
                  margin: 0,
                  fontFamily: 'monospace'
                }}>
                  {account.iban}
                </p>
              </div>
            )}

            {account.swiftBic && (
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
                  SWIFT/BIC
                </label>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#111827',
                  margin: 0,
                  fontFamily: 'monospace'
                }}>
                  {account.swiftBic}
                </p>
              </div>
            )}

            {account.routingNumber && (
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
                  Routing Number
                </label>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#111827',
                  margin: 0,
                  fontFamily: 'monospace'
                }}>
                  {account.routingNumber}
                </p>
              </div>
            )}

            {account.currency && (
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
                  Currency
                </label>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#111827',
                  margin: 0,
                  fontWeight: '500'
                }}>
                  {account.currency}
                </p>
              </div>
            )}
          </div>
        </div>

        {account.note && (
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
              {account.note}
            </p>
          </div>
        )}

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
            <span style={{ fontWeight: '600' }}>Created:</span> {formatDateTime(account.createdAt)}
          </div>
          <div>
            <span style={{ fontWeight: '600' }}>Last Updated:</span> {formatDateTime(account.updatedAt)}
          </div>
        </div>
      </div>

      {showEditForm && (
        <CompanyAccountForm
          account={account}
          onClose={() => setShowEditForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
