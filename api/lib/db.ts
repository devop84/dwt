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
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    dbInitialized = true
  } catch (error) {
    // Table might already exist, that's fine
    console.error('DB init error:', error)
  }
}
