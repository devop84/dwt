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
    
    // Create destinations table if not exists
    await pool.query(`
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
      )
    `)
    
    // Add prefeitura, state, and cep columns if they don't exist (migration for existing tables)
    try {
      await pool.query(`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS prefeitura VARCHAR(255)`)
      await pool.query(`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS state VARCHAR(100)`)
      await pool.query(`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS cep VARCHAR(20)`)
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
        "destinationId" UUID REFERENCES destinations(id) ON DELETE CASCADE,
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
        "destinationId" UUID REFERENCES destinations(id) ON DELETE CASCADE,
        languages VARCHAR(255),
        note TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    
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

// Get all destinations
app.get('/api/destinations', async (req, res) => {
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
      FROM destinations
      ORDER BY name ASC
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Destinations error:', error)
    res.status(500).json({ message: error.message || 'Failed to fetch destinations' })
  }
})

// Create a new destination
app.post('/api/destinations', async (req, res) => {
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

    const destinationId = randomUUID()
    const result = await pool.query(
      `INSERT INTO destinations (id, name, coordinates, prefeitura, state, cep, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, coordinates, prefeitura, state, cep, description, "createdAt", "updatedAt"`,
      [destinationId, name, coordinates || null, prefeitura || null, state || null, cep || null, description || null]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create destination error:', error)
    res.status(500).json({ message: error.message || 'Failed to create destination' })
  }
})

// Get a single destination
app.get('/api/destinations/:id', async (req, res) => {
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
      FROM destinations
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
app.put('/api/destinations/:id', async (req, res) => {
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
    const existing = await pool.query('SELECT id FROM destinations WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Destination not found' })
    }

    const result = await pool.query(
      `UPDATE destinations 
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
app.delete('/api/destinations/:id', async (req, res) => {
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
    const existing = await pool.query('SELECT id FROM destinations WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Destination not found' })
    }

    await pool.query('DELETE FROM destinations WHERE id = $1', [id])

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
        h."destinationId",
          h.description,
        h."contactNumber",
        h.email,
        h.address,
        h.coordinates,
        h."createdAt",
        h."updatedAt",
        d.name as "destinationName"
      FROM hotels h
      LEFT JOIN destinations d ON h."destinationId" = d.id
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

    const { name, rating, priceRange, destinationId, description, contactNumber, email, address, coordinates } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    if (!destinationId) {
      return res.status(400).json({ message: 'Destination is required' })
    }

    const hotelId = randomUUID()
    const result = await pool.query(
      `INSERT INTO hotels (id, name, rating, "priceRange", "destinationId", description, "contactNumber", email, address, coordinates)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, rating, "priceRange", "destinationId", description, "contactNumber", email, address, coordinates, "createdAt", "updatedAt"`,
      [hotelId, name, rating || null, priceRange || null, destinationId, description || null, contactNumber || null, email || null, address || null, coordinates || null]
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
        h."destinationId",
          h.description,
        h."contactNumber",
        h.email,
        h.address,
        h.coordinates,
        h."createdAt",
        h."updatedAt",
        d.name as "destinationName"
      FROM hotels h
      LEFT JOIN destinations d ON h."destinationId" = d.id
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
    const { name, rating, priceRange, destinationId, description, contactNumber, email, address, coordinates } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    if (!destinationId) {
      return res.status(400).json({ message: 'Destination is required' })
    }

    // Check if hotel exists
    const existing = await pool.query('SELECT id FROM hotels WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Hotel not found' })
    }

    const result = await pool.query(
      `UPDATE hotels 
       SET name = $1, rating = $2, "priceRange" = $3, "destinationId" = $4, description = $5, 
           "contactNumber" = $6, email = $7, address = $8, coordinates = $9, "updatedAt" = NOW()
       WHERE id = $10
       RETURNING id, name, rating, "priceRange", "destinationId", description, "contactNumber", email, address, coordinates, "createdAt", "updatedAt"`,
      [name, rating || null, priceRange || null, destinationId, description || null, contactNumber || null, email || null, address || null, coordinates || null, id]
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
        g."destinationId",
        g.languages,
        g.note,
        g."createdAt",
        g."updatedAt",
        d.name as "destinationName"
      FROM guides g
      LEFT JOIN destinations d ON g."destinationId" = d.id
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

    const { name, contactNumber, email, destinationId, languages, note } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    if (!destinationId) {
      return res.status(400).json({ message: 'Destination is required' })
    }

    const guideId = randomUUID()
    const result = await pool.query(
      `INSERT INTO guides (id, name, "contactNumber", email, "destinationId", languages, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, "contactNumber", email, "destinationId", languages, note, "createdAt", "updatedAt"`,
      [guideId, name, contactNumber || null, email || null, destinationId, languages || null, note || null]
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
        g."destinationId",
        g.languages,
        g.note,
        g."createdAt",
        g."updatedAt",
        d.name as "destinationName"
      FROM guides g
      LEFT JOIN destinations d ON g."destinationId" = d.id
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
    const { name, contactNumber, email, destinationId, languages, note } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Name is required' })
    }

    if (!destinationId) {
      return res.status(400).json({ message: 'Destination is required' })
    }

    // Check if guide exists
    const existing = await pool.query('SELECT id FROM guides WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Guide not found' })
    }

    const result = await pool.query(
      `UPDATE guides 
       SET name = $1, "contactNumber" = $2, email = $3, "destinationId" = $4, languages = $5, note = $6, "updatedAt" = NOW()
       WHERE id = $7
       RETURNING id, name, "contactNumber", email, "destinationId", languages, note, "createdAt", "updatedAt"`,
      [name, contactNumber || null, email || null, destinationId, languages || null, note || null, id]
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

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`)
})
