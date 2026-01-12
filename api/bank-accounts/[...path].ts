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
      // GET all bank accounts (with optional entity filter)
      if (req.method === 'GET') {
        const entityType = req.query.entityType as string | undefined
        const entityId = req.query.entityId as string | undefined

        let sql = `SELECT * FROM bank_accounts WHERE 1=1`
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
        const { entityType, entityId, accountHolderName, bankName, accountNumber, iban, swiftBic, routingNumber, currency, isPrimary, note } = req.body
        
        if (!entityType || !entityId || !accountHolderName || !bankName) {
          res.status(400).json({ message: 'Entity type, entity ID, account holder name, and bank name are required' })
          return
        }

        if (!['client', 'hotel', 'guide', 'driver'].includes(entityType)) {
          res.status(400).json({ message: 'Invalid entity type' })
          return
        }

        // If setting as primary, unset other primary accounts for this entity
        if (isPrimary) {
          await query(
            `UPDATE bank_accounts SET "isPrimary" = FALSE WHERE "entityType" = $1 AND "entityId" = $2`,
            [entityType, entityId]
          )
        }

        const accountId = randomUUID()
        const result = await query(
          `INSERT INTO bank_accounts (id, "entityType", "entityId", "accountHolderName", "bankName", "accountNumber", iban, "swiftBic", "routingNumber", currency, "isPrimary", note)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
          [
            accountId,
            entityType,
            entityId,
            accountHolderName,
            bankName,
            accountNumber || null,
            iban || null,
            swiftBic || null,
            routingNumber || null,
            currency || null,
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
        const account = await queryOne('SELECT * FROM bank_accounts WHERE id = $1', [id])
        if (!account) {
          res.status(404).json({ message: 'Bank account not found' })
          return
        }
        res.status(200).json(account)
      } else if (req.method === 'PUT') {
        const { accountHolderName, bankName, accountNumber, iban, swiftBic, routingNumber, currency, isPrimary, note } = req.body
        
        if (!accountHolderName || !bankName) {
          res.status(400).json({ message: 'Account holder name and bank name are required' })
          return
        }

        const existing = await queryOne('SELECT * FROM bank_accounts WHERE id = $1', [id])
        if (!existing) {
          res.status(404).json({ message: 'Bank account not found' })
          return
        }

        // If setting as primary, unset other primary accounts for this entity
        if (isPrimary && (!existing.isPrimary)) {
          await query(
            `UPDATE bank_accounts SET "isPrimary" = FALSE WHERE "entityType" = $1 AND "entityId" = $2 AND id != $3`,
            [existing.entityType, existing.entityId, id]
          )
        }

        const result = await query(
          `UPDATE bank_accounts 
           SET "accountHolderName" = $1, "bankName" = $2, "accountNumber" = $3, iban = $4, "swiftBic" = $5, "routingNumber" = $6, currency = $7, "isPrimary" = $8, note = $9, "updatedAt" = NOW()
           WHERE id = $10 RETURNING *`,
          [
            accountHolderName,
            bankName,
            accountNumber || null,
            iban || null,
            swiftBic || null,
            routingNumber || null,
            currency || null,
            isPrimary || false,
            note || null,
            id
          ]
        )
        res.status(200).json(result[0])
      } else if (req.method === 'DELETE') {
        const existing = await queryOne('SELECT id FROM bank_accounts WHERE id = $1', [id])
        if (!existing) {
          res.status(404).json({ message: 'Bank account not found' })
          return
        }
        await query('DELETE FROM bank_accounts WHERE id = $1', [id])
        res.status(200).json({ message: 'Bank account deleted successfully' })
      } else {
        res.status(405).json({ message: 'Method not allowed' })
      }
    }
  } catch (error: any) {
    console.error('Bank accounts API error:', error)
    res.status(500).json({ message: error.message || 'Failed to process request' })
  }
}
