import 'dotenv/config'
import pg from 'pg'
import { randomUUID } from 'crypto'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

const locationData = {
  name: 'Ilha do Caju',
  coordinates: '-2.7339, -42.1242',
  prefeitura: 'Araioses',
  state: 'Maranhão',
  cep: '65570-000',
  description: 'A Ilha do Caju está localizada no município de Araioses, no estado do Maranhão, Brasil, a aproximadamente 50 km da cidade de Parnaíba, no Piauí. Situada no Delta do Rio Parnaíba, o único delta em mar aberto das Américas, a ilha é uma das maiores entre as cerca de 80 ilhas e ilhotas que compõem essa região. A ilha abrange uma variedade de ecossistemas, incluindo manguezais, dunas, matas, campos e áreas alagadas de água salgada. É lar de diversas espécies de animais silvestres, como tatus, cotias, gatos-maracajás, tamanduaís, tucanos, jacarés de papo-amarelo, guaxinins, veados, raposas, tartarugas marinhas e botos. Acesso via lancha rápida (1h30min de Parnaíba-PI, 40min de Tutóia-MA) ou chalana.'
}

async function addIlhaDoCaju() {
  try {
    console.log('🌱 Adding Ilha do Caju to database...\n')

    // Check if location already exists
    const existing = await pool.query(
      'SELECT id FROM locations WHERE name = $1',
      [locationData.name]
    )

    if (existing.rows.length > 0) {
      console.log(`⚠️  Location "${locationData.name}" already exists, updating...`)
      await pool.query(
        `UPDATE locations 
         SET coordinates = $1, prefeitura = $2, state = $3, cep = $4, description = $5, "updatedAt" = NOW()
         WHERE name = $6`,
        [
          locationData.coordinates,
          locationData.prefeitura,
          locationData.state,
          locationData.cep,
          locationData.description,
          locationData.name
        ]
      )
      console.log(`✅ Updated: ${locationData.name}`)
    } else {
      const locId = randomUUID()
      await pool.query(
        `INSERT INTO locations (id, name, coordinates, prefeitura, state, cep, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          locId,
          locationData.name,
          locationData.coordinates,
          locationData.prefeitura,
          locationData.state,
          locationData.cep,
          locationData.description,
        ]
      )
      console.log(`✅ Inserted: ${locationData.name}`)
    }

    const totalLocations = await pool.query('SELECT COUNT(*) FROM locations')
    console.log(`\n📈 Total locations in database: ${totalLocations.rows[0].count}`)
    console.log('✨ Successfully added Ilha do Caju!')

    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error adding location:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

addIlhaDoCaju()
