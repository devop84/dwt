import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function addUsernameColumn() {
  try {
    console.log('🔧 Adding username column to users table...')
    
    // Check if column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'username'
    `)
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ Username column already exists')
      
      // Check if it's nullable
      const nullableCheck = await pool.query(`
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'username'
      `)
      
      if (nullableCheck.rows[0].is_nullable === 'YES') {
        // Update existing users to set username = name if username is null
        await pool.query(`UPDATE users SET username = name WHERE username IS NULL`)
        console.log('✅ Updated existing users with username = name')
        
        // Make NOT NULL
        await pool.query(`ALTER TABLE users ALTER COLUMN username SET NOT NULL`)
        console.log('✅ Made username NOT NULL')
      }
      
      await pool.end()
      return
    }
    
    // Add column
    await pool.query(`ALTER TABLE users ADD COLUMN username VARCHAR(255) UNIQUE`)
    console.log('✅ Added username column')
    
    // Update existing users to set username = name
    await pool.query(`UPDATE users SET username = name WHERE username IS NULL`)
    console.log('✅ Updated existing users with username = name')
    
    // Make NOT NULL
    await pool.query(`ALTER TABLE users ALTER COLUMN username SET NOT NULL`)
    console.log('✅ Made username NOT NULL')
    
    await pool.end()
    console.log('✅ Migration complete!')
  } catch (error) {
    console.error('❌ Error:', error.message)
    await pool.end()
    process.exit(1)
  }
}

addUsernameColumn()
