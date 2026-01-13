import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function transferDestinationsToLocations() {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('🔄 Transferring data from destinations to locations...\n')
    
    // Check if destinations table exists
    const destinationsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'destinations'
      )
    `)
    
    if (!destinationsCheck.rows[0].exists) {
      console.log('⚠️  destinations table does not exist. Nothing to transfer.')
      await client.query('ROLLBACK')
      await pool.end()
      process.exit(0)
    }
    
    // Check if locations table exists
    const locationsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'locations'
      )
    `)
    
    if (!locationsCheck.rows[0].exists) {
      console.log('❌ locations table does not exist. Please create it first.')
      await client.query('ROLLBACK')
      await pool.end()
      process.exit(1)
    }
    
    // Check if locations table already has data
    const locationsCount = await client.query('SELECT COUNT(*) as count FROM locations')
    if (parseInt(locationsCount.rows[0].count) > 0) {
      console.log(`⚠️  locations table already has ${locationsCount.rows[0].count} records.`)
      console.log('   Skipping transfer to avoid duplicates.')
      await client.query('ROLLBACK')
      await pool.end()
      process.exit(0)
    }
    
    // Get count of destinations
    const destinationsCount = await client.query('SELECT COUNT(*) as count FROM destinations')
    const count = parseInt(destinationsCount.rows[0].count)
    
    if (count === 0) {
      console.log('⚠️  destinations table is empty. Nothing to transfer.')
      await client.query('ROLLBACK')
      await pool.end()
      process.exit(0)
    }
    
    console.log(`📊 Found ${count} records in destinations table`)
    console.log('📦 Transferring data (preserving IDs)...')
    
    // Transfer data from destinations to locations
    const result = await client.query(`
      INSERT INTO locations (id, name, coordinates, prefeitura, state, cep, description, "createdAt", "updatedAt")
      SELECT id, name, coordinates, prefeitura, state, cep, description, "createdAt", "updatedAt"
      FROM destinations
    `)
    
    console.log(`✅ Successfully transferred ${result.rowCount} records to locations table`)
    
    // Verify the transfer
    const verifyCount = await client.query('SELECT COUNT(*) as count FROM locations')
    console.log(`📊 Total records in locations table: ${verifyCount.rows[0].count}`)
    
    await client.query('COMMIT')
    console.log('\n✅ Data transfer completed successfully!')
    console.log('   All IDs have been preserved to maintain foreign key relationships.')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('\n❌ Transfer failed:')
    console.error(error.message)
    if (error.code === '23505') {
      console.error('   Error: Duplicate key violation. Some records may already exist in locations table.')
    }
    console.error(error.stack)
    await pool.end()
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

transferDestinationsToLocations()
