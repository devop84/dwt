import axios from 'axios'
import type { AuthResponse, User, Client, Destination, Hotel, Guide, Driver, Caterer, Account, EntityType } from '../types'

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

export const destinationsApi = {
  getAll: async (): Promise<Destination[]> => {
    const { data } = await api.get<Destination[]>('/destinations')
    return data
  },
  getById: async (id: string): Promise<Destination> => {
    const { data } = await api.get<Destination>(`/destinations/${id}`)
    return data
  },
  create: async (destination: Omit<Destination, 'id' | 'createdAt' | 'updatedAt'>): Promise<Destination> => {
    const { data } = await api.post<Destination>('/destinations', destination)
    return data
  },
  update: async (id: string, destination: Omit<Destination, 'id' | 'createdAt' | 'updatedAt'>): Promise<Destination> => {
    const { data } = await api.put<Destination>(`/destinations/${id}`, destination)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/destinations/${id}`)
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
  create: async (guide: Omit<Guide, 'id' | 'createdAt' | 'updatedAt' | 'destinationName'>): Promise<Guide> => {
    const { data } = await api.post<Guide>('/guides', guide)
    return data
  },
  update: async (id: string, guide: Omit<Guide, 'id' | 'createdAt' | 'updatedAt' | 'destinationName'>): Promise<Guide> => {
    const { data } = await api.put<Guide>(`/guides/${id}`, guide)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/guides/${id}`)
  },
}

export const driversApi = {
  getAll: async (): Promise<Driver[]> => {
    const { data } = await api.get<Driver[]>('/drivers')
    return data
  },
  getById: async (id: string): Promise<Driver> => {
    const { data } = await api.get<Driver>(`/drivers/${id}`)
    return data
  },
  create: async (driver: Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'destinationName'>): Promise<Driver> => {
    const { data } = await api.post<Driver>('/drivers', driver)
    return data
  },
  update: async (id: string, driver: Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'destinationName'>): Promise<Driver> => {
    const { data } = await api.put<Driver>(`/drivers/${id}`, driver)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/drivers/${id}`)
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
  create: async (caterer: Omit<Caterer, 'id' | 'createdAt' | 'updatedAt' | 'destinationName'>): Promise<Caterer> => {
    const { data } = await api.post<Caterer>('/caterers', caterer)
    return data
  },
  update: async (id: string, caterer: Omit<Caterer, 'id' | 'createdAt' | 'updatedAt' | 'destinationName'>): Promise<Caterer> => {
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
