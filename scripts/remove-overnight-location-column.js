import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/downwinder_tours'
})

async function removeOvernightLocationColumn() {
  try {
    console.log('🔧 Checking for overnight_location_id column...')
    
    // Check if column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'route_segments' 
      AND column_name = 'overnight_location_id'
    `)
    
    if (checkResult.rows.length > 0) {
      console.log('📝 Column exists, removing it...')
      await pool.query('ALTER TABLE route_segments DROP COLUMN IF EXISTS overnight_location_id')
      console.log('✅ Removed overnight_location_id column from route_segments table')
    } else {
      console.log('ℹ️  Column does not exist, nothing to remove')
    }
    
    console.log('✅ Migration complete!')
  } catch (error) {
    console.error('❌ Error removing column:', error)
    throw error
  } finally {
    await pool.end()
  }
}

removeOvernightLocationColumn()
