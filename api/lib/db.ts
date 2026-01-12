import { Pool } from 'pg'

const globalForPool = globalThis as unknown as {
  pool: Pool | undefined
}

// Lazy initialization of pool - check DATABASE_URL at runtime
function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!')
    throw new Error('DATABASE_URL environment variable is required. Please set it in your Vercel environment variables.')
  }

  if (!globalForPool.pool) {
    globalForPool.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
    })

    // Test connection on initialization
    globalForPool.pool.on('error', (err) => {
      console.error('❌ Unexpected database pool error:', err)
    })

    globalForPool.pool.on('connect', () => {
      console.log('✅ Database pool connected')
    })
  }

  return globalForPool.pool
}

export const query = async (text: string, params?: any[]) => {
  const poolInstance = getPool()
  const result = await poolInstance.query(text, params)
  return result.rows
}

export const queryOne = async (text: string, params?: any[]) => {
  const poolInstance = getPool()
  const result = await poolInstance.query(text, params)
  return result.rows[0] || null
}

// Initialize users table (auto-runs on first request)
let dbInitialized = false
let dbInitializing = false

export const initDb = async () => {
  if (dbInitialized) return
  if (dbInitializing) {
    // Wait for ongoing initialization
    while (dbInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return
  }
  
  dbInitializing = true
  
  try {
    console.log('🔧 Initializing database...')
    
    // Check DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set. Please configure it in Vercel dashboard → Settings → Environment Variables')
    }
    
    // Test database connection first
    const poolInstance = getPool()
    await poolInstance.query('SELECT NOW()')
    console.log('✅ Database connection successful')
    
    // Create users table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Users table ready')
    
    // Create clients table if not exists
    await query(`
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
    console.log('✅ Clients table ready')
    
    // Create destinations table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS destinations (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        coordinates VARCHAR(255),
        prefeitura VARCHAR(255),
        state VARCHAR(100),
        cep VARCHAR(20),
        description TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Destinations table ready')
    
    // Add prefeitura, state, and cep columns if they don't exist (migration for existing tables)
    try {
      await query(`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS prefeitura VARCHAR(255)`)
      await query(`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS state VARCHAR(100)`)
      await query(`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS cep VARCHAR(20)`)
      // Migrate note to description for destinations
      await query(`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS description TEXT`)
      // Copy data from note to description if note exists and description doesn't
      await query(`
        UPDATE destinations 
        SET description = note 
        WHERE note IS NOT NULL AND (description IS NULL OR description = '')
      `)
      // Drop the old note column if it exists (after migration)
      await query(`
        DO $$ 
        BEGIN 
          IF EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'destinations' AND column_name = 'note') THEN
            ALTER TABLE destinations DROP COLUMN note;
          END IF;
        END $$;
      `)
    } catch (migrationError) {
      console.log('Migration note:', migrationError)
    }
    
    // Create hotels table if not exists
    await query(`
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
    console.log('✅ Hotels table ready')
    
    // Migrate note to description for hotels
    try {
      await query(`ALTER TABLE hotels ADD COLUMN IF NOT EXISTS description TEXT`)
      // Copy data from note to description if note exists and description doesn't
      await query(`
        UPDATE hotels 
        SET description = note 
        WHERE note IS NOT NULL AND (description IS NULL OR description = '')
      `)
      // Drop the old note column if it exists (after migration)
      await query(`
        DO $$ 
        BEGIN 
          IF EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'hotels' AND column_name = 'note') THEN
            ALTER TABLE hotels DROP COLUMN note;
          END IF;
        END $$;
      `)
    } catch (migrationError) {
      console.log('Migration note:', migrationError)
    }
    
    // Create guides table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS guides (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "contactNumber" VARCHAR(50),
        email VARCHAR(255),
        "destinationId" UUID REFERENCES destinations(id) ON DELETE CASCADE,
        languages VARCHAR(255),
        note TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Guides table ready')
    
    // Create drivers table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "contactNumber" VARCHAR(50),
        email VARCHAR(255),
        "destinationId" UUID REFERENCES destinations(id) ON DELETE CASCADE,
        languages VARCHAR(255),
        vehicle VARCHAR(50),
        note TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Drivers table ready')
    
    // Add vehicle column if it doesn't exist (migration for existing tables)
    try {
      await query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle VARCHAR(50)`)
    } catch (migrationError) {
      console.log('Migration note:', migrationError)
    }
    
    // Create bank_accounts table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS bank_accounts (
        id UUID PRIMARY KEY,
        "entityType" VARCHAR(50) NOT NULL,
        "entityId" UUID NOT NULL,
        "accountHolderName" VARCHAR(255) NOT NULL,
        "bankName" VARCHAR(255) NOT NULL,
        "accountNumber" VARCHAR(100),
        iban VARCHAR(100),
        "swiftBic" VARCHAR(50),
        "routingNumber" VARCHAR(50),
        currency VARCHAR(10),
        "isOnlineService" BOOLEAN DEFAULT FALSE,
        "serviceName" VARCHAR(100),
        "isPrimary" BOOLEAN DEFAULT FALSE,
        note TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT check_entity_type CHECK ("entityType" IN ('client', 'hotel', 'guide', 'driver'))
      )
    `)
    console.log('✅ Bank accounts table ready')
    
    // Add online service columns if they don't exist (migration for existing tables)
    try {
      await query(`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS "isOnlineService" BOOLEAN DEFAULT FALSE`)
      await query(`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS "serviceName" VARCHAR(100)`)
    } catch (migrationError) {
      console.log('Migration note:', migrationError)
    }
    
    // Add username column if it doesn't exist (migration for existing tables)
    try {
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE`)
      // Update existing users to set username = name if username is null
      await query(`UPDATE users SET username = name WHERE username IS NULL`)
      // Make username NOT NULL if it's still nullable
      await query(`
        DO $$ 
        BEGIN 
          IF EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'users' AND column_name = 'username' AND is_nullable = 'YES') THEN
            ALTER TABLE users ALTER COLUMN username SET NOT NULL;
          END IF;
        END $$;
      `)
    } catch (migrationError) {
      // Migration might fail if column already exists, that's fine
      console.log('Migration note:', migrationError)
    }
    
    dbInitialized = true
    dbInitializing = false
    console.log('✅ Database initialization complete')
  } catch (error: any) {
    dbInitializing = false
    const errorMessage = error?.message || String(error)
    const errorStack = error?.stack || ''
    console.error('❌ DB init error:', errorMessage)
    console.error('❌ Error details:', {
      message: errorMessage,
      code: error?.code,
      detail: error?.detail,
      hint: error?.hint,
      stack: errorStack.substring(0, 500) // Limit stack trace
    })
    
    // Re-throw error so API endpoints can handle it properly
    throw new Error(`Database initialization failed: ${errorMessage}`)
  }
}
