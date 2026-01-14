import 'dotenv/config'
import { Pool } from 'pg'
import { randomUUID } from 'crypto'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function addIlhaDosPoldrosHotel() {
  try {
    console.log('🏨 Adding hotel "Ilha dos Poldros" to database...\n')

    // Find the location "Ilha Dos Poldros" (note: might be stored with different capitalization)
    const locationResult = await pool.query(`
      SELECT id, name FROM locations 
      WHERE LOWER(name) LIKE '%ilha%poldros%' OR LOWER(name) LIKE '%poldros%'
    `)

    if (locationResult.rows.length === 0) {
      console.log('❌ Location "Ilha Dos Poldros" not found. Please add the location first.')
      await pool.end()
      process.exit(1)
    }

    const location = locationResult.rows[0]
    console.log(`✅ Found location: ${location.name} (${location.id})\n`)

    // Check if hotel already exists
    const existingHotel = await pool.query(`
      SELECT id, name FROM hotels 
      WHERE LOWER(name) LIKE '%ilha%poldros%' OR LOWER(name) LIKE '%poldros%'
    `)

    if (existingHotel.rows.length > 0) {
      console.log(`⚠️  Hotel "${existingHotel.rows[0].name}" already exists. Skipping...`)
      await pool.end()
      process.exit(0)
    }

    // Insert the hotel
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
        'Ilha dos Poldros',
        5, // Luxury pousada
        '$200-$400', // Price range
        location.id,
        'Luxury pousada located in the heart of the Parnaíba River Delta, offering accommodations in a main house with two suites and two independent bungalows, accommodating up to 12 guests. Amenities include a swimming pool, internet, satellite TV, and activities such as quad biking and boat tours.',
        '+55 88 9852-0017',
        'reservas@ilhadospoldros.com.br',
        'Delta do Parnaíba, Araioses, Maranhão, Brazil',
        '-2.8333, -41.8333', // Coordinates
      ]
    )

    console.log('✅ Successfully added hotel "Ilha dos Poldros"!')
    console.log(`   Location: ${location.name}`)
    console.log('   Rating: 5 stars')
    console.log('   Price Range: $200-$400')
    console.log('   Contact: +55 88 9852-0017')
    console.log('   Email: reservas@ilhadospoldros.com.br')
    console.log('   Website: www.ilhadospoldros.com.br')

    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error adding hotel:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

addIlhaDosPoldrosHotel()
