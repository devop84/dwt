import 'dotenv/config'
import pg from 'pg'
import { randomUUID } from 'crypto'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function seedHotels() {
  try {
    console.log('🏨 Seeding hotels (1-2 per destination)...\n')

    // Get all destinations
    const destinationsResult = await pool.query('SELECT id, name FROM destinations ORDER BY name ASC')
    const destinations = destinationsResult.rows

    if (destinations.length === 0) {
      console.log('❌ No destinations found. Please seed destinations first.')
      await pool.end()
      process.exit(1)
    }

    // Create hotels table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hotels (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        rating INTEGER,
        "priceRange" VARCHAR(50),
        "destinationId" UUID REFERENCES destinations(id) ON DELETE CASCADE,
        description TEXT,
        "contactNumber" VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        coordinates VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    
    console.log('✅ Hotels table ready\n')

    // Clear existing hotels
    await pool.query('DELETE FROM hotels')
    console.log('🗑️  Cleared existing hotels\n')

    const hotelsToSeed = []

    // Generate 1-2 hotels per destination
    for (const dest of destinations) {
      const numHotels = Math.random() > 0.5 ? 2 : 1
      
      for (let i = 0; i < numHotels; i++) {
        const hotelNames = [
          `Pousada ${dest.name}`,
          `Hotel ${dest.name}`,
          `Resort ${dest.name}`,
          `Inn ${dest.name}`,
          `Lodge ${dest.name}`,
          `Hostel ${dest.name}`,
          `Beach House ${dest.name}`,
          `Villa ${dest.name}`
        ]
        
        const priceRanges = [
          '$50-$100',
          '$100-$200',
          '$200-$300',
          '$150-$250',
          '$80-$150',
          '$200-$400',
          '$300-$500'
        ]
        
        const hotelName = numHotels === 2 && i === 1 
          ? hotelNames[Math.floor(Math.random() * hotelNames.length)]
          : `Pousada ${dest.name}`
        
        const rating = Math.floor(Math.random() * 3) + 3 // 3-5 stars
        const priceRange = priceRanges[Math.floor(Math.random() * priceRanges.length)]
        
        // Get destination coordinates from database and add small random offset for hotel location
        const destCoordsResult = await pool.query('SELECT coordinates FROM destinations WHERE id = $1', [dest.id])
        let coordinates = destCoordsResult.rows[0]?.coordinates || null
        
        // If destination has coordinates, add small random offset for hotel location
        if (coordinates) {
          const coords = coordinates.replace(/\s+/g, '').split(',')
          const lat = parseFloat(coords[0])
          const lng = parseFloat(coords[1])
          if (!isNaN(lat) && !isNaN(lng)) {
            // Add small random offset (0.001-0.005 degrees, roughly 100-500 meters)
            const latOffset = (Math.random() * 0.004 + 0.001) * (Math.random() > 0.5 ? 1 : -1)
            const lngOffset = (Math.random() * 0.004 + 0.001) * (Math.random() > 0.5 ? 1 : -1)
            coordinates = `${(lat + latOffset).toFixed(4)}, ${(lng + lngOffset).toFixed(4)}`
          }
        }
        
        hotelsToSeed.push({
          name: hotelName,
          rating,
          priceRange,
          destinationId: dest.id,
          description: `Comfortable accommodation in ${dest.name}. Great location for kitesurfing enthusiasts.`,
          contactNumber: `+55 85 ${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
          email: `contact@${hotelName.toLowerCase().replace(/\s+/g, '')}.com`,
          address: `Rua Principal, ${Math.floor(Math.random() * 500) + 1}, ${dest.name}`,
          coordinates
        })
      }
    }

    let insertedCount = 0
    for (const hotelData of hotelsToSeed) {
      const hotelId = randomUUID()
      await pool.query(
        `INSERT INTO hotels (id, name, rating, "priceRange", "destinationId", description, "contactNumber", email, address, coordinates)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [
          hotelId,
          hotelData.name,
          hotelData.rating,
          hotelData.priceRange,
          hotelData.destinationId,
          hotelData.description,
          hotelData.contactNumber,
          hotelData.email,
          hotelData.address,
          hotelData.coordinates,
        ]
      )
      console.log(`✅ Inserted: ${hotelData.name} (${hotelData.rating} stars) - ${hotelData.priceRange}`)
      insertedCount++
    }

    const totalHotels = await pool.query('SELECT COUNT(*) FROM hotels')
    console.log(`\n📈 Total hotels after seeding: ${totalHotels.rows[0].count}`)
    console.log(`✨ Successfully seeded ${insertedCount} hotels!`)

    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error seeding hotels:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

seedHotels()
