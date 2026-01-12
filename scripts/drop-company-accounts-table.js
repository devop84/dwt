import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function dropCompanyAccountsTable() {
  try {
    console.log('🔍 Checking for company_accounts table...')
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'company_accounts'
      )
    `)
    
    if (!tableCheck.rows[0].exists) {
      console.log('✅ company_accounts table does not exist. Nothing to drop.')
      await pool.end()
      return
    }
    
    console.log('⚠️  company_accounts table found. Dropping it...')
    
    // Drop the table
    await pool.query('DROP TABLE IF EXISTS company_accounts CASCADE')
    
    console.log('✅ company_accounts table dropped successfully!')
    console.log('ℹ️  Company accounts are now stored in the accounts table with entityType = \'company\'')
    
    await pool.end()
  } catch (error) {
    console.error('❌ Error:', error.message)
    await pool.end()
    process.exit(1)
  }
}

dropCompanyAccountsTable()
