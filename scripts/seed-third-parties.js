import 'dotenv/config'
import pg from 'pg'
import { randomUUID } from 'crypto'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

const thirdParties = [
  {
    name: 'ABC Travel Agency',
    contactNumber: '+55 11 9876-5432',
    email: 'contact@abctravel.com',
    note: 'Main travel partner for group bookings'
  },
  {
    name: 'XYZ Insurance Company',
    contactNumber: '+55 21 3456-7890',
    email: 'info@xyzinsurance.com',
    note: 'Travel insurance provider'
  },
  {
    name: 'Local Transport Services',
    contactNumber: '+55 85 2345-6789',
    email: 'transport@local.com',
    note: 'Ground transportation for tours'
  },
  {
    name: 'Event Planning Co.',
    contactNumber: '+55 47 8765-4321',
    email: 'events@planningco.com',
    note: 'Special events and celebrations'
  },
  {
    name: 'Photography Studio',
    contactNumber: '+55 11 7654-3210',
    email: 'photos@studio.com',
    note: 'Tour photography services'
  },
  {
    name: 'Equipment Rental',
    contactNumber: '+55 48 6543-2109',
    email: 'rental@equipment.com',
    note: 'Outdoor gear and equipment rental'
  },
  {
    name: 'Translation Services',
    contactNumber: '+55 31 5432-1098',
    email: 'translate@services.com',
    note: 'Multi-language translation support'
  },
  {
    name: 'Medical Support',
    contactNumber: '+55 11 4321-0987',
    email: 'medical@support.com',
    note: 'Emergency medical assistance'
  },
  {
    name: 'Food Catering',
    contactNumber: '+55 21 3210-9876',
    email: 'catering@food.com',
    note: 'Special dietary requirements catering'
  },
  {
    name: 'Security Services',
    contactNumber: '+55 85 2109-8765',
    email: 'security@services.com',
    note: 'Tour security and safety services'
  }
]

async function seedThirdParties() {
  try {
    console.log('🌱 Seeding third parties...')
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'third_parties'
      )
    `)
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ third_parties table does not exist. Please run: npm run create:third-parties-table')
      await pool.end()
      process.exit(1)
    }
    
    // Check if there are already third parties
    const existingCount = await pool.query('SELECT COUNT(*) as count FROM third_parties')
    if (parseInt(existingCount.rows[0].count) > 0) {
      console.log(`⚠️  Found ${existingCount.rows[0].count} existing third parties.`)
      console.log('   Skipping seed to avoid duplicates.')
      await pool.end()
      process.exit(0)
    }
    
    // Insert third parties
    for (const thirdParty of thirdParties) {
      const id = randomUUID()
      await pool.query(
        `INSERT INTO third_parties (id, name, "contactNumber", email, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, thirdParty.name, thirdParty.contactNumber, thirdParty.email, thirdParty.note]
      )
      console.log(`✅ Created: ${thirdParty.name}`)
    }
    
    console.log(`\n🎉 Successfully seeded ${thirdParties.length} third parties!`)
    
    // Show summary
    const count = await pool.query('SELECT COUNT(*) as count FROM third_parties')
    console.log(`📊 Total third parties in database: ${count.rows[0].count}`)
    
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding third parties:')
    console.error(error.message)
    await pool.end()
    process.exit(1)
  }
}

seedThirdParties()
