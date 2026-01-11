import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function createGuidesTable() {
  try {
    console.log('🔄 Creating guides table...\n')

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
    console.log('✅ Guides table created successfully!')

    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error creating guides table:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

createGuidesTable()
