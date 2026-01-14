-- Enable UUID extension (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  "contactNumber" VARCHAR(50),
  email VARCHAR(255),
  "dateOfBirth" DATE,
  nationality VARCHAR(100),
  note TEXT,
  "IDNumber" VARCHAR(100),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  coordinates VARCHAR(255),
  prefeitura VARCHAR(255),
  state VARCHAR(100),
  cep VARCHAR(20),
  description TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Hotels table
CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  rating INTEGER,
  "priceRange" VARCHAR(50),
  "locationId" UUID REFERENCES locations(id) ON DELETE CASCADE,
  description TEXT,
  "contactNumber" VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  coordinates VARCHAR(255),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  "contactNumber" VARCHAR(50),
  email VARCHAR(255),
  "locationId" UUID REFERENCES locations(id) ON DELETE CASCADE,
  languages VARCHAR(255),
  note TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  "vehicleOwner" VARCHAR(50) NOT NULL,
  "locationId" UUID REFERENCES locations(id) ON DELETE SET NULL,
  "thirdPartyId" UUID REFERENCES third_parties(id) ON DELETE SET NULL,
  "hotelId" UUID REFERENCES hotels(id) ON DELETE SET NULL,
  note TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_vehicle_type CHECK (type IN ('car4x4', 'boat', 'quadbike', 'carSedan', 'outro')),
  CONSTRAINT check_vehicle_owner CHECK ("vehicleOwner" IN ('company', 'third-party', 'hotel')),
  CONSTRAINT check_vehicle_owner_consistency CHECK (
    ("vehicleOwner" = 'company' AND "thirdPartyId" IS NULL AND "hotelId" IS NULL) OR
    ("vehicleOwner" = 'third-party' AND "thirdPartyId" IS NOT NULL AND "hotelId" IS NULL) OR
    ("vehicleOwner" = 'hotel' AND "thirdPartyId" IS NULL AND "hotelId" IS NOT NULL)
  )
);

-- Third Parties table
CREATE TABLE IF NOT EXISTS third_parties (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  "contactNumber" VARCHAR(50),
  email VARCHAR(255),
  note TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Accounts table (polymorphic relationship - supports bank accounts, online services, and cash)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY,
  "entityType" VARCHAR(50) NOT NULL,
  "entityId" UUID,
  "accountType" VARCHAR(50) NOT NULL DEFAULT 'bank',
  "accountHolderName" VARCHAR(255) NOT NULL,
  "bankName" VARCHAR(255),
  "accountNumber" VARCHAR(100),
  iban VARCHAR(100),
  "swiftBic" VARCHAR(50),
  "routingNumber" VARCHAR(50),
  currency VARCHAR(10),
  "serviceName" VARCHAR(100),
  "isPrimary" BOOLEAN DEFAULT FALSE,
  note TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_entity_type CHECK ("entityType" IN ('client', 'hotel', 'staff', 'vehicle', 'driver', 'company', 'third-party')),
  CONSTRAINT check_account_type CHECK ("accountType" IN ('bank', 'cash', 'online', 'other'))
);
