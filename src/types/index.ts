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

export interface Location {
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
  locationId: string
  description: string | null
  contactNumber: string | null
  email: string | null
  address: string | null
  coordinates: string | null
  createdAt: string
  updatedAt: string
}

export interface Staff {
  id: string
  name: string
  contactNumber: string | null
  email: string | null
  locationId: string
  languages: string | null
  note: string | null
  createdAt: string
  updatedAt: string
  locationName?: string
}

export interface Vehicle {
  id: string
  type: 'car4x4' | 'boat' | 'quadbike' | 'carSedan' | 'outro'
  vehicleOwner: 'company' | 'third-party' | 'hotel'
  locationId: string | null
  thirdPartyId: string | null
  hotelId: string | null
  note: string | null
  createdAt: string
  updatedAt: string
  locationName?: string
  thirdPartyName?: string
  hotelName?: string
}

export interface ThirdParty {
  id: string
  name: string
  locationId: string | null
  contactNumber: string | null
  email: string | null
  note: string | null
  createdAt: string
  updatedAt: string
  locationName?: string
}

export type EntityType = 'client' | 'hotel' | 'staff' | 'driver' | 'company' | 'third-party' | 'vehicle'

export type AccountType = 'bank' | 'cash' | 'online' | 'other'

export interface Account {
  id: string
  entityType: EntityType
  entityId: string | null
  accountType: AccountType
  accountHolderName: string
  bankName: string | null
  accountNumber: string | null
  iban: string | null
  swiftBic: string | null
  routingNumber: string | null
  currency: string | null
  serviceName: string | null
  isPrimary: boolean
  note: string | null
  createdAt: string
  updatedAt: string
}

// Route types
export type RouteStatus = 'draft' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'
export type LogisticsType = 'airport-transfer' | 'support-vehicle' | 'hotel-client' | 'hotel-staff' | 'lunch' | 'third-party' | 'extra-cost'
export type EntityTypeForLogistics = 'vehicle' | 'hotel' | 'third-party' | 'location'
export type ParticipantRole = 'client' | 'guide-captain' | 'guide-tail' | 'staff'
export type AccommodationGroupType = 'client' | 'staff'
export type RoomType = 'single' | 'double' | 'twin' | 'triple'
export type TransactionType = 'payment' | 'expense' | 'refund'
export type TransactionCategory = 'hotel' | 'transport' | 'food' | 'third-party' | 'vehicle' | 'other'

export interface Route {
  id: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  duration: number | null
  status: RouteStatus
  totalDistance: number | null
  estimatedCost: number
  actualCost: number
  currency: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface RouteSegment {
  id: string
  routeId: string
  dayNumber: number
  segmentDate: string | null
  fromDestinationId: string | null
  toDestinationId: string | null
  overnightLocationId?: string | null
  distance: number
  segmentOrder: number
  notes: string | null
  createdAt: string
  updatedAt: string
  fromDestinationName?: string
  toDestinationName?: string
  overnightLocationName?: string
  stops?: RouteSegmentStop[]
}

export interface RouteSegmentStop {
  id: string
  segmentId: string
  locationId: string
  stopOrder: number
  notes: string | null
  createdAt: string
  updatedAt: string
  locationName?: string
}

export interface RouteLogistics {
  id: string
  routeId: string
  segmentId: string | null
  logisticsType: LogisticsType
  entityId: string | null
  entityType: EntityTypeForLogistics
  itemName?: string | null
  quantity: number
  cost: number
  date: string | null
  driverPilotName: string | null
  isOwnVehicle: boolean
  vehicleType: Vehicle['type'] | null
  notes: string | null
  createdAt: string
  updatedAt: string
  entityName?: string
}

export interface RouteSegmentAccommodationRoom {
  id: string
  accommodationId: string
  roomType: RoomType
  roomLabel: string | null
  isCouple: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
  participants: RouteParticipant[]
}

export interface RouteSegmentAccommodation {
  id: string
  segmentId: string
  hotelId: string
  groupType: AccommodationGroupType
  notes: string | null
  createdAt: string
  updatedAt: string
  hotelName?: string
  rooms: RouteSegmentAccommodationRoom[]
}

export interface RouteParticipant {
  id: string
  routeId: string
  clientId: string | null
  guideId: string | null
  role: ParticipantRole
  notes: string | null
  createdAt: string
  updatedAt: string
  clientName?: string
  guideName?: string
  segmentIds?: string[] // Array of segment IDs this participant is assigned to
}

export interface RouteTransaction {
  id: string
  routeId: string
  segmentId: string | null
  transactionType: TransactionType
  category: TransactionCategory
  amount: number
  currency: string
  fromAccountId: string | null
  toAccountId: string | null
  description: string | null
  snapshotData: Record<string, any>
  transactionDate: string
  notes: string | null
  createdAt: string
  fromAccountName?: string
  toAccountName?: string
}

export interface RouteTransfer {
  id: string
  routeId: string
  transferDate: string
  fromLocationId: string
  toLocationId: string
  totalCost: number
  notes: string | null
  createdAt: string
  updatedAt: string
  fromLocationName?: string
  toLocationName?: string
  vehicles?: RouteTransferVehicle[]
  participants?: RouteTransferParticipant[]
}

export interface RouteTransferVehicle {
  id: string
  transferId: string
  vehicleId: string
  driverPilotName: string | null
  quantity: number
  cost: number
  isOwnVehicle: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
  vehicleName?: string
  vehicleType?: Vehicle['type']
  vehicleOwner?: Vehicle['vehicleOwner']
  hotelName?: string
  thirdPartyName?: string
}

export interface RouteTransferParticipant {
  id: string
  transferId: string
  participantId: string
  createdAt: string
  participantName?: string
  participantRole?: ParticipantRole
}

export interface RouteSegmentParticipant {
  id: string
  segmentId: string
  participantId: string
  createdAt: string
  participantName?: string
  participantRole?: ParticipantRole
}
