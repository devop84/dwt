import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function updateConstraint() {
  try {
    console.log('🔧 Updating accounts table constraint to include third-party...')
    
    // Drop the old constraint
    await pool.query(`
      ALTER TABLE accounts 
      DROP CONSTRAINT IF EXISTS check_entity_type
    `)
    console.log('✅ Dropped old constraint')
    
    // Add the new constraint with third-party
    await pool.query(`
      ALTER TABLE accounts 
      ADD CONSTRAINT check_entity_type 
      CHECK ("entityType" IN ('client', 'hotel', 'guide', 'driver', 'caterer', 'company', 'third-party'))
    `)
    console.log('✅ Added new constraint with third-party')
    
    // Verify the constraint exists
    const result = await pool.query(`
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'accounts' AND con.conname = 'check_entity_type'
    `)
    
    if (result.rows.length > 0) {
      console.log('✅ Constraint verified and exists')
    } else {
      console.log('⚠️  Constraint not found (this might be okay if it was already updated)')
    }
    
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error updating constraint:', error)
    await pool.end()
    process.exit(1)
  }
}

updateConstraint()
