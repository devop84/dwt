import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function addSegmentAccommodations() {
  try {
    console.log('🚀 Adding segment accommodations tables...')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS route_segment_accommodations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        segment_id UUID NOT NULL REFERENCES route_segments(id) ON DELETE CASCADE,
        hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
        group_type VARCHAR(20) NOT NULL CHECK (group_type IN ('client', 'staff')),
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE(segment_id, hotel_id, group_type)
      )
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_segment_accommodations_segment ON route_segment_accommodations(segment_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_segment_accommodations_hotel ON route_segment_accommodations(hotel_id)
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS route_segment_accommodation_rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        accommodation_id UUID NOT NULL REFERENCES route_segment_accommodations(id) ON DELETE CASCADE,
        room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('single', 'double', 'twin', 'triple')),
        room_label VARCHAR(100),
        is_couple BOOLEAN DEFAULT FALSE,
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_segment_accommodation_rooms_accommodation ON route_segment_accommodation_rooms(accommodation_id)
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS route_segment_accommodation_room_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL REFERENCES route_segment_accommodation_rooms(id) ON DELETE CASCADE,
        participant_id UUID NOT NULL REFERENCES route_participants(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE(room_id, participant_id)
      )
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_segment_room_participants_room ON route_segment_accommodation_room_participants(room_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_segment_room_participants_participant ON route_segment_accommodation_room_participants(participant_id)
    `)

    console.log('✅ Segment accommodations tables ready')
  } catch (error) {
    console.error('❌ Error adding segment accommodations tables:', error)
    throw error
  } finally {
    await pool.end()
  }
}

addSegmentAccommodations()
