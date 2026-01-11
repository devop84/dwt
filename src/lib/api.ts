import axios from 'axios'
import type { AuthResponse, User } from '../types'

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
