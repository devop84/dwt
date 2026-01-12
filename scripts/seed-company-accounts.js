import 'dotenv/config'
import pg from 'pg'
import { randomUUID } from 'crypto'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

const companyAccountsToSeed = [
  {
    accountType: 'bank',
    accountHolderName: 'Downwinder Tours Company',
    bankName: 'Banco do Brasil',
    accountNumber: '12345-6',
    iban: 'BR1800000000000000000000000',
    swiftBic: 'BRASBRRJ',
    currency: 'BRL',
    isPrimary: true,
    note: 'Main company bank account for operations'
  },
  {
    accountType: 'cash',
    accountHolderName: 'Downwinder Tours Company',
    currency: 'BRL',
    isPrimary: false,
    note: 'Cash transactions for local operations'
  },
  {
    accountType: 'online',
    accountHolderName: 'Downwinder Tours Company',
    serviceName: 'Wise',
    accountNumber: '@downwindertours',
    currency: 'USD',
    isPrimary: false,
    note: 'Wise account for international transfers'
  }
]

async function seedCompanyAccounts() {
  try {
    console.log('🔄 Starting company accounts seed...\n')

    // Check if entityId column can be NULL (for company accounts)
    console.log('🔧 Checking accounts table structure...')
    try {
      // Try to alter the column to allow NULL if it doesn't already
      await pool.query(`ALTER TABLE accounts ALTER COLUMN "entityId" DROP NOT NULL`)
      console.log('✅ Updated entityId column to allow NULL')
    } catch (migrationError) {
      // Column might already allow NULL, that's fine
      console.log('ℹ️  entityId column check completed')
    }

    // Update constraint to include 'company' entity type
    try {
      console.log('🔧 Updating entity type constraint...')
      // Drop the old constraint
      await pool.query(`ALTER TABLE accounts DROP CONSTRAINT IF EXISTS check_entity_type`)
      // Add the new constraint with 'company' included
      await pool.query(`
        ALTER TABLE accounts 
        ADD CONSTRAINT check_entity_type 
        CHECK ("entityType" IN ('client', 'hotel', 'guide', 'driver', 'caterer', 'company'))
      `)
      console.log('✅ Updated entity type constraint to include company\n')
    } catch (migrationError) {
      console.log('ℹ️  Constraint update check completed\n')
    }

    // Clear existing company accounts
    console.log('🗑️  Clearing existing company accounts...')
    await pool.query(`DELETE FROM accounts WHERE "entityType" = 'company' AND "entityId" IS NULL`)
    console.log('✅ Cleared existing company accounts\n')

    // Seed company accounts
    console.log('🌱 Seeding company accounts...\n')
    let seededCount = 0

    for (const accountData of companyAccountsToSeed) {
      const accountId = randomUUID()
      
      await pool.query(
        `INSERT INTO accounts (id, "entityType", "entityId", "accountType", "accountHolderName", "bankName", "accountNumber", iban, "swiftBic", "routingNumber", currency, "serviceName", "isPrimary", note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          accountId,
          'company',
          null, // entityId is NULL for company accounts
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

      const accountTypeLabel = accountData.accountType === 'online' 
        ? `${accountData.accountType} (${accountData.serviceName})`
        : accountData.accountType
      console.log(`   ✓ Seeded company account: ${accountData.accountHolderName} - ${accountTypeLabel}`)
      seededCount++
    }

    console.log(`\n✅ Successfully seeded ${seededCount} company accounts!`)
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error seeding company accounts:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

seedCompanyAccounts()
