import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '../lib/auth.js'
import { query, queryOne, initDb } from '../lib/db.js'
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

    const path = req.query.path as string[]
    const id = path && path.length > 0 ? path[0] : null

    if (!id) {
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
        
        if (!entityType || !entityId || !accountHolderName) {
          res.status(400).json({ message: 'Entity type, entity ID, and account holder name are required' })
          return
        }

        if (!['client', 'hotel', 'guide', 'driver'].includes(entityType)) {
          res.status(400).json({ message: 'Invalid entity type' })
          return
        }

        if (!accountType || !['bank', 'cash', 'online'].includes(accountType)) {
          res.status(400).json({ message: 'Account type must be bank, cash, or online' })
          return
        }

        // Validate required fields based on account type
        if (accountType === 'bank' && !bankName) {
          res.status(400).json({ message: 'Bank name is required for bank accounts' })
          return
        }
        if (accountType === 'online' && !serviceName) {
          res.status(400).json({ message: 'Service name/tag is required for online accounts' })
          return
        }

        // If setting as primary, unset other primary accounts for this entity
        if (isPrimary) {
          await query(
            `UPDATE accounts SET "isPrimary" = FALSE WHERE "entityType" = $1 AND "entityId" = $2`,
            [entityType, entityId]
          )
        }

        const accountId = randomUUID()
        const result = await query(
          `INSERT INTO accounts (id, "entityType", "entityId", "accountType", "accountHolderName", "bankName", "accountNumber", iban, "swiftBic", "routingNumber", currency, "serviceName", "isPrimary", note)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
          [
            accountId,
            entityType,
            entityId,
            accountType,
            accountHolderName,
            accountType === 'cash' ? null : (bankName || null),
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
    } else {
      if (req.method === 'GET') {
        const account = await queryOne('SELECT * FROM accounts WHERE id = $1', [id])
        if (!account) {
          res.status(404).json({ message: 'Account not found' })
          return
        }
        res.status(200).json(account)
      } else if (req.method === 'PUT') {
        const { accountType, accountHolderName, bankName, accountNumber, iban, swiftBic, routingNumber, currency, serviceName, isPrimary, note } = req.body
        
        if (!accountHolderName) {
          res.status(400).json({ message: 'Account holder name is required' })
          return
        }

        if (!accountType || !['bank', 'cash', 'online'].includes(accountType)) {
          res.status(400).json({ message: 'Account type must be bank, cash, or online' })
          return
        }

        // Validate required fields based on account type
        if (accountType === 'bank' && !bankName) {
          res.status(400).json({ message: 'Bank name is required for bank accounts' })
          return
        }
        if (accountType === 'online' && !serviceName) {
          res.status(400).json({ message: 'Service name/tag is required for online accounts' })
          return
        }

        const existing = await queryOne('SELECT * FROM accounts WHERE id = $1', [id])
        if (!existing) {
          res.status(404).json({ message: 'Account not found' })
          return
        }

        // If setting as primary, unset other primary accounts for this entity
        if (isPrimary && (!existing.isPrimary)) {
          await query(
            `UPDATE accounts SET "isPrimary" = FALSE WHERE "entityType" = $1 AND "entityId" = $2 AND id != $3`,
            [existing.entityType, existing.entityId, id]
          )
        }

        const result = await query(
          `UPDATE accounts 
           SET "accountType" = $1, "accountHolderName" = $2, "bankName" = $3, "accountNumber" = $4, iban = $5, "swiftBic" = $6, "routingNumber" = $7, currency = $8, "serviceName" = $9, "isPrimary" = $10, note = $11, "updatedAt" = NOW()
           WHERE id = $12 RETURNING *`,
          [
            accountType,
            accountHolderName,
            accountType === 'cash' ? null : (bankName || null),
            accountNumber || null,
            iban || null,
            swiftBic || null,
            routingNumber || null,
            currency || null,
            serviceName || null,
            isPrimary || false,
            note || null,
            id
          ]
        )
        res.status(200).json(result[0])
      } else if (req.method === 'DELETE') {
        const existing = await queryOne('SELECT id FROM accounts WHERE id = $1', [id])
        if (!existing) {
          res.status(404).json({ message: 'Account not found' })
          return
        }
        await query('DELETE FROM accounts WHERE id = $1', [id])
        res.status(200).json({ message: 'Account deleted successfully' })
      } else {
        res.status(405).json({ message: 'Method not allowed' })
      }
    }
  } catch (error: any) {
    console.error('Accounts API error:', error)
    res.status(500).json({ message: error.message || 'Failed to process request' })
  }
}
