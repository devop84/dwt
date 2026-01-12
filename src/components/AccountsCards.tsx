import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { accountsApi } from '../lib/api'
import type { Account, EntityType } from '../types'
import { AccountForm } from './AccountForm'

interface AccountsCardsProps {
  entityType: EntityType
  entityId: string
}

export function AccountsCards({ entityType, entityId }: AccountsCardsProps) {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

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

  const handleCardClick = (accountId: string) => {
    navigate(`/accounts/${accountId}`)
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
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '700',
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
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {accounts.map((account) => (
              <div
                key={account.id}
                onClick={() => handleCardClick(account.id)}
                style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '0.5rem',
                  border: account.isPrimary ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {account.isPrimary && (
                  <div style={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
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
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.25rem'
                  }}>
                    Account Holder
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '0.5rem'
                  }}>
                    {account.accountHolderName}
                  </div>
                </div>

                <div style={{
                  marginBottom: '1rem'
                }}>
                  {account.accountType === 'cash' ? (
                    <div>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.25rem'
                      }}>
                        Type
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#111827',
                        fontWeight: '500'
                      }}>
                        💵 Cash
                      </div>
                    </div>
                  ) : account.accountType === 'online' ? (
                    <div>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.25rem'
                      }}>
                        Online Service Name
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#111827',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        {account.serviceName || '-'}
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#e0f2fe',
                          color: '#0284c7',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          Online
                        </span>
                      </div>
                    </div>
                  ) : account.accountType === 'other' ? (
                    <div>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.25rem'
                      }}>
                        Account Name
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#111827',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        {account.bankName || '-'}
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          Other
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.25rem'
                      }}>
                        Bank Name
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#111827',
                        fontWeight: '500'
                      }}>
                        {account.bankName || '-'}
                      </div>
                    </div>
                  )}
                </div>

                {account.accountType === 'online' && account.accountNumber && (
                  <div style={{
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.25rem'
                    }}>
                      Tag / Username
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#111827',
                      fontFamily: 'monospace'
                    }}>
                      {account.accountNumber}
                    </div>
                  </div>
                )}
                {account.accountNumber && account.accountType !== 'online' && (
                  <div style={{
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.25rem'
                    }}>
                      Account Number
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#111827'
                    }}>
                      {account.accountNumber}
                    </div>
                  </div>
                )}

                {account.currency && (
                  <div style={{
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.25rem'
                    }}>
                      Currency
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#111827',
                      fontWeight: '500'
                    }}>
                      {account.currency}
                    </div>
                  </div>
                )}

                {account.note && (
                  <div style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '0.25rem'
                    }}>
                      Note
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      fontStyle: 'italic'
                    }}>
                      {account.note}
                    </div>
                  </div>
                )}
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
