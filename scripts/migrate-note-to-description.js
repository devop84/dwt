import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function migrateNoteToDescription() {
  try {
    console.log('🔄 Starting migration: note → description\n')

    // Migrate destinations table
    console.log('📋 Migrating destinations table...')
    
    // Check if note column exists
    const destNoteCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'destinations' AND column_name = 'note'
    `)
    
    // Check if description column exists
    const destDescCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'destinations' AND column_name = 'description'
    `)

    if (destNoteCheck.rows.length > 0) {
      console.log('   ✓ Found "note" column')
      
      // Add description column if it doesn't exist
      if (destDescCheck.rows.length === 0) {
        console.log('   → Adding "description" column...')
        await pool.query(`ALTER TABLE destinations ADD COLUMN description TEXT`)
        console.log('   ✓ Added "description" column')
      } else {
        console.log('   ✓ "description" column already exists')
      }

      // Copy data from note to description
      console.log('   → Copying data from "note" to "description"...')
      const updateResult = await pool.query(`
        UPDATE destinations 
        SET description = note 
        WHERE note IS NOT NULL AND (description IS NULL OR description = '')
      `)
      console.log(`   ✓ Updated ${updateResult.rowCount} rows`)

      // Drop the note column
      console.log('   → Dropping "note" column...')
      await pool.query(`ALTER TABLE destinations DROP COLUMN note`)
      console.log('   ✓ Dropped "note" column\n')
    } else {
      console.log('   ℹ "note" column does not exist')
      if (destDescCheck.rows.length === 0) {
        console.log('   → Adding "description" column...')
        await pool.query(`ALTER TABLE destinations ADD COLUMN description TEXT`)
        console.log('   ✓ Added "description" column\n')
      } else {
        console.log('   ✓ "description" column already exists\n')
      }
    }

    // Migrate hotels table
    console.log('🏨 Migrating hotels table...')
    
    // Check if note column exists
    const hotelNoteCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'hotels' AND column_name = 'note'
    `)
    
    // Check if description column exists
    const hotelDescCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'hotels' AND column_name = 'description'
    `)

    if (hotelNoteCheck.rows.length > 0) {
      console.log('   ✓ Found "note" column')
      
      // Add description column if it doesn't exist
      if (hotelDescCheck.rows.length === 0) {
        console.log('   → Adding "description" column...')
        await pool.query(`ALTER TABLE hotels ADD COLUMN description TEXT`)
        console.log('   ✓ Added "description" column')
      } else {
        console.log('   ✓ "description" column already exists')
      }

      // Copy data from note to description
      console.log('   → Copying data from "note" to "description"...')
      const updateResult = await pool.query(`
        UPDATE hotels 
        SET description = note 
        WHERE note IS NOT NULL AND (description IS NULL OR description = '')
      `)
      console.log(`   ✓ Updated ${updateResult.rowCount} rows`)

      // Drop the note column
      console.log('   → Dropping "note" column...')
      await pool.query(`ALTER TABLE hotels DROP COLUMN note`)
      console.log('   ✓ Dropped "note" column\n')
    } else {
      console.log('   ℹ "note" column does not exist')
      if (hotelDescCheck.rows.length === 0) {
        console.log('   → Adding "description" column...')
        await pool.query(`ALTER TABLE hotels ADD COLUMN description TEXT`)
        console.log('   ✓ Added "description" column\n')
      } else {
        console.log('   ✓ "description" column already exists\n')
      }
    }

    // Verify final state
    console.log('✅ Verifying final state...\n')
    
    const destColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'destinations' 
      AND column_name IN ('note', 'description')
      ORDER BY column_name
    `)
    
    const hotelColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'hotels' 
      AND column_name IN ('note', 'description')
      ORDER BY column_name
    `)

    console.log('📊 Destinations table columns:')
    destColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name}`)
    })

    console.log('\n📊 Hotels table columns:')
    hotelColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name}`)
    })

    console.log('\n✨ Migration completed successfully!')
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

migrateNoteToDescription()
