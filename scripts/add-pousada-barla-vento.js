import 'dotenv/config'
import { Pool } from 'pg'
import { randomUUID } from 'crypto'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function addPousadaBarlaVento() {
  try {
    console.log('🏨 Adding hotel "Pousada Barla Vento" to database...\n')

    // Find or create location "Porto dos Tatus"
    const locationResult = await pool.query(`
      SELECT id, name FROM locations
      WHERE LOWER(name) LIKE '%porto%tatus%'
    `)

    let location = locationResult.rows[0]
    if (!location) {
      const locationId = randomUUID()
      await pool.query(
        `INSERT INTO locations (
          id,
          name,
          coordinates,
          prefeitura,
          state,
          cep,
          description,
          "createdAt",
          "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          locationId,
          'Porto dos Tatus',
          null,
          'Ilha Grande',
          'Piaui',
          null,
          'Port area in Ilha Grande, Delta do Parnaiba, Brazil.'
        ]
      )
      location = { id: locationId, name: 'Porto dos Tatus' }
      console.log(`✅ Created location: ${location.name} (${location.id})\n`)
    } else {
      console.log(`✅ Found location: ${location.name} (${location.id})\n`)
    }

    // Check if hotel already exists
    const existingHotel = await pool.query(`
      SELECT id, name FROM hotels
      WHERE LOWER(name) LIKE '%barla%vento%' OR LOWER(name) LIKE '%barlavento%'
    `)

    if (existingHotel.rows.length > 0) {
      console.log(`⚠️  Hotel "${existingHotel.rows[0].name}" already exists. Skipping...`)
      await pool.end()
      process.exit(0)
    }

    const hotelId = randomUUID()
    await pool.query(
      `INSERT INTO hotels (
        id,
        name,
        rating,
        "priceRange",
        "locationId",
        description,
        "contactNumber",
        email,
        address,
        coordinates,
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING`,
      [
        hotelId,
        'Pousada Barla Vento',
        null,
        null,
        location.id,
        'Pousada near Porto dos Tatus in the Delta do Parnaiba region, offering air-conditioned rooms, pool, restaurant, and free parking.',
        null,
        null,
        'Porto dos Tatus, Ilha Grande, Piaui, Brazil',
        null,
      ]
    )

    console.log('✅ Successfully added hotel "Pousada Barla Vento"!')
    console.log(`   Location: ${location.name}`)

    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error adding hotel:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

addPousadaBarlaVento()
