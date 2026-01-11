import 'dotenv/config'
import pg from 'pg'
import { randomUUID } from 'crypto'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

const destinationsToSeed = [
  { name: 'Cumbuco', coordinates: '-3.6258, -38.7236', prefeitura: 'Caucaia', state: 'Ceará', cep: '61600-000', description: 'Popular spot near Fortaleza with strong winds and flat water lagoons. Great for beginners and freestyle. Starting point of the downwinder route.' },
  { name: 'Cauipe', coordinates: '-3.6000, -38.7000', prefeitura: 'Caucaia', state: 'Ceará', cep: '61600-000', description: 'Renowned flat water lagoon just 5km from Cumbuco. Perfect for freestyle and freeride. One of the most popular spots in the region.' },
  { name: 'Tabuba', coordinates: '-3.5800, -38.6800', prefeitura: 'Caucaia', state: 'Ceará', cep: '61600-000', description: 'Flat water lagoon about 4.5km upwind from Cumbuco. Size varies with precipitation. Great alternative to Cauipe for freestyle.' },
  { name: 'Pecém', coordinates: '-3.5431, -38.7944', prefeitura: 'São Gonçalo do Amarante', state: 'Ceará', cep: '62670-000', description: 'Approximately 20km downwind of Cumbuco. Open ocean conditions recommended for experienced kitesurfers. Thrilling downwinder journey.' },
  { name: 'Taiba', coordinates: '-3.4483, -38.8533', prefeitura: 'São Gonçalo do Amarante', state: 'Ceará', cep: '62670-000', description: 'Excellent wind conditions with both flat water and wave spots. Great for all skill levels. Small lagoon popular among professionals.' },
  { name: 'Paracuru', coordinates: '-3.4100, -39.0300', prefeitura: 'Paracuru', state: 'Ceará', cep: '62680-000', description: 'Strong winds and flat water conditions. Popular for wave riding and freestyle kitesurfing. Top spot for experienced riders.' },
  { name: 'Lagoa do Mato', coordinates: '-3.3500, -39.1000', prefeitura: 'Trairi', state: 'Ceará', cep: '62690-000', description: 'Flat water lagoon perfect for learning and freestyle. Strong and consistent winds.' },
  { name: 'Icarai de Amontada', coordinates: '-3.3500, -39.2000', prefeitura: 'Amontada', state: 'Ceará', cep: '62540-000', description: 'Consistent winds and beautiful beaches. Growing kitesurfing destination with good infrastructure.' },
  { name: 'Mundaú', coordinates: '-3.2000, -39.2500', prefeitura: 'Trairi', state: 'Ceará', cep: '62690-000', description: 'Flat water lagoon with excellent wind conditions. Perfect for freestyle and learning.' },
  { name: 'Guajiru', coordinates: '-3.4000, -38.9500', prefeitura: 'Trairi', state: 'Ceará', cep: '62690-000', description: 'Flat water spot with consistent winds. Popular for freestyle and learning new tricks.' },
  { name: 'Fleixeiras', coordinates: '-3.5000, -38.9000', prefeitura: 'Trairi', state: 'Ceará', cep: '62690-000', description: 'Flat water lagoon perfect for learning and freestyle. Strong and consistent winds.' },
  { name: 'Itarema', coordinates: '-2.9500, -39.9167', prefeitura: 'Itarema', state: 'Ceará', cep: '62590-000', description: 'Consistent winds and beautiful beaches. Great for all skill levels with good learning conditions.' },
  { name: 'Acaraú', coordinates: '-2.8833, -40.1167', prefeitura: 'Acaraú', state: 'Ceará', cep: '62580-000', description: 'Strong winds and good infrastructure. Popular spot for both locals and tourists.' },
  { name: 'Camocim', coordinates: '-2.9022, -40.8411', prefeitura: 'Camocim', state: 'Ceará', cep: '62400-000', description: 'Excellent wind conditions with both flat water and wave spots. Growing kitesurfing community.' },
  { name: 'Barra Grande', coordinates: '-2.7500, -40.8500', prefeitura: 'Camocim', state: 'Ceará', cep: '62400-000', description: 'Pristine beaches with excellent wind conditions. Great for wave riding and downwinders.' },
  { name: 'Lagoinha', coordinates: '-2.9500, -40.4000', prefeitura: 'Cruz', state: 'Ceará', cep: '62595-000', description: 'Beautiful lagoon with excellent wind conditions. Great spot for beginners and intermediate riders.' },
  { name: 'Preá', coordinates: '-2.8500, -40.4500', prefeitura: 'Cruz', state: 'Ceará', cep: '62595-000', description: 'Small fishing village with consistent winds and beautiful scenery. Less crowded than Jericoacoara.' },
  { name: 'Jericoacoara', coordinates: '-2.7974, -40.5123', prefeitura: 'Jijoca de Jericoacoara', state: 'Ceará', cep: '62598-000', description: 'World-famous kitesurfing destination with consistent winds and beautiful dunes. Best season: July to December.' },
  { name: 'Guriú', coordinates: '-2.8200, -40.4800', prefeitura: 'Jijoca de Jericoacoara', state: 'Ceará', cep: '62598-000', description: 'Beautiful lagoon near Jericoacoara with waist-deep flat water. Perfect for kitesurfing. Remote location accessible by 4x4 or boat.' },
  { name: 'Tatajuba', coordinates: '-2.9000, -40.5000', prefeitura: 'Cruz', state: 'Ceará', cep: '62595-000', description: 'Remote beach with excellent wind conditions and pristine nature. Accessible by 4x4 or boat.' },
  { name: 'Cajueiro da Praia', coordinates: '-2.9000, -41.3500', prefeitura: 'Cajueiro da Praia', state: 'Piauí', cep: '64222-000', description: 'Strong winds and beautiful scenery. Less developed but excellent for experienced riders.' },
  { name: 'Ilha do Guajiru', coordinates: '-3.3500, -38.9800', prefeitura: 'Trairi', state: 'Ceará', cep: '62690-000', description: 'Island destination with flat water and consistent winds. Accessible by boat or during low tide.' },
  { name: 'Paulino Neves', coordinates: '-2.7167, -42.5333', prefeitura: 'Paulino Neves', state: 'Maranhão', cep: '65285-000', description: 'Small coastal town with good wind conditions. Less crowded spot for kitesurfing.' },
  { name: 'Tutóia', coordinates: '-2.7611, -42.2744', prefeitura: 'Tutóia', state: 'Maranhão', cep: '65580-000', description: 'Gateway to the Lençóis Maranhenses. Good wind conditions and access to beautiful lagoons.' },
  { name: 'Curimãs', coordinates: '-3.2640, -39.2313', prefeitura: 'Barroquinha', state: 'Ceará', cep: '62480-000', description: 'Beautiful beach with excellent wind conditions. Great spot for wave riding and downwinders.' },
  { name: 'Moréias', coordinates: '-2.8833, -40.8333', prefeitura: 'Camocim', state: 'Ceará', cep: '62400-000', description: 'Scenic destination with consistent winds and beautiful lagoons. Popular for kitesurfing and nature lovers.' },
  { name: 'Atins', coordinates: '-2.5000, -42.7000', prefeitura: 'Barreirinhas', state: 'Maranhão', cep: '65590-000', description: 'Remote paradise at the end of the downwinder route. Stunning beaches, strong winds, and access to Lençóis Maranhenses. Best for experienced riders.' },
  { name: 'Mandacaru', coordinates: '-2.5500, -42.6500', prefeitura: 'Barreirinhas', state: 'Maranhão', cep: '65590-000', description: 'Small fishing village near Atins with excellent wind conditions. Great for wave riding.' },
  { name: 'Cabo Verde', coordinates: '-2.6000, -42.6000', prefeitura: 'Barreirinhas', state: 'Maranhão', cep: '65590-000', description: 'Beautiful beach with consistent winds. Popular spot for downwinders ending at Atins.' },
  { name: 'Pontal do Atins', coordinates: '-2.4800, -42.7200', prefeitura: 'Barreirinhas', state: 'Maranhão', cep: '65590-000', description: 'Point break near Atins with excellent wave conditions. Best during high tide.' },
  { name: 'Rio Preguiças', coordinates: '-2.5200, -42.6800', prefeitura: 'Barreirinhas', state: 'Maranhão', cep: '65590-000', description: 'River mouth near Atins offering flat water conditions. Great for beginners and freestyle.' },
]

async function seedDestinations() {
  try {
    console.log('🌱 Seeding 31 kitesurf destinations from Cumbuco to Atins...\n')

    // Create destinations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS destinations (
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
    
    // Add prefeitura, state, and cep columns if they don't exist (migration for existing tables)
    try {
      await pool.query(`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS prefeitura VARCHAR(255)`)
      await pool.query(`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS state VARCHAR(100)`)
      await pool.query(`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS cep VARCHAR(20)`)
    } catch (migrationError) {
      console.log('Migration note:', migrationError.message)
    }
    
    console.log('✅ Destinations table ready\n')

    // Drop all existing destinations
    await pool.query('DELETE FROM destinations')
    console.log('🗑️  Cleared existing destinations\n')

    const currentDestinationsCount = await pool.query('SELECT COUNT(*) FROM destinations')
    console.log(`📊 Current destinations in database: ${currentDestinationsCount.rows[0].count}`)

    for (const destData of destinationsToSeed) {
      const destId = randomUUID()
      await pool.query(
        `INSERT INTO destinations (id, name, coordinates, prefeitura, state, cep, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          destId,
          destData.name,
          destData.coordinates,
          destData.prefeitura,
          destData.state,
          destData.cep,
          destData.description,
        ]
      )
      console.log(`✅ Inserted: ${destData.name}`)
    }

    const totalDestinations = await pool.query('SELECT COUNT(*) FROM destinations')
    console.log(`\n📈 Total destinations after seeding: ${totalDestinations.rows[0].count}`)
    console.log('✨ Successfully seeded 31 kitesurf destinations from Cumbuco to Atins!')

    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error seeding destinations:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

seedDestinations()
