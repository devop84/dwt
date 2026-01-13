import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function createThirdPartiesTable() {
  try {
    console.log('🔧 Creating third_parties table...')
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS third_parties (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "contactNumber" VARCHAR(50),
        email VARCHAR(255),
        note TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    
    console.log('✅ Third parties table created successfully!')
    
    // Verify table exists
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'third_parties'
      ORDER BY ordinal_position
    `)
    
    console.log('\n📋 Table structure:')
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`)
    })
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating table:', error)
    process.exit(1)
  }
}

createThirdPartiesTable()
