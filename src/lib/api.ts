import axios from 'axios'
import type { AuthResponse, User } from '../types'

// Determine API base URL
// IMPORTANT: On Vercel production, always use relative path '/api'
// Vercel serves both frontend and API routes from the same domain
const getApiBaseURL = () => {
  // In production, always use relative path (never localhost!)
  if (import.meta.env.PROD) {
    return '/api'
  }
  
  // In development, check if VITE_API_URL is set
  // Otherwise use relative path (works with vercel dev)
  return import.meta.env.VITE_API_URL || '/api'
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
