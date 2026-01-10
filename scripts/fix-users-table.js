import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function fixTable() {
  try {
    console.log('🔧 Fixing users table schema...')
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      )
    `)
    
    if (!tableCheck.rows[0].exists) {
      console.log('✅ Table does not exist, it will be created on next registration')
      await pool.end()
      return
    }
    
    // Check current schema
    const columns = await pool.query(`
      SELECT column_name, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id'
    `)
    
    if (columns.rows.length > 0) {
      const currentDefault = columns.rows[0].column_default
      console.log('Current id column default:', currentDefault)
      
      if (currentDefault && currentDefault.includes('gen_random_uuid')) {
        console.log('⚠️  Table has old schema, fixing...')
        
        // Alter table to remove default
        await pool.query('ALTER TABLE users ALTER COLUMN id DROP DEFAULT')
        console.log('✅ Removed DEFAULT constraint from id column')
      } else {
        console.log('✅ Table schema is already correct')
      }
    }
    
    await pool.end()
    console.log('✅ Done!')
  } catch (error) {
    console.error('❌ Error:', error.message)
    await pool.end()
    process.exit(1)
  }
}

fixTable()
