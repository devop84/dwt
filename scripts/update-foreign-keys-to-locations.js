import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function updateForeignKeysToLocations() {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    console.log('🔄 Updating foreign key connections to locations table...\n')
    
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
    
    // Tables that should have locationId foreign key
    const tables = [
      { name: 'hotels', onDelete: 'CASCADE' },
      { name: 'guides', onDelete: 'CASCADE' },
      { name: 'vehicles', onDelete: 'SET NULL' },
      { name: 'caterers', onDelete: 'SET NULL' }
    ]
    
    for (const table of tables) {
      console.log(`\n📋 Processing ${table.name} table...`)
      
      // Check if destinationId column exists
      const destinationIdCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'destinationId'
        )
      `, [table.name])
      
      // Check if locationId column exists
      const locationIdCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'locationId'
        )
      `, [table.name])
      
      // Rename destinationId to locationId if it exists and locationId doesn't
      if (destinationIdCheck.rows[0].exists && !locationIdCheck.rows[0].exists) {
        console.log(`   🔄 Renaming destinationId → locationId`)
        await client.query(`ALTER TABLE ${table.name} RENAME COLUMN "destinationId" TO "locationId"`)
        console.log(`   ✓ Column renamed`)
      } else if (destinationIdCheck.rows[0].exists && locationIdCheck.rows[0].exists) {
        // Both exist - we need to migrate data and drop destinationId
        console.log(`   ⚠️  Both destinationId and locationId exist. Migrating data...`)
        await client.query(`
          UPDATE ${table.name}
          SET "locationId" = "destinationId"
          WHERE "locationId" IS NULL AND "destinationId" IS NOT NULL
        `)
        await client.query(`ALTER TABLE ${table.name} DROP COLUMN "destinationId"`)
        console.log(`   ✓ Data migrated and destinationId column dropped`)
      }
      
      // Get all foreign key constraints for this table
      const constraintsQuery = await client.query(`
        SELECT 
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = $1
          AND tc.constraint_type = 'FOREIGN KEY'
          AND (ccu.table_name = 'destinations' OR ccu.table_name = 'locations')
      `, [table.name])
      
      // Drop old foreign key constraints pointing to destinations
      for (const constraint of constraintsQuery.rows) {
        if (constraint.foreign_table_name === 'destinations' || 
            constraint.column_name === 'destinationId' ||
            constraint.constraint_name.includes('destination')) {
          console.log(`   🗑️  Dropping old constraint: ${constraint.constraint_name}`)
          try {
            await client.query(`ALTER TABLE ${table.name} DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}"`)
            console.log(`   ✓ Constraint dropped`)
          } catch (error) {
            console.log(`   ⚠️  Could not drop constraint: ${error.message}`)
          }
        }
      }
      
      // Check if locationId column exists before creating constraint
      const finalLocationIdCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'locationId'
        )
      `, [table.name])
      
      if (finalLocationIdCheck.rows[0].exists) {
        // Check if constraint already exists
        const existingConstraint = await client.query(`
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = $1
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%location%'
        `, [table.name])
        
        if (existingConstraint.rows.length === 0) {
          // Create new foreign key constraint pointing to locations
          const constraintName = `${table.name}_locationId_fkey`
          console.log(`   🔗 Creating foreign key constraint to locations table...`)
          try {
            await client.query(`
              ALTER TABLE ${table.name}
              ADD CONSTRAINT ${constraintName}
              FOREIGN KEY ("locationId")
              REFERENCES locations(id)
              ON DELETE ${table.onDelete}
            `)
            console.log(`   ✓ Foreign key constraint created (ON DELETE ${table.onDelete})`)
          } catch (error) {
            if (error.code === '42710') {
              console.log(`   ℹ️  Constraint already exists`)
            } else {
              throw error
            }
          }
        } else {
          console.log(`   ✓ Foreign key constraint already exists`)
        }
      } else {
        console.log(`   ⚠️  locationId column does not exist in ${table.name} table`)
      }
    }
    
    await client.query('COMMIT')
    console.log('\n✅ Foreign key connections updated successfully!')
    console.log('   All tables now reference the locations table instead of destinations.')
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('\n❌ Update failed:')
    console.error(error.message)
    console.error(error.stack)
    await pool.end()
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

updateForeignKeysToLocations()
