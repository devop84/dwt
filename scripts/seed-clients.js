import 'dotenv/config'
import pg from 'pg'
import { randomUUID } from 'crypto'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

const sampleClients = [
  {
    name: 'John Smith',
    contactNumber: '+1-555-0101',
    email: 'john.smith@email.com',
    dateOfBirth: '1985-03-15',
    nationality: 'American',
    note: 'Regular customer, prefers morning sessions',
    IDNumber: 'US-123456789'
  },
  {
    name: 'Maria Garcia',
    contactNumber: '+34-912-345-678',
    email: 'maria.garcia@email.com',
    dateOfBirth: '1990-07-22',
    nationality: 'Spanish',
    note: 'First-time client, interested in group lessons',
    IDNumber: 'ES-987654321'
  },
  {
    name: 'David Chen',
    contactNumber: '+86-138-0013-8000',
    email: 'david.chen@email.com',
    dateOfBirth: '1988-11-08',
    nationality: 'Chinese',
    note: 'Experienced surfer, needs equipment rental',
    IDNumber: 'CN-456789123'
  },
  {
    name: 'Sophie Martin',
    contactNumber: '+33-6-12-34-56-78',
    email: 'sophie.martin@email.com',
    dateOfBirth: '1992-05-30',
    nationality: 'French',
    note: 'VIP client, prefers private lessons',
    IDNumber: 'FR-789123456'
  },
  {
    name: 'James Wilson',
    contactNumber: '+44-20-7946-0958',
    email: 'james.wilson@email.com',
    dateOfBirth: '1987-09-14',
    nationality: 'British',
    note: 'Returning customer, very satisfied',
    IDNumber: 'GB-321654987'
  },
  {
    name: 'Emma Thompson',
    contactNumber: '+1-555-0202',
    email: 'emma.thompson@email.com',
    dateOfBirth: '1995-01-20',
    nationality: 'Canadian',
    note: 'Beginner, needs basic instruction',
    IDNumber: 'CA-654321987'
  },
  {
    name: 'Luca Rossi',
    contactNumber: '+39-06-1234-5678',
    email: 'luca.rossi@email.com',
    dateOfBirth: '1989-12-05',
    nationality: 'Italian',
    note: 'Intermediate level, interested in advanced techniques',
    IDNumber: 'IT-147258369'
  },
  {
    name: 'Anna Schmidt',
    contactNumber: '+49-30-12345678',
    email: 'anna.schmidt@email.com',
    dateOfBirth: '1993-08-18',
    nationality: 'German',
    note: 'Group booking for 4 people',
    IDNumber: 'DE-258369147'
  },
  {
    name: 'Hiroshi Tanaka',
    contactNumber: '+81-90-1234-5678',
    email: 'hiroshi.tanaka@email.com',
    dateOfBirth: '1986-04-12',
    nationality: 'Japanese',
    note: 'Photographer, interested in surf photography tours',
    IDNumber: 'JP-369147258'
  },
  {
    name: 'Isabella Silva',
    contactNumber: '+55-11-98765-4321',
    email: 'isabella.silva@email.com',
    dateOfBirth: '1991-06-25',
    nationality: 'Brazilian',
    note: 'Professional surfer, needs competition training',
    IDNumber: 'BR-741852963'
  },
  {
    name: 'Michael O\'Connor',
    contactNumber: '+353-1-234-5678',
    email: 'michael.oconnor@email.com',
    dateOfBirth: '1984-02-28',
    nationality: 'Irish',
    note: 'Family booking, 2 adults and 2 children',
    IDNumber: 'IE-852963741'
  },
  {
    name: 'Yuki Nakamura',
    contactNumber: '+81-80-9876-5432',
    email: 'yuki.nakamura@email.com',
    dateOfBirth: '1994-10-03',
    nationality: 'Japanese',
    note: 'Student discount applied',
    IDNumber: 'JP-963741852'
  },
  {
    name: 'Carlos Rodriguez',
    contactNumber: '+52-55-1234-5678',
    email: 'carlos.rodriguez@email.com',
    dateOfBirth: '1983-07-17',
    nationality: 'Mexican',
    note: 'Corporate group booking, 8 people',
    IDNumber: 'MX-159753486'
  },
  {
    name: 'Lisa Anderson',
    contactNumber: '+1-555-0303',
    email: 'lisa.anderson@email.com',
    dateOfBirth: '1996-03-09',
    nationality: 'American',
    note: 'Birthday celebration, special arrangements needed',
    IDNumber: 'US-357159486'
  },
  {
    name: 'Thomas Brown',
    contactNumber: '+61-2-9876-5432',
    email: 'thomas.brown@email.com',
    dateOfBirth: '1982-11-21',
    nationality: 'Australian',
    note: 'Long-term rental, 2 weeks',
    IDNumber: 'AU-486159753'
  },
  {
    name: 'Amélie Dubois',
    contactNumber: '+33-6-98-76-54-32',
    email: 'amelie.dubois@email.com',
    dateOfBirth: '1997-09-14',
    nationality: 'French',
    note: 'First time surfing, very excited',
    IDNumber: 'FR-753486159'
  },
  {
    name: 'Raj Patel',
    contactNumber: '+91-98765-43210',
    email: 'raj.patel@email.com',
    dateOfBirth: '1990-05-07',
    nationality: 'Indian',
    note: 'Honeymoon trip, romantic package preferred',
    IDNumber: 'IN-159486753'
  },
  {
    name: 'Nina Johansson',
    contactNumber: '+46-70-123-4567',
    email: 'nina.johansson@email.com',
    dateOfBirth: '1988-12-30',
    nationality: 'Swedish',
    note: 'Environmentalist, prefers eco-friendly options',
    IDNumber: 'SE-486753159'
  },
  {
    name: 'Pedro Santos',
    contactNumber: '+351-912-345-678',
    email: 'pedro.santos@email.com',
    dateOfBirth: '1985-08-11',
    nationality: 'Portuguese',
    note: 'Surf instructor certification course',
    IDNumber: 'PT-753159486'
  },
  {
    name: 'Sarah Kim',
    contactNumber: '+82-10-1234-5678',
    email: 'sarah.kim@email.com',
    dateOfBirth: '1992-04-26',
    nationality: 'South Korean',
    note: 'Social media influencer, content creation permission needed',
    IDNumber: 'KR-159753486'
  }
]

async function seedClients() {
  try {
    console.log('🌱 Seeding 20 clients into database...\n')
    
    // Check if clients table exists, create if not
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clients'
      )
    `)
    
    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  Clients table does not exist. Creating it now...\n')
      await pool.query(`
        CREATE TABLE IF NOT EXISTS clients (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          "contactNumber" VARCHAR(50),
          email VARCHAR(255),
          "dateOfBirth" DATE,
          nationality VARCHAR(100),
          note TEXT,
          "IDNumber" VARCHAR(100),
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )
      `)
      console.log('✅ Clients table created!\n')
    }
    
    // Check existing count
    const existingCount = await pool.query('SELECT COUNT(*) as count FROM clients')
    console.log(`📊 Current clients in database: ${existingCount.rows[0].count}`)
    
    // Insert clients
    let inserted = 0
    for (const client of sampleClients) {
      const id = randomUUID()
      await pool.query(`
        INSERT INTO clients (id, name, "contactNumber", email, "dateOfBirth", nationality, note, "IDNumber")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [
        id,
        client.name,
        client.contactNumber,
        client.email,
        client.dateOfBirth,
        client.nationality,
        client.note,
        client.IDNumber
      ])
      inserted++
      console.log(`✅ Inserted: ${client.name}`)
    }
    
    // Final count
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM clients')
    console.log(`\n📈 Total clients after seeding: ${finalCount.rows[0].count}`)
    console.log(`✨ Successfully seeded ${inserted} clients!`)
    
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error seeding clients:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

seedClients()
