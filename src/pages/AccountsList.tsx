import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { accountsApi, clientsApi, hotelsApi, guidesApi, driversApi, caterersApi } from '../lib/api'
import type { Account, EntityType } from '../types'

type FilterColumn = 'all' | 'accountHolderName' | 'bankName' | 'entityType' | 'serviceName'
type SortColumn = 'accountHolderName' | 'bankName' | 'entityType' | 'createdAt'

interface AccountWithEntity extends Account {
  entityName?: string
}

export function AccountsList() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<AccountWithEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterColumn, setFilterColumn] = useState<FilterColumn>('all')
  const [filterEntityType, setFilterEntityType] = useState<EntityType | 'all'>('all')
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      setError(null)
      const allAccounts = await accountsApi.getAll()
      
      // Load entity names for each account
      const accountsWithNames = await Promise.all(
        allAccounts.map(async (account) => {
          let entityName = ''
          try {
            switch (account.entityType) {
              case 'client':
                const client = await clientsApi.getById(account.entityId)
                entityName = client.name
                break
              case 'hotel':
                const hotel = await hotelsApi.getById(account.entityId)
                entityName = hotel.name
                break
              case 'guide':
                const guide = await guidesApi.getById(account.entityId)
                entityName = guide.name
                break
              case 'driver':
                const driver = await driversApi.getById(account.entityId!)
                entityName = driver.name
                break
              case 'caterer':
                const caterer = await caterersApi.getById(account.entityId!)
                entityName = caterer.name
                break
              case 'company':
                entityName = 'Company'
                break
            }
          } catch (err) {
            console.error(`Error loading ${account.entityType} name:`, err)
          }
          return { ...account, entityName }
        })
      )
      
      setAccounts(Array.isArray(accountsWithNames) ? accountsWithNames : [])
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts')
      setAccounts([]) // Ensure accounts is always an array
      console.error('Error loading accounts:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort accounts
  const filteredAccounts = useMemo(() => {
    let result = [...accounts]

    // Apply entity type filter
    if (filterEntityType !== 'all') {
      result = result.filter(account => account.entityType === filterEntityType)
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim()

      result = result.filter((account) => {
        if (filterColumn === 'all') {
          return (
            account.accountHolderName.toLowerCase().includes(search) ||
            account.bankName.toLowerCase().includes(search) ||
            (account.entityName && account.entityName.toLowerCase().includes(search)) ||
            (account.serviceName && account.serviceName.toLowerCase().includes(search)) ||
            (account.accountNumber && account.accountNumber.toLowerCase().includes(search)) ||
            (account.iban && account.iban.toLowerCase().includes(search))
          )
        } else {
          switch (filterColumn) {
            case 'accountHolderName':
              return account.accountHolderName.toLowerCase().includes(search)
            case 'bankName':
              return account.bankName.toLowerCase().includes(search)
            case 'entityType':
              return account.entityType.toLowerCase().includes(search) ||
                     (account.entityName && account.entityName.toLowerCase().includes(search))
            case 'serviceName':
              return account.serviceName?.toLowerCase().includes(search) ?? false
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
          case 'accountHolderName':
            aValue = a.accountHolderName.toLowerCase()
            bValue = b.accountHolderName.toLowerCase()
            break
          case 'bankName':
            aValue = a.bankName.toLowerCase()
            bValue = b.bankName.toLowerCase()
            break
          case 'entityType':
            aValue = `${a.entityType} ${a.entityName || ''}`.toLowerCase()
            bValue = `${b.entityType} ${b.entityName || ''}`.toLowerCase()
            break
          case 'createdAt':
            aValue = a.createdAt
            bValue = b.createdAt
            break
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [accounts, searchTerm, filterColumn, filterEntityType, sortColumn, sortDirection])

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

  const handleRowClick = (account: AccountWithEntity) => {
    navigate(`/accounts/${account.id}`)
  }

  const handleEntityClick = (e: React.MouseEvent, account: AccountWithEntity) => {
    e.stopPropagation() // Prevent row click from firing
    const routes: Record<EntityType, string> = {
      client: '/clients',
      hotel: '/hotels',
      guide: '/guides',
      driver: '/drivers',
      caterer: '/caterers',
      company: '/company-accounts'
    }
    if (routes[account.entityType]) {
      navigate(`${routes[account.entityType]}/${account.entityId}`)
    }
  }

  const getEntityTypeLabel = (type: EntityType) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
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
            Accounts
          </h1>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#6b7280', margin: 0 }}>Loading accounts...</p>
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
            Accounts
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
            onClick={loadAccounts}
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
            Accounts
        </h1>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            {searchTerm || filterEntityType !== 'all' ? filteredAccounts.length : accounts.length} {filteredAccounts.length === 1 ? 'account' : 'accounts'}
            {searchTerm && filteredAccounts.length !== accounts.length && (
              <span style={{ color: '#9ca3af' }}> of {accounts.length}</span>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="Search accounts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: '1 1 200px',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
        <select
          value={filterEntityType}
          onChange={(e) => setFilterEntityType(e.target.value as EntityType | 'all')}
          style={{
            flex: '0 0 auto',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            backgroundColor: 'white'
          }}
        >
          <option value="all">All Entity Types</option>
          <option value="client">Clients</option>
          <option value="hotel">Hotels</option>
          <option value="guide">Guides</option>
          <option value="driver">Drivers</option>
          <option value="caterer">Caterers</option>
          <option value="company">Company</option>
        </select>
        <select
          value={filterColumn}
          onChange={(e) => setFilterColumn(e.target.value as FilterColumn)}
          style={{
            flex: '0 0 auto',
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            backgroundColor: 'white'
          }}
        >
          <option value="all">All Columns</option>
          <option value="accountHolderName">Account Holder</option>
          <option value="bankName">Bank/Service Name</option>
          <option value="entityType">Entity</option>
          <option value="serviceName">Service Tag</option>
        </select>
        {(searchTerm || filterEntityType !== 'all') && (
          <button
            onClick={() => {
              setSearchTerm('')
              setFilterColumn('all')
              setFilterEntityType('all')
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
          >
            Clear
          </button>
        )}
      </div>

      {/* Content Card */}
      {filteredAccounts.length === 0 && (searchTerm || filterEntityType !== 'all') ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{
            color: '#6b7280',
            fontSize: '1rem',
            margin: 0
          }}>
            No accounts match your search criteria.
          </p>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <p style={{
            color: '#6b7280',
            fontSize: '1rem',
            margin: 0
          }}>
            No accounts found. Accounts will appear here once added.
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            overflowX: 'auto'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#f9fafb',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <th
                    onClick={() => handleSort('accountHolderName')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: sortColumn === 'accountHolderName' ? '#3b82f6' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'accountHolderName') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortColumn !== 'accountHolderName') {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                      }
                    }}
                  >
                    Account Holder{getSortIndicator('accountHolderName')}
                  </th>
                  <th
                    onClick={() => handleSort('bankName')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: sortColumn === 'bankName' ? '#3b82f6' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'bankName') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortColumn !== 'bankName') {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                      }
                    }}
                  >
                    Bank/Service{getSortIndicator('bankName')}
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Account Number / Tag
                  </th>
                  <th
                    onClick={() => handleSort('entityType')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: sortColumn === 'entityType' ? '#3b82f6' : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (sortColumn !== 'entityType') {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sortColumn !== 'entityType') {
                        e.currentTarget.style.backgroundColor = '#f9fafb'
                      }
                    }}
                  >
                    Entity{getSortIndicator('entityType')}
                  </th>
                  <th
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    Currency
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr
                    key={account.id}
                    onClick={() => handleRowClick(account)}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {account.accountHolderName}
                        {account.isPrimary && (
                          <span style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.625rem',
                            fontWeight: '600'
                          }}>
                            PRIMARY
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>
                      <div>
                        {account.accountType === 'cash' ? (
                          <span style={{ fontWeight: '500' }}>💵 Cash</span>
                        ) : account.accountType === 'online' ? (
                          <>
                            {account.serviceName || '-'}
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
                          </>
                        ) : account.accountType === 'other' ? (
                          <>
                            {account.bankName || '-'}
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
                          </>
                        ) : (
                          account.bankName || '-'
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>
                      {account.accountType === 'online' && account.accountNumber ? (
                        <span style={{ fontFamily: 'monospace' }}>{account.accountNumber}</span>
                      ) : account.accountType === 'bank' && account.accountNumber ? (
                        <span style={{ fontFamily: 'monospace' }}>{account.accountNumber}</span>
                      ) : account.accountType === 'cash' ? (
                        <span style={{ color: '#6b7280', fontStyle: 'italic' }}>N/A</span>
                      ) : (
                        account.accountNumber || '-'
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>
                      <div>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backgroundColor: '#e5e7eb',
                          color: '#374151',
                          marginRight: '0.5rem'
                        }}>
                          {getEntityTypeLabel(account.entityType)}
                        </span>
                        <span
                          onClick={(e) => handleEntityClick(e, account)}
                          style={{
                            color: '#3b82f6',
                            textDecoration: 'none',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {account.entityName || account.entityId}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827' }}>
                      {account.currency || '-'}
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
