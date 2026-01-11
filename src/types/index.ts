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

export interface Destination {
  id: string
  name: string
  coordinates: string | null
  prefeitura: string | null
  state: string | null
  cep: string | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface Hotel {
  id: string
  name: string
  rating: number | null
  priceRange: string | null
  destinationId: string
  description: string | null
  contactNumber: string | null
  email: string | null
  address: string | null
  coordinates: string | null
  createdAt: string
  updatedAt: string
}
