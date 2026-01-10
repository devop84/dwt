import { useQuery } from '@tanstack/react-query'
import { bookingsApi } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import { UserRole } from '../types'

export const BookingsList: React.FC = () => {
  const { user, hasRole } = useAuth()

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: bookingsApi.getAll,
  })

  const filteredBookings = hasRole(UserRole.CLIENT)
    ? bookings?.filter((b) => b.clientId === user?.id) || []
    : bookings || []

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="mt-2 text-sm text-gray-600">
            {hasRole(UserRole.CLIENT)
              ? 'Your downwinder bookings.'
              : 'A list of all bookings in the system.'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading bookings...</div>
      ) : filteredBookings.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No bookings found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {!hasRole(UserRole.CLIENT) && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Downwinder
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booked On
                </th>
                {!hasRole(UserRole.CLIENT) && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  {!hasRole(UserRole.CLIENT) && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {booking.client?.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">{booking.client?.email}</div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {booking.downwinder?.title || 'Unknown Downwinder'}
                    </div>
                    {booking.downwinder && (
                      <div className="text-sm text-gray-500">
                        {format(new Date(booking.downwinder.startDate), 'MMM dd')} -{' '}
                        {format(new Date(booking.downwinder.endDate), 'MMM dd, yyyy')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        booking.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : booking.status === 'completed'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(booking.createdAt), 'MMM dd, yyyy')}
                  </td>
                  {!hasRole(UserRole.CLIENT) && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-primary-600 hover:text-primary-900">Edit</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}