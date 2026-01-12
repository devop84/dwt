import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '../lib/auth.js'
import { query, queryOne, initDb } from '../lib/db.js'

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

    const id = req.query.id as string

    if (req.method === 'GET') {
      let account = await queryOne('SELECT * FROM accounts WHERE id = $1', [id])
      if (!account) {
        res.status(404).json({ message: 'Account not found' })
        return
      }
      
      if (account.entityId && account.entityType) {
        let entityName = null
        try {
          if (account.entityType === 'client') {
            const entity = await queryOne('SELECT name FROM clients WHERE id = $1', [account.entityId])
            entityName = entity?.name || null
          } else if (account.entityType === 'hotel') {
            const entity = await queryOne('SELECT name FROM hotels WHERE id = $1', [account.entityId])
            entityName = entity?.name || null
          } else if (account.entityType === 'guide') {
            const entity = await queryOne('SELECT name FROM guides WHERE id = $1', [account.entityId])
            entityName = entity?.name || null
          } else if (account.entityType === 'driver') {
            const entity = await queryOne('SELECT name FROM drivers WHERE id = $1', [account.entityId])
            entityName = entity?.name || null
          } else if (account.entityType === 'caterer') {
            const entity = await queryOne('SELECT name FROM caterers WHERE id = $1', [account.entityId])
            entityName = entity?.name || null
          }
        } catch (err) {
          console.error('Error fetching entity name:', err)
        }
        account = { ...account, entityName }
      }
      
      res.status(200).json(account)
    } else if (req.method === 'PUT') {
      const { entityType, entityId, accountType, accountHolderName, bankName, accountNumber, iban, swiftBic, routingNumber, currency, serviceName, isPrimary, note } = req.body
      
      if (!accountHolderName) {
        res.status(400).json({ message: 'Account holder name is required' })
        return
      }

      if (!accountType || !['bank', 'cash', 'online', 'other'].includes(accountType)) {
        res.status(400).json({ message: 'Account type must be bank, cash, online, or other' })
        return
      }

      if ((accountType === 'bank' || accountType === 'other') && !bankName) {
        res.status(400).json({ message: accountType === 'bank' ? 'Bank name is required for bank accounts' : 'Account name/description is required' })
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

      if (isPrimary && (!existing.isPrimary)) {
        if (existing.entityType === 'company') {
          await query(
            `UPDATE accounts SET "isPrimary" = FALSE WHERE "entityType" = 'company' AND "entityId" IS NULL AND id != $1`,
            [id]
          )
        } else {
          await query(
            `UPDATE accounts SET "isPrimary" = FALSE WHERE "entityType" = $1 AND "entityId" = $2 AND id != $3`,
            [existing.entityType, existing.entityId, id]
          )
        }
      }

      const result = await query(
        `UPDATE accounts 
         SET "accountType" = $1, "accountHolderName" = $2, "bankName" = $3, "accountNumber" = $4, iban = $5, "swiftBic" = $6, "routingNumber" = $7, currency = $8, "serviceName" = $9, "isPrimary" = $10, note = $11, "updatedAt" = NOW()
         WHERE id = $12 RETURNING *`,
        [
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
  } catch (error: any) {
    console.error('Account API error:', error)
    res.status(500).json({ message: error.message || 'Internal server error' })
  }
}
