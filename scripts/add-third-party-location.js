import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function addThirdPartyLocation() {
  try {
    console.log('🚀 Adding location to third_parties...')
    await pool.query(`ALTER TABLE third_parties ADD COLUMN IF NOT EXISTS location_id UUID`)
    try {
      await pool.query(`
        ALTER TABLE third_parties
        ADD CONSTRAINT third_parties_location_id_fkey
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
      `)
    } catch {
      // Constraint may already exist
    }
    console.log('✅ location_id added to third_parties')
  } catch (error) {
    console.error('❌ Error adding location_id to third_parties:', error)
    throw error
  } finally {
    await pool.end()
  }
}

addThirdPartyLocation()
