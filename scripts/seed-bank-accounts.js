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
    accountHolderName: 'John Smith',
    bankName: 'Banco do Brasil',
    accountNumber: '12345-6',
    iban: 'BR1800000000000000000000000',
    swiftBic: 'BRASBRRJ',
    currency: 'BRL',
    isOnlineService: false,
    serviceName: null,
    isPrimary: true,
    note: 'Main account for client payments'
  },
  {
    entityType: 'client',
    accountHolderName: 'Maria Garcia',
    bankName: 'Itaú Unibanco',
    accountNumber: '78901-2',
    iban: 'BR1800000000000000000000001',
    swiftBic: 'ITAUUS33',
    currency: 'BRL',
    isOnlineService: false,
    serviceName: null,
    isPrimary: true,
    note: null
  },
  {
    entityType: 'hotel',
    accountHolderName: 'Hotel Cumbuco Beach',
    bankName: 'Banco Bradesco',
    accountNumber: '34567-8',
    iban: 'BR1800000000000000000000002',
    swiftBic: 'BRADUS33',
    currency: 'BRL',
    isOnlineService: false,
    serviceName: null,
    isPrimary: true,
    note: 'Business account for hotel operations'
  },
  {
    entityType: 'hotel',
    accountHolderName: 'Pousada Jericoacoara',
    bankName: 'Banco Santander',
    accountNumber: '90123-4',
    iban: 'BR1800000000000000000000003',
    swiftBic: 'BSCHBR33',
    currency: 'BRL',
    isOnlineService: false,
    serviceName: null,
    isPrimary: true,
    note: null
  },
  {
    entityType: 'guide',
    accountHolderName: 'João Silva',
    bankName: 'Caixa Econômica Federal',
    accountNumber: '56789-0',
    iban: 'BR1800000000000000000000004',
    swiftBic: 'CEFABRSP',
    currency: 'BRL',
    isOnlineService: false,
    serviceName: null,
    isPrimary: true,
    note: 'Guide payment account'
  },
  {
    entityType: 'guide',
    accountHolderName: 'Maria Santos',
    bankName: 'Banco Inter',
    accountNumber: '23456-7',
    iban: 'BR1800000000000000000000005',
    swiftBic: 'INTRBRRJ',
    currency: 'BRL',
    isOnlineService: false,
    serviceName: null,
    isPrimary: true,
    note: null
  },
  {
    entityType: 'driver',
    accountHolderName: 'Antonio Ferreira',
    bankName: 'Nubank',
    accountNumber: '89012-3',
    iban: 'BR1800000000000000000000006',
    swiftBic: 'NUBABRSP',
    currency: 'BRL',
    isOnlineService: false,
    serviceName: null,
    isPrimary: true,
    note: 'Driver payment account'
  },
  {
    entityType: 'driver',
    accountHolderName: 'Luiz Rodrigues',
    bankName: 'Banco Original',
    accountNumber: '45678-9',
    iban: 'BR1800000000000000000000007',
    swiftBic: 'BGALBRRJ',
    currency: 'BRL',
    isOnlineService: false,
    serviceName: null,
    isPrimary: true,
    note: null
  },
  // Online payment services
  {
    entityType: 'client',
    accountHolderName: 'John Smith',
    bankName: 'Wise',
    accountNumber: null,
    iban: null,
    swiftBic: null,
    currency: 'USD',
    isOnlineService: true,
    serviceName: '@johnsmith',
    isPrimary: false,
    note: 'International transfers'
  },
  {
    entityType: 'client',
    accountHolderName: 'Maria Garcia',
    bankName: 'Revolut',
    accountNumber: null,
    iban: null,
    swiftBic: null,
    currency: 'EUR',
    isOnlineService: true,
    serviceName: 'maria.garcia@revolut',
    isPrimary: false,
    note: 'Multi-currency account'
  },
  {
    entityType: 'hotel',
    accountHolderName: 'Hotel Cumbuco Beach',
    bankName: 'Wise',
    accountNumber: null,
    iban: null,
    swiftBic: null,
    currency: 'USD',
    isOnlineService: true,
    serviceName: 'hotel.cumbuco@wise',
    isPrimary: false,
    note: 'For international guest payments'
  },
  {
    entityType: 'guide',
    accountHolderName: 'João Silva',
    bankName: 'PayPal',
    accountNumber: null,
    iban: null,
    swiftBic: null,
    currency: 'USD',
    isOnlineService: true,
    serviceName: 'joao.silva@paypal.com',
    isPrimary: false,
    note: 'Quick payment option'
  },
  {
    entityType: 'guide',
    accountHolderName: 'Carlos Oliveira',
    bankName: 'Wise',
    accountNumber: null,
    iban: null,
    swiftBic: null,
    currency: 'EUR',
    isOnlineService: true,
    serviceName: '@carlos.oliveira',
    isPrimary: true,
    note: 'Primary account for international clients'
  },
  {
    entityType: 'driver',
    accountHolderName: 'Antonio Ferreira',
    bankName: 'Revolut',
    accountNumber: null,
    iban: null,
    swiftBic: null,
    currency: 'USD',
    isOnlineService: true,
    serviceName: 'antonio.ferreira@revolut',
    isPrimary: false,
    note: 'Alternative payment method'
  },
  {
    entityType: 'driver',
    accountHolderName: 'Paulo Alves',
    bankName: 'Wise',
    accountNumber: null,
    iban: null,
    swiftBic: null,
    currency: 'BRL',
    isOnlineService: true,
    serviceName: '@paulo.alves',
    isPrimary: true,
    note: 'Main account for payments'
  },
]

async function seedBankAccounts() {
  try {
    console.log('🔄 Starting bank accounts seed...\n')

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

    // Add online service columns if they don't exist
    console.log('🔧 Checking for online service columns...')
    try {
      await pool.query(`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS "isOnlineService" BOOLEAN DEFAULT FALSE`)
      await pool.query(`ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS "serviceName" VARCHAR(100)`)
      console.log('✅ Online service columns ready\n')
    } catch (migrationError) {
      // Columns might already exist, that's fine
      console.log('ℹ️  Online service columns check completed\n')
    }

    // Clear existing bank accounts
    console.log('🗑️  Clearing existing bank accounts...')
    await pool.query('DELETE FROM bank_accounts')
    console.log('✅ Cleared existing bank accounts\n')

    // Seed bank accounts
    console.log('🌱 Seeding bank accounts...\n')
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
          `SELECT id FROM bank_accounts WHERE "entityType" = $1 AND "entityId" = $2 AND "isPrimary" = TRUE`,
          [accountData.entityType, entityId]
        )
        if (existingPrimary.rows.length > 0) {
          // Unset existing primary
          await pool.query(
            `UPDATE bank_accounts SET "isPrimary" = FALSE WHERE "entityType" = $1 AND "entityId" = $2`,
            [accountData.entityType, entityId]
          )
        }
      }

      const accountId = randomUUID()

      await pool.query(
        `INSERT INTO bank_accounts (id, "entityType", "entityId", "accountHolderName", "bankName", "accountNumber", iban, "swiftBic", "routingNumber", currency, "isOnlineService", "serviceName", "isPrimary", note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          accountId,
          accountData.entityType,
          entityId,
          accountData.accountHolderName,
          accountData.bankName,
          accountData.accountNumber,
          accountData.iban,
          accountData.swiftBic,
          null, // routingNumber
          accountData.currency,
          accountData.isOnlineService,
          accountData.serviceName,
          accountData.isPrimary,
          accountData.note,
        ]
      )

      const serviceInfo = accountData.isOnlineService 
        ? ` (${accountData.serviceName})` 
        : ''
      console.log(`   ✓ Seeded ${accountData.entityType} account: ${accountData.bankName}${serviceInfo} → ${entityName}`)
      seededCount++
    }

    console.log(`\n✅ Successfully seeded ${seededCount} bank accounts!`)
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error seeding bank accounts:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

seedBankAccounts()
