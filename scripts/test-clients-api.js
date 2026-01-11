import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function testClientsTable() {
  try {
    console.log('Testing clients table creation...\n')
    
    // Check if clients table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clients'
      )
    `)
    
    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  Clients table does not exist. Creating it now...\n')
      
      // Create clients table (same as in db.ts)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS clients (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          "contactNumber" VARCHAR(50),
          email VARCHAR(255),
          "dateOfBirth" DATE,
          nationality VARCHAR(100),
          note TEXT,
          "IDNumber" VARCHAR(100),
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )
      `)
      
      console.log('✅ Clients table created successfully!\n')
    } else {
      console.log('✅ Clients table already exists\n')
    }
    
    // Verify table structure
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'clients' 
      ORDER BY ordinal_position
    `)
    
    console.log('📋 Clients table structure:')
    columnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? '[nullable]' : '[required]'}`)
    })
    
    // Count clients
    const countResult = await pool.query('SELECT COUNT(*) as count FROM clients')
    console.log(`\n📈 Total clients: ${countResult.rows[0].count}`)
    
    await pool.end()
    console.log('\n✅ Test completed successfully!')
    console.log('\n💡 Next steps:')
    console.log('   1. Make sure your API server is running: npm run dev')
    console.log('   2. The /api/clients endpoint should now work')
    console.log('   3. If you get 404, check that server.js has the /api/clients route')
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

testClientsTable()
