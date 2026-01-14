import 'dotenv/config'
import pg from 'pg'
import { randomUUID } from 'crypto'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

const locationsToAdd = [
  {
    name: 'Rio Negro (Lençóis Maranhenses)',
    coordinates: '-2.5500, -42.8000',
    prefeitura: 'Barreirinhas',
    state: 'Maranhão',
    cep: '65590-000',
    description: 'Rio Negro é uma localidade na região dos Lençóis Maranhenses, no estado do Maranhão. Situada no Parque Nacional dos Lençóis Maranhenses, é conhecida por suas paisagens de dunas brancas e lagoas de água doce cristalina. A região oferece acesso a algumas das mais belas lagoas do parque, como a Lagoa Azul e a Lagoa Bonita. É um destino popular para turistas que buscam explorar as dunas e lagoas dos Lençóis Maranhenses, oferecendo trilhas e passeios de 4x4 pela região.'
  },
  {
    name: 'Santo Amaro',
    coordinates: '-2.5000, -43.2500',
    prefeitura: 'Santo Amaro do Maranhão',
    state: 'Maranhão',
    cep: '65195-000',
    description: 'Santo Amaro do Maranhão é um município brasileiro localizado no estado do Maranhão, na região Nordeste do país. É conhecido por ser uma das principais portas de entrada para o Parque Nacional dos Lençóis Maranhenses, oferecendo acesso a paisagens deslumbrantes de dunas e lagoas de água doce. A cidade está situada a aproximadamente 113 km da capital do estado, São Luís. O acesso é feito pela rodovia BR-135, seguida pela MA-402 e, por fim, mais 36 km de estrada asfaltada até o portal da cidade. A economia local é impulsionada pelo turismo, especialmente devido à proximidade com os Lençóis Maranhenses. Principais atrações incluem a Lagoa da Gaivota e a Lagoa da Andorinha.'
  }
]

async function addLocations() {
  try {
    console.log('🌱 Adding Rio Negro and Santo Amaro to database...\n')

    for (const locationData of locationsToAdd) {
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
    }

    const totalLocations = await pool.query('SELECT COUNT(*) FROM locations')
    console.log(`\n📈 Total locations in database: ${totalLocations.rows[0].count}`)
    console.log('✨ Successfully added Rio Negro and Santo Amaro!')

    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error adding locations:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

addLocations()
