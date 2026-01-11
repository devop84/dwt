import { Pool } from 'pg'

const globalForPool = globalThis as unknown as {
  pool: Pool | undefined
}

const pool = globalForPool.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

if (process.env.NODE_ENV !== 'production') globalForPool.pool = pool

export const query = async (text: string, params?: any[]) => {
  const result = await pool.query(text, params)
  return result.rows
}

export const queryOne = async (text: string, params?: any[]) => {
  const result = await pool.query(text, params)
  return result.rows[0] || null
}

// Initialize users table (auto-runs on first request)
let dbInitialized = false
export const initDb = async () => {
  if (dbInitialized) return
  try {
    // Create users table if not exists
    await query(`
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
    await query(`
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
    await query(`
      CREATE TABLE IF NOT EXISTS destinations (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        coordinates VARCHAR(255),
        prefeitura VARCHAR(255),
        state VARCHAR(100),
        cep VARCHAR(20),
        note TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    
    // Add prefeitura, state, and cep columns if they don't exist (migration for existing tables)
    try {
      await query(`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS prefeitura VARCHAR(255)`)
      await query(`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS state VARCHAR(100)`)
      await query(`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS cep VARCHAR(20)`)
    } catch (migrationError) {
      console.log('Migration note:', migrationError)
    }
    
    // Create hotels table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS hotels (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        rating INTEGER,
        "priceRange" VARCHAR(50),
        "destinationId" UUID REFERENCES destinations(id) ON DELETE CASCADE,
        note TEXT,
        "contactNumber" VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        coordinates VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    
    // Add username column if it doesn't exist (migration for existing tables)
    try {
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE`)
      // Update existing users to set username = name if username is null
      await query(`UPDATE users SET username = name WHERE username IS NULL`)
      // Make username NOT NULL if it's still nullable
      await query(`
        DO $$ 
        BEGIN 
          IF EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'users' AND column_name = 'username' AND is_nullable = 'YES') THEN
            ALTER TABLE users ALTER COLUMN username SET NOT NULL;
          END IF;
        END $$;
      `)
    } catch (migrationError) {
      // Migration might fail if column already exists, that's fine
      console.log('Migration note:', migrationError)
    }
    
    dbInitialized = true
  } catch (error) {
    // Table might already exist, that's fine
    console.error('DB init error:', error)
  }
}
