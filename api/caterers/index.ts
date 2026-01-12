import type { VercelRequest, VercelResponse } from '@vercel/node'
import { query, initDb } from '../lib/db.js'
import { verifyToken } from '../lib/auth.js'
import { randomUUID } from 'crypto'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await initDb()

  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    // GET all caterers
    if (req.method === 'GET') {
      const result = await query(`
        SELECT c.*, d.name as "destinationName"
        FROM caterers c
        LEFT JOIN destinations d ON c."destinationId" = d.id
        ORDER BY c.name
      `)
      res.json(result)
    } else if (req.method === 'POST') {
      const { name, contactNumber, email, type, destinationId, note } = req.body

      if (!name || !type) {
        res.status(400).json({ message: 'Name and type are required' })
        return
      }

      if (!['restaurant', 'hotel', 'particular'].includes(type)) {
        res.status(400).json({ message: 'Type must be restaurant, hotel, or particular' })
        return
      }

      const catererId = randomUUID()
      const result = await query(
        `INSERT INTO caterers (id, name, "contactNumber", email, type, "destinationId", note)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [catererId, name, contactNumber || null, email || null, type, destinationId || null, note || null]
      )
      res.status(201).json(result[0])
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Caterers API error:', error)
    res.status(500).json({ message: error.message || 'Internal server error' })
  }
}
