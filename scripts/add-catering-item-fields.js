import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function addCateringItemFields() {
  try {
    console.log('🍽️ Updating route_logistics for catering items...\n')

    await pool.query(`ALTER TABLE route_logistics ADD COLUMN IF NOT EXISTS item_name VARCHAR(255)`)
    await pool.query(`ALTER TABLE route_logistics ALTER COLUMN entity_id DROP NOT NULL`)

    console.log('✅ route_logistics updated')
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error updating route_logistics:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

addCateringItemFields()
