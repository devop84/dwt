import axios from 'axios'
import type { AuthResponse, User, Client, Location, Hotel, Guide, Driver, Vehicle, Caterer, Account, EntityType, ThirdParty, Route, RouteSegment, RouteLogistics, RouteParticipant, RouteTransaction } from '../types'

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

export const guidesApi = {
  getAll: async (): Promise<Guide[]> => {
    const { data } = await api.get<Guide[]>('/guides')
    return data
  },
  getById: async (id: string): Promise<Guide> => {
    const { data } = await api.get<Guide>(`/guides/${id}`)
    return data
  },
  create: async (guide: Omit<Guide, 'id' | 'createdAt' | 'updatedAt' | 'locationName'>): Promise<Guide> => {
    const { data } = await api.post<Guide>('/guides', guide)
    return data
  },
  update: async (id: string, guide: Omit<Guide, 'id' | 'createdAt' | 'updatedAt' | 'locationName'>): Promise<Guide> => {
    const { data } = await api.put<Guide>(`/guides/${id}`, guide)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/guides/${id}`)
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
  create: async (vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'locationName' | 'thirdPartyName'>): Promise<Vehicle> => {
    const { data } = await api.post<Vehicle>('/vehicles', vehicle)
    return data
  },
  update: async (id: string, vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'locationName' | 'thirdPartyName'>): Promise<Vehicle> => {
    const { data } = await api.put<Vehicle>(`/vehicles/${id}`, vehicle)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/vehicles/${id}`)
  },
}

export const caterersApi = {
  getAll: async (): Promise<Caterer[]> => {
    const { data } = await api.get<Caterer[]>('/caterers')
    return data
  },
  getById: async (id: string): Promise<Caterer> => {
    const { data } = await api.get<Caterer>(`/caterers/${id}`)
    return data
  },
  create: async (caterer: Omit<Caterer, 'id' | 'createdAt' | 'updatedAt' | 'locationName'>): Promise<Caterer> => {
    const { data } = await api.post<Caterer>('/caterers', caterer)
    return data
  },
  update: async (id: string, caterer: Omit<Caterer, 'id' | 'createdAt' | 'updatedAt' | 'locationName'>): Promise<Caterer> => {
    const { data } = await api.put<Caterer>(`/caterers/${id}`, caterer)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/caterers/${id}`)
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
  create: async (routeId: string, segment: Omit<RouteSegment, 'id' | 'routeId' | 'segmentDate' | 'createdAt' | 'updatedAt' | 'fromDestinationName' | 'toDestinationName' | 'overnightLocationName'>): Promise<RouteSegment> => {
    const { data } = await api.post<RouteSegment>(`/routes/${routeId}/segments`, segment)
    return data
  },
  update: async (routeId: string, id: string, segment: Partial<Omit<RouteSegment, 'id' | 'routeId' | 'createdAt' | 'updatedAt' | 'fromDestinationName' | 'toDestinationName' | 'overnightLocationName'>>): Promise<RouteSegment> => {
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
  create: async (routeId: string, participant: Omit<RouteParticipant, 'id' | 'routeId' | 'createdAt' | 'updatedAt' | 'clientName' | 'guideName'>): Promise<RouteParticipant> => {
    const { data } = await api.post<RouteParticipant>(`/routes/${routeId}/participants`, participant)
    return data
  },
  delete: async (routeId: string, id: string): Promise<void> => {
    await api.delete(`/routes/${routeId}/participants/${id}`)
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
