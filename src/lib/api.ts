import axios from 'axios'
import type { User, AuthResponse, Downwinder, Spot, Hotel, Booking, Logistics } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api'),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
    return data
  },

  register: async (email: string, password: string, name: string, role?: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', { email, password, name, role })
    return data
  },

  me: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me')
    return data
  },
}

// Downwinders API
export const downwindersApi = {
  getAll: async (): Promise<Downwinder[]> => {
    const { data } = await api.get<Downwinder[]>('/downwinders')
    return data
  },

  getById: async (id: string): Promise<Downwinder> => {
    const { data } = await api.get<Downwinder>(`/downwinders/${id}`)
    return data
  },

  create: async (downwinder: Partial<Downwinder>): Promise<Downwinder> => {
    const { data } = await api.post<Downwinder>('/downwinders', downwinder)
    return data
  },

  update: async (id: string, downwinder: Partial<Downwinder>): Promise<Downwinder> => {
    const { data } = await api.put<Downwinder>(`/downwinders/${id}`, downwinder)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/downwinders/${id}`)
  },
}

// Spots API
export const spotsApi = {
  getAll: async (): Promise<Spot[]> => {
    const { data } = await api.get<Spot[]>('/spots')
    return data
  },

  getById: async (id: string): Promise<Spot> => {
    const { data } = await api.get<Spot>(`/spots/${id}`)
    return data
  },

  create: async (spot: Partial<Spot>): Promise<Spot> => {
    const { data } = await api.post<Spot>('/spots', spot)
    return data
  },

  update: async (id: string, spot: Partial<Spot>): Promise<Spot> => {
    const { data } = await api.put<Spot>(`/spots/${id}`, spot)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/spots/${id}`)
  },
}

// Hotels API
export const hotelsApi = {
  getAll: async (): Promise<Hotel[]> => {
    const { data } = await api.get<Hotel[]>('/hotels')
    return data
  },

  getById: async (id: string): Promise<Hotel> => {
    const { data } = await api.get<Hotel>(`/hotels/${id}`)
    return data
  },

  create: async (hotel: Partial<Hotel>): Promise<Hotel> => {
    const { data } = await api.post<Hotel>('/hotels', hotel)
    return data
  },

  update: async (id: string, hotel: Partial<Hotel>): Promise<Hotel> => {
    const { data } = await api.put<Hotel>(`/hotels/${id}`, hotel)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/hotels/${id}`)
  },
}

// Clients/Users API
export const clientsApi = {
  getAll: async (): Promise<User[]> => {
    const { data } = await api.get<User[]>('/clients')
    return data
  },

  getById: async (id: string): Promise<User> => {
    const { data } = await api.get<User>(`/clients/${id}`)
    return data
  },

  create: async (client: Partial<User>): Promise<User> => {
    const { data } = await api.post<User>('/clients', client)
    return data
  },

  update: async (id: string, client: Partial<User>): Promise<User> => {
    const { data } = await api.put<User>(`/clients/${id}`, client)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/clients/${id}`)
  },
}

// Bookings API
export const bookingsApi = {
  getAll: async (): Promise<Booking[]> => {
    const { data } = await api.get<Booking[]>('/bookings')
    return data
  },

  getById: async (id: string): Promise<Booking> => {
    const { data } = await api.get<Booking>(`/bookings/${id}`)
    return data
  },

  create: async (booking: Partial<Booking>): Promise<Booking> => {
    const { data } = await api.post<Booking>('/bookings', booking)
    return data
  },

  update: async (id: string, booking: Partial<Booking>): Promise<Booking> => {
    const { data } = await api.put<Booking>(`/bookings/${id}`, booking)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/bookings/${id}`)
  },
}

// Logistics API
export const logisticsApi = {
  getAll: async (downwinderId?: string): Promise<Logistics[]> => {
    const params = downwinderId ? { downwinderId } : {}
    const { data } = await api.get<Logistics[]>('/logistics', { params })
    return data
  },

  getById: async (id: string): Promise<Logistics> => {
    const { data } = await api.get<Logistics>(`/logistics/${id}`)
    return data
  },

  create: async (logistics: Partial<Logistics>): Promise<Logistics> => {
    const { data } = await api.post<Logistics>('/logistics', logistics)
    return data
  },

  update: async (id: string, logistics: Partial<Logistics>): Promise<Logistics> => {
    const { data } = await api.put<Logistics>(`/logistics/${id}`, logistics)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/logistics/${id}`)
  },
}

export default api