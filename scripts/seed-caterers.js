import pg from 'pg'
import dotenv from 'dotenv'
import { randomUUID } from 'crypto'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const caterersToSeed = [
  {
    name: 'Restaurante do Mar',
    contactNumber: '+55 85 99999-1111',
    email: 'contato@restaurantedomar.com.br',
    type: 'restaurant',
    destinationId: null, // Will be set to first destination
    note: 'Specializes in seafood dishes'
  },
  {
    name: 'Pousada Beach Restaurant',
    contactNumber: '+55 85 99999-2222',
    email: 'restaurant@pousadabeach.com.br',
    type: 'hotel',
    destinationId: null,
    note: 'Hotel restaurant with buffet service'
  },
  {
    name: 'Maria Silva',
    contactNumber: '+55 85 99999-3333',
    email: 'maria.silva@email.com',
    type: 'particular',
    destinationId: null,
    note: 'Private caterer for small events'
  },
  {
    name: 'Casa do Sabor',
    contactNumber: '+55 85 99999-4444',
    email: 'contato@casadosabor.com.br',
    type: 'restaurant',
    destinationId: null,
    note: 'Traditional Brazilian cuisine'
  },
  {
    name: 'Hotel Paradise Restaurant',
    contactNumber: '+55 85 99999-5555',
    email: 'restaurant@hotelparadise.com.br',
    type: 'hotel',
    destinationId: null,
    note: 'Fine dining restaurant in hotel'
  },
  {
    name: 'João Santos',
    contactNumber: '+55 85 99999-6666',
    email: 'joao.santos@email.com',
    type: 'particular',
    destinationId: null,
    note: 'Private chef for special occasions'
  },
  {
    name: 'Bella Vista Restaurant',
    contactNumber: '+55 85 99999-7777',
    email: 'info@bellavista.com.br',
    type: 'restaurant',
    destinationId: null,
    note: 'Italian-Brazilian fusion cuisine'
  },
  {
    name: 'Resort Ocean Restaurant',
    contactNumber: '+55 85 99999-8888',
    email: 'dining@resortocean.com.br',
    type: 'hotel',
    destinationId: null,
    note: 'Resort restaurant with international menu'
  },
  {
    name: 'Ana Costa',
    contactNumber: '+55 85 99999-9999',
    email: 'ana.costa@email.com',
    type: 'particular',
    destinationId: null,
    note: 'Home-based catering service'
  },
  {
    name: 'Sabor Nordestino',
    contactNumber: '+55 85 99999-0000',
    email: 'contato@sabornordestino.com.br',
    type: 'restaurant',
    destinationId: null,
    note: 'Authentic Northeastern Brazilian food'
  }
]

async function seedCaterers() {
  console.log('🔄 Starting caterers seed...')

  try {
    // Get all destinations to distribute caterers
    const destinationsResult = await pool.query('SELECT id, name FROM destinations ORDER BY name')
    const destinations = destinationsResult.rows

    if (destinations.length === 0) {
      console.error('❌ No destinations found. Please seed destinations first.')
      await pool.end()
      process.exit(1)
    }

    console.log(`📋 Found ${destinations.length} destination(s)\n`)

    // Clear existing caterers
    console.log('🗑️  Clearing existing caterers...')
    await pool.query('DELETE FROM caterers')
    console.log('✅ Cleared existing caterers\n')

    console.log('🌱 Seeding caterers...\n')

    // Distribute caterers across destinations (round-robin)
    for (let i = 0; i < caterersToSeed.length; i++) {
      const catererData = caterersToSeed[i]
      const destination = destinations[i % destinations.length]
      const catererId = randomUUID()

      await pool.query(
        `INSERT INTO caterers (id, name, "contactNumber", email, type, "destinationId", note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          catererId,
          catererData.name,
          catererData.contactNumber,
          catererData.email,
          catererData.type,
          destination.id,
          catererData.note,
        ]
      )

      console.log(`   ✓ Seeded caterer: ${catererData.name} (${catererData.type}) → ${destination.name}`)
    }

    console.log(`\n✅ Successfully seeded ${caterersToSeed.length} caterers!`)
  } catch (error) {
    console.error('❌ Error seeding caterers:', error)
    throw error
  } finally {
    await pool.end()
  }
}

seedCaterers()
