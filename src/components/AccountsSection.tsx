import { useState, useEffect } from 'react'
import { accountsApi } from '../lib/api'
import type { Account, EntityType } from '../types'
import { AccountForm } from './AccountForm'

interface AccountsSectionProps {
  entityType: EntityType
  entityId: string
}

export function AccountsSection({ entityType, entityId }: AccountsSectionProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadAccounts()
  }, [entityType, entityId])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await accountsApi.getAll(entityType, entityId)
      setAccounts(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts')
      console.error('Error loading accounts:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingAccount(null)
    setShowForm(true)
  }

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account)
    setShowForm(true)
  }

  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingId(accountId)
      await accountsApi.delete(accountId)
      await loadAccounts()
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete account')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSave = async () => {
    await loadAccounts()
    setShowForm(false)
    setEditingAccount(null)
  }

  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
          <p style={{ color: '#6b7280', margin: 0 }}>Loading accounts...</p>
      </div>
    )
  }

  return (
    <>
      <div style={{
        padding: '2rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#111827',
            margin: 0
          }}>
            Accounts
          </h3>
          <button
            onClick={handleAdd}
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
            + Add Account
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        {accounts.length === 0 ? (
          <p style={{
            color: '#6b7280',
            fontSize: '0.875rem',
            margin: 0
          }}>
            No accounts added yet.
          </p>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {accounts.map((account) => (
              <div
                key={account.id}
                style={{
                  backgroundColor: 'white',
                  padding: '1rem',
                  borderRadius: '0.375rem',
                  border: account.isPrimary ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  position: 'relative'
                }}
              >
                {account.isPrimary && (
                  <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    PRIMARY
                  </div>
                )}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1rem',
                  marginBottom: '0.75rem'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.25rem'
                    }}>
                      Account Holder
                    </label>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#111827',
                      margin: 0,
                      fontWeight: '500'
                    }}>
                      {account.accountHolderName}
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
                      marginBottom: '0.25rem'
                    }}>
                      {account.isOnlineService ? 'Service Name' : 'Bank Name'}
                    </label>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#111827',
                      margin: 0
                    }}>
                      {account.bankName}
                      {account.isOnlineService && account.serviceName && (
                        <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                          ({account.serviceName})
                        </span>
                      )}
                    </p>
                  </div>
                  {account.accountNumber && (
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.25rem'
                      }}>
                        Account Number
                      </label>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#111827',
                        margin: 0
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
                        marginBottom: '0.25rem'
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
                        marginBottom: '0.25rem'
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
                        marginBottom: '0.25rem'
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
                        marginBottom: '0.25rem'
                      }}>
                        Currency
                      </label>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#111827',
                        margin: 0
                      }}>
                        {account.currency}
                      </p>
                    </div>
                  )}
                </div>
                {account.note && (
                  <div style={{
                    marginTop: '0.75rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      margin: 0
                    }}>
                      {account.note}
                    </p>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginTop: '0.75rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <button
                    onClick={() => handleEdit(account)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    disabled={deletingId === account.id}
                    style={{
                      padding: '0.375rem 0.75rem',
                      backgroundColor: deletingId === account.id ? '#9ca3af' : '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: deletingId === account.id ? 'not-allowed' : 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (deletingId !== account.id) {
                        e.currentTarget.style.backgroundColor = '#dc2626'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (deletingId !== account.id) {
                        e.currentTarget.style.backgroundColor = '#ef4444'
                      }
                    }}
                  >
                    {deletingId === account.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <AccountForm
          account={editingAccount}
          entityType={entityType}
          entityId={entityId}
          onClose={() => {
            setShowForm(false)
            setEditingAccount(null)
          }}
          onSave={handleSave}
        />
      )}
    </>
  )
}
