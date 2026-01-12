import { ReactNode } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Sidebar */}
      <aside style={{
        width: '250px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 4px rgba(0, 0, 0, 0.05)'
      }}>
        {/* User Area */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}>
            <div>
              <p style={{
                fontWeight: '600',
                color: '#111827',
                fontSize: '0.875rem',
                margin: 0
              }}>
                {user?.name || 'User'}
              </p>
              <p style={{
                color: '#6b7280',
                fontSize: '0.75rem',
                margin: '0.25rem 0 0 0'
              }}>
                @{user?.username || 'username'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
          >
            Logout
          </button>
        </div>

        {/* Menu */}
        <nav style={{ flex: 1, padding: '1rem 0' }}>
          <Link
            to="/"
            style={{
              display: 'block',
              padding: '0.75rem 1.5rem',
              color: isActive('/') ? '#3b82f6' : '#6b7280',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: isActive('/') ? '600' : '500',
              backgroundColor: isActive('/') ? '#eff6ff' : 'transparent',
              borderLeft: isActive('/') ? '3px solid #3b82f6' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              if (!isActive('/')) {
                e.currentTarget.style.backgroundColor = '#f9fafb'
                e.currentTarget.style.color = '#111827'
              }
            }}
            onMouseOut={(e) => {
              if (!isActive('/')) {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#6b7280'
              }
            }}
          >
            Dashboard
          </Link>
          <Link
            to="/clients"
            style={{
              display: 'block',
              padding: '0.75rem 1.5rem',
              color: isActive('/clients') ? '#3b82f6' : '#6b7280',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: isActive('/clients') ? '600' : '500',
              backgroundColor: isActive('/clients') ? '#eff6ff' : 'transparent',
              borderLeft: isActive('/clients') ? '3px solid #3b82f6' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              if (!isActive('/clients')) {
                e.currentTarget.style.backgroundColor = '#f9fafb'
                e.currentTarget.style.color = '#111827'
              }
            }}
            onMouseOut={(e) => {
              if (!isActive('/clients')) {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#6b7280'
              }
            }}
          >
            Clients
          </Link>
          <Link
            to="/destinations"
            style={{
              display: 'block',
              padding: '0.75rem 1.5rem',
              color: isActive('/destinations') ? '#3b82f6' : '#6b7280',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: isActive('/destinations') ? '600' : '500',
              backgroundColor: isActive('/destinations') ? '#eff6ff' : 'transparent',
              borderLeft: isActive('/destinations') ? '3px solid #3b82f6' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              if (!isActive('/destinations')) {
                e.currentTarget.style.backgroundColor = '#f9fafb'
                e.currentTarget.style.color = '#111827'
              }
            }}
            onMouseOut={(e) => {
              if (!isActive('/destinations')) {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#6b7280'
              }
            }}
          >
            Destinations
          </Link>
          <Link
            to="/hotels"
            style={{
              display: 'block',
              padding: '0.75rem 1.5rem',
              color: isActive('/hotels') ? '#3b82f6' : '#6b7280',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: isActive('/hotels') ? '600' : '500',
              backgroundColor: isActive('/hotels') ? '#eff6ff' : 'transparent',
              borderLeft: isActive('/hotels') ? '3px solid #3b82f6' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              if (!isActive('/hotels')) {
                e.currentTarget.style.backgroundColor = '#f9fafb'
                e.currentTarget.style.color = '#111827'
              }
            }}
            onMouseOut={(e) => {
              if (!isActive('/hotels')) {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#6b7280'
              }
            }}
          >
            Hotels
          </Link>
          <Link
            to="/guides"
            style={{
              display: 'block',
              padding: '0.75rem 1.5rem',
              color: isActive('/guides') ? '#3b82f6' : '#6b7280',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: isActive('/guides') ? '600' : '500',
              backgroundColor: isActive('/guides') ? '#eff6ff' : 'transparent',
              borderLeft: isActive('/guides') ? '3px solid #3b82f6' : '3px solid transparent',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              if (!isActive('/guides')) {
                e.currentTarget.style.backgroundColor = '#f9fafb'
                e.currentTarget.style.color = '#111827'
              }
            }}
            onMouseOut={(e) => {
              if (!isActive('/guides')) {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#6b7280'
              }
            }}
          >
            Guides
          </Link>
        <Link
          to="/drivers"
          style={{
            display: 'block',
            padding: '0.75rem 1.5rem',
            color: isActive('/drivers') ? '#3b82f6' : '#6b7280',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: isActive('/drivers') ? '600' : '500',
            backgroundColor: isActive('/drivers') ? '#eff6ff' : 'transparent',
            borderLeft: isActive('/drivers') ? '3px solid #3b82f6' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            if (!isActive('/drivers')) {
              e.currentTarget.style.backgroundColor = '#f9fafb'
              e.currentTarget.style.color = '#111827'
            }
          }}
          onMouseOut={(e) => {
            if (!isActive('/drivers')) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#6b7280'
            }
          }}
        >
          Drivers
        </Link>
        <Link
          to="/caterers"
          style={{
            display: 'block',
            padding: '0.75rem 1.5rem',
            color: isActive('/caterers') ? '#3b82f6' : '#6b7280',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: isActive('/caterers') ? '600' : '500',
            backgroundColor: isActive('/caterers') ? '#eff6ff' : 'transparent',
            borderLeft: isActive('/caterers') ? '3px solid #3b82f6' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            if (!isActive('/caterers')) {
              e.currentTarget.style.backgroundColor = '#f9fafb'
              e.currentTarget.style.color = '#111827'
            }
          }}
          onMouseOut={(e) => {
            if (!isActive('/caterers')) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#6b7280'
            }
          }}
        >
          Caterers
        </Link>
        <Link
          to="/accounts"
          style={{
            display: 'block',
            padding: '0.75rem 1.5rem',
            color: isActive('/accounts') ? '#3b82f6' : '#6b7280',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: isActive('/accounts') ? '600' : '500',
            backgroundColor: isActive('/accounts') ? '#eff6ff' : 'transparent',
            borderLeft: isActive('/accounts') ? '3px solid #3b82f6' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            if (!isActive('/accounts')) {
              e.currentTarget.style.backgroundColor = '#f9fafb'
              e.currentTarget.style.color = '#111827'
            }
          }}
          onMouseOut={(e) => {
            if (!isActive('/accounts')) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#6b7280'
            }
          }}
        >
          Accounts
        </Link>
        <Link
          to="/company-accounts"
          style={{
            display: 'block',
            padding: '0.75rem 1.5rem',
            color: isActive('/company-accounts') ? '#3b82f6' : '#6b7280',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: isActive('/company-accounts') ? '600' : '500',
            backgroundColor: isActive('/company-accounts') ? '#eff6ff' : 'transparent',
            borderLeft: isActive('/company-accounts') ? '3px solid #3b82f6' : '3px solid transparent',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            if (!isActive('/company-accounts')) {
              e.currentTarget.style.backgroundColor = '#f9fafb'
              e.currentTarget.style.color = '#111827'
            }
          }}
          onMouseOut={(e) => {
            if (!isActive('/company-accounts')) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#6b7280'
            }
          }}
        >
          Company Accounts
        </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: '2rem',
        overflow: 'auto'
      }}>
        {children}
      </main>
    </div>
  )
}
