import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { downwindersApi } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import type { UserRole } from '../types'

export const DownwindersList: React.FC = () => {
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()

  const { data: downwinders, isLoading } = useQuery({
    queryKey: ['downwinders'],
    queryFn: downwindersApi.getAll,
  })

  const deleteMutation = useMutation({
    mutationFn: downwindersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downwinders'] })
    },
  })

  const canEdit = hasRole(UserRole.ADMIN) || hasRole(UserRole.GUIDE)

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this downwinder?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">Downwinders</h1>
          <p className="mt-2 text-sm text-gray-600">
            A list of all downwinder tours in the system.
          </p>
        </div>
        {canEdit && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Link to="/downwinders/new" className="btn-primary">
              Add Downwinder
            </Link>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading downwinders...</div>
      ) : !downwinders || downwinders.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No downwinders found.</p>
          {canEdit && (
            <Link to="/downwinders/new" className="btn-primary inline-block">
              Create Your First Downwinder
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
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
                  Max Clients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {downwinders.map((downwinder) => (
                <tr key={downwinder.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{downwinder.title}</div>
                    {downwinder.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {downwinder.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(downwinder.startDate), 'MMM dd, yyyy')} -{' '}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {downwinder.maxClients}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                    <Link
                      to={`/downwinders/${downwinder.id}`}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      View
                    </Link>
                    {canEdit && (
                      <>
                        <Link
                          to={`/downwinders/${downwinder.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(downwinder.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}