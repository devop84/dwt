import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function removeSegmentTypeDuration() {
  try {
    console.log('🧹 Removing segment_type and estimated_duration from route_segments...\n')

    await pool.query('ALTER TABLE route_segments DROP COLUMN IF EXISTS estimated_duration')
    await pool.query('ALTER TABLE route_segments DROP COLUMN IF EXISTS segment_type')

    console.log('✅ route_segments columns removed')
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error removing segment columns:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

removeSegmentTypeDuration()
