import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...')
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set')
    
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version')
    console.log('✅ Database connection successful!')
    console.log('📅 Current time:', result.rows[0].current_time)
    console.log('🐘 PostgreSQL version:', result.rows[0].pg_version.split(',')[0])
    
    // Test if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      )
    `)
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Users table exists')
      
      // Count users
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users')
      console.log(`👥 Total users: ${userCount.rows[0].count}`)
    } else {
      console.log('⚠️  Users table does not exist yet')
    }
    
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Database connection failed:')
    console.error(error.message)
    await pool.end()
    process.exit(1)
  }
}

testConnection()
