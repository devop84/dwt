import 'dotenv/config'
import pg from 'pg'
import { randomUUID } from 'crypto'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

const vehiclesToSeed = [
  // Company vehicles
  { type: 'car4x4', vehicleOwner: 'company', note: 'Main support vehicle for downwinder routes' },
  { type: 'car4x4', vehicleOwner: 'company', note: 'Backup support vehicle' },
  { type: 'boat', vehicleOwner: 'company', note: 'Support boat for water crossings' },
  { type: 'quadbike', vehicleOwner: 'company', note: 'For beach access and difficult terrain' },
  { type: 'carSedan', vehicleOwner: 'company', note: 'Airport transfers and local transport' },
  { type: 'car4x4', vehicleOwner: 'company', note: 'Additional support vehicle for large groups' },
  
  // Third-party vehicles (will be assigned to third parties)
  { type: 'car4x4', vehicleOwner: 'third-party', note: 'Rented from local transport service' },
  { type: 'boat', vehicleOwner: 'third-party', note: 'Chartered boat for special routes' },
  { type: 'quadbike', vehicleOwner: 'third-party', note: 'Rented quadbike for specific tours' },
  { type: 'carSedan', vehicleOwner: 'third-party', note: 'Third-party transfer vehicle' },
  { type: 'outro', vehicleOwner: 'third-party', note: 'Special vehicle for unique requirements' },
]

async function seedVehicles() {
  try {
    console.log('🌱 Seeding vehicles...\n')
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'vehicles'
      )
    `)
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ vehicles table does not exist. Please run the migration first.')
      await pool.end()
      process.exit(1)
    }
    
    // Check if there are already vehicles
    const existingCount = await pool.query('SELECT COUNT(*) as count FROM vehicles')
    if (parseInt(existingCount.rows[0].count) > 0) {
      console.log(`⚠️  Found ${existingCount.rows[0].count} existing vehicles.`)
      console.log('   Skipping seed to avoid duplicates.')
      await pool.end()
      process.exit(0)
    }
    
    // Get destinations for assignment
    const destinationsResult = await pool.query('SELECT id, name FROM destinations ORDER BY name LIMIT 10')
    const destinations = destinationsResult.rows
    
    // Get third parties for third-party vehicles
    const thirdPartiesResult = await pool.query('SELECT id, name FROM third_parties ORDER BY name LIMIT 10')
    const thirdParties = thirdPartiesResult.rows
    
    if (thirdParties.length === 0) {
      console.log('⚠️  No third parties found. Third-party vehicles will be created without owner assignment.')
    }
    
    console.log(`📋 Found ${destinations.length} destinations`)
    if (thirdParties.length > 0) {
      console.log(`📋 Found ${thirdParties.length} third parties\n`)
    } else {
      console.log('📋 No third parties available\n')
    }
    
    // Insert vehicles
    let seededCount = 0
    let thirdPartyIndex = 0
    
    for (let i = 0; i < vehiclesToSeed.length; i++) {
      const vehicle = vehiclesToSeed[i]
      const vehicleId = randomUUID()
      
      // Assign destination (round-robin)
      const destination = destinations.length > 0 ? destinations[i % destinations.length] : null
      
      // For third-party vehicles, assign a third party
      let thirdPartyId = null
      if (vehicle.vehicleOwner === 'third-party' && thirdParties.length > 0) {
        thirdPartyId = thirdParties[thirdPartyIndex % thirdParties.length].id
        thirdPartyIndex++
      }
      
      await pool.query(
        `INSERT INTO vehicles (id, type, "vehicleOwner", "destinationId", "thirdPartyId", note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          vehicleId,
          vehicle.type,
          vehicle.vehicleOwner,
          destination ? destination.id : null,
          thirdPartyId,
          vehicle.note
        ]
      )
      
      const ownerLabel = vehicle.vehicleOwner === 'company' ? 'Company' : (thirdPartyId ? thirdParties.find(tp => tp.id === thirdPartyId)?.name : 'Third Party')
      const destLabel = destination ? destination.name : 'No destination'
      console.log(`✅ Created: ${vehicle.type} (${ownerLabel}) → ${destLabel}`)
      seededCount++
    }
    
    console.log(`\n🎉 Successfully seeded ${seededCount} vehicles!`)
    
    // Show summary
    const count = await pool.query('SELECT COUNT(*) as count FROM vehicles')
    const companyCount = await pool.query(`SELECT COUNT(*) as count FROM vehicles WHERE "vehicleOwner" = 'company'`)
    const thirdPartyCount = await pool.query(`SELECT COUNT(*) as count FROM vehicles WHERE "vehicleOwner" = 'third-party'`)
    
    console.log(`\n📊 Summary:`)
    console.log(`   Total vehicles: ${count.rows[0].count}`)
    console.log(`   Company vehicles: ${companyCount.rows[0].count}`)
    console.log(`   Third-party vehicles: ${thirdPartyCount.rows[0].count}`)
    
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding vehicles:')
    console.error(error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    await pool.end()
    process.exit(1)
  }
}

seedVehicles()
