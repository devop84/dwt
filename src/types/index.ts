export enum UserRole {
  ADMIN = 'ADMIN',
  GUIDE = 'GUIDE',
  CLIENT = 'CLIENT',
}

export interface User {
  id: string
  email: string
  username?: string
  name: string
  role: UserRole
  phone?: string
  createdAt: string
  updatedAt: string
}

export interface Spot {
  id: string
  name: string
  description?: string
  location: string
  latitude?: number
  longitude?: number
  difficulty?: string
  conditions?: string
  createdAt: string
  updatedAt: string
}

export interface Hotel {
  id: string
  name: string
  description?: string
  address: string
  phone?: string
  email?: string
  rating?: number
  createdAt: string
  updatedAt: string
}

export enum LogisticsType {
  CAR = 'CAR',
  TRANSFER = 'TRANSFER',
  FOOD = 'FOOD',
  BOAT_SUPPORT = 'BOAT_SUPPORT',
  QUAD_BIKE = 'QUAD_BIKE',
  OTHER = 'OTHER',
}

export interface Logistics {
  id: string
  downwinderId: string
  type: LogisticsType
  name: string
  description?: string
  quantity: number
  cost?: number
  provider?: string
  contactInfo?: string
  status: string
  startDate?: string
  endDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Downwinder {
  id: string
  title: string
  description?: string
  startDate: string
  endDate: string
  status: string
  maxClients: number
  createdById: string
  createdBy?: User
  hotelId?: string
  hotel?: Hotel
  spots?: DownwinderSpot[]
  bookings?: Booking[]
  guides?: DownwinderGuide[]
  logistics?: Logistics[]
  createdAt: string
  updatedAt: string
}

export interface DownwinderSpot {
  id: string
  downwinderId: string
  spotId: string
  spot?: Spot
  order: number
  notes?: string
}

export interface DownwinderGuide {
  id: string
  downwinderId: string
  guideId: string
  guide?: User
  role?: string
  notes?: string
}

export interface Booking {
  id: string
  downwinderId: string
  downwinder?: Downwinder
  clientId: string
  client?: User
  status: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  token: string
  user: User
}