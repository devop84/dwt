import 'dotenv/config'
import pg from 'pg'
import { randomUUID } from 'crypto'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

const driversToSeed = [
  {
    name: 'Antonio Ferreira',
    contactNumber: '+55 85 99999-2001',
    email: 'antonio.ferreira@driver.com',
    languages: 'pt, en',
    vehicle: '4x4',
    note: 'Experienced driver with 10+ years in the region. Knows all routes from Cumbuco to Atins. Safe and reliable.'
  },
  {
    name: 'Luiz Rodrigues',
    contactNumber: '+55 85 98888-3002',
    email: 'luiz.rodrigues@driver.com',
    languages: 'pt, en, es',
    vehicle: 'boat',
    note: 'Professional driver specializing in downwinder support. Excellent knowledge of beaches and access points.'
  },
  {
    name: 'Francisco Santos',
    contactNumber: '+55 85 97777-4003',
    email: 'francisco.santos@driver.com',
    languages: 'pt, en',
    vehicle: '4x4',
    note: 'Local driver with great knowledge of hidden spots. Can navigate 4x4 tracks with ease.'
  },
  {
    name: 'Jose Costa',
    contactNumber: '+55 85 96666-5004',
    email: 'jose.costa@driver.com',
    languages: 'pt, en, fr',
    vehicle: 'sedan',
    note: 'Reliable driver for long-distance transfers. Comfortable vehicles with equipment storage.'
  },
  {
    name: 'Paulo Alves',
    contactNumber: '+55 88 95555-6005',
    email: 'paulo.alves@driver.com',
    languages: 'pt, en, de',
    vehicle: '4x4',
    note: 'Expert driver in Jericoacoara area. Knows all the access roads and best times to travel.'
  },
  {
    name: 'Marcos Lima',
    contactNumber: '+55 85 94444-7006',
    email: 'marcos.lima@driver.com',
    languages: 'pt, en',
    vehicle: 'sedan',
    note: 'Professional driver with 8+ years experience. Specializes in group transfers and equipment transport.'
  },
  {
    name: 'Eduardo Souza',
    contactNumber: '+55 88 93333-8007',
    email: 'eduardo.souza@driver.com',
    languages: 'pt, en, it',
    vehicle: 'quadbike',
    note: 'Skilled driver for beach transfers. Can handle sand tracks and difficult terrain. Safe driver.'
  },
  {
    name: 'Roberto Silva',
    contactNumber: '+55 85 92222-9008',
    email: 'roberto.silva@driver.com',
    languages: 'pt, en, es',
    vehicle: '4x4',
    note: 'Experienced driver with knowledge of all kitesurf spots. Flexible schedule and competitive rates.'
  },
  {
    name: 'Fernando Martins',
    contactNumber: '+55 88 91111-1009',
    email: 'fernando.martins@driver.com',
    languages: 'pt, en',
    vehicle: 'boat',
    note: 'Local driver with 12+ years experience. Great for early morning transfers and downwinder support.'
  },
  {
    name: 'Carlos Rocha',
    contactNumber: '+55 85 90000-2010',
    email: 'carlos.rocha@driver.com',
    languages: 'pt, en, nl',
    vehicle: 'sedan',
    note: 'Professional driver with international tourist experience. Comfortable vehicles and punctual service.'
  },
]

async function seedDrivers() {
  try {
    console.log('🔄 Starting drivers seed...\n')

    // Get all destinations to assign drivers
    const destinationsResult = await pool.query('SELECT id, name FROM destinations ORDER BY name')
    const destinations = destinationsResult.rows

    if (destinations.length === 0) {
      console.error('❌ No destinations found. Please seed destinations first.')
      await pool.end()
      process.exit(1)
    }

    console.log(`📋 Found ${destinations.length} destinations\n`)

    // Add vehicle column if it doesn't exist
    console.log('🔧 Checking for vehicle column...')
    try {
      await pool.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle VARCHAR(50)`)
      console.log('✅ Vehicle column ready\n')
    } catch (migrationError) {
      // Column might already exist, that's fine
      console.log('ℹ️  Vehicle column check completed\n')
    }

    // Clear existing drivers
    console.log('🗑️  Clearing existing drivers...')
    await pool.query('DELETE FROM drivers')
    console.log('✅ Cleared existing drivers\n')

    // Seed drivers
    console.log('🌱 Seeding drivers...\n')
    let seededCount = 0

    for (let i = 0; i < driversToSeed.length; i++) {
      const driver = driversToSeed[i]
      
      // Assign each driver to a destination (round-robin distribution)
      const destination = destinations[i % destinations.length]
      
      const driverId = randomUUID()
      
      await pool.query(
        `INSERT INTO drivers (id, name, "contactNumber", email, "destinationId", languages, vehicle, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          driverId,
          driver.name,
          driver.contactNumber,
          driver.email,
          destination.id,
          driver.languages,
          driver.vehicle,
          driver.note,
        ]
      )

      console.log(`   ✓ Seeded driver: ${driver.name} → ${destination.name}`)
      seededCount++
    }

    console.log(`\n✅ Successfully seeded ${seededCount} drivers!`)
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error seeding drivers:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

seedDrivers()
