import axios from 'axios'
import type { AuthResponse, User } from '../types'

// Determine API base URL
// In production: use /api (served by Vercel)
// In development with Vite only: will fail (need vercel dev)
// In development with vercel dev: use /api (proxied correctly)
const getApiBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // For Vercel dev or production, use relative path
  return '/api'
}

const api = axios.create({
  baseURL: getApiBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
    return data
  },
  register: async (email: string, password: string, name: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', { email, password, name })
    return data
  },
  me: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me')
    return data
  },
}
