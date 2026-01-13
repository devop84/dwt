import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function migrate() {
  try {
    console.log('🚀 Starting migration: Drivers → Vehicles')
    
    // Check if drivers table exists
    const driversTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'drivers'
      )
    `)
    
    const driversExists = driversTableCheck.rows[0].exists
    
    // Check if vehicles table exists
    const vehiclesTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'vehicles'
      )
    `)
    
    const vehiclesExists = vehiclesTableCheck.rows[0].exists
    
    console.log(`📊 Current state: drivers=${driversExists}, vehicles=${vehiclesExists}`)
    
    // Create vehicles table if it doesn't exist
    if (!vehiclesExists) {
      console.log('📦 Creating vehicles table...')
      await pool.query(`
        CREATE TABLE IF NOT EXISTS vehicles (
          id UUID PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          "vehicleOwner" VARCHAR(50) NOT NULL,
          "destinationId" UUID REFERENCES destinations(id) ON DELETE SET NULL,
          "thirdPartyId" UUID REFERENCES third_parties(id) ON DELETE SET NULL,
          note TEXT,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW(),
          CONSTRAINT check_vehicle_type CHECK (type IN ('car4x4', 'boat', 'quadbike', 'carSedan', 'outro')),
          CONSTRAINT check_vehicle_owner CHECK ("vehicleOwner" IN ('company', 'third-party'))
        )
      `)
      console.log('✅ Vehicles table created')
    } else {
      console.log('✅ Vehicles table already exists')
    }
    
    // Update accounts table constraint to replace 'driver' with 'vehicle'
    console.log('🔄 Updating accounts table constraint...')
    try {
      // Check if accounts table exists
      const accountsCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'accounts'
        )
      `)
      
      if (accountsCheck.rows[0].exists) {
        // Drop the old constraint
        await pool.query(`
          ALTER TABLE accounts 
          DROP CONSTRAINT IF EXISTS check_entity_type
        `)
        
        // Add new constraint with 'vehicle' instead of 'driver'
        await pool.query(`
          ALTER TABLE accounts 
          ADD CONSTRAINT check_entity_type 
          CHECK ("entityType" IN ('client', 'hotel', 'guide', 'vehicle', 'caterer', 'company', 'third-party'))
        `)
        console.log('✅ Accounts table constraint updated (driver → vehicle)')
      } else {
        console.log('ℹ️  Accounts table does not exist (skipping constraint update)')
      }
    } catch (error) {
      console.log('⚠️  Could not update accounts constraint:', error.message)
      // Continue anyway
    }
    
    // Drop drivers table if it exists
    if (driversExists) {
      console.log('🗑️  Dropping drivers table...')
      
      // First, check if there are any foreign key constraints referencing drivers
      const fkCheck = await pool.query(`
        SELECT 
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'drivers'
      `)
      
      if (fkCheck.rows.length > 0) {
        console.log('⚠️  Found foreign key constraints referencing drivers table:')
        fkCheck.rows.forEach(fk => {
          console.log(`   - ${fk.table_name}.${fk.column_name} → drivers.${fk.foreign_column_name}`)
        })
        console.log('⚠️  Dropping with CASCADE to remove these constraints...')
      }
      
      // Drop the table (CASCADE will drop dependent objects)
      await pool.query('DROP TABLE IF EXISTS drivers CASCADE')
      console.log('✅ Drivers table dropped')
    } else {
      console.log('ℹ️  Drivers table does not exist (nothing to drop)')
    }
    
    console.log('✅ Migration complete!')
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error(error)
    await pool.end()
    process.exit(1)
  }
}

migrate()
