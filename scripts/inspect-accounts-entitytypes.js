import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function inspectAccountsEntityTypes() {
  try {
    const result = await pool.query(
      'SELECT "entityType", COUNT(*) AS count FROM accounts GROUP BY "entityType" ORDER BY "entityType"'
    )
    console.log(result.rows)
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('Error inspecting accounts entityType:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

inspectAccountsEntityTypes()
