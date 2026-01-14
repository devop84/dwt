import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function updateAccountsGuideToStaff() {
  try {
    const result = await pool.query(
      'UPDATE accounts SET "entityType" = $1 WHERE "entityType" = $2',
      ['staff', 'guide']
    )
    console.log(`✅ Updated ${result.rowCount} account(s) from guide to staff`)
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error updating accounts:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

updateAccountsGuideToStaff()
