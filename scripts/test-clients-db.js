import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function testConnection() {
  try {
    console.log('Testing database connection...\n')
    
    // Test basic connection
    const timeResult = await pool.query('SELECT NOW() as time, version() as version')
    console.log('✅ Database connected!')
    console.log('Time:', timeResult.rows[0].time)
    console.log('PostgreSQL:', timeResult.rows[0].version.split(',')[0])
    
    // List all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    console.log('\n📊 Tables in database:')
    if (tablesResult.rows.length === 0) {
      console.log('  (no tables found)')
    } else {
      tablesResult.rows.forEach(row => console.log('  -', row.table_name))
    }
    
    // Check clients table
    const clientsTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clients'
      )
    `)
    
    if (clientsTableCheck.rows[0].exists) {
      console.log('\n✅ Clients table exists')
      
      // Get clients table columns
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'clients' 
        ORDER BY ordinal_position
      `)
      console.log('\n📋 Clients table columns:')
      columnsResult.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? '[nullable]' : '[required]'}`)
      })
      
      // Count clients
      const countResult = await pool.query('SELECT COUNT(*) as count FROM clients')
      console.log(`\n📈 Total clients: ${countResult.rows[0].count}`)
    } else {
      console.log('\n⚠️  Clients table does NOT exist')
      console.log('   The table will be created automatically on first API request')
    }
    
    // Check users table
    const usersTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `)
    if (usersTableCheck.rows[0].exists) {
      const userCountResult = await pool.query('SELECT COUNT(*) as count FROM users')
      console.log(`\n👤 Total users: ${userCountResult.rows[0].count}`)
    }
    
    await pool.end()
    console.log('\n✅ Test completed successfully!')
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

testConnection()
