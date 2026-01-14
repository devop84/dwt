import 'dotenv/config'
import pg from 'pg'
import { randomUUID } from 'crypto'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

const locationsToSeed = [
  {
    name: 'Fortaleza',
    coordinates: '-3.71722, -38.54306',
    prefeitura: 'Fortaleza',
    state: 'Ceará',
    cep: '60000-000',
    description: 'Fortaleza é a capital do estado do Ceará, localizada na região Nordeste do Brasil. É conhecida por suas praias, cultura vibrante e infraestrutura turística desenvolvida. Principal ponto de entrada para a região com aeroporto internacional e excelente infraestrutura hoteleira.'
  },
  {
    name: 'Ilha dos Poldros',
    coordinates: '-2.83333, -41.83333',
    prefeitura: 'Araioses',
    state: 'Maranhão',
    cep: '65570-000',
    description: 'A Ilha dos Poldros está situada no município de Araioses, no Maranhão, e faz parte do Delta do Parnaíba. É conhecida por suas paisagens naturais, incluindo dunas, manguezais e rica biodiversidade. Praias paradisíacas com paisagens de manguezais, igarapés e dunas. Acesso por barco a partir de Porto dos Tatus.'
  },
  {
    name: 'Porto dos Tatus',
    coordinates: '-2.85750, -41.81889',
    prefeitura: 'Ilha Grande',
    state: 'Piauí',
    cep: '64290-000',
    description: 'Porto dos Tatus é um ponto de embarque localizado no município de Ilha Grande, no Piauí. É uma das principais portas de entrada para o Delta do Parnaíba, facilitando o acesso a diversas ilhas e atrações naturais da região. Ponto de partida para passeios pelo Delta do Parnaíba, oferecendo acesso a diversas ilhas e praias da região.'
  },
  {
    name: 'Ilha das Canárias',
    coordinates: '-2.83333, -41.83333',
    prefeitura: 'Araioses',
    state: 'Maranhão',
    cep: '65570-000',
    description: 'Localizada no município de Araioses, Maranhão, a Ilha das Canárias é uma das maiores ilhas do Delta do Parnaíba. A ilha é habitada por comunidades tradicionais que vivem da pesca e do turismo ecológico. Composta por dunas, manguezais, igarapés e abriga uma rica fauna, incluindo caranguejos, jacarés e diversas aves. Faz parte da Reserva Extrativista Marinha do Delta do Parnaíba.'
  },
  {
    name: 'Paulino Neves',
    coordinates: '-2.72083, -42.52500',
    prefeitura: 'Paulino Neves',
    state: 'Maranhão',
    cep: '65285-000',
    description: 'Paulino Neves é um município localizado no estado do Maranhão, conhecido por suas paisagens naturais, incluindo praias e os Pequenos Lençóis, uma extensão dos Lençóis Maranhenses. A região é conhecida por suas praias e faz parte da Área de Proteção Ambiental (APA) do Delta do Parnaíba. Atrai turistas em busca de ecoturismo e aventura.'
  },
  {
    name: 'Barro Vermelho',
    coordinates: '-2.72083, -42.52500',
    prefeitura: 'Paulino Neves',
    state: 'Maranhão',
    cep: '65285-000',
    description: 'Barro Vermelho é uma praia localizada no município de Paulino Neves, Maranhão. É conhecida por suas dunas e paisagens naturais, sendo parte da Área de Proteção Ambiental do Delta do Parnaíba. Praia com águas tranquilas, dunas e belezas naturais, fazendo parte das atrações turísticas da região do Delta do Parnaíba.'
  }
]

async function seedNewLocations() {
  try {
    console.log('🌱 Seeding 6 new locations...\n')

    // Check if locations table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'locations'
      )
    `)
    
    if (!tableCheck.rows[0].exists) {
      console.log('📝 Creating locations table...')
      await pool.query(`
        CREATE TABLE IF NOT EXISTS locations (
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
    }

    // Check if columns exist, add if not
    try {
      await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS prefeitura VARCHAR(255)`)
      await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS state VARCHAR(100)`)
      await pool.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS cep VARCHAR(20)`)
    } catch (migrationError) {
      // Columns might already exist, that's fine
    }

    console.log('✅ Locations table ready\n')

    // Check if location already exists before inserting
    for (const locData of locationsToSeed) {
      const existing = await pool.query(
        'SELECT id FROM locations WHERE name = $1',
        [locData.name]
      )

      if (existing.rows.length > 0) {
        console.log(`⚠️  Location "${locData.name}" already exists, updating...`)
        await pool.query(
          `UPDATE locations 
           SET coordinates = $1, prefeitura = $2, state = $3, cep = $4, description = $5, "updatedAt" = NOW()
           WHERE name = $6`,
          [
            locData.coordinates,
            locData.prefeitura,
            locData.state,
            locData.cep,
            locData.description,
            locData.name
          ]
        )
        console.log(`✅ Updated: ${locData.name}`)
      } else {
        const locId = randomUUID()
        await pool.query(
          `INSERT INTO locations (id, name, coordinates, prefeitura, state, cep, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            locId,
            locData.name,
            locData.coordinates,
            locData.prefeitura,
            locData.state,
            locData.cep,
            locData.description,
          ]
        )
        console.log(`✅ Inserted: ${locData.name}`)
      }
    }

    const totalLocations = await pool.query('SELECT COUNT(*) FROM locations')
    console.log(`\n📈 Total locations in database: ${totalLocations.rows[0].count}`)
    console.log('✨ Successfully seeded 6 new locations!')

    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error seeding locations:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

seedNewLocations()
