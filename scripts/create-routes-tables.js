import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function createRoutesTables() {
  try {
    console.log('🚀 Creating routes tables...')

    // Enable UUID extension
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)

    // Routes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS routes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE,
        end_date DATE,
        duration INTEGER,
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'in-progress', 'completed', 'cancelled')),
        total_distance DECIMAL(8, 2),
        estimated_cost DECIMAL(10, 2) DEFAULT 0,
        actual_cost DECIMAL(10, 2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'BRL',
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        CHECK (status = 'draft' OR start_date IS NOT NULL)
      )
    `)
    console.log('✅ Created routes table')

    // Route segments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS route_segments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        day_number INTEGER NOT NULL,
        segment_date DATE,
        from_destination_id UUID REFERENCES locations(id) ON DELETE SET NULL,
        to_destination_id UUID REFERENCES locations(id) ON DELETE SET NULL,
        distance DECIMAL(6, 2) DEFAULT 0 CHECK (distance >= 0 AND distance <= 60),
        segment_order INTEGER NOT NULL,
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE(route_id, day_number)
      )
    `)
    console.log('✅ Created route_segments table')

    // Create index for segment_date before adding generated column constraint
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_segments_route ON route_segments(route_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_segments_date ON route_segments(segment_date)
    `)

    // Route logistics table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS route_logistics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        segment_id UUID REFERENCES route_segments(id) ON DELETE CASCADE,
        logistics_type VARCHAR(50) NOT NULL CHECK (logistics_type IN (
          'airport-transfer', 
          'support-vehicle', 
          'hotel-client', 
          'hotel-staff', 
          'lunch', 
          'third-party', 
          'extra-cost'
        )),
        entity_id UUID,
        entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
          'vehicle',
          'hotel', 
          'third-party', 
          'location'
        )),
        item_name VARCHAR(255),
        quantity INTEGER DEFAULT 1,
        cost DECIMAL(10, 2) DEFAULT 0,
        date DATE,
        driver_pilot_name VARCHAR(255),
        is_own_vehicle BOOLEAN DEFAULT FALSE,
        vehicle_type VARCHAR(50) CHECK (vehicle_type IN ('car4x4', 'boat', 'quadbike', 'carSedan', 'outro')),
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Created route_logistics table')

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_logistics_route ON route_logistics(route_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_logistics_segment ON route_logistics(segment_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_logistics_type ON route_logistics(logistics_type)
    `)

    // Route participants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS route_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        guide_id UUID REFERENCES staff(id) ON DELETE SET NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('client', 'guide-captain', 'guide-tail', 'staff')),
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        CHECK (
          (role = 'client' AND client_id IS NOT NULL AND guide_id IS NULL) OR
          (role IN ('guide-captain', 'guide-tail') AND guide_id IS NOT NULL AND client_id IS NULL) OR
          (role = 'staff' AND client_id IS NULL)
        )
      )
    `)
    console.log('✅ Created route_participants table')

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_participants_route ON route_participants(route_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_participants_client ON route_participants(client_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_participants_guide ON route_participants(guide_id)
    `)

    // Route transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS route_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id UUID NOT NULL REFERENCES routes(id) ON DELETE RESTRICT,
        segment_id UUID REFERENCES route_segments(id) ON DELETE SET NULL,
        transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('payment', 'expense', 'refund')),
        category VARCHAR(50) NOT NULL CHECK (category IN ('hotel', 'transport', 'food', 'third-party', 'vehicle', 'other')),
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'BRL',
        from_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
        to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
        description TEXT,
        snapshot_data JSONB,
        transaction_date DATE NOT NULL,
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Created route_transactions table')

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_transactions_route ON route_transactions(route_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_transactions_date ON route_transactions(transaction_date)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_transactions_type ON route_transactions(transaction_type)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_transactions_snapshot ON route_transactions USING GIN(snapshot_data)
    `)

    // Create indexes for routes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_routes_dates ON routes(start_date, end_date)
    `)

    // Functions for calculating route totals
    await pool.query(`
      CREATE OR REPLACE FUNCTION calculate_route_distance(route_uuid UUID)
      RETURNS DECIMAL AS $$
        SELECT COALESCE(SUM(distance), 0)
        FROM route_segments
        WHERE route_id = route_uuid;
      $$ LANGUAGE SQL;
    `)

    await pool.query(`
      CREATE OR REPLACE FUNCTION calculate_route_estimated_cost(route_uuid UUID)
      RETURNS DECIMAL AS $$
        SELECT COALESCE(
          (SELECT SUM(cost * quantity) FROM route_logistics WHERE route_id = route_uuid) +
          (SELECT SUM(cost) FROM route_logistics WHERE route_id = route_uuid AND logistics_type = 'extra-cost'),
          0
        );
      $$ LANGUAGE SQL;
    `)

    // Function to calculate route end_date and duration
    await pool.query(`
      CREATE OR REPLACE FUNCTION calculate_route_dates(route_uuid UUID)
      RETURNS TABLE(end_date DATE, duration INTEGER) AS $$
      DECLARE
        route_start_date DATE;
        max_day INTEGER;
      BEGIN
        SELECT start_date INTO route_start_date FROM routes WHERE id = route_uuid;
        SELECT COALESCE(MAX(day_number), 0) INTO max_day FROM route_segments WHERE route_id = route_uuid;
        
        IF route_start_date IS NOT NULL AND max_day > 0 THEN
          RETURN QUERY SELECT 
            route_start_date + max_day - 1,
            max_day;
        ELSE
          RETURN QUERY SELECT NULL::DATE, NULL::INTEGER;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `)

    // Trigger to update route totals when segments change
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_route_totals()
      RETURNS TRIGGER AS $$
      DECLARE
        route_dates RECORD;
      BEGIN
        SELECT * INTO route_dates FROM calculate_route_dates(COALESCE(NEW.route_id, OLD.route_id));
        
        UPDATE routes
        SET 
          total_distance = calculate_route_distance(COALESCE(NEW.route_id, OLD.route_id)),
          end_date = route_dates.end_date,
          duration = route_dates.duration,
          "updatedAt" = NOW()
        WHERE id = COALESCE(NEW.route_id, OLD.route_id);
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `)

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_route_distance ON route_segments;
      CREATE TRIGGER trigger_update_route_distance
        AFTER INSERT OR UPDATE OR DELETE ON route_segments
        FOR EACH ROW
        EXECUTE FUNCTION update_route_totals();
    `)

    // Trigger to update route estimated cost
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_route_cost()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE routes
        SET 
          estimated_cost = calculate_route_estimated_cost(COALESCE(NEW.route_id, OLD.route_id)),
          "updatedAt" = NOW()
        WHERE id = COALESCE(NEW.route_id, OLD.route_id);
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `)

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_route_cost_logistics ON route_logistics;
      CREATE TRIGGER trigger_update_route_cost_logistics
        AFTER INSERT OR UPDATE OR DELETE ON route_logistics
        FOR EACH ROW
        EXECUTE FUNCTION update_route_cost();
    `)

    // Function to recalculate segment dates
    await pool.query(`
      CREATE OR REPLACE FUNCTION recalculate_segment_dates(route_uuid UUID)
      RETURNS VOID AS $$
      DECLARE
        route_start_date DATE;
      BEGIN
        SELECT start_date INTO route_start_date
        FROM routes
        WHERE id = route_uuid;
        
        IF route_start_date IS NOT NULL THEN
          UPDATE route_segments
          SET segment_date = route_start_date + day_number - 1
          WHERE route_id = route_uuid
            AND (segment_date IS DISTINCT FROM (route_start_date + day_number - 1));
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `)

    // Trigger to auto-update segment dates when start_date changes
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_segment_dates_on_start_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.start_date IS DISTINCT FROM OLD.start_date AND NEW.status = 'draft' THEN
          PERFORM recalculate_segment_dates(NEW.id);
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `)

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_segment_dates ON routes;
      CREATE TRIGGER trigger_update_segment_dates
        AFTER UPDATE OF start_date ON routes
        FOR EACH ROW
        WHEN (NEW.status = 'draft')
        EXECUTE FUNCTION update_segment_dates_on_start_change();
    `)

    // Trigger to update segment dates when segments are added/modified
    // Only recalculate if day_number changed, not if segment_date was updated by the trigger itself
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_segment_dates_on_segment_change()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Only recalculate if day_number changed, to avoid infinite loops
        IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND (NEW.day_number IS DISTINCT FROM OLD.day_number)) THEN
          PERFORM recalculate_segment_dates(COALESCE(NEW.route_id, OLD.route_id));
        END IF;
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `)

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_segment_dates_on_insert ON route_segments;
      CREATE TRIGGER trigger_update_segment_dates_on_insert
        AFTER INSERT ON route_segments
        FOR EACH ROW
        EXECUTE FUNCTION update_segment_dates_on_segment_change();
    `)

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_segment_dates_on_update ON route_segments;
      CREATE TRIGGER trigger_update_segment_dates_on_update
        AFTER UPDATE ON route_segments
        FOR EACH ROW
        EXECUTE FUNCTION update_segment_dates_on_segment_change();
    `)

    // Route transfers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS route_transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        transfer_date DATE NOT NULL,
        from_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        to_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        total_cost DECIMAL(10, 2) DEFAULT 0,
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        CHECK (from_location_id != to_location_id)
      )
    `)
    console.log('✅ Created route_transfers table')

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_transfers_route ON route_transfers(route_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_transfers_date ON route_transfers(transfer_date)
    `)

    // Route transfer vehicles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS route_transfer_vehicles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transfer_id UUID NOT NULL REFERENCES route_transfers(id) ON DELETE CASCADE,
        vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
        driver_pilot_name VARCHAR(255),
        quantity INTEGER DEFAULT 1,
        cost DECIMAL(10, 2) DEFAULT 0,
        is_own_vehicle BOOLEAN DEFAULT FALSE,
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Created route_transfer_vehicles table')

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_transfer_vehicles_transfer ON route_transfer_vehicles(transfer_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_transfer_vehicles_vehicle ON route_transfer_vehicles(vehicle_id)
    `)

    // Route transfer participants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS route_transfer_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transfer_id UUID NOT NULL REFERENCES route_transfers(id) ON DELETE CASCADE,
        participant_id UUID NOT NULL REFERENCES route_participants(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE(transfer_id, participant_id)
      )
    `)
    console.log('✅ Created route_transfer_participants table')

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_transfer_participants_transfer ON route_transfer_participants(transfer_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_transfer_participants_participant ON route_transfer_participants(participant_id)
    `)

    // Function to calculate transfer total cost
    await pool.query(`
      CREATE OR REPLACE FUNCTION calculate_transfer_total_cost(transfer_uuid UUID)
      RETURNS DECIMAL AS $$
        SELECT COALESCE(SUM(cost * quantity), 0)
        FROM route_transfer_vehicles
        WHERE transfer_id = transfer_uuid;
      $$ LANGUAGE SQL;
    `)

    // Trigger to update transfer total cost when vehicles change
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_transfer_total_cost()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE route_transfers
        SET 
          total_cost = calculate_transfer_total_cost(COALESCE(NEW.transfer_id, OLD.transfer_id)),
          "updatedAt" = NOW()
        WHERE id = COALESCE(NEW.transfer_id, OLD.transfer_id);
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `)

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_update_transfer_cost ON route_transfer_vehicles;
      CREATE TRIGGER trigger_update_transfer_cost
        AFTER INSERT OR UPDATE OR DELETE ON route_transfer_vehicles
        FOR EACH ROW
        EXECUTE FUNCTION update_transfer_total_cost();
    `)

    // Route segment participants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS route_segment_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        segment_id UUID NOT NULL REFERENCES route_segments(id) ON DELETE CASCADE,
        participant_id UUID NOT NULL REFERENCES route_participants(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE(segment_id, participant_id)
      )
    `)
    console.log('✅ Created route_segment_participants table')

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_segment_participants_segment ON route_segment_participants(segment_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_segment_participants_participant ON route_segment_participants(participant_id)
    `)

    // Route segment stops table (for intermediate stops between from and to destinations)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS route_segment_stops (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        segment_id UUID NOT NULL REFERENCES route_segments(id) ON DELETE CASCADE,
        location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        stop_order INTEGER NOT NULL,
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE(segment_id, stop_order)
      )
    `)
    console.log('✅ Created route_segment_stops table')

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_segment_stops_segment ON route_segment_stops(segment_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_segment_stops_order ON route_segment_stops(segment_id, stop_order)
    `)

    // Route segment accommodations tables
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
    console.log('✅ Created route_segment_accommodations table')

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
    console.log('✅ Created route_segment_accommodation_rooms table')

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
    console.log('✅ Created route_segment_accommodation_room_participants table')

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_segment_room_participants_room ON route_segment_accommodation_room_participants(room_id)
    `)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_route_segment_room_participants_participant ON route_segment_accommodation_room_participants(participant_id)
    `)

    console.log('✅ All routes tables and triggers created successfully!')
  } catch (error) {
    console.error('❌ Error creating routes tables:', error)
    throw error
  } finally {
    await pool.end()
  }
}

createRoutesTables()
