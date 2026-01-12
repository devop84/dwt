import type { VercelRequest, VercelResponse } from '@vercel/node'
import { query, queryOne, initDb } from '../lib/db.js'
import { verifyToken } from '../lib/auth.js'
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

    const path = req.query.path as string[] | undefined
    const id = path && path.length > 0 ? path[0] : null

    if (!id) {
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
    } else {
      // GET one caterer
      if (req.method === 'GET') {
        const result = await queryOne(
          `SELECT c.*, d.name as "destinationName"
           FROM caterers c
           LEFT JOIN destinations d ON c."destinationId" = d.id
           WHERE c.id = $1`,
          [id]
        )
        if (!result) {
          res.status(404).json({ message: 'Caterer not found' })
          return
        }
        res.json(result)
      } else if (req.method === 'PUT') {
        const { name, contactNumber, email, type, destinationId, note } = req.body

        if (!name || !type) {
          res.status(400).json({ message: 'Name and type are required' })
          return
        }

        if (!['restaurant', 'hotel', 'particular'].includes(type)) {
          res.status(400).json({ message: 'Type must be restaurant, hotel, or particular' })
          return
        }

        const result = await query(
          `UPDATE caterers 
           SET name = $1, "contactNumber" = $2, email = $3, type = $4, "destinationId" = $5, note = $6, "updatedAt" = NOW()
           WHERE id = $7 RETURNING *`,
          [name, contactNumber || null, email || null, type, destinationId || null, note || null, id]
        )
        res.status(200).json(result[0])
      } else if (req.method === 'DELETE') {
        await query('DELETE FROM caterers WHERE id = $1', [id])
        res.status(204).end()
      } else {
        res.status(405).json({ message: 'Method not allowed' })
      }
    }
  } catch (error: any) {
    console.error('Caterers API error:', error)
    res.status(500).json({ message: error.message || 'Internal server error' })
  }
}
