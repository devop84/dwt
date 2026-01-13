import axios from 'axios'
import type { AuthResponse, User, Client, Location, Hotel, Guide, Driver, Vehicle, Caterer, Account, EntityType, ThirdParty } from '../types'

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
