import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function dropCaterers() {
  try {
    console.log('🧹 Dropping caterers table and updating constraints...\n')

    await pool.query('DROP TABLE IF EXISTS caterers CASCADE')

    // Update accounts entity type constraint to remove caterer
    await pool.query('ALTER TABLE accounts DROP CONSTRAINT IF EXISTS check_entity_type')
    await pool.query(
      `ALTER TABLE accounts
       ADD CONSTRAINT check_entity_type CHECK ("entityType" IN ('client', 'hotel', 'staff', 'driver', 'vehicle', 'company', 'third-party'))`
    )

    console.log('✅ Caterers removed and constraints updated')
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error dropping caterers:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

dropCaterers()
