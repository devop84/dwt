import 'dotenv/config'
import pg from 'pg'
import { randomUUID } from 'crypto'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

const bankAccountsToSeed = [
  // Traditional bank accounts
  {
    entityType: 'client',
    accountType: 'bank',
    accountHolderName: 'John Smith',
    bankName: 'Banco do Brasil',
    accountNumber: '12345-6',
    iban: 'BR1800000000000000000000000',
    swiftBic: 'BRASBRRJ',
    currency: 'BRL',
    serviceName: null,
    isPrimary: true,
    note: 'Main account for client payments'
  },
  {
    entityType: 'client',
    accountType: 'bank',
    accountHolderName: 'Maria Garcia',
    bankName: 'Itaú Unibanco',
    accountNumber: '78901-2',
    iban: 'BR1800000000000000000000001',
    swiftBic: 'ITAUUS33',
    currency: 'BRL',
    serviceName: null,
    isPrimary: true,
    note: null
  },
  {
    entityType: 'hotel',
    accountType: 'bank',
    accountHolderName: 'Hotel Cumbuco Beach',
    bankName: 'Banco Bradesco',
    accountNumber: '34567-8',
    iban: 'BR1800000000000000000000002',
    swiftBic: 'BRADUS33',
    currency: 'BRL',
    serviceName: null,
    isPrimary: true,
    note: 'Business account for hotel operations'
  },
  {
    entityType: 'hotel',
    accountType: 'bank',
    accountHolderName: 'Pousada Jericoacoara',
    bankName: 'Banco Santander',
    accountNumber: '90123-4',
    iban: 'BR1800000000000000000000003',
    swiftBic: 'BSCHBR33',
    currency: 'BRL',
    serviceName: null,
    isPrimary: true,
    note: null
  },
  {
    entityType: 'guide',
    accountType: 'bank',
    accountHolderName: 'João Silva',
    bankName: 'Caixa Econômica Federal',
    accountNumber: '56789-0',
    iban: 'BR1800000000000000000000004',
    swiftBic: 'CEFABRSP',
    currency: 'BRL',
    serviceName: null,
    isPrimary: true,
    note: 'Guide payment account'
  },
  {
    entityType: 'guide',
    accountType: 'bank',
    accountHolderName: 'Maria Santos',
    bankName: 'Banco Inter',
    accountNumber: '23456-7',
    iban: 'BR1800000000000000000000005',
    swiftBic: 'INTRBRRJ',
    currency: 'BRL',
    serviceName: null,
    isPrimary: true,
    note: null
  },
  {
    entityType: 'driver',
    accountType: 'bank',
    accountHolderName: 'Antonio Ferreira',
    bankName: 'Nubank',
    accountNumber: '89012-3',
    iban: 'BR1800000000000000000000006',
    swiftBic: 'NUBABRSP',
    currency: 'BRL',
    serviceName: null,
    isPrimary: true,
    note: 'Driver payment account'
  },
  {
    entityType: 'driver',
    accountType: 'bank',
    accountHolderName: 'Luiz Rodrigues',
    bankName: 'Banco Original',
    accountNumber: '45678-9',
    iban: 'BR1800000000000000000000007',
    swiftBic: 'BGALBRRJ',
    currency: 'BRL',
    serviceName: null,
    isPrimary: true,
    note: null
  },
  // Online payment services
  {
    entityType: 'client',
    accountType: 'online',
    accountHolderName: 'John Smith',
    bankName: null,
    accountNumber: '@johnsmith',
    iban: null,
    swiftBic: null,
    currency: 'USD',
    serviceName: 'Wise',
    isPrimary: false,
    note: 'International transfers'
  },
  {
    entityType: 'client',
    accountType: 'online',
    accountHolderName: 'Maria Garcia',
    bankName: null,
    accountNumber: 'maria.garcia@revolut',
    iban: null,
    swiftBic: null,
    currency: 'EUR',
    serviceName: 'Revolut',
    isPrimary: false,
    note: 'Multi-currency account'
  },
  {
    entityType: 'hotel',
    accountType: 'online',
    accountHolderName: 'Hotel Cumbuco Beach',
    bankName: null,
    accountNumber: 'hotel.cumbuco@wise',
    iban: null,
    swiftBic: null,
    currency: 'USD',
    serviceName: 'Wise',
    isPrimary: false,
    note: 'For international guest payments'
  },
  {
    entityType: 'guide',
    accountType: 'online',
    accountHolderName: 'João Silva',
    bankName: null,
    accountNumber: 'joao.silva@paypal.com',
    iban: null,
    swiftBic: null,
    currency: 'USD',
    serviceName: 'PayPal',
    isPrimary: false,
    note: 'Quick payment option'
  },
  {
    entityType: 'guide',
    accountType: 'online',
    accountHolderName: 'Carlos Oliveira',
    bankName: null,
    accountNumber: '@carlos.oliveira',
    iban: null,
    swiftBic: null,
    currency: 'EUR',
    serviceName: 'Wise',
    isPrimary: true,
    note: 'Primary account for international clients'
  },
  {
    entityType: 'driver',
    accountType: 'online',
    accountHolderName: 'Antonio Ferreira',
    bankName: null,
    accountNumber: 'antonio.ferreira@revolut',
    iban: null,
    swiftBic: null,
    currency: 'USD',
    serviceName: 'Revolut',
    isPrimary: false,
    note: 'Alternative payment method'
  },
  {
    entityType: 'driver',
    accountType: 'online',
    accountHolderName: 'Paulo Alves',
    bankName: null,
    accountNumber: '@paulo.alves',
    iban: null,
    swiftBic: null,
    currency: 'BRL',
    serviceName: 'Wise',
    isPrimary: true,
    note: 'Main account for payments'
  },
  // Cash accounts
  {
    entityType: 'client',
    accountType: 'cash',
    accountHolderName: 'John Smith',
    bankName: null,
    accountNumber: null,
    iban: null,
    swiftBic: null,
    currency: 'BRL',
    serviceName: null,
    isPrimary: false,
    note: 'Cash transactions only'
  },
  {
    entityType: 'guide',
    accountType: 'cash',
    accountHolderName: 'Ana Costa',
    bankName: null,
    accountNumber: null,
    iban: null,
    swiftBic: null,
    currency: 'BRL',
    serviceName: null,
    isPrimary: false,
    note: 'Local cash payments'
  },
]

async function seedBankAccounts() {
  try {
    console.log('🔄 Starting accounts seed...\n')

    // Get all entities to assign bank accounts
    const clientsResult = await pool.query('SELECT id, name FROM clients ORDER BY name LIMIT 10')
    const hotelsResult = await pool.query('SELECT id, name FROM hotels ORDER BY name LIMIT 10')
    const guidesResult = await pool.query('SELECT id, name FROM guides ORDER BY name LIMIT 10')
    const driversResult = await pool.query('SELECT id, name FROM drivers ORDER BY name LIMIT 10')

    const clients = clientsResult.rows
    const hotels = hotelsResult.rows
    const guides = guidesResult.rows
    const drivers = driversResult.rows

    console.log(`📋 Found ${clients.length} clients, ${hotels.length} hotels, ${guides.length} guides, ${drivers.length} drivers\n`)

    if (clients.length === 0 && hotels.length === 0 && guides.length === 0 && drivers.length === 0) {
      console.error('❌ No entities found. Please seed clients, hotels, guides, or drivers first.')
      await pool.end()
      process.exit(1)
    }

    // Ensure accountType column exists
    console.log('🔧 Checking for accountType column...')
    try {
      await pool.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "accountType" VARCHAR(50) DEFAULT 'bank'`)
      console.log('✅ Account type column ready\n')
    } catch (migrationError) {
      // Column might already exist, that's fine
      console.log('ℹ️  Account type column check completed\n')
    }
    
    // Migrate bank_accounts table to accounts if it exists
    try {
      await pool.query(`
        DO $$ 
        BEGIN 
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_accounts') THEN
            ALTER TABLE bank_accounts RENAME TO accounts;
          END IF;
        END $$;
      `)
    } catch (migrationError) {
      // Table might not exist or already renamed, that's fine
    }

    // Clear existing accounts
    console.log('🗑️  Clearing existing accounts...')
    await pool.query('DELETE FROM accounts')
    console.log('✅ Cleared existing accounts\n')

    // Seed accounts
    console.log('🌱 Seeding accounts...\n')
    let seededCount = 0

    for (const accountData of bankAccountsToSeed) {
      let entityId = null
      let entityName = ''

      // Find appropriate entity based on type
      switch (accountData.entityType) {
        case 'client':
          if (clients.length > 0) {
            // Try to find entity by name match, otherwise use first available
            const matched = clients.find(c => 
              c.name.toLowerCase().includes(accountData.accountHolderName.toLowerCase().split(' ')[0])
            )
            entityId = matched ? matched.id : clients[0].id
            entityName = matched ? matched.name : clients[0].name
          }
          break
        case 'hotel':
          if (hotels.length > 0) {
            const matched = hotels.find(h => 
              h.name.toLowerCase().includes(accountData.accountHolderName.toLowerCase().split(' ')[0])
            )
            entityId = matched ? matched.id : hotels[0].id
            entityName = matched ? matched.name : hotels[0].name
          }
          break
        case 'guide':
          if (guides.length > 0) {
            const matched = guides.find(g => 
              g.name.toLowerCase().includes(accountData.accountHolderName.toLowerCase().split(' ')[0])
            )
            entityId = matched ? matched.id : guides[0].id
            entityName = matched ? matched.name : guides[0].name
          }
          break
        case 'driver':
          if (drivers.length > 0) {
            const matched = drivers.find(d => 
              d.name.toLowerCase().includes(accountData.accountHolderName.toLowerCase().split(' ')[0])
            )
            entityId = matched ? matched.id : drivers[0].id
            entityName = matched ? matched.name : drivers[0].name
          }
          break
      }

      if (!entityId) {
        console.log(`   ⚠️  Skipped: No ${accountData.entityType} found for ${accountData.accountHolderName}`)
        continue
      }

      // If setting as primary, check if there's already a primary account for this entity
      if (accountData.isPrimary) {
        const existingPrimary = await pool.query(
          `SELECT id FROM accounts WHERE "entityType" = $1 AND "entityId" = $2 AND "isPrimary" = TRUE`,
          [accountData.entityType, entityId]
        )
        if (existingPrimary.rows.length > 0) {
          // Unset existing primary
          await pool.query(
            `UPDATE accounts SET "isPrimary" = FALSE WHERE "entityType" = $1 AND "entityId" = $2`,
            [accountData.entityType, entityId]
          )
        }
      }

      const accountId = randomUUID()

      await pool.query(
        `INSERT INTO accounts (id, "entityType", "entityId", "accountType", "accountHolderName", "bankName", "accountNumber", iban, "swiftBic", "routingNumber", currency, "serviceName", "isPrimary", note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          accountId,
          accountData.entityType,
          entityId,
          accountData.accountType,
          accountData.accountHolderName,
          accountData.bankName || null,
          accountData.accountNumber || null,
          accountData.iban || null,
          accountData.swiftBic || null,
          null, // routingNumber
          accountData.currency || null,
          accountData.serviceName || null,
          accountData.isPrimary || false,
          accountData.note || null,
        ]
      )

      const accountDisplay = accountData.accountType === 'online'
        ? `${accountData.serviceName} (${accountData.accountNumber})`
        : accountData.accountType === 'cash'
        ? 'Cash'
        : accountData.bankName
      console.log(`   ✓ Seeded ${accountData.entityType} account: ${accountDisplay} → ${entityName}`)
      seededCount++
    }

    console.log(`\n✅ Successfully seeded ${seededCount} accounts!`)
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error seeding accounts:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

seedBankAccounts()
