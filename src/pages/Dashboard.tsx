import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { downwindersApi, bookingsApi } from '../lib/api'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { UserRole } from '../types'

export const Dashboard: React.FC = () => {
  const { user, hasRole } = useAuth()

  const { data: downwinders, isLoading: loadingDownwinders } = useQuery({
    queryKey: ['downwinders'],
    queryFn: downwindersApi.getAll,
  })

  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: bookingsApi.getAll,
    enabled: hasRole(UserRole.CLIENT),
  })

  const userDownwinders = hasRole(UserRole.CLIENT)
    ? bookings?.map((b) => b.downwinder).filter(Boolean) || []
    : downwinders || []

  const stats = [
    {
      name: 'Total Downwinders',
      value: userDownwinders.length,
      color: 'bg-blue-500',
    },
    {
      name: 'Upcoming',
      value: userDownwinders.filter((d) => {
        if (!d) return false
        const startDate = new Date(d.startDate)
        return startDate > new Date() && d.status !== 'cancelled'
      }).length,
      color: 'bg-green-500',
    },
    {
      name: 'In Progress',
      value: userDownwinders.filter((d) => {
        if (!d) return false
        const now = new Date()
        const startDate = new Date(d.startDate)
        const endDate = new Date(d.endDate)
        return startDate <= now && endDate >= now && d.status === 'confirmed'
      }).length,
      color: 'bg-yellow-500',
    },
    {
      name: 'Completed',
      value: userDownwinders.filter((d) => d?.status === 'completed').length,
      color: 'bg-gray-500',
    },
  ]

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Welcome back, {user?.name}! Here's an overview of your downwinders.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <div className="w-6 h-6 text-white"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Downwinders</h2>
          {(hasRole(UserRole.ADMIN) || hasRole(UserRole.GUIDE)) && (
            <Link to="/downwinders/new" className="btn-primary">
              Create New Downwinder
            </Link>
          )}
        </div>

        {loadingDownwinders || loadingBookings ? (
          <div className="text-center py-8">Loading...</div>
        ) : userDownwinders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No downwinders found. Create your first one!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userDownwinders.slice(0, 10).map((downwinder) => {
                  if (!downwinder) return null
                  return (
                    <tr key={downwinder.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{downwinder.title}</div>
                        {downwinder.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {downwinder.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(downwinder.startDate), 'MMM dd')} -{' '}
                        {format(new Date(downwinder.endDate), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            downwinder.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : downwinder.status === 'completed'
                                ? 'bg-gray-100 text-gray-800'
                                : downwinder.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {downwinder.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          to={`/downwinders/${downwinder.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}