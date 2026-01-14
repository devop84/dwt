import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function addHotelOwnerToVehicles() {
  try {
    console.log('🔄 Starting migration: Add hotel owner support to vehicles...')
    
    // Check if vehicles table exists
    const checkTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'vehicles'
    `)
    
    if (checkTable.rows.length === 0) {
      console.log('⚠️  vehicles table does not exist, skipping migration')
      return
    }
    
    // Check if hotelId column already exists
    const checkColumn = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'vehicles' AND column_name = 'hotelId'
    `)
    
    if (checkColumn.rows.length > 0) {
      console.log('⚠️  hotelId column already exists, skipping migration')
      return
    }
    
    // Add hotelId column
    await pool.query(`
      ALTER TABLE vehicles 
      ADD COLUMN "hotelId" UUID REFERENCES hotels(id) ON DELETE SET NULL
    `)
    console.log('✅ Added hotelId column to vehicles table')
    
    // Update the check constraint to allow 'hotel' as vehicleOwner
    // First, drop the old constraint
    await pool.query(`
      ALTER TABLE vehicles 
      DROP CONSTRAINT IF EXISTS check_vehicle_owner
    `)
    console.log('✅ Dropped old vehicleOwner constraint')
    
    // Add new constraint allowing 'company', 'third-party', and 'hotel'
    await pool.query(`
      ALTER TABLE vehicles 
      ADD CONSTRAINT check_vehicle_owner 
      CHECK ("vehicleOwner" IN ('company', 'third-party', 'hotel'))
    `)
    console.log('✅ Added new vehicleOwner constraint (company, third-party, hotel)')
    
    // Add constraint to ensure proper owner ID is set based on vehicleOwner type
    // If vehicleOwner is 'third-party', thirdPartyId should be set
    // If vehicleOwner is 'hotel', hotelId should be set
    // If vehicleOwner is 'company', both should be null
    await pool.query(`
      ALTER TABLE vehicles 
      ADD CONSTRAINT check_vehicle_owner_consistency 
      CHECK (
        ("vehicleOwner" = 'company' AND "thirdPartyId" IS NULL AND "hotelId" IS NULL) OR
        ("vehicleOwner" = 'third-party' AND "thirdPartyId" IS NOT NULL AND "hotelId" IS NULL) OR
        ("vehicleOwner" = 'hotel' AND "thirdPartyId" IS NULL AND "hotelId" IS NOT NULL)
      )
    `)
    console.log('✅ Added vehicleOwner consistency constraint')
    
    console.log('✅ Migration complete!')
  } catch (error) {
    console.error('❌ Error during migration:', error)
    throw error
  } finally {
    await pool.end()
  }
}

addHotelOwnerToVehicles()
