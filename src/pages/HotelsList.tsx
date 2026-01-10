import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hotelsApi } from '../lib/api'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const hotelSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  rating: z.number().min(0).max(5).optional(),
})

type HotelFormData = z.infer<typeof hotelSchema>

export const HotelsList: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingHotel, setEditingHotel] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: hotels, isLoading } = useQuery({
    queryKey: ['hotels'],
    queryFn: hotelsApi.getAll,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<HotelFormData>({
    resolver: zodResolver(hotelSchema),
  })

  const createMutation = useMutation({
    mutationFn: hotelsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] })
      setIsModalOpen(false)
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HotelFormData> }) =>
      hotelsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] })
      setIsModalOpen(false)
      setEditingHotel(null)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: hotelsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotels'] })
    },
  })

  const handleEdit = (hotel: any) => {
    setEditingHotel(hotel.id)
    setValue('name', hotel.name)
    setValue('address', hotel.address)
    setValue('description', hotel.description || '')
    setValue('phone', hotel.phone || '')
    setValue('email', hotel.email || '')
    setValue('rating', hotel.rating || 0)
    setIsModalOpen(true)
  }

  const handleNew = () => {
    setEditingHotel(null)
    reset()
    setIsModalOpen(true)
  }

  const onSubmit = (data: HotelFormData) => {
    if (editingHotel) {
      updateMutation.mutate({ id: editingHotel, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this hotel?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">Hotels</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage all hotels and accommodations used for downwinders.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button onClick={handleNew} className="btn-primary">
            Add Hotel
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading hotels...</div>
      ) : !hotels || hotels.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No hotels found.</p>
          <button onClick={handleNew} className="btn-primary">
            Add Your First Hotel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hotels.map((hotel) => (
            <div key={hotel.id} className="card">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{hotel.name}</h3>
                {hotel.rating !== undefined && hotel.rating > 0 && (
                  <span className="text-sm text-yellow-600">⭐ {hotel.rating}/5</span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Address:</span> {hotel.address}
              </p>
              {hotel.phone && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Phone:</span> {hotel.phone}
                </p>
              )}
              {hotel.email && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Email:</span> {hotel.email}
                </p>
              )}
              {hotel.description && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{hotel.description}</p>
              )}
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => handleEdit(hotel)}
                  className="text-sm text-blue-600 hover:text-blue-900"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(hotel.id)}
                  className="text-sm text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingHotel ? 'Edit Hotel' : 'Add New Hotel'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input {...register('name')} type="text" className="input-field" />
                  {errors.name && (
                    <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <input {...register('address')} type="text" className="input-field" />
                  {errors.address && (
                    <p className="text-sm text-red-600 mt-1">{errors.address.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea {...register('description')} rows={3} className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input {...register('phone')} type="tel" className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input {...register('email')} type="email" className="input-field" />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                  <input
                    {...register('rating', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    className="input-field"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false)
                      setEditingHotel(null)
                      reset()
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="btn-primary disabled:opacity-50"
                  >
                    {editingHotel ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}