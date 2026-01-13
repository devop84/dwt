import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function migrateDestinationsToLocations() {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('🔄 Starting migration: destinations → locations...\n')
    
    // Check if destinations table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'destinations'
      )
    `)
    
    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  destinations table does not exist. Nothing to migrate.')
      await client.query('ROLLBACK')
      await pool.end()
      process.exit(0)
    }
    
    // Check if locations table already exists
    const locationsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'locations'
      )
    `)
    
    if (locationsCheck.rows[0].exists) {
      console.log('⚠️  locations table already exists. Skipping migration.')
      await client.query('ROLLBACK')
      await pool.end()
      process.exit(0)
    }
    
    console.log('1️⃣  Creating locations table...')
    await client.query(`
      CREATE TABLE locations (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        coordinates VARCHAR(255),
        prefeitura VARCHAR(255),
        state VARCHAR(100),
        cep VARCHAR(20),
        description TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('   ✓ Locations table created')
    
    console.log('2️⃣  Transferring data from destinations to locations (preserving IDs)...')
    const dataTransfer = await client.query(`
      INSERT INTO locations (id, name, coordinates, prefeitura, state, cep, description, "createdAt", "updatedAt")
      SELECT id, name, coordinates, prefeitura, state, cep, description, "createdAt", "updatedAt"
      FROM destinations
    `)
    console.log(`   ✓ Transferred ${dataTransfer.rowCount} records to locations table`)
    
    console.log('3️⃣  Renaming foreign key columns...')
    
    // Rename destinationId to locationId in hotels table
    const hotelsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'hotels' AND column_name = 'destinationId'
      )
    `)
    if (hotelsCheck.rows[0].exists) {
      await client.query('ALTER TABLE hotels RENAME COLUMN "destinationId" TO "locationId"')
      console.log('   ✓ hotels.destinationId → hotels.locationId')
    }
    
    // Rename destinationId to locationId in guides table
    const guidesCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'guides' AND column_name = 'destinationId'
      )
    `)
    if (guidesCheck.rows[0].exists) {
      await client.query('ALTER TABLE guides RENAME COLUMN "destinationId" TO "locationId"')
      console.log('   ✓ guides.destinationId → guides.locationId')
    }
    
    // Rename destinationId to locationId in vehicles table
    const vehiclesCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'destinationId'
      )
    `)
    if (vehiclesCheck.rows[0].exists) {
      await client.query('ALTER TABLE vehicles RENAME COLUMN "destinationId" TO "locationId"')
      console.log('   ✓ vehicles.destinationId → vehicles.locationId')
    }
    
    // Rename destinationId to locationId in caterers table
    const caterersCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'caterers' AND column_name = 'destinationId'
      )
    `)
    if (caterersCheck.rows[0].exists) {
      await client.query('ALTER TABLE caterers RENAME COLUMN "destinationId" TO "locationId"')
      console.log('   ✓ caterers.destinationId → caterers.locationId')
    }
    
    // Update foreign key constraints to reference locations instead of destinations
    console.log('4️⃣  Updating foreign key constraints...')
    
    // Drop old foreign key constraints and recreate them
    const tables = ['hotels', 'guides', 'vehicles', 'caterers']
    for (const table of tables) {
      try {
        // Get constraint name
        const constraintQuery = await client.query(`
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = $1
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name LIKE '%destination%'
        `, [table])
        
        if (constraintQuery.rows.length > 0) {
          for (const constraint of constraintQuery.rows) {
            await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}"`)
          }
        }
        
        // Recreate foreign key constraint
        const onDelete = table === 'vehicles' || table === 'caterers' ? 'SET NULL' : 'CASCADE'
        await client.query(`
          ALTER TABLE ${table}
          ADD CONSTRAINT ${table}_locationId_fkey
          FOREIGN KEY ("locationId")
          REFERENCES locations(id)
          ON DELETE ${onDelete}
        `)
        console.log(`   ✓ Updated foreign key constraint for ${table}`)
      } catch (error) {
        // Constraint might already exist or table might not have the column
        console.log(`   ⚠️  Skipping constraint update for ${table}: ${error.message}`)
      }
    }
    
    console.log('5️⃣  Dropping destinations table...')
    await client.query('DROP TABLE IF EXISTS destinations CASCADE')
    console.log('   ✓ Destinations table dropped')
    
    await client.query('COMMIT')
    console.log('\n✅ Migration completed successfully!')
    console.log('   ✓ Created locations table')
    console.log('   ✓ Transferred all data from destinations to locations (preserving IDs)')
    console.log('   ✓ Renamed destinationId → locationId (in all related tables)')
    console.log('   ✓ Updated foreign key constraints to reference locations')
    console.log('   ✓ Dropped destinations table')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('\n❌ Migration failed:')
    console.error(error.message)
    console.error(error.stack)
    await pool.end()
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

migrateDestinationsToLocations()
