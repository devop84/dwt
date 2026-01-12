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

-- Destinations table
CREATE TABLE IF NOT EXISTS destinations (
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
  "destinationId" UUID REFERENCES destinations(id) ON DELETE CASCADE,
  description TEXT,
  "contactNumber" VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  coordinates VARCHAR(255),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Guides table
CREATE TABLE IF NOT EXISTS guides (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  "contactNumber" VARCHAR(50),
  email VARCHAR(255),
  "destinationId" UUID REFERENCES destinations(id) ON DELETE CASCADE,
  languages VARCHAR(255),
  note TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  "contactNumber" VARCHAR(50),
  email VARCHAR(255),
  "destinationId" UUID REFERENCES destinations(id) ON DELETE CASCADE,
  languages VARCHAR(255),
  vehicle VARCHAR(50),
  note TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Accounts table (polymorphic relationship - supports bank accounts, online services, and cash)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY,
  "entityType" VARCHAR(50) NOT NULL,
  "entityId" UUID NOT NULL,
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
  CONSTRAINT check_entity_type CHECK ("entityType" IN ('client', 'hotel', 'guide', 'driver')),
  CONSTRAINT check_account_type CHECK ("accountType" IN ('bank', 'cash', 'online'))
);
