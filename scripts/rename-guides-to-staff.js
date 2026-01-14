import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function renameGuidesToStaff() {
  try {
    console.log('🔄 Starting migration: guides → staff...')
    
    // Check if guides table exists
    const checkTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'guides'
    `)
    
    if (checkTable.rows.length === 0) {
      console.log('⚠️  guides table does not exist, skipping migration')
      return
    }
    
    // Check if staff table already exists
    const checkStaffTable = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'staff'
    `)
    
    if (checkStaffTable.rows.length > 0) {
      console.log('⚠️  staff table already exists, skipping migration')
      return
    }
    
    // Rename the table
    await pool.query('ALTER TABLE guides RENAME TO staff')
    console.log('✅ Renamed table: guides → staff')
    
    // Rename the primary key constraint if it exists
    try {
      await pool.query('ALTER TABLE staff RENAME CONSTRAINT guides_pkey TO staff_pkey')
      console.log('✅ Renamed primary key constraint')
    } catch (err) {
      // Constraint might have a different name, ignore
      console.log('ℹ️  Primary key constraint name unchanged (may have different name)')
    }
    
    // Rename foreign key constraints
    try {
      const fkConstraints = await pool.query(`
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'staff' AND tc.constraint_type = 'FOREIGN KEY'
      `)
      
      for (const constraint of fkConstraints.rows) {
        const oldName = constraint.constraint_name
        const newName = oldName.replace('guides_', 'staff_')
        if (oldName !== newName) {
          await pool.query(`ALTER TABLE staff RENAME CONSTRAINT "${oldName}" TO "${newName}"`)
          console.log(`✅ Renamed foreign key constraint: ${oldName} → ${newName}`)
        }
      }
    } catch (err) {
      console.log('ℹ️  Foreign key constraints unchanged')
    }
    
    // Update foreign key references in other tables
    // Check for guide_id columns in other tables
    const tablesWithGuideId = await pool.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE column_name LIKE '%guide%' AND table_schema = 'public'
      AND table_name != 'staff'
    `)
    
    for (const row of tablesWithGuideId.rows) {
      const tableName = row.table_name
      const columnName = row.column_name
      
      // Check if this column references guides/staff table
      const fkCheck = await pool.query(`
        SELECT 
          tc.constraint_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = $1 
          AND kcu.column_name = $2
          AND tc.constraint_type = 'FOREIGN KEY'
      `, [tableName, columnName])
      
      if (fkCheck.rows.length > 0) {
        const constraintName = fkCheck.rows[0].constraint_name
        const foreignTableName = fkCheck.rows[0].foreign_table_name
        
        // If the FK references the staff table (which was renamed from guides)
        if (foreignTableName === 'staff') {
          // Just rename the constraint if needed
          const newConstraintName = constraintName.replace('guide', 'staff')
          if (constraintName !== newConstraintName) {
            await pool.query(`ALTER TABLE ${tableName} RENAME CONSTRAINT "${constraintName}" TO "${newConstraintName}"`)
            console.log(`✅ Renamed foreign key constraint in ${tableName}: ${constraintName} → ${newConstraintName}`)
          }
          
          // Optionally rename the column if it contains 'guide'
          const newColumnName = columnName.replace('guide', 'staff')
          if (columnName !== newColumnName && columnName.includes('guide')) {
            // First drop the constraint
            const constraintToDrop = newConstraintName !== constraintName ? newConstraintName : constraintName
            await pool.query(`ALTER TABLE ${tableName} DROP CONSTRAINT "${constraintToDrop}"`)
            
            // Rename the column
            await pool.query(`ALTER TABLE ${tableName} RENAME COLUMN "${columnName}" TO "${newColumnName}"`)
            console.log(`✅ Renamed column ${tableName}.${columnName} → ${newColumnName}`)
            
            // Recreate the constraint with new column name
            await pool.query(`
              ALTER TABLE ${tableName} 
              ADD CONSTRAINT "${newConstraintName}" 
              FOREIGN KEY (${newColumnName}) REFERENCES staff(id)
            `)
            console.log(`✅ Recreated foreign key in ${tableName}`)
          }
        }
      }
    }
    
    console.log('✅ Migration complete!')
  } catch (error) {
    console.error('❌ Error during migration:', error)
    throw error
  } finally {
    await pool.end()
  }
}

renameGuidesToStaff()
