import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  const navLinks = [
    { path: '/', label: 'Dashboard', roles: [UserRole.ADMIN, UserRole.GUIDE, UserRole.CLIENT] },
    { path: '/downwinders', label: 'Downwinders', roles: [UserRole.ADMIN, UserRole.GUIDE, UserRole.CLIENT] },
    { path: '/spots', label: 'Spots', roles: [UserRole.ADMIN, UserRole.GUIDE] },
    { path: '/hotels', label: 'Hotels', roles: [UserRole.ADMIN, UserRole.GUIDE] },
    { path: '/clients', label: 'Clients', roles: [UserRole.ADMIN, UserRole.GUIDE] },
    { path: '/bookings', label: 'Bookings', roles: [UserRole.ADMIN, UserRole.GUIDE, UserRole.CLIENT] },
  ]

  const visibleLinks = navLinks.filter(link => 
    link.roles.some(role => hasRole(role))
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-primary-600">Downwinder Tours</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {visibleLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                      isActive(link.path)
                        ? 'border-b-2 border-primary-500 text-gray-900'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user?.name}</span>
              <span className="text-xs px-2 py-1 bg-primary-100 text-primary-800 rounded-full">
                {user?.role}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}