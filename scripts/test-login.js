import 'dotenv/config'
import pg from 'pg'
import bcrypt from 'bcryptjs'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function testLogin() {
  try {
    const identifier = 'admin' // Test with username
    const testPassword = 'test123' // Change this to your actual password
    
    console.log(`Testing login with identifier: "${identifier}"`)
    
    // Query for user
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)',
      [identifier.trim()]
    )
    
    if (result.rows.length === 0) {
      console.log('❌ User not found with identifier:', identifier)
      await pool.end()
      return
    }
    
    const user = result.rows[0]
    console.log('✅ User found:')
    console.log('  Email:', user.email)
    console.log('  Username:', user.username)
    console.log('  Name:', user.name)
    console.log('  Has password hash:', !!user.password)
    
    // Test password (you'll need to provide the actual password)
    if (testPassword) {
      const isValid = await bcrypt.compare(testPassword, user.password)
      console.log('Password match:', isValid ? '✅ CORRECT' : '❌ INCORRECT')
    } else {
      console.log('⚠️  No test password provided - cannot verify password')
    }
    
    await pool.end()
  } catch (error) {
    console.error('❌ Error:', error.message)
    await pool.end()
    process.exit(1)
  }
}

testLogin()
