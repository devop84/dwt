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
    
    // Create table if not exists
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

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`)
})
