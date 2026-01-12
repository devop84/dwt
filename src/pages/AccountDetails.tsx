import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { accountsApi } from '../lib/api'
import type { Account } from '../types'
import { AccountForm } from '../components/AccountForm'

export function AccountDetails() {
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
      setError(err.response?.data?.message || err.message || 'Failed to load account')
      console.error('Error loading account:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!account) return
    
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      await accountsApi.delete(account.id)
      
      // Navigate back to the entity detail page
      if (account.entityType === 'client') {
        navigate(`/clients/${account.entityId}`)
      } else if (account.entityType === 'hotel') {
        navigate(`/hotels/${account.entityId}`)
      } else if (account.entityType === 'guide') {
        navigate(`/guides/${account.entityId}`)
      } else if (account.entityType === 'driver') {
        navigate(`/drivers/${account.entityId}`)
      } else if (account.entityType === 'caterer') {
        navigate(`/caterers/${account.entityId}`)
      } else {
        navigate('/accounts')
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete account')
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!account) return
    await loadAccount()
    setShowEditForm(false)
  }

  const handleBack = () => {
    if (!account) {
      navigate('/accounts')
      return
    }
    
    // Navigate back to the entity detail page
    if (account.entityType === 'client') {
      navigate(`/clients/${account.entityId}`)
    } else if (account.entityType === 'hotel') {
      navigate(`/hotels/${account.entityId}`)
    } else if (account.entityType === 'guide') {
      navigate(`/guides/${account.entityId}`)
    } else if (account.entityType === 'driver') {
      navigate(`/drivers/${account.entityId}`)
    } else if (account.entityType === 'caterer') {
      navigate(`/caterers/${account.entityId}`)
    } else {
      navigate('/accounts')
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
            Account Details
          </h1>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#6b7280' }}>Loading account...</p>
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
            Account Details
          </h1>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#ef4444' }}>{error || 'Account not found'}</p>
          <button
            onClick={() => navigate('/accounts')}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
          >
            Back to Accounts
          </button>
        </div>
      </div>
    )
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem'
  }

  const valueStyle = {
    fontSize: '0.875rem',
    color: '#111827',
    margin: 0
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
        <div>
          <button
            onClick={handleBack}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              marginBottom: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb'
              e.currentTarget.style.borderColor = '#9ca3af'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = '#d1d5db'
            }}
          >
            ← Back
          </button>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#111827',
            margin: 0
          }}>
            Account Details
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowEditForm(true)}
            style={{
              padding: '0.5rem 1rem',
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
              padding: '0.5rem 1rem',
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
        padding: '2rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: '2rem'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1.5rem'
        }}>
          <div>
            <label style={labelStyle}>Account Holder Name</label>
            <p style={valueStyle}>{account.accountHolderName}</p>
          </div>
          <div>
            <label style={labelStyle}>Account Type</label>
            <p style={valueStyle}>
              {account.accountType === 'bank' && 'Bank Account'}
              {account.accountType === 'cash' && 'Cash'}
              {account.accountType === 'online' && 'Online Banking'}
              {account.accountType === 'other' && 'Other'}
            </p>
          </div>
          {account.accountType === 'bank' && (
            <>
              <div>
                <label style={labelStyle}>Bank Name</label>
                <p style={valueStyle}>{account.bankName || '-'}</p>
              </div>
              <div>
                <label style={labelStyle}>Account Number</label>
                <p style={valueStyle}>{account.accountNumber || '-'}</p>
              </div>
              <div>
                <label style={labelStyle}>IBAN</label>
                <p style={valueStyle}>{account.iban || '-'}</p>
              </div>
              <div>
                <label style={labelStyle}>SWIFT/BIC</label>
                <p style={valueStyle}>{account.swiftBic || '-'}</p>
              </div>
              <div>
                <label style={labelStyle}>Routing Number</label>
                <p style={valueStyle}>{account.routingNumber || '-'}</p>
              </div>
            </>
          )}
          {account.accountType === 'online' && (
            <>
              <div>
                <label style={labelStyle}>Online Service Name</label>
                <p style={valueStyle}>{account.serviceName || '-'}</p>
              </div>
              <div>
                <label style={labelStyle}>Tag / Username</label>
                <p style={valueStyle}>{account.accountNumber || '-'}</p>
              </div>
            </>
          )}
          {account.accountType === 'other' && (
            <>
              <div>
                <label style={labelStyle}>Account Name/Description</label>
                <p style={valueStyle}>{account.bankName || '-'}</p>
              </div>
              <div>
                <label style={labelStyle}>Account Number</label>
                <p style={valueStyle}>{account.accountNumber || '-'}</p>
              </div>
            </>
          )}
          {account.accountType === 'cash' && (
            <div>
              <label style={labelStyle}>Currency</label>
              <p style={valueStyle}>{account.currency || '-'}</p>
            </div>
          )}
          {(account.accountType === 'bank' || account.accountType === 'online' || account.accountType === 'other') && (
            <div>
              <label style={labelStyle}>Currency</label>
              <p style={valueStyle}>{account.currency || '-'}</p>
            </div>
          )}
          <div>
            <label style={labelStyle}>Primary Account</label>
            <p style={valueStyle}>{account.isPrimary ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <label style={labelStyle}>Entity Type</label>
            <p style={valueStyle}>
              {account.entityType.charAt(0).toUpperCase() + account.entityType.slice(1)}
            </p>
          </div>
          {account.entityName && (
            <div>
              <label style={labelStyle}>Entity Name</label>
              <p style={valueStyle}>{account.entityName}</p>
            </div>
          )}
          {account.note && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Note</label>
              <p style={valueStyle}>{account.note}</p>
            </div>
          )}
          <div>
            <label style={labelStyle}>Created At</label>
            <p style={valueStyle}>{formatDateTime(account.createdAt)}</p>
          </div>
          <div>
            <label style={labelStyle}>Updated At</label>
            <p style={valueStyle}>{formatDateTime(account.updatedAt)}</p>
          </div>
        </div>
      </div>

      {showEditForm && account && (
        <AccountForm
          account={account}
          entityType={account.entityType}
          entityId={account.entityId || ''}
          onClose={() => setShowEditForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
