import { useAuth } from '../contexts/AuthContext'

export function Dashboard() {
  const { user } = useAuth()

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Page Header */}
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
          Dashboard
        </h1>
      </div>

      {/* Content Card */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          padding: '1.5rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.5rem'
        }}>
          <p style={{
            fontSize: '1rem',
            color: '#6b7280',
            marginBottom: '1rem',
            margin: 0
          }}>
            Welcome back, <strong style={{ color: '#111827' }}>{user?.name}</strong>!
          </p>
          <p style={{
            fontSize: '0.875rem',
            color: '#9ca3af',
            margin: 0
          }}>
            Your dashboard is ready. You can start building your features here.
          </p>
        </div>
      </div>
    </div>
  )
}
