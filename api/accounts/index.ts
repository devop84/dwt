import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '../lib/auth.js'
import { query, initDb } from '../lib/db.js'
import { randomUUID } from 'crypto'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await initDb()
  
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      res.status(401).json({ message: 'Invalid token' })
      return
    }

    // GET all accounts (with optional entity filter)
    if (req.method === 'GET') {
      const entityType = req.query.entityType as string | undefined
      const entityId = req.query.entityId as string | undefined

      let sql = `SELECT * FROM accounts WHERE 1=1`
      const params: any[] = []
      let paramIndex = 1

      if (entityType) {
        sql += ` AND "entityType" = $${paramIndex}`
        params.push(entityType)
        paramIndex++
      }

      if (entityId) {
        sql += ` AND "entityId" = $${paramIndex}`
        params.push(entityId)
        paramIndex++
      }

      sql += ` ORDER BY "isPrimary" DESC, "createdAt" ASC`

      const accounts = await query(sql, params.length > 0 ? params : undefined)
      res.status(200).json(accounts)
    } else if (req.method === 'POST') {
      const { entityType, entityId, accountType, accountHolderName, bankName, accountNumber, iban, swiftBic, routingNumber, currency, serviceName, isPrimary, note } = req.body
      
      if (!entityType || !accountHolderName) {
        res.status(400).json({ message: 'Entity type and account holder name are required' })
        return
      }

      // For company accounts, entityId is not required
      if (entityType !== 'company' && !entityId) {
        res.status(400).json({ message: 'Entity ID is required for non-company accounts' })
        return
      }

      if (!['client', 'hotel', 'guide', 'driver', 'caterer', 'company'].includes(entityType)) {
        res.status(400).json({ message: 'Invalid entity type' })
        return
      }

      if (!accountType || !['bank', 'cash', 'online', 'other'].includes(accountType)) {
        res.status(400).json({ message: 'Account type must be bank, cash, online, or other' })
        return
      }

      // Validate required fields based on account type
      if ((accountType === 'bank' || accountType === 'other') && !bankName) {
        res.status(400).json({ message: accountType === 'bank' ? 'Bank name is required for bank accounts' : 'Account name/description is required' })
        return
      }
      if (accountType === 'online' && !serviceName) {
        res.status(400).json({ message: 'Service name/tag is required for online accounts' })
        return
      }

      // If setting as primary, unset other primary accounts for this entity
      if (isPrimary) {
        if (entityType === 'company') {
          await query(
            `UPDATE accounts SET "isPrimary" = FALSE WHERE "entityType" = 'company' AND "entityId" IS NULL`
          )
        } else {
          await query(
            `UPDATE accounts SET "isPrimary" = FALSE WHERE "entityType" = $1 AND "entityId" = $2`,
            [entityType, entityId]
          )
        }
      }

      const accountId = randomUUID()
      const result = await query(
        `INSERT INTO accounts (id, "entityType", "entityId", "accountType", "accountHolderName", "bankName", "accountNumber", iban, "swiftBic", "routingNumber", currency, "serviceName", "isPrimary", note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [
          accountId,
          entityType,
          entityType === 'company' ? null : entityId,
          accountType,
          accountHolderName,
          (accountType === 'cash') ? null : (bankName || null),
          accountNumber || null,
          iban || null,
          swiftBic || null,
          routingNumber || null,
          currency || null,
          serviceName || null,
          isPrimary || false,
          note || null
        ]
      )
      res.status(201).json(result[0])
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Accounts API error:', error)
    res.status(500).json({ message: error.message || 'Failed to process request' })
  }
}
