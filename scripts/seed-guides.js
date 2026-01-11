import 'dotenv/config'
import pg from 'pg'
import { randomUUID } from 'crypto'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

const guidesToSeed = [
  {
    name: 'João Silva',
    contactNumber: '+55 85 99999-1001',
    email: 'joao.silva@kiteguide.com',
    languages: 'pt, en',
    note: 'Professional kitesurf instructor with 10+ years experience. Specializes in beginner and intermediate lessons.'
  },
  {
    name: 'Maria Santos',
    contactNumber: '+55 85 98888-2002',
    email: 'maria.santos@kiteguide.com',
    languages: 'pt, en, es',
    note: 'Certified instructor, expert in downwinder tours. Great knowledge of local conditions.'
  },
  {
    name: 'Carlos Oliveira',
    contactNumber: '+55 85 97777-3003',
    email: 'carlos.oliveira@kiteguide.com',
    languages: 'pt, en',
    note: 'Advanced instructor, perfect for progression. Safety-first approach.'
  },
  {
    name: 'Ana Costa',
    contactNumber: '+55 85 96666-4004',
    email: 'ana.costa@kiteguide.com',
    languages: 'pt, en, fr',
    note: 'Freestyle specialist. Experienced with wave riding and tricks.'
  },
  {
    name: 'Pedro Alves',
    contactNumber: '+55 88 95555-5005',
    email: 'pedro.alves@kiteguide.com',
    languages: 'pt, en, de',
    note: 'Local expert in Jericoacoara and surrounding areas. Knowledge of best spots.'
  },
  {
    name: 'Fernanda Lima',
    contactNumber: '+55 85 94444-6006',
    email: 'fernanda.lima@kiteguide.com',
    languages: 'pt, en',
    note: 'Beginner-friendly instructor. Patient and encouraging teaching style.'
  },
  {
    name: 'Ricardo Souza',
    contactNumber: '+55 88 93333-7007',
    email: 'ricardo.souza@kiteguide.com',
    languages: 'pt, en, it',
    note: 'Hydrofoil specialist. Also offers kite repair services.'
  },
  {
    name: 'Juliana Ferreira',
    contactNumber: '+55 85 92222-8008',
    email: 'juliana.ferreira@kiteguide.com',
    languages: 'pt, en, es',
    note: 'Female instructor, great for women who want to learn. Focus on technique and confidence building.'
  },
  {
    name: 'Roberto Martins',
    contactNumber: '+55 88 91111-9009',
    email: 'roberto.martins@kiteguide.com',
    languages: 'pt, en',
    note: 'Veteran instructor with 15+ years. Knows all the secret spots between Cumbuco and Atins.'
  },
  {
    name: 'Patricia Rocha',
    contactNumber: '+55 85 90000-1010',
    email: 'patricia.rocha@kiteguide.com',
    languages: 'pt, en, nl',
    note: 'IKO certified instructor. Excellent for international tourists. Organizes group lessons and tours.'
  },
]

async function seedGuides() {
  try {
    console.log('🔄 Starting guides seed...\n')

    // Get all destinations to assign guides
    const destinationsResult = await pool.query('SELECT id, name FROM destinations ORDER BY name')
    const destinations = destinationsResult.rows

    if (destinations.length === 0) {
      console.error('❌ No destinations found. Please seed destinations first.')
      await pool.end()
      process.exit(1)
    }

    console.log(`📋 Found ${destinations.length} destinations\n`)

    // Clear existing guides
    console.log('🗑️  Clearing existing guides...')
    await pool.query('DELETE FROM guides')
    console.log('✅ Cleared existing guides\n')

    // Seed guides
    console.log('🌱 Seeding guides...\n')
    let seededCount = 0

    for (let i = 0; i < guidesToSeed.length; i++) {
      const guide = guidesToSeed[i]
      
      // Assign each guide to a destination (round-robin distribution)
      const destination = destinations[i % destinations.length]
      
      const guideId = randomUUID()
      
      await pool.query(
        `INSERT INTO guides (id, name, "contactNumber", email, "destinationId", languages, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          guideId,
          guide.name,
          guide.contactNumber,
          guide.email,
          destination.id,
          guide.languages,
          guide.note,
        ]
      )

      console.log(`   ✓ Seeded guide: ${guide.name} → ${destination.name}`)
      seededCount++
    }

    console.log(`\n✅ Successfully seeded ${seededCount} guides!`)
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error seeding guides:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

seedGuides()
