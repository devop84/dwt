import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function updateRouteParticipantsConstraint() {
  try {
    console.log('🧩 Updating route_participants constraint...\n')

    await pool.query(`
      ALTER TABLE route_participants
      DROP CONSTRAINT IF EXISTS route_participants_check
    `)

    await pool.query(`
      ALTER TABLE route_participants
      ADD CONSTRAINT route_participants_check CHECK (
        (role = 'client' AND client_id IS NOT NULL AND guide_id IS NULL) OR
        (role IN ('guide-captain', 'guide-tail') AND guide_id IS NOT NULL AND client_id IS NULL) OR
        (role = 'staff' AND client_id IS NULL)
      )
    `)

    console.log('✅ route_participants constraint updated')
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error updating route_participants constraint:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

updateRouteParticipantsConstraint()
