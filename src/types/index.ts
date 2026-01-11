export interface User {
  id: string
  email: string
  username: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Client {
  id: string
  name: string
  contactNumber: string | null
  email: string | null
  dateOfBirth: string | null
  nationality: string | null
  note: string | null
  IDNumber: string | null
  createdAt: string
  updatedAt: string
}
