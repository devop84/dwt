import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { downwindersApi, hotelsApi, logisticsApi } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'

const downwinderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  maxClients: z.number().min(1, 'Must be at least 1'),
  status: z.enum(['draft', 'confirmed', 'completed', 'cancelled']),
  hotelId: z.string().optional(),
})

type DownwinderFormData = z.infer<typeof downwinderSchema>

export const DownwinderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: downwinder, isLoading } = useQuery({
    queryKey: ['downwinder', id],
    queryFn: () => downwindersApi.getById(id!),
    enabled: !isNew && !!id,
  })

  const { data: hotels } = useQuery({
    queryKey: ['hotels'],
    queryFn: hotelsApi.getAll,
  })

  const { data: logistics } = useQuery({
    queryKey: ['logistics', id],
    queryFn: () => logisticsApi.getAll(id!),
    enabled: !isNew && !!id,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<DownwinderFormData>({
    resolver: zodResolver(downwinderSchema),
    defaultValues: {
      title: '',
      description: '',
      maxClients: 10,
      status: 'draft',
    },
  })

  useEffect(() => {
    if (downwinder) {
      setValue('title', downwinder.title)
      setValue('description', downwinder.description || '')
      setValue('startDate', format(new Date(downwinder.startDate), 'yyyy-MM-dd'))
      setValue('endDate', format(new Date(downwinder.endDate), 'yyyy-MM-dd'))
      setValue('maxClients', downwinder.maxClients)
      setValue('status', downwinder.status as any)
      setValue('hotelId', downwinder.hotelId || '')
    }
  }, [downwinder, setValue])

  const createMutation = useMutation({
    mutationFn: (data: Partial<DownwinderFormData>) =>
      downwindersApi.create({ ...data, createdById: user?.id }),
    onSuccess: (newDownwinder) => {
      queryClient.invalidateQueries({ queryKey: ['downwinders'] })
      navigate(`/downwinders/${newDownwinder.id}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<DownwinderFormData>) =>
      downwindersApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['downwinder', id] })
      queryClient.invalidateQueries({ queryKey: ['downwinders'] })
    },
  })

  const onSubmit = (data: DownwinderFormData) => {
    if (isNew) {
      createMutation.mutate(data)
    } else {
      updateMutation.mutate(data)
    }
  }

  if (isLoading && !isNew) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-600 hover:text-gray-900 mb-4">
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          {isNew ? 'Create New Downwinder' : 'Downwinder Details'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              {...register('title')}
              type="text"
              id="title"
              className="input-field"
              placeholder="Summer Downwinder Tour 2024"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select {...register('status')} id="status" className="input-field">
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              {...register('startDate')}
              type="date"
              id="startDate"
              className="input-field"
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date *
            </label>
            <input
              {...register('endDate')}
              type="date"
              id="endDate"
              className="input-field"
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="maxClients" className="block text-sm font-medium text-gray-700 mb-1">
              Max Clients *
            </label>
            <input
              {...register('maxClients', { valueAsNumber: true })}
              type="number"
              id="maxClients"
              min="1"
              className="input-field"
            />
            {errors.maxClients && (
              <p className="mt-1 text-sm text-red-600">{errors.maxClients.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="hotelId" className="block text-sm font-medium text-gray-700 mb-1">
              Hotel
            </label>
            <select {...register('hotelId')} id="hotelId" className="input-field">
              <option value="">Select a hotel</option>
              {hotels?.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              id="description"
              rows={4}
              className="input-field"
              placeholder="Add a description for this downwinder tour..."
            />
          </div>
        </div>

        {!isNew && logistics && logistics.length > 0 && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Logistics</h2>
            <div className="space-y-3">
              {logistics.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{log.name}</h3>
                      <p className="text-sm text-gray-500">{log.type}</p>
                      {log.description && (
                        <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        Quantity: {log.quantity} | Status: {log.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="btn-primary disabled:opacity-50"
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : isNew
                ? 'Create Downwinder'
                : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}