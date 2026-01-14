import axios from 'axios'
import type { AuthResponse, User, Client, Location, Hotel, Staff, Driver, Vehicle, Account, EntityType, ThirdParty, Route, RouteSegment, RouteSegmentStop, RouteLogistics, RouteParticipant, RouteTransaction, RouteTransfer, RouteTransferVehicle, RouteTransferParticipant, RouteSegmentAccommodation, RouteSegmentAccommodationRoom, RoomType } from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('API Error:', {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    })
    return Promise.reject(error)
  }
)

export const authApi = {
  login: async (identifier: string, password: string): Promise<AuthResponse> => {
    // Backend accepts either email or username, sent as 'email' field for backward compatibility
    const { data } = await api.post<AuthResponse>('/auth/login', { email: identifier, password })
    return data
  },
  register: async (email: string, username: string, password: string, name: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', { email, username, password, name })
    return data
  },
  me: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me')
    return data
  },
}

export const clientsApi = {
  getAll: async (): Promise<Client[]> => {
    const { data } = await api.get<Client[]>('/clients')
    return data
  },
  getById: async (id: string): Promise<Client> => {
    const { data } = await api.get<Client>(`/clients/${id}`)
    return data
  },
  create: async (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> => {
    const { data } = await api.post<Client>('/clients', client)
    return data
  },
  update: async (id: string, client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> => {
    const { data } = await api.put<Client>(`/clients/${id}`, client)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/clients/${id}`)
  },
}

export const locationsApi = {
  getAll: async (): Promise<Location[]> => {
    const { data } = await api.get<Location[]>('/locations')
    return data
  },
  getById: async (id: string): Promise<Location> => {
    const { data } = await api.get<Location>(`/locations/${id}`)
    return data
  },
  create: async (location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>): Promise<Location> => {
    const { data } = await api.post<Location>('/locations', location)
    return data
  },
  update: async (id: string, location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>): Promise<Location> => {
    const { data } = await api.put<Location>(`/locations/${id}`, location)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/locations/${id}`)
  },
}

export const hotelsApi = {
  getAll: async (): Promise<Hotel[]> => {
    const { data } = await api.get<Hotel[]>('/hotels')
    return data
  },
  getById: async (id: string): Promise<Hotel> => {
    const { data } = await api.get<Hotel>(`/hotels/${id}`)
    return data
  },
  create: async (hotel: Omit<Hotel, 'id' | 'createdAt' | 'updatedAt'>): Promise<Hotel> => {
    const { data } = await api.post<Hotel>('/hotels', hotel)
    return data
  },
  update: async (id: string, hotel: Omit<Hotel, 'id' | 'createdAt' | 'updatedAt'>): Promise<Hotel> => {
    const { data } = await api.put<Hotel>(`/hotels/${id}`, hotel)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/hotels/${id}`)
  },
}

export const staffApi = {
  getAll: async (): Promise<Staff[]> => {
    const { data } = await api.get<Staff[]>('/staff')
    return data
  },
  getById: async (id: string): Promise<Staff> => {
    const { data } = await api.get<Staff>(`/staff/${id}`)
    return data
  },
  create: async (staff: Omit<Staff, 'id' | 'createdAt' | 'updatedAt' | 'locationName'>): Promise<Staff> => {
    const { data } = await api.post<Staff>('/staff', staff)
    return data
  },
  update: async (id: string, staff: Partial<Omit<Staff, 'id' | 'createdAt' | 'updatedAt' | 'locationName'>>): Promise<Staff> => {
    const { data } = await api.put<Staff>(`/staff/${id}`, staff)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/staff/${id}`)
  },
}

export const vehiclesApi = {
  getAll: async (): Promise<Vehicle[]> => {
    const { data } = await api.get<Vehicle[]>('/vehicles')
    return data
  },
  getById: async (id: string): Promise<Vehicle> => {
    const { data } = await api.get<Vehicle>(`/vehicles/${id}`)
    return data
  },
  create: async (vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'locationName' | 'thirdPartyName' | 'hotelName'>): Promise<Vehicle> => {
    const { data } = await api.post<Vehicle>('/vehicles', vehicle)
    return data
  },
  update: async (id: string, vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'locationName' | 'thirdPartyName' | 'hotelName'>): Promise<Vehicle> => {
    const { data } = await api.put<Vehicle>(`/vehicles/${id}`, vehicle)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/vehicles/${id}`)
  },
}

export const accountsApi = {
  getAll: async (entityType?: EntityType, entityId?: string): Promise<Account[]> => {
    const params = new URLSearchParams()
    if (entityType) params.append('entityType', entityType)
    if (entityId) params.append('entityId', entityId)
    const queryString = params.toString()
    const { data } = await api.get<Account[]>(`/accounts${queryString ? `?${queryString}` : ''}`)
    return data
  },
  getById: async (id: string): Promise<Account> => {
    const { data } = await api.get<Account>(`/accounts/${id}`)
    return data
  },
  create: async (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> => {
    const { data } = await api.post<Account>('/accounts', account)
    return data
  },
  update: async (id: string, account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> => {
    const { data } = await api.put<Account>(`/accounts/${id}`, account)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/accounts/${id}`)
  },
}

export const thirdPartiesApi = {
  getAll: async (): Promise<ThirdParty[]> => {
    const { data } = await api.get<ThirdParty[]>('/third-parties')
    return data
  },
  getById: async (id: string): Promise<ThirdParty> => {
    const { data } = await api.get<ThirdParty>(`/third-parties/${id}`)
    return data
  },
  create: async (thirdParty: Omit<ThirdParty, 'id' | 'createdAt' | 'updatedAt'>): Promise<ThirdParty> => {
    const { data } = await api.post<ThirdParty>('/third-parties', thirdParty)
    return data
  },
  update: async (id: string, thirdParty: Omit<ThirdParty, 'id' | 'createdAt' | 'updatedAt'>): Promise<ThirdParty> => {
    const { data } = await api.put<ThirdParty>(`/third-parties/${id}`, thirdParty)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/third-parties/${id}`)
  },
}

export const routesApi = {
  getAll: async (params?: { status?: string; startDate?: string; endDate?: string }): Promise<Route[]> => {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)
    const queryString = queryParams.toString()
    const { data } = await api.get<Route[]>(`/routes${queryString ? `?${queryString}` : ''}`)
    return data
  },
  getById: async (id: string): Promise<Route & { segments: RouteSegment[]; logistics: RouteLogistics[]; participants: RouteParticipant[]; transactions: RouteTransaction[] }> => {
    const { data } = await api.get(`/routes/${id}`)
    return data
  },
  create: async (route: Omit<Route, 'id' | 'endDate' | 'duration' | 'totalDistance' | 'createdAt' | 'updatedAt'>): Promise<Route> => {
    const { data } = await api.post<Route>('/routes', route)
    return data
  },
  update: async (id: string, route: Partial<Omit<Route, 'id' | 'endDate' | 'duration' | 'createdAt' | 'updatedAt'>>): Promise<Route> => {
    const { data } = await api.put<Route>(`/routes/${id}`, route)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/routes/${id}`)
  },
  duplicate: async (id: string, name?: string): Promise<Route> => {
    const { data } = await api.post<Route>(`/routes/${id}/duplicate`, { name })
    return data
  },
}

export const routeSegmentsApi = {
  getAll: async (routeId: string): Promise<RouteSegment[]> => {
    const { data } = await api.get<RouteSegment[]>(`/routes/${routeId}/segments`)
    return data
  },
  create: async (routeId: string, segment: Omit<RouteSegment, 'id' | 'routeId' | 'segmentDate' | 'createdAt' | 'updatedAt' | 'fromDestinationName' | 'toDestinationName' | 'stops'>): Promise<RouteSegment> => {
    const { data } = await api.post<RouteSegment>(`/routes/${routeId}/segments`, segment)
    return data
  },
  update: async (routeId: string, id: string, segment: Partial<Omit<RouteSegment, 'id' | 'routeId' | 'createdAt' | 'updatedAt' | 'fromDestinationName' | 'toDestinationName' | 'stops'>>): Promise<RouteSegment> => {
    const { data } = await api.put<RouteSegment>(`/routes/${routeId}/segments/${id}`, segment)
    return data
  },
  delete: async (routeId: string, id: string): Promise<void> => {
    await api.delete(`/routes/${routeId}/segments/${id}`)
  },
  reorder: async (routeId: string, segmentOrders: Array<{ id: string; segmentOrder: number; dayNumber: number }>): Promise<void> => {
    await api.put(`/routes/${routeId}/segments/reorder`, { segmentOrders })
  },
}

export const routeSegmentStopsApi = {
  getAll: async (routeId: string, segmentId: string): Promise<RouteSegmentStop[]> => {
    const { data } = await api.get<RouteSegmentStop[]>(`/routes/${routeId}/segments/${segmentId}/stops`)
    return data
  },
  add: async (routeId: string, segmentId: string, stop: Omit<RouteSegmentStop, 'id' | 'segmentId' | 'createdAt' | 'updatedAt' | 'locationName'>): Promise<RouteSegmentStop> => {
    const { data } = await api.post<RouteSegmentStop>(`/routes/${routeId}/segments/${segmentId}/stops`, stop)
    return data
  },
  delete: async (routeId: string, segmentId: string, stopId: string): Promise<void> => {
    await api.delete(`/routes/${routeId}/segments/${segmentId}/stops/${stopId}`)
  },
  reorder: async (routeId: string, segmentId: string, stopOrders: Array<{ id: string; stopOrder: number }>): Promise<void> => {
    await api.put(`/routes/${routeId}/segments/${segmentId}/stops/reorder`, { stopOrders })
  },
}

export const routeLogisticsApi = {
  getAll: async (routeId: string): Promise<RouteLogistics[]> => {
    const { data } = await api.get<RouteLogistics[]>(`/routes/${routeId}/logistics`)
    return data
  },
  create: async (routeId: string, logistics: Omit<RouteLogistics, 'id' | 'routeId' | 'createdAt' | 'updatedAt' | 'entityName'>): Promise<RouteLogistics> => {
    const { data } = await api.post<RouteLogistics>(`/routes/${routeId}/logistics`, logistics)
    return data
  },
  update: async (routeId: string, id: string, logistics: Partial<Omit<RouteLogistics, 'id' | 'routeId' | 'createdAt' | 'updatedAt' | 'entityName'>>): Promise<RouteLogistics> => {
    const { data } = await api.put<RouteLogistics>(`/routes/${routeId}/logistics/${id}`, logistics)
    return data
  },
  delete: async (routeId: string, id: string): Promise<void> => {
    await api.delete(`/routes/${routeId}/logistics/${id}`)
  },
}

export const routeParticipantsApi = {
  getAll: async (routeId: string): Promise<RouteParticipant[]> => {
    const { data } = await api.get<RouteParticipant[]>(`/routes/${routeId}/participants`)
    return data
  },
  create: async (routeId: string, participant: Omit<RouteParticipant, 'id' | 'routeId' | 'createdAt' | 'updatedAt' | 'clientName' | 'guideName' | 'segmentIds'> & { segmentIds?: string[] }): Promise<RouteParticipant> => {
    const { data } = await api.post<RouteParticipant>(`/routes/${routeId}/participants`, participant)
    return data
  },
  update: async (routeId: string, id: string, participant: Partial<Omit<RouteParticipant, 'id' | 'routeId' | 'createdAt' | 'updatedAt' | 'clientName' | 'guideName'>> & { segmentIds?: string[] }): Promise<RouteParticipant> => {
    const { data } = await api.put<RouteParticipant>(`/routes/${routeId}/participants/${id}`, participant)
    return data
  },
  delete: async (routeId: string, id: string): Promise<void> => {
    await api.delete(`/routes/${routeId}/participants/${id}`)
  },
  updateSegments: async (routeId: string, id: string, segmentIds: string[]): Promise<RouteParticipant> => {
    const { data } = await api.put<RouteParticipant>(`/routes/${routeId}/participants/${id}/segments`, { segmentIds })
    return data
  },
}

export const routeSegmentParticipantsApi = {
  getBySegment: async (routeId: string, segmentId: string): Promise<RouteParticipant[]> => {
    const { data } = await api.get<RouteParticipant[]>(`/routes/${routeId}/segments/${segmentId}/participants`)
    return data
  },
  add: async (routeId: string, segmentId: string, participantId: string): Promise<void> => {
    await api.post(`/routes/${routeId}/segments/${segmentId}/participants`, { participantId })
  },
  remove: async (routeId: string, segmentId: string, participantId: string): Promise<void> => {
    await api.delete(`/routes/${routeId}/segments/${segmentId}/participants/${participantId}`)
  },
}

export const routeSegmentAccommodationsApi = {
  getBySegment: async (routeId: string, segmentId: string): Promise<RouteSegmentAccommodation[]> => {
    const { data } = await api.get<RouteSegmentAccommodation[]>(`/routes/${routeId}/segments/${segmentId}/accommodations`)
    return data
  },
  addHotel: async (routeId: string, segmentId: string, payload: { hotelId: string; groupType: 'client' | 'staff'; notes?: string | null }): Promise<RouteSegmentAccommodation> => {
    const { data } = await api.post<RouteSegmentAccommodation>(`/routes/${routeId}/segments/${segmentId}/accommodations`, payload)
    return data
  },
  removeHotel: async (routeId: string, segmentId: string, accommodationId: string): Promise<void> => {
    await api.delete(`/routes/${routeId}/segments/${segmentId}/accommodations/${accommodationId}`)
  },
  addRoom: async (routeId: string, segmentId: string, accommodationId: string, payload: { roomType: RoomType; roomLabel?: string | null; isCouple?: boolean; participantIds?: string[] }): Promise<RouteSegmentAccommodationRoom> => {
    const { data } = await api.post<RouteSegmentAccommodationRoom>(`/routes/${routeId}/segments/${segmentId}/accommodations/${accommodationId}/rooms`, payload)
    return data
  },
  updateRoom: async (routeId: string, segmentId: string, accommodationId: string, roomId: string, payload: { roomType?: RoomType; roomLabel?: string | null; isCouple?: boolean; participantIds?: string[] }): Promise<RouteSegmentAccommodationRoom> => {
    const { data } = await api.put<RouteSegmentAccommodationRoom>(`/routes/${routeId}/segments/${segmentId}/accommodations/${accommodationId}/rooms/${roomId}`, payload)
    return data
  },
  removeRoom: async (routeId: string, segmentId: string, accommodationId: string, roomId: string): Promise<void> => {
    await api.delete(`/routes/${routeId}/segments/${segmentId}/accommodations/${accommodationId}/rooms/${roomId}`)
  },
}

export const routeTransactionsApi = {
  getAll: async (routeId: string): Promise<RouteTransaction[]> => {
    const { data } = await api.get<RouteTransaction[]>(`/routes/${routeId}/transactions`)
    return data
  },
  create: async (routeId: string, transaction: Omit<RouteTransaction, 'id' | 'routeId' | 'createdAt' | 'fromAccountName' | 'toAccountName'>): Promise<RouteTransaction> => {
    const { data } = await api.post<RouteTransaction>(`/routes/${routeId}/transactions`, transaction)
    return data
  },
}

export const routeTransfersApi = {
  getAll: async (routeId: string): Promise<RouteTransfer[]> => {
    const { data } = await api.get<RouteTransfer[]>(`/routes/${routeId}/transfers`)
    return data
  },
  getById: async (routeId: string, id: string): Promise<RouteTransfer> => {
    const { data } = await api.get<RouteTransfer>(`/routes/${routeId}/transfers/${id}`)
    return data
  },
  create: async (routeId: string, transfer: Omit<RouteTransfer, 'id' | 'routeId' | 'totalCost' | 'createdAt' | 'updatedAt' | 'fromLocationName' | 'toLocationName' | 'vehicles' | 'participants'> & { vehicles?: Omit<RouteTransferVehicle, 'id' | 'transferId' | 'createdAt' | 'updatedAt' | 'vehicleName' | 'vehicleType'>[], participants?: string[] }): Promise<RouteTransfer> => {
    const { data } = await api.post<RouteTransfer>(`/routes/${routeId}/transfers`, transfer)
    return data
  },
  update: async (routeId: string, id: string, transfer: Partial<Omit<RouteTransfer, 'id' | 'routeId' | 'totalCost' | 'createdAt' | 'updatedAt' | 'fromLocationName' | 'toLocationName' | 'vehicles' | 'participants'>>): Promise<RouteTransfer> => {
    const { data } = await api.put<RouteTransfer>(`/routes/${routeId}/transfers/${id}`, transfer)
    return data
  },
  delete: async (routeId: string, id: string): Promise<void> => {
    await api.delete(`/routes/${routeId}/transfers/${id}`)
  },
  addVehicle: async (routeId: string, transferId: string, vehicle: Omit<RouteTransferVehicle, 'id' | 'transferId' | 'createdAt' | 'updatedAt' | 'vehicleName' | 'vehicleType'>): Promise<RouteTransferVehicle> => {
    const { data } = await api.post<RouteTransferVehicle>(`/routes/${routeId}/transfers/${transferId}/vehicles`, vehicle)
    return data
  },
  removeVehicle: async (routeId: string, transferId: string, id: string): Promise<void> => {
    await api.delete(`/routes/${routeId}/transfers/${transferId}/vehicles/${id}`)
  },
  addParticipant: async (routeId: string, transferId: string, participantId: string): Promise<RouteTransferParticipant> => {
    const { data } = await api.post<RouteTransferParticipant>(`/routes/${routeId}/transfers/${transferId}/participants`, { participantId })
    return data
  },
  removeParticipant: async (routeId: string, transferId: string, id: string): Promise<void> => {
    await api.delete(`/routes/${routeId}/transfers/${transferId}/participants/${id}`)
  },
}
