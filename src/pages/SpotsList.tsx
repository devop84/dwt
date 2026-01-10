import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { spotsApi } from '../lib/api'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const spotSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location: z.string().min(1, 'Location is required'),
  description: z.string().optional(),
  difficulty: z.string().optional(),
  conditions: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

type SpotFormData = z.infer<typeof spotSchema>

export const SpotsList: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSpot, setEditingSpot] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: spots, isLoading } = useQuery({
    queryKey: ['spots'],
    queryFn: spotsApi.getAll,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<SpotFormData>({
    resolver: zodResolver(spotSchema),
  })

  const createMutation = useMutation({
    mutationFn: spotsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spots'] })
      setIsModalOpen(false)
      reset()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SpotFormData> }) =>
      spotsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spots'] })
      setIsModalOpen(false)
      setEditingSpot(null)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: spotsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spots'] })
    },
  })

  const handleEdit = (spot: any) => {
    setEditingSpot(spot.id)
    setValue('name', spot.name)
    setValue('location', spot.location)
    setValue('description', spot.description || '')
    setValue('difficulty', spot.difficulty || '')
    setValue('conditions', spot.conditions || '')
    setValue('latitude', spot.latitude)
    setValue('longitude', spot.longitude)
    setIsModalOpen(true)
  }

  const handleNew = () => {
    setEditingSpot(null)
    reset()
    setIsModalOpen(true)
  }

  const onSubmit = (data: SpotFormData) => {
    if (editingSpot) {
      updateMutation.mutate({ id: editingSpot, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this spot?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center mb-8">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">Spots</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage all downwinder spots and locations.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button onClick={handleNew} className="btn-primary">
            Add Spot
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading spots...</div>
      ) : !spots || spots.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No spots found.</p>
          <button onClick={handleNew} className="btn-primary">
            Add Your First Spot
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spots.map((spot) => (
            <div key={spot.id} className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{spot.name}</h3>
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Location:</span> {spot.location}
              </p>
              {spot.difficulty && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Difficulty:</span> {spot.difficulty}
                </p>
              )}
              {spot.description && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{spot.description}</p>
              )}
              {spot.latitude && spot.longitude && (
                <p className="text-xs text-gray-400 mt-2">
                  {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
                </p>
              )}
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => handleEdit(spot)}
                  className="text-sm text-blue-600 hover:text-blue-900"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(spot.id)}
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
                {editingSpot ? 'Edit Spot' : 'Add New Spot'}
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
                    Location *
                  </label>
                  <input {...register('location')} type="text" className="input-field" />
                  {errors.location && (
                    <p className="text-sm text-red-600 mt-1">{errors.location.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea {...register('description')} rows={3} className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty
                  </label>
                  <select {...register('difficulty')} className="input-field">
                    <option value="">Select difficulty</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conditions
                  </label>
                  <input {...register('conditions')} type="text" className="input-field" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      {...register('latitude', { valueAsNumber: true })}
                      type="number"
                      step="any"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      {...register('longitude', { valueAsNumber: true })}
                      type="number"
                      step="any"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false)
                      setEditingSpot(null)
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
                    {editingSpot ? 'Update' : 'Create'}
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