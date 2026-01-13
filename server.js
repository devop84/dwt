import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'

const app = express()
const PORT = 5000
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

// Initialize database
let dbInitialized = false
async function initDb() {
  if (dbInitialized) return
  try {
    // Enable UUID extension if not exists (for older PostgreSQL versions)
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
    
    // Create users table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    
    // Create clients table if not exists
    await pool.query(`
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
      )
    `)
    
    // Create locations table if not exists
    await pool.query(`
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
      )
    `)
    
    // Add prefeitura, state, and cep columns if they don't exist (migration for existing tables)
    try {
      await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS prefeitura VARCHAR(255)`)
      await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS state VARCHAR(100)`)
      await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS cep VARCHAR(20)`)
    } catch (migrationError) {
      console.log('Migration note:', migrationError.message)
    }
    
    // Add username column if it doesn't exist (migration for existing tables)
    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE
      `)
      // Update existing users to set username = name if username is null
      await pool.query(`
        UPDATE users SET username = name WHERE username IS NULL
      `)
      // Make username NOT NULL if it's still nullable
      await pool.query(`
        DO $$ 
        BEGIN 
          IF EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'users' AND column_name = 'username' AND is_nullable = 'YES') THEN
            ALTER TABLE users ALTER COLUMN username SET NOT NULL;
          END IF;
        END $$;
      `)
    } catch (migrationError) {
      console.log('Migration note:', migrationError.message)
    }
    
    // Create hotels table if not exists
    await pool.query(`
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
      )
    `)
    
    // Create guides table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guides (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "contactNumber" VARCHAR(50),
        email VARCHAR(255),
        "locationId" UUID REFERENCES locations(id) ON DELETE CASCADE,
        languages VARCHAR(255),
        note TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    
    // Create vehicles table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id UUID PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        "vehicleOwner" VARCHAR(50) NOT NULL,
        "locationId" UUID REFERENCES locations(id) ON DELETE SET NULL,
        "thirdPartyId" UUID REFERENCES third_parties(id) ON DELETE SET NULL,
        note TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT check_vehicle_type CHECK (type IN ('car4x4', 'boat', 'quadbike', 'carSedan', 'outro')),
        CONSTRAINT check_vehicle_owner CHECK ("vehicleOwner" IN ('company', 'third-party'))
      )
    `)

    // Create caterers table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS caterers (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "contactNumber" VARCHAR(50),
        email VARCHAR(255),
        type VARCHAR(50) NOT NULL,
        "locationId" UUID REFERENCES locations(id) ON DELETE SET NULL,
        note TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT check_caterer_type CHECK (type IN ('restaurant', 'hotel', 'particular'))
      )
    `)
    
    // Create third_parties table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS third_parties (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "contactNumber" VARCHAR(50),
        email VARCHAR(255),
        note TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    
    // Create accounts table if not exists
    await pool.query(`
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
        CONSTRAINT check_entity_type CHECK ("entityType" IN ('client', 'hotel', 'guide', 'driver', 'caterer', 'company', 'third-party')),
        CONSTRAINT check_account_type CHECK ("accountType" IN ('bank', 'cash', 'online', 'other'))
      )
    `)
    
    // Add accountType column if it doesn't exist (migration for existing tables)
    try {
      await pool.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "accountType" VARCHAR(50) DEFAULT 'bank'`)
      // Migrate isOnlineService to accountType
      await pool.query(`
        UPDATE accounts 
        SET "accountType" = CASE 
          WHEN "isOnlineService" = TRUE THEN 'online'
          ELSE 'bank'
        END
        WHERE "accountType" IS NULL OR "accountType" = 'bank'
      `)
      // Make accountType NOT NULL after migration
      await pool.query(`ALTER TABLE accounts ALTER COLUMN "accountType" SET NOT NULL`)
      await pool.query(`ALTER TABLE accounts ALTER COLUMN "accountType" SET DEFAULT 'bank'`)
    } catch (migrationError) {
      // Migration might fail if column already exists, that's fine
    }
    
    // Make bankName nullable (for cash accounts)
    try {
      await pool.query(`ALTER TABLE accounts ALTER COLUMN "bankName" DROP NOT NULL`)
    } catch (migrationError) {
      // Column might already be nullable, that's fine
    }
    
    // Add serviceName column if it doesn't exist
    try {
      await pool.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "serviceName" VARCHAR(100)`)
    } catch (migrationError) {
      // Column might already exist, that's fine
    }
    
    dbInitialized = true
    console.log('✅ Database initialized')
  } catch (error) {
    console.error('❌ DB init error:', error.message)
  }
}

// Middleware
app.use(cors())
app.use(express.json())

// Initialize DB on startup
initDb()

// Helper functions
async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword)
}

function generateToken(userId, email) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' })
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API server is running' })
})

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version')
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      )
    `)
    
    res.json({
      connected: true,
      currentTime: result.rows[0].current_time,
      pgVersion: result.rows[0].pg_version.split(',')[0],
      usersTableExists: tableCheck.rows[0].exists
    })
  } catch (error) {
    res.status(500).json({ 
      connected: false, 
      error: error.message 
    })
  }
})

// Register
app.post('/api/auth/register', async (req, res) => {
  await initDb()
  
  try {
    const { email, username, password, name } = req.body

    if (!email || !username || !password || !name) {
      return res.status(400).json({ message: 'Email, username, password, and name are required' })
    }

    // Check if email already exists
    const existingEmail = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' })
    }

    // Check if username already exists
    const existingUsername = await pool.query('SELECT * FROM users WHERE username = $1', [username])
    if (existingUsername.rows.length > 0) {
      return res.status(400).json({ message: 'Username is already taken' })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Generate UUID
    const userId = randomUUID()

    // Create user
    const result = await pool.query(
      'INSERT INTO users (id, email, username, password, name) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username, name, "createdAt", "updatedAt"',
      [userId, email, username, hashedPassword, name]
    )
    const user = result.rows[0]

    const token = generateToken(user.id, user.email)

    res.status(201).json({
      token,
      user,
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: error.message || 'Registration failed' })
  }
})

// Login - accepts either email or username
app.post('/api/auth/login', async (req, res) => {
  await initDb()
  
  try {
    const { email, username, password } = req.body
    
    // Support both 'email' and 'username' field names from frontend
    const identifier = email || username

    console.log('Login attempt:', { email, username, identifier: identifier?.substring(0, 10), hasPassword: !!password })

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email/Username and password are required' })
    }

    // Try to find user by email or username - case-insensitive
    const trimmedIdentifier = identifier.trim()
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)',
      [trimmedIdentifier]
    )
    const user = result.rows[0]

    if (!user) {
      console.log(`❌ Login failed - identifier not found: "${trimmedIdentifier}"`)
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    
    console.log(`✅ User found: ${user.email} (username: ${user.username})`)

    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      console.log(`❌ Login failed - password incorrect for: ${trimmedIdentifier}`)
      return res.status(401).json({ message: 'Invalid credentials' })
    }
    
    console.log(`✅ Password verified for: ${user.username}`)

    const token = generateToken(user.id, user.email)
    const { password: _, ...userWithoutPassword } = user

    res.json({
      token,
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: error.message || 'Authentication failed' })
  }
})

// Get current user
app.get('/api/auth/me', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const result = await pool.query(
      'SELECT id, email, username, name, "createdAt", "updatedAt" FROM users WHERE id = $1',
      [decoded.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Me error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch user' })
  }
})

// Get all clients
app.get('/api/clients', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const result = await pool.query(`
      SELECT 
        id,
        name,
        "contactNumber",
        email,
        "dateOfBirth",
        nationality,
        note,
        "IDNumber",
        "createdAt",
        "updatedAt"
      FROM clients
      ORDER BY "createdAt" DESC
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Clients error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch clients' })
  }
})

// Create a new client
app.post('/api/clients', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { name, contactNumber, email, dateOfBirth, nationality, note, IDNumber } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    const clientId = randomUUID()
    const result = await pool.query(
      `INSERT INTO clients (id, name, "contactNumber", email, "dateOfBirth", nationality, note, "IDNumber")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, "contactNumber", email, "dateOfBirth", nationality, note, "IDNumber", "createdAt", "updatedAt"`,
      [clientId, name, contactNumber || null, email || null, dateOfBirth || null, nationality || null, note || null, IDNumber || null]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create client error:', error)
    res.status(500).json({ message: error.message || 'Failed to create client' })
  }
})

// Get a single client
app.get('/api/clients/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params

    const result = await pool.query(
      `SELECT 
        id,
        name,
        "contactNumber",
        email,
        "dateOfBirth",
        nationality,
        note,
        "IDNumber",
        "createdAt",
        "updatedAt"
      FROM clients
      WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    res.status(200).json(result.rows[0])
  } catch (error) {
    console.error('Get client error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch client' })
  }
})

// Update a client
app.put('/api/clients/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params
    const { name, contactNumber, email, dateOfBirth, nationality, note, IDNumber } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    // Check if client exists
    const existing = await pool.query('SELECT id FROM clients WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    const result = await pool.query(
      `UPDATE clients 
       SET name = $1, "contactNumber" = $2, email = $3, "dateOfBirth" = $4, nationality = $5, note = $6, "IDNumber" = $7, "updatedAt" = NOW()
       WHERE id = $8
       RETURNING id, name, "contactNumber", email, "dateOfBirth", nationality, note, "IDNumber", "createdAt", "updatedAt"`,
      [name, contactNumber || null, email || null, dateOfBirth || null, nationality || null, note || null, IDNumber || null, id]
    )

    res.status(200).json(result.rows[0])
  } catch (error) {
    console.error('Update client error:', error)
    res.status(500).json({ message: error.message || 'Failed to update client' })
  }
})

// Delete a client
app.delete('/api/clients/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params

    // Check if client exists
    const existing = await pool.query('SELECT id FROM clients WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' })
    }

    await pool.query('DELETE FROM clients WHERE id = $1', [id])

    res.status(200).json({ message: 'Client deleted successfully' })
  } catch (error) {
    console.error('Delete client error:', error)
    res.status(500).json({ message: error.message || 'Failed to delete client' })
  }
})

// Get all locations
app.get('/api/locations', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const result = await pool.query(`
      SELECT 
        id,
        name,
        coordinates,
        prefeitura,
        state,
        cep,
        description,
        "createdAt",
        "updatedAt"
      FROM locations
      ORDER BY name ASC
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Destinations error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch locations' })
  }
})

// Create a new destination
app.post('/api/locations', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { name, coordinates, prefeitura, state, cep, description } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    const locationId = randomUUID()
    const result = await pool.query(
      `INSERT INTO locations (id, name, coordinates, prefeitura, state, cep, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, coordinates, prefeitura, state, cep, description, "createdAt", "updatedAt"`,
      [locationId, name, coordinates || null, prefeitura || null, state || null, cep || null, description || null]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create destination error:', error)
    res.status(500).json({ message: error.message || 'Failed to create destination' })
  }
})

// Get a single destination
app.get('/api/locations/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params

    const result = await pool.query(
      `SELECT 
        id,
        name,
        coordinates,
        prefeitura,
        state,
        cep,
        description,
        "createdAt",
        "updatedAt"
      FROM locations
      WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Destination not found' })
    }

    res.status(200).json(result.rows[0])
  } catch (error) {
    console.error('Get destination error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch destination' })
  }
})

// Update a destination
app.put('/api/locations/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params
    const { name, coordinates, prefeitura, state, cep, description } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    // Check if destination exists
    const existing = await pool.query('SELECT id FROM locations WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Destination not found' })
    }

    const result = await pool.query(
      `UPDATE locations 
       SET name = $1, coordinates = $2, prefeitura = $3, state = $4, cep = $5, description = $6, "updatedAt" = NOW()
       WHERE id = $7
       RETURNING id, name, coordinates, prefeitura, state, cep, description, "createdAt", "updatedAt"`,
      [name, coordinates || null, prefeitura || null, state || null, cep || null, description || null, id]
    )

    res.status(200).json(result.rows[0])
  } catch (error) {
    console.error('Update destination error:', error)
    res.status(500).json({ message: error.message || 'Failed to update destination' })
  }
})

// Delete a destination
app.delete('/api/locations/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params

    // Check if destination exists
    const existing = await pool.query('SELECT id FROM locations WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Destination not found' })
    }

    await pool.query('DELETE FROM locations WHERE id = $1', [id])

    res.status(200).json({ message: 'Destination deleted successfully' })
  } catch (error) {
    console.error('Delete destination error:', error)
    res.status(500).json({ message: error.message || 'Failed to delete destination' })
  }
})

// Get all hotels
app.get('/api/hotels', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const result = await pool.query(`
      SELECT 
        h.id,
        h.name,
        h.rating,
        h."priceRange",
        h."locationId",
          h.description,
        h."contactNumber",
        h.email,
        h.address,
        h.coordinates,
        h."createdAt",
        h."updatedAt",
        d.name as "locationName"
      FROM hotels h
      LEFT JOIN locations d ON h."locationId" = d.id
      ORDER BY h.name ASC
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Hotels error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch hotels' })
  }
})

// Create a new hotel
app.post('/api/hotels', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { name, rating, priceRange, locationId, description, contactNumber, email, address, coordinates } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    if (!locationId) {
      return res.status(400).json({ message: 'Destination is required' })
    }

    const hotelId = randomUUID()
    const result = await pool.query(
      `INSERT INTO hotels (id, name, rating, "priceRange", "locationId", description, "contactNumber", email, address, coordinates)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, rating, "priceRange", "locationId", description, "contactNumber", email, address, coordinates, "createdAt", "updatedAt"`,
      [hotelId, name, rating || null, priceRange || null, locationId, description || null, contactNumber || null, email || null, address || null, coordinates || null]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create hotel error:', error)
    res.status(500).json({ message: error.message || 'Failed to create hotel' })
  }
})

// Get a single hotel
app.get('/api/hotels/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params
    const result = await pool.query(
      `SELECT 
        h.id,
        h.name,
        h.rating,
        h."priceRange",
        h."locationId",
          h.description,
        h."contactNumber",
        h.email,
        h.address,
        h.coordinates,
        h."createdAt",
        h."updatedAt",
        d.name as "locationName"
      FROM hotels h
      LEFT JOIN locations d ON h."locationId" = d.id
      WHERE h.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Hotel not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Hotel error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch hotel' })
  }
})

// Update a hotel
app.put('/api/hotels/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params
    const { name, rating, priceRange, locationId, description, contactNumber, email, address, coordinates } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    if (!locationId) {
      return res.status(400).json({ message: 'Destination is required' })
    }

    // Check if hotel exists
    const existing = await pool.query('SELECT id FROM hotels WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Hotel not found' })
    }

    const result = await pool.query(
      `UPDATE hotels 
       SET name = $1, rating = $2, "priceRange" = $3, "locationId" = $4, description = $5, 
           "contactNumber" = $6, email = $7, address = $8, coordinates = $9, "updatedAt" = NOW()
       WHERE id = $10
       RETURNING id, name, rating, "priceRange", "locationId", description, "contactNumber", email, address, coordinates, "createdAt", "updatedAt"`,
      [name, rating || null, priceRange || null, locationId, description || null, contactNumber || null, email || null, address || null, coordinates || null, id]
    )

    res.status(200).json(result.rows[0])
  } catch (error) {
    console.error('Update hotel error:', error)
    res.status(500).json({ message: error.message || 'Failed to update hotel' })
  }
})

// Delete a hotel
app.delete('/api/hotels/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params

    // Check if hotel exists
    const existing = await pool.query('SELECT id FROM hotels WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Hotel not found' })
    }

    await pool.query('DELETE FROM hotels WHERE id = $1', [id])

    res.status(200).json({ message: 'Hotel deleted successfully' })
  } catch (error) {
    console.error('Delete hotel error:', error)
    res.status(500).json({ message: error.message || 'Failed to delete hotel' })
  }
})

// Get all guides
app.get('/api/guides', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const result = await pool.query(`
      SELECT 
        g.id,
        g.name,
        g."contactNumber",
        g.email,
        g."locationId",
        g.languages,
        g.note,
        g."createdAt",
        g."updatedAt",
        d.name as "locationName"
      FROM guides g
      LEFT JOIN locations d ON g."locationId" = d.id
      ORDER BY g.name ASC
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Guides error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch guides' })
  }
})

// Create a new guide
app.post('/api/guides', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { name, contactNumber, email, locationId, languages, note } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    if (!locationId) {
      return res.status(400).json({ message: 'Destination is required' })
    }

    const guideId = randomUUID()
    const result = await pool.query(
      `INSERT INTO guides (id, name, "contactNumber", email, "locationId", languages, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, "contactNumber", email, "locationId", languages, note, "createdAt", "updatedAt"`,
      [guideId, name, contactNumber || null, email || null, locationId, languages || null, note || null]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create guide error:', error)
    res.status(500).json({ message: error.message || 'Failed to create guide' })
  }
})

// Get a single guide
app.get('/api/guides/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params
    const result = await pool.query(
      `SELECT 
        g.id,
        g.name,
        g."contactNumber",
        g.email,
        g."locationId",
        g.languages,
        g.note,
        g."createdAt",
        g."updatedAt",
        d.name as "locationName"
      FROM guides g
      LEFT JOIN locations d ON g."locationId" = d.id
      WHERE g.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Guide not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Guide error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch guide' })
  }
})

// Update a guide
app.put('/api/guides/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params
    const { name, contactNumber, email, locationId, languages, note } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    if (!locationId) {
      return res.status(400).json({ message: 'Destination is required' })
    }

    // Check if guide exists
    const existing = await pool.query('SELECT id FROM guides WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Guide not found' })
    }

    const result = await pool.query(
      `UPDATE guides 
       SET name = $1, "contactNumber" = $2, email = $3, "locationId" = $4, languages = $5, note = $6, "updatedAt" = NOW()
       WHERE id = $7
       RETURNING id, name, "contactNumber", email, "locationId", languages, note, "createdAt", "updatedAt"`,
      [name, contactNumber || null, email || null, locationId, languages || null, note || null, id]
    )

    res.status(200).json(result.rows[0])
  } catch (error) {
    console.error('Update guide error:', error)
    res.status(500).json({ message: error.message || 'Failed to update guide' })
  }
})

// Delete a guide
app.delete('/api/guides/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params

    // Check if guide exists
    const existing = await pool.query('SELECT id FROM guides WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Guide not found' })
    }

    await pool.query('DELETE FROM guides WHERE id = $1', [id])

    res.status(200).json({ message: 'Guide deleted successfully' })
  } catch (error) {
    console.error('Delete guide error:', error)
    res.status(500).json({ message: error.message || 'Failed to delete guide' })
  }
})

// Get all vehicles
app.get('/api/vehicles', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const result = await pool.query(`
      SELECT 
        v.id,
        v.type,
        v."vehicleOwner",
        v."locationId",
        v."thirdPartyId",
        v.note,
        v."createdAt",
        v."updatedAt",
        dest.name as "locationName",
        tp.name as "thirdPartyName"
      FROM vehicles v
      LEFT JOIN locations dest ON v."locationId" = dest.id
      LEFT JOIN third_parties tp ON v."thirdPartyId" = tp.id
      ORDER BY v.type ASC, v."createdAt" DESC
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Vehicles error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch vehicles' })
  }
})

// Create a new vehicle
app.post('/api/vehicles', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { type, vehicleOwner, locationId, thirdPartyId, note } = req.body

    if (!type) {
      return res.status(400).json({ message: 'Type is required' })
    }

    if (!vehicleOwner) {
      return res.status(400).json({ message: 'Vehicle owner is required' })
    }

    if (!['car4x4', 'boat', 'quadbike', 'carSedan', 'outro'].includes(type)) {
      return res.status(400).json({ message: 'Invalid vehicle type' })
    }

    if (!['company', 'third-party'].includes(vehicleOwner)) {
      return res.status(400).json({ message: 'Invalid vehicle owner' })
    }

    if (vehicleOwner === 'third-party' && !thirdPartyId) {
      return res.status(400).json({ message: 'Third party ID is required when vehicle owner is third-party' })
    }

    const vehicleId = randomUUID()
    const result = await pool.query(
      `INSERT INTO vehicles (id, type, "vehicleOwner", "locationId", "thirdPartyId", note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [vehicleId, type, vehicleOwner, locationId || null, vehicleOwner === 'third-party' ? thirdPartyId : null, note || null]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create vehicle error:', error)
    res.status(500).json({ message: error.message || 'Failed to create vehicle' })
  }
})

// Get a single vehicle
app.get('/api/vehicles/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params
    const result = await pool.query(
      `SELECT 
        v.id,
        v.type,
        v."vehicleOwner",
        v."locationId",
        v."thirdPartyId",
        v.note,
        v."createdAt",
        v."updatedAt",
        dest.name as "locationName",
        tp.name as "thirdPartyName"
      FROM vehicles v
      LEFT JOIN locations dest ON v."locationId" = dest.id
      LEFT JOIN third_parties tp ON v."thirdPartyId" = tp.id
      WHERE v.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Vehicle error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch vehicle' })
  }
})

// Update a vehicle
app.put('/api/vehicles/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params
    const { type, vehicleOwner, locationId, thirdPartyId, note } = req.body

    if (!type) {
      return res.status(400).json({ message: 'Type is required' })
    }

    if (!vehicleOwner) {
      return res.status(400).json({ message: 'Vehicle owner is required' })
    }

    if (!['car4x4', 'boat', 'quadbike', 'carSedan', 'outro'].includes(type)) {
      return res.status(400).json({ message: 'Invalid vehicle type' })
    }

    if (!['company', 'third-party'].includes(vehicleOwner)) {
      return res.status(400).json({ message: 'Invalid vehicle owner' })
    }

    if (vehicleOwner === 'third-party' && !thirdPartyId) {
      return res.status(400).json({ message: 'Third party ID is required when vehicle owner is third-party' })
    }

    // Check if vehicle exists
    const existing = await pool.query('SELECT id FROM vehicles WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' })
    }

    const result = await pool.query(
      `UPDATE vehicles 
       SET type = $1, "vehicleOwner" = $2, "locationId" = $3, "thirdPartyId" = $4, note = $5, "updatedAt" = NOW()
       WHERE id = $6
       RETURNING *`,
      [type, vehicleOwner, locationId || null, vehicleOwner === 'third-party' ? thirdPartyId : null, note || null, id]
    )

    res.status(200).json(result.rows[0])
  } catch (error) {
    console.error('Update vehicle error:', error)
    res.status(500).json({ message: error.message || 'Failed to update vehicle' })
  }
})

// Delete a vehicle
app.delete('/api/vehicles/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params

    // Check if driver exists
    const existing = await pool.query('SELECT id FROM vehicles WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' })
    }

    await pool.query('DELETE FROM vehicles WHERE id = $1', [id])

    res.status(200).json({ message: 'Vehicle deleted successfully' })
  } catch (error) {
    console.error('Delete vehicle error:', error)
    res.status(500).json({ message: error.message || 'Failed to delete vehicle' })
  }
})

// Get all caterers
app.get('/api/caterers', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const result = await pool.query(`
      SELECT c.*, d.name as "locationName"
      FROM caterers c
      LEFT JOIN locations d ON c."locationId" = d.id
      ORDER BY c.name
    `)
    res.json(result.rows)
  } catch (error) {
    console.error('Caterers error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch caterers' })
  }
})

// Create a new caterer
app.post('/api/caterers', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { name, contactNumber, email, type, locationId, note } = req.body

    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' })
    }

    if (!['restaurant', 'hotel', 'particular'].includes(type)) {
      return res.status(400).json({ message: 'Type must be restaurant, hotel, or particular' })
    }

    const catererId = randomUUID()
    const result = await pool.query(
      `INSERT INTO caterers (id, name, "contactNumber", email, type, "locationId", note)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [catererId, name, contactNumber || null, email || null, type, locationId || null, note || null]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create caterer error:', error)
    res.status(500).json({ message: error.message || 'Failed to create caterer' })
  }
})

// Get a single caterer
app.get('/api/caterers/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params
    const result = await pool.query(`
      SELECT c.*, d.name as "locationName"
      FROM caterers c
      LEFT JOIN locations d ON c."locationId" = d.id
      WHERE c.id = $1
    `, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Caterer not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Caterer error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch caterer' })
  }
})

// Update a caterer
app.put('/api/caterers/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params
    const { name, contactNumber, email, type, locationId, note } = req.body

    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' })
    }

    if (!['restaurant', 'hotel', 'particular'].includes(type)) {
      return res.status(400).json({ message: 'Type must be restaurant, hotel, or particular' })
    }

    // Check if caterer exists
    const existing = await pool.query('SELECT id FROM caterers WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Caterer not found' })
    }

    const result = await pool.query(
      `UPDATE caterers 
       SET name = $1, "contactNumber" = $2, email = $3, type = $4, "locationId" = $5, note = $6, "updatedAt" = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, contactNumber || null, email || null, type, locationId || null, note || null, id]
    )

    res.status(200).json(result.rows[0])
  } catch (error) {
    console.error('Update caterer error:', error)
    res.status(500).json({ message: error.message || 'Failed to update caterer' })
  }
})

// Delete a caterer
app.delete('/api/caterers/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params

    // Check if caterer exists
    const existing = await pool.query('SELECT id FROM caterers WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Caterer not found' })
    }

    await pool.query('DELETE FROM caterers WHERE id = $1', [id])

    res.status(200).json({ message: 'Caterer deleted successfully' })
  } catch (error) {
    console.error('Delete caterer error:', error)
    res.status(500).json({ message: error.message || 'Failed to delete caterer' })
  }
})

// Third Parties API routes
// Get all third parties
app.get('/api/third-parties', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const result = await pool.query(`
      SELECT id, name, "contactNumber", email, note, "createdAt", "updatedAt"
      FROM third_parties
      ORDER BY "createdAt" DESC
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Third parties error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch third parties' })
  }
})

// Create a new third party
app.post('/api/third-parties', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { name, contactNumber, email, note } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    const thirdPartyId = randomUUID()
    const result = await pool.query(
      `INSERT INTO third_parties (id, name, "contactNumber", email, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, "contactNumber", email, note, "createdAt", "updatedAt"`,
      [thirdPartyId, name, contactNumber || null, email || null, note || null]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create third party error:', error)
    res.status(500).json({ message: error.message || 'Failed to create third party' })
  }
})

// Get a single third party
app.get('/api/third-parties/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params
    const result = await pool.query('SELECT * FROM third_parties WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Third party not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Third party error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch third party' })
  }
})

// Update a third party
app.put('/api/third-parties/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params
    const { name, contactNumber, email, note } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    // Check if third party exists
    const existing = await pool.query('SELECT id FROM third_parties WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Third party not found' })
    }

    const result = await pool.query(
      `UPDATE third_parties SET name = $1, "contactNumber" = $2, email = $3, note = $4, "updatedAt" = NOW()
       WHERE id = $5 RETURNING *`,
      [name, contactNumber || null, email || null, note || null, id]
    )

    res.status(200).json(result.rows[0])
  } catch (error) {
    console.error('Update third party error:', error)
    res.status(500).json({ message: error.message || 'Failed to update third party' })
  }
})

// Delete a third party
app.delete('/api/third-parties/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params

    // Check if third party exists
    const existing = await pool.query('SELECT id FROM third_parties WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Third party not found' })
    }

    await pool.query('DELETE FROM third_parties WHERE id = $1', [id])

    res.status(200).json({ message: 'Third party deleted successfully' })
  } catch (error) {
    console.error('Delete third party error:', error)
    res.status(500).json({ message: error.message || 'Failed to delete third party' })
  }
})

// Accounts API routes
// Get all accounts (with optional filters)
app.get('/api/accounts', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const entityType = req.query.entityType
    const entityId = req.query.entityId

    let sql = `SELECT * FROM accounts WHERE 1=1`
    const params = []
    let paramIndex = 1

    if (entityType) {
      sql += ` AND "entityType" = $${paramIndex}`
      params.push(entityType)
      paramIndex++
      
      // For company accounts, entityId should be NULL
      if (entityType === 'company') {
        sql += ` AND "entityId" IS NULL`
      }
    }

    if (entityId) {
      sql += ` AND "entityId" = $${paramIndex}`
      params.push(entityId)
      paramIndex++
    }

    sql += ` ORDER BY "isPrimary" DESC, "createdAt" ASC`

    const result = await pool.query(sql, params.length > 0 ? params : undefined)
    res.json(result.rows)
  } catch (error) {
    console.error('Bank accounts error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch accounts' })
  }
})

// Create a new account
app.post('/api/accounts', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { entityType, entityId, accountType, accountHolderName, bankName, accountNumber, iban, swiftBic, routingNumber, currency, serviceName, isPrimary, note } = req.body

    console.log('📝 Creating account:', { entityType, entityId, accountType, accountHolderName })

    if (!entityType || !accountHolderName) {
      return res.status(400).json({ message: 'Entity type and account holder name are required' })
    }

    // For company accounts, entityId is not required
    if (entityType !== 'company' && !entityId) {
      return res.status(400).json({ message: 'Entity ID is required for non-company accounts' })
    }

    const validEntityTypes = ['client', 'hotel', 'guide', 'driver', 'caterer', 'company', 'third-party']
    if (!validEntityTypes.includes(entityType)) {
      console.log('❌ Invalid entity type:', { entityType, validTypes: validEntityTypes, receivedType: typeof entityType })
      return res.status(400).json({ message: 'Invalid entity type', received: entityType, valid: validEntityTypes })
    }

    if (!accountType || !['bank', 'cash', 'online', 'other'].includes(accountType)) {
      return res.status(400).json({ message: 'Account type must be bank, cash, online, or other' })
    }

    // Validate required fields based on account type
    if ((accountType === 'bank' || accountType === 'other') && !bankName) {
      return res.status(400).json({ message: accountType === 'bank' ? 'Bank name is required for bank accounts' : 'Account name/description is required' })
    }
    if (accountType === 'online' && !serviceName) {
      return res.status(400).json({ message: 'Service name/tag is required for online accounts' })
    }

    if (!['client', 'hotel', 'guide', 'driver', 'caterer', 'company', 'third-party'].includes(entityType)) {
      return res.status(400).json({ message: 'Invalid entity type' })
    }

    // If setting as primary, unset other primary accounts for this entity
    if (isPrimary) {
      if (entityType === 'company') {
        await pool.query(
          `UPDATE accounts SET "isPrimary" = FALSE WHERE "entityType" = 'company' AND "entityId" IS NULL`
        )
      } else {
        await pool.query(
          `UPDATE accounts SET "isPrimary" = FALSE WHERE "entityType" = $1 AND "entityId" = $2`,
          [entityType, entityId]
        )
      }
    }

    const accountId = randomUUID()
    const result = await pool.query(
      `INSERT INTO accounts (id, "entityType", "entityId", "accountType", "accountHolderName", "bankName", "accountNumber", iban, "swiftBic", "routingNumber", currency, "serviceName", "isPrimary", note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        accountId,
        entityType,
        entityId || null,
        accountType,
        accountHolderName,
        (accountType === 'cash') ? null : (bankName || null),
        accountNumber || null,
        iban || null,
        swiftBic || null,
        routingNumber || null,
        currency || null,
        serviceName || null,
        isPrimary || false,
        note || null
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create bank account error:', error)
    res.status(500).json({ message: error.message || 'Failed to create account' })
  }
})

// Get a single account
app.get('/api/accounts/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params
    const result = await pool.query('SELECT * FROM accounts WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' })
    }

    let account = result.rows[0]
    
    // Add entity name if entityId exists
    if (account.entityId && account.entityType) {
      let entityName = null
      try {
        if (account.entityType === 'client') {
          const entityResult = await pool.query('SELECT name FROM clients WHERE id = $1', [account.entityId])
          entityName = entityResult.rows[0]?.name || null
        } else if (account.entityType === 'hotel') {
          const entityResult = await pool.query('SELECT name FROM hotels WHERE id = $1', [account.entityId])
          entityName = entityResult.rows[0]?.name || null
        } else if (account.entityType === 'guide') {
          const entityResult = await pool.query('SELECT name FROM guides WHERE id = $1', [account.entityId])
          entityName = entityResult.rows[0]?.name || null
        } else if (account.entityType === 'driver') {
          const entityResult = await pool.query('SELECT name FROM drivers WHERE id = $1', [account.entityId])
          entityName = entityResult.rows[0]?.name || null
        } else if (account.entityType === 'caterer') {
          const entityResult = await pool.query('SELECT name FROM caterers WHERE id = $1', [account.entityId])
          entityName = entityResult.rows[0]?.name || null
        } else if (account.entityType === 'third-party') {
          const entityResult = await pool.query('SELECT name FROM third_parties WHERE id = $1', [account.entityId])
          entityName = entityResult.rows[0]?.name || null
        }
      } catch (err) {
        console.error('Error fetching entity name:', err)
      }
      account = { ...account, entityName }
    }

    res.json(account)
  } catch (error) {
    console.error('Bank account error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch account' })
  }
})

// Update an account
app.put('/api/accounts/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params
    const { entityType, entityId, accountType, accountHolderName, bankName, accountNumber, iban, swiftBic, routingNumber, currency, serviceName, isPrimary, note } = req.body

    if (!accountHolderName) {
      return res.status(400).json({ message: 'Account holder name is required' })
    }

    if (!accountType || !['bank', 'cash', 'online', 'other'].includes(accountType)) {
      return res.status(400).json({ message: 'Account type must be bank, cash, online, or other' })
    }

    // Validate required fields based on account type
    if ((accountType === 'bank' || accountType === 'other') && !bankName) {
      return res.status(400).json({ message: accountType === 'bank' ? 'Bank name is required for bank accounts' : 'Account name/description is required' })
    }
    if (accountType === 'online' && !serviceName) {
      return res.status(400).json({ message: 'Service name/tag is required for online accounts' })
    }

    const existing = await pool.query('SELECT * FROM accounts WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' })
    }

    // If setting as primary, unset other primary accounts for this entity
    if (isPrimary && (!existing.rows[0].isPrimary)) {
      if (existing.rows[0].entityType === 'company') {
        await pool.query(
          `UPDATE accounts SET "isPrimary" = FALSE WHERE "entityType" = 'company' AND "entityId" IS NULL AND id != $1`,
          [id]
        )
      } else {
        await pool.query(
          `UPDATE accounts SET "isPrimary" = FALSE WHERE "entityType" = $1 AND "entityId" = $2 AND id != $3`,
          [existing.rows[0].entityType, existing.rows[0].entityId, id]
        )
      }
    }

    const result = await pool.query(
      `UPDATE accounts 
       SET "accountType" = $1, "accountHolderName" = $2, "bankName" = $3, "accountNumber" = $4, iban = $5, "swiftBic" = $6, "routingNumber" = $7, currency = $8, "serviceName" = $9, "isPrimary" = $10, note = $11, "updatedAt" = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        accountType,
        accountHolderName,
        (accountType === 'cash') ? null : (bankName || null),
        accountNumber || null,
        iban || null,
        swiftBic || null,
        routingNumber || null,
        currency || null,
        serviceName || null,
        isPrimary || false,
        note || null,
        id
      ]
    )

    res.status(200).json(result.rows[0])
  } catch (error) {
    console.error('Update bank account error:', error)
    res.status(500).json({ message: error.message || 'Failed to update account' })
  }
})

// Delete an account
app.delete('/api/accounts/:id', async (req, res) => {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const { id } = req.params
    const existing = await pool.query('SELECT id FROM accounts WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' })
    }

    await pool.query('DELETE FROM accounts WHERE id = $1', [id])

    res.status(200).json({ message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Delete bank account error:', error)
    res.status(500).json({ message: error.message || 'Failed to delete account' })
  }
})

// ============================================
// ROUTES API ENDPOINTS
// ============================================

// Helper function to verify auth
function verifyAuth(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized')
  }
  const token = authHeader.substring(7)
  const decoded = verifyToken(token)
  if (!decoded) {
    throw new Error('Invalid token')
  }
  return decoded
}

// Get all routes
app.get('/api/routes', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { status, startDate, endDate } = req.query
    
    let query = `
      SELECT 
        id, name, description, start_date, end_date, duration, status,
        total_distance, estimated_cost, actual_cost, currency, notes,
        "createdAt", "updatedAt"
      FROM routes
      WHERE 1=1
    `
    const params = []
    let paramCount = 1
    
    if (status) {
      query += ` AND status = $${paramCount++}`
      params.push(status)
    }
    if (startDate) {
      query += ` AND start_date >= $${paramCount++}`
      params.push(startDate)
    }
    if (endDate) {
      query += ` AND end_date <= $${paramCount++}`
      params.push(endDate)
    }
    
    query += ` ORDER BY "createdAt" DESC`
    
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Routes error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to fetch routes' })
  }
})

// Get a single route with all related data
app.get('/api/routes/:id', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { id } = req.params
    
    // Get route
    const routeResult = await pool.query(
      `SELECT * FROM routes WHERE id = $1`,
      [id]
    )
    if (routeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Route not found' })
    }
    const route = routeResult.rows[0]
    
    // Get segments with location names
    const segmentsResult = await pool.query(
      `SELECT 
        rs.*,
        l1.name as from_destination_name,
        l2.name as to_destination_name,
        l3.name as overnight_location_name
      FROM route_segments rs
      LEFT JOIN locations l1 ON rs.from_destination_id = l1.id
      LEFT JOIN locations l2 ON rs.to_destination_id = l2.id
      LEFT JOIN locations l3 ON rs.overnight_location_id = l3.id
      WHERE rs.route_id = $1
      ORDER BY rs.segment_order, rs.day_number`,
      [id]
    )
    
    // Get logistics with entity names
    const logisticsResult = await pool.query(
      `SELECT 
        rl.*,
        CASE 
          WHEN rl.entity_type = 'hotel' THEN h.name
          WHEN rl.entity_type = 'caterer' THEN c.name
          WHEN rl.entity_type = 'third-party' THEN tp.name
          WHEN rl.entity_type = 'vehicle' THEN v.type || ' - ' || CASE WHEN v."vehicleOwner" = 'company' THEN 'Company' ELSE 'Third Party' END
          WHEN rl.entity_type = 'location' THEN l.name
          ELSE NULL
        END as entity_name
      FROM route_logistics rl
      LEFT JOIN hotels h ON rl.entity_type = 'hotel' AND rl.entity_id = h.id
      LEFT JOIN caterers c ON rl.entity_type = 'caterer' AND rl.entity_id = c.id
      LEFT JOIN third_parties tp ON rl.entity_type = 'third-party' AND rl.entity_id = tp.id
      LEFT JOIN vehicles v ON rl.entity_type = 'vehicle' AND rl.entity_id = v.id
      LEFT JOIN locations l ON rl.entity_type = 'location' AND rl.entity_id = l.id
      WHERE rl.route_id = $1`,
      [id]
    )
    
    // Get participants with names
    const participantsResult = await pool.query(
      `SELECT 
        rp.*,
        c.name as client_name,
        g.name as guide_name
      FROM route_participants rp
      LEFT JOIN clients c ON rp.client_id = c.id
      LEFT JOIN guides g ON rp.guide_id = g.id
      WHERE rp.route_id = $1`,
      [id]
    )
    
    // Get transactions
    const transactionsResult = await pool.query(
      `SELECT 
        rt.*,
        a1."accountHolderName" as from_account_name,
        a2."accountHolderName" as to_account_name
      FROM route_transactions rt
      LEFT JOIN accounts a1 ON rt.from_account_id = a1.id
      LEFT JOIN accounts a2 ON rt.to_account_id = a2.id
      WHERE rt.route_id = $1
      ORDER BY rt.transaction_date DESC, rt."createdAt" DESC`,
      [id]
    )
    
    res.json({
      ...route,
      segments: segmentsResult.rows,
      logistics: logisticsResult.rows,
      participants: participantsResult.rows,
      transactions: transactionsResult.rows
    })
  } catch (error) {
    console.error('Get route error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to fetch route' })
  }
})

// Create a new route
app.post('/api/routes', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { name, description, startDate, status, currency, notes } = req.body
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }
    
    const routeId = randomUUID()
    const result = await pool.query(
      `INSERT INTO routes (id, name, description, start_date, status, currency, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        routeId,
        name,
        description || null,
        startDate || null,
        status || 'draft',
        currency || 'BRL',
        notes || null
      ]
    )
    
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create route error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to create route' })
  }
})

// Update a route
app.put('/api/routes/:id', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { id } = req.params
    const { name, description, startDate, status, currency, notes } = req.body
    
    const existing = await pool.query('SELECT id, status FROM routes WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Route not found' })
    }
    
    // If route is confirmed and trying to change start_date, validate
    if (existing.rows[0].status !== 'draft' && startDate && startDate !== existing.rows[0].start_date) {
      return res.status(400).json({ message: 'Cannot change start date of confirmed route' })
    }
    
    const result = await pool.query(
      `UPDATE routes 
       SET name = $1, description = $2, start_date = $3, status = $4, currency = $5, notes = $6, "updatedAt" = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        name,
        description || null,
        startDate || null,
        status || existing.rows[0].status,
        currency || 'BRL',
        notes || null,
        id
      ]
    )
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Update route error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to update route' })
  }
})

// Delete a route
app.delete('/api/routes/:id', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { id } = req.params
    
    // Check if route has transactions (immutable records)
    const transactionsCheck = await pool.query(
      'SELECT id FROM route_transactions WHERE route_id = $1 LIMIT 1',
      [id]
    )
    if (transactionsCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Cannot delete route with transactions. Cancel the route instead.' })
    }
    
    const existing = await pool.query('SELECT id FROM routes WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Route not found' })
    }
    
    await pool.query('DELETE FROM routes WHERE id = $1', [id])
    
    res.json({ message: 'Route deleted successfully' })
  } catch (error) {
    console.error('Delete route error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to delete route' })
  }
})

// Duplicate a route
app.post('/api/routes/:id/duplicate', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { id } = req.params
    const { name } = req.body
    
    // Get original route
    const routeResult = await pool.query('SELECT * FROM routes WHERE id = $1', [id])
    if (routeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Route not found' })
    }
    const originalRoute = routeResult.rows[0]
    
    // Create new route
    const newRouteId = randomUUID()
    const newRouteResult = await pool.query(
      `INSERT INTO routes (id, name, description, start_date, status, currency, notes)
       VALUES ($1, $2, $3, NULL, 'draft', $4, $5)
       RETURNING *`,
      [
        newRouteId,
        name || `${originalRoute.name} (Copy)`,
        originalRoute.description,
        originalRoute.currency,
        originalRoute.notes
      ]
    )
    
    // Copy segments
    const segmentsResult = await pool.query(
      'SELECT * FROM route_segments WHERE route_id = $1 ORDER BY segment_order, day_number',
      [id]
    )
    for (const segment of segmentsResult.rows) {
      await pool.query(
        `INSERT INTO route_segments (id, route_id, day_number, segment_date, from_destination_id, to_destination_id, overnight_location_id, distance, estimated_duration, segment_type, segment_order, notes)
         VALUES (gen_random_uuid(), $1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          newRouteId,
          segment.day_number,
          segment.from_destination_id,
          segment.to_destination_id,
          segment.overnight_location_id,
          segment.distance,
          segment.estimated_duration,
          segment.segment_type,
          segment.segment_order,
          segment.notes
        ]
      )
    }
    
    // Copy logistics
    const logisticsResult = await pool.query(
      'SELECT * FROM route_logistics WHERE route_id = $1',
      [id]
    )
    for (const logistics of logisticsResult.rows) {
      const newSegmentId = logistics.segment_id ? (
        await pool.query(
          'SELECT id FROM route_segments WHERE route_id = $1 AND day_number = $2',
          [newRouteId, (await pool.query('SELECT day_number FROM route_segments WHERE id = $1', [logistics.segment_id])).rows[0]?.day_number]
        )
      ).rows[0]?.id : null
      
      await pool.query(
        `INSERT INTO route_logistics (id, route_id, segment_id, logistics_type, entity_id, entity_type, quantity, cost, date, driver_pilot_name, is_own_vehicle, vehicle_type, notes)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NULL, $8, $9, $10, $11)`,
        [
          newRouteId,
          newSegmentId,
          logistics.logistics_type,
          logistics.entity_id,
          logistics.entity_type,
          logistics.quantity,
          logistics.cost,
          logistics.driver_pilot_name,
          logistics.is_own_vehicle,
          logistics.vehicle_type,
          logistics.notes
        ]
      )
    }
    
    // Copy participants
    const participantsResult = await pool.query(
      'SELECT * FROM route_participants WHERE route_id = $1',
      [id]
    )
    for (const participant of participantsResult.rows) {
      await pool.query(
        `INSERT INTO route_participants (id, route_id, client_id, guide_id, role, notes)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
        [
          newRouteId,
          participant.client_id,
          participant.guide_id,
          participant.role,
          participant.notes
        ]
      )
    }
    
    res.status(201).json(newRouteResult.rows[0])
  } catch (error) {
    console.error('Duplicate route error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to duplicate route' })
  }
})

// ============================================
// ROUTE SEGMENTS API ENDPOINTS
// ============================================

// Get all segments for a route
app.get('/api/routes/:routeId/segments', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { routeId } = req.params
    
    const result = await pool.query(
      `SELECT 
        rs.*,
        l1.name as from_destination_name,
        l2.name as to_destination_name,
        l3.name as overnight_location_name
      FROM route_segments rs
      LEFT JOIN locations l1 ON rs.from_destination_id = l1.id
      LEFT JOIN locations l2 ON rs.to_destination_id = l2.id
      LEFT JOIN locations l3 ON rs.overnight_location_id = l3.id
      WHERE rs.route_id = $1
      ORDER BY rs.segment_order, rs.day_number`,
      [routeId]
    )
    
    res.json(result.rows)
  } catch (error) {
    console.error('Get segments error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to fetch segments' })
  }
})

// Create a segment
app.post('/api/routes/:routeId/segments', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { routeId } = req.params
    const { dayNumber, fromDestinationId, toDestinationId, overnightLocationId, distance, estimatedDuration, segmentType, segmentOrder, notes } = req.body
    
    // Get max day_number to set default
    const maxDayResult = await pool.query(
      'SELECT COALESCE(MAX(day_number), 0) as max_day FROM route_segments WHERE route_id = $1',
      [routeId]
    )
    const maxDay = parseInt(maxDayResult.rows[0].max_day) || 0
    
    const dayNum = dayNumber || maxDay + 1
    const segOrder = segmentOrder !== undefined ? segmentOrder : maxDay
    
    // Get route start_date to calculate segment_date
    const routeResult = await pool.query('SELECT start_date FROM routes WHERE id = $1', [routeId])
    const startDate = routeResult.rows[0]?.start_date
    const segmentDate = startDate ? new Date(startDate)
    segmentDate.setDate(segmentDate.getDate() + dayNum - 1)
    const segmentDateStr = startDate ? segmentDate.toISOString().split('T')[0] : null
    
    const segmentId = randomUUID()
    const result = await pool.query(
      `INSERT INTO route_segments (id, route_id, day_number, segment_date, from_destination_id, to_destination_id, overnight_location_id, distance, estimated_duration, segment_type, segment_order, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        segmentId,
        routeId,
        dayNum,
        segmentDateStr,
        fromDestinationId || null,
        toDestinationId || null,
        overnightLocationId || null,
        distance || 0,
        estimatedDuration || null,
        segmentType || 'travel',
        segOrder,
        notes || null
      ]
    )
    
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create segment error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to create segment' })
  }
})

// Update a segment
app.put('/api/routes/:routeId/segments/:id', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { routeId, id } = req.params
    const { dayNumber, fromDestinationId, toDestinationId, overnightLocationId, distance, estimatedDuration, segmentType, segmentOrder, notes } = req.body
    
    const existing = await pool.query('SELECT id FROM route_segments WHERE id = $1 AND route_id = $2', [id, routeId])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Segment not found' })
    }
    
    // Recalculate segment_date if day_number changed
    let segmentDate = null
    if (dayNumber !== undefined) {
      const routeResult = await pool.query('SELECT start_date FROM routes WHERE id = $1', [routeId])
      const startDate = routeResult.rows[0]?.start_date
      if (startDate) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + dayNumber - 1)
        segmentDate = date.toISOString().split('T')[0]
      }
    }
    
    const result = await pool.query(
      `UPDATE route_segments 
       SET day_number = COALESCE($1, day_number),
           segment_date = COALESCE($2, segment_date),
           from_destination_id = $3,
           to_destination_id = $4,
           overnight_location_id = $5,
           distance = $6,
           estimated_duration = $7,
           segment_type = $8,
           segment_order = COALESCE($9, segment_order),
           notes = $10,
           "updatedAt" = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        dayNumber,
        segmentDate,
        fromDestinationId || null,
        toDestinationId || null,
        overnightLocationId || null,
        distance || 0,
        estimatedDuration || null,
        segmentType || 'travel',
        segmentOrder,
        notes || null,
        id
      ]
    )
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Update segment error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to update segment' })
  }
})

// Delete a segment
app.delete('/api/routes/:routeId/segments/:id', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { routeId, id } = req.params
    
    const existing = await pool.query('SELECT id FROM route_segments WHERE id = $1 AND route_id = $2', [id, routeId])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Segment not found' })
    }
    
    await pool.query('DELETE FROM route_segments WHERE id = $1', [id])
    
    res.json({ message: 'Segment deleted successfully' })
  } catch (error) {
    console.error('Delete segment error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to delete segment' })
  }
})

// Reorder segments
app.put('/api/routes/:routeId/segments/reorder', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { routeId } = req.params
    const { segmentOrders } = req.body // Array of { id, segmentOrder, dayNumber }
    
    if (!Array.isArray(segmentOrders)) {
      return res.status(400).json({ message: 'segmentOrders must be an array' })
    }
    
    // Update each segment
    for (const { id, segmentOrder, dayNumber } of segmentOrders) {
      let segmentDate = null
      if (dayNumber !== undefined) {
        const routeResult = await pool.query('SELECT start_date FROM routes WHERE id = $1', [routeId])
        const startDate = routeResult.rows[0]?.start_date
        if (startDate) {
          const date = new Date(startDate)
          date.setDate(date.getDate() + dayNumber - 1)
          segmentDate = date.toISOString().split('T')[0]
        }
      }
      
      await pool.query(
        `UPDATE route_segments 
         SET segment_order = $1, day_number = $2, segment_date = COALESCE($3, segment_date), "updatedAt" = NOW()
         WHERE id = $4 AND route_id = $5`,
        [segmentOrder, dayNumber, segmentDate, id, routeId]
      )
    }
    
    res.json({ message: 'Segments reordered successfully' })
  } catch (error) {
    console.error('Reorder segments error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to reorder segments' })
  }
})

// ============================================
// ROUTE LOGISTICS API ENDPOINTS
// ============================================

// Get all logistics for a route
app.get('/api/routes/:routeId/logistics', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { routeId } = req.params
    
    const result = await pool.query(
      `SELECT 
        rl.*,
        CASE 
          WHEN rl.entity_type = 'hotel' THEN h.name
          WHEN rl.entity_type = 'caterer' THEN c.name
          WHEN rl.entity_type = 'third-party' THEN tp.name
          WHEN rl.entity_type = 'vehicle' THEN v.type || ' - ' || CASE WHEN v."vehicleOwner" = 'company' THEN 'Company' ELSE 'Third Party' END
          WHEN rl.entity_type = 'location' THEN l.name
          ELSE NULL
        END as entity_name
      FROM route_logistics rl
      LEFT JOIN hotels h ON rl.entity_type = 'hotel' AND rl.entity_id = h.id
      LEFT JOIN caterers c ON rl.entity_type = 'caterer' AND rl.entity_id = c.id
      LEFT JOIN third_parties tp ON rl.entity_type = 'third-party' AND rl.entity_id = tp.id
      LEFT JOIN vehicles v ON rl.entity_type = 'vehicle' AND rl.entity_id = v.id
      LEFT JOIN locations l ON rl.entity_type = 'location' AND rl.entity_id = l.id
      WHERE rl.route_id = $1
      ORDER BY rl.segment_id, rl.logistics_type`,
      [routeId]
    )
    
    res.json(result.rows)
  } catch (error) {
    console.error('Get logistics error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to fetch logistics' })
  }
})

// Create logistics
app.post('/api/routes/:routeId/logistics', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { routeId } = req.params
    const { segmentId, logisticsType, entityId, entityType, quantity, cost, date, driverPilotName, isOwnVehicle, vehicleType, notes } = req.body
    
    if (!logisticsType || !entityId || !entityType) {
      return res.status(400).json({ message: 'logisticsType, entityId, and entityType are required' })
    }
    
    const logisticsId = randomUUID()
    const result = await pool.query(
      `INSERT INTO route_logistics (id, route_id, segment_id, logistics_type, entity_id, entity_type, quantity, cost, date, driver_pilot_name, is_own_vehicle, vehicle_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        logisticsId,
        routeId,
        segmentId || null,
        logisticsType,
        entityId,
        entityType,
        quantity || 1,
        cost || 0,
        date || null,
        driverPilotName || null,
        isOwnVehicle || false,
        vehicleType || null,
        notes || null
      ]
    )
    
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create logistics error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to create logistics' })
  }
})

// Update logistics
app.put('/api/routes/:routeId/logistics/:id', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { routeId, id } = req.params
    const { segmentId, logisticsType, entityId, entityType, quantity, cost, date, driverPilotName, isOwnVehicle, vehicleType, notes } = req.body
    
    const existing = await pool.query('SELECT id FROM route_logistics WHERE id = $1 AND route_id = $2', [id, routeId])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Logistics not found' })
    }
    
    const result = await pool.query(
      `UPDATE route_logistics 
       SET segment_id = $1,
           logistics_type = $2,
           entity_id = $3,
           entity_type = $4,
           quantity = $5,
           cost = $6,
           date = $7,
           driver_pilot_name = $8,
           is_own_vehicle = $9,
           vehicle_type = $10,
           notes = $11,
           "updatedAt" = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        segmentId !== undefined ? segmentId : null,
        logisticsType,
        entityId,
        entityType,
        quantity || 1,
        cost || 0,
        date || null,
        driverPilotName || null,
        isOwnVehicle || false,
        vehicleType || null,
        notes || null,
        id
      ]
    )
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Update logistics error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to update logistics' })
  }
})

// Delete logistics
app.delete('/api/routes/:routeId/logistics/:id', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { routeId, id } = req.params
    
    const existing = await pool.query('SELECT id FROM route_logistics WHERE id = $1 AND route_id = $2', [id, routeId])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Logistics not found' })
    }
    
    await pool.query('DELETE FROM route_logistics WHERE id = $1', [id])
    
    res.json({ message: 'Logistics deleted successfully' })
  } catch (error) {
    console.error('Delete logistics error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to delete logistics' })
  }
})

// ============================================
// ROUTE PARTICIPANTS API ENDPOINTS
// ============================================

// Get all participants for a route
app.get('/api/routes/:routeId/participants', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { routeId } = req.params
    
    const result = await pool.query(
      `SELECT 
        rp.*,
        c.name as client_name,
        g.name as guide_name
      FROM route_participants rp
      LEFT JOIN clients c ON rp.client_id = c.id
      LEFT JOIN guides g ON rp.guide_id = g.id
      WHERE rp.route_id = $1
      ORDER BY rp.role, rp."createdAt"`,
      [routeId]
    )
    
    res.json(result.rows)
  } catch (error) {
    console.error('Get participants error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to fetch participants' })
  }
})

// Create participant
app.post('/api/routes/:routeId/participants', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { routeId } = req.params
    const { clientId, guideId, role, notes } = req.body
    
    if (!role) {
      return res.status(400).json({ message: 'Role is required' })
    }
    
    // Validate role requirements
    if (role === 'client' && !clientId) {
      return res.status(400).json({ message: 'clientId is required for client role' })
    }
    if ((role === 'guide-captain' || role === 'guide-tail') && !guideId) {
      return res.status(400).json({ message: 'guideId is required for guide roles' })
    }
    
    const participantId = randomUUID()
    const result = await pool.query(
      `INSERT INTO route_participants (id, route_id, client_id, guide_id, role, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        participantId,
        routeId,
        clientId || null,
        guideId || null,
        role,
        notes || null
      ]
    )
    
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create participant error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to create participant' })
  }
})

// Delete participant
app.delete('/api/routes/:routeId/participants/:id', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { routeId, id } = req.params
    
    const existing = await pool.query('SELECT id FROM route_participants WHERE id = $1 AND route_id = $2', [id, routeId])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Participant not found' })
    }
    
    await pool.query('DELETE FROM route_participants WHERE id = $1', [id])
    
    res.json({ message: 'Participant deleted successfully' })
  } catch (error) {
    console.error('Delete participant error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to delete participant' })
  }
})

// ============================================
// ROUTE TRANSACTIONS API ENDPOINTS
// ============================================

// Get all transactions for a route
app.get('/api/routes/:routeId/transactions', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { routeId } = req.params
    
    const result = await pool.query(
      `SELECT 
        rt.*,
        a1."accountHolderName" as from_account_name,
        a2."accountHolderName" as to_account_name
      FROM route_transactions rt
      LEFT JOIN accounts a1 ON rt.from_account_id = a1.id
      LEFT JOIN accounts a2 ON rt.to_account_id = a2.id
      WHERE rt.route_id = $1
      ORDER BY rt.transaction_date DESC, rt."createdAt" DESC`,
      [routeId]
    )
    
    res.json(result.rows)
  } catch (error) {
    console.error('Get transactions error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to fetch transactions' })
  }
})

// Create transaction (immutable)
app.post('/api/routes/:routeId/transactions', async (req, res) => {
  await initDb()
  try {
    verifyAuth(req)
    const { routeId } = req.params
    const { segmentId, transactionType, category, amount, currency, fromAccountId, toAccountId, description, snapshotData, transactionDate, notes } = req.body
    
    if (!transactionType || !category || !amount || !transactionDate) {
      return res.status(400).json({ message: 'transactionType, category, amount, and transactionDate are required' })
    }
    
    // Build snapshot data if not provided
    let snapshot = snapshotData || {}
    if (!snapshotData) {
      // Get route info
      const routeResult = await pool.query('SELECT name FROM routes WHERE id = $1', [routeId])
      snapshot.routeName = routeResult.rows[0]?.name
      snapshot.routeId = routeId
      
      if (segmentId) {
        const segmentResult = await pool.query('SELECT day_number, segment_date FROM route_segments WHERE id = $1', [segmentId])
        if (segmentResult.rows[0]) {
          snapshot.segmentDay = segmentResult.rows[0].day_number
          snapshot.segmentDate = segmentResult.rows[0].segment_date
        }
      }
      
      snapshot.snapshotDate = new Date().toISOString()
    }
    
    const transactionId = randomUUID()
    const result = await pool.query(
      `INSERT INTO route_transactions (id, route_id, segment_id, transaction_type, category, amount, currency, from_account_id, to_account_id, description, snapshot_data, transaction_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        transactionId,
        routeId,
        segmentId || null,
        transactionType,
        category,
        amount,
        currency || 'BRL',
        fromAccountId || null,
        toAccountId || null,
        description || null,
        JSON.stringify(snapshot),
        transactionDate,
        notes || null
      ]
    )
    
    // Update route actual_cost
    const costResult = await pool.query(
      `SELECT COALESCE(SUM(
        CASE 
          WHEN transaction_type = 'expense' THEN -amount
          WHEN transaction_type = 'payment' THEN amount
          WHEN transaction_type = 'refund' THEN -amount
          ELSE 0
        END
      ), 0) as total FROM route_transactions WHERE route_id = $1`,
      [routeId]
    )
    await pool.query(
      'UPDATE routes SET actual_cost = $1, "updatedAt" = NOW() WHERE id = $2',
      [Math.abs(parseFloat(costResult.rows[0].total)), routeId]
    )
    
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create transaction error:', error)
    if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
      return res.status(401).json({ message: error.message })
    }
    res.status(500).json({ message: error.message || 'Failed to create transaction' })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`)
})
