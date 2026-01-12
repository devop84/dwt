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

    const path = req.query.path as string[] | undefined
    const id = path && path.length > 0 ? path[0] : null

    if (!id) {
      if (req.method === 'GET') {
        const guides = await query(`
          SELECT g.*, d.name as "destinationName"
          FROM guides g
          LEFT JOIN destinations d ON g."destinationId" = d.id
          ORDER BY g.name ASC
        `)
        res.status(200).json(guides)
      } else if (req.method === 'POST') {
        const { name, contactNumber, email, destinationId, languages, note } = req.body
        if (!name || !destinationId) {
          res.status(400).json({ message: 'Name and destination are required' })
          return
        }
        const guideId = randomUUID()
        const result = await query(
          `INSERT INTO guides (id, name, "contactNumber", email, "destinationId", languages, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [guideId, name, contactNumber || null, email || null, destinationId, languages || null, note || null]
        )
        res.status(201).json(result[0])
      } else {
        res.status(405).json({ message: 'Method not allowed' })
      }
    } else {
      if (req.method === 'GET') {
        const guide = await queryOne(
          `SELECT g.*, d.name as "destinationName" FROM guides g
           LEFT JOIN destinations d ON g."destinationId" = d.id WHERE g.id = $1`,
          [id]
        )
        if (!guide) {
          res.status(404).json({ message: 'Guide not found' })
          return
        }
        res.status(200).json(guide)
      } else if (req.method === 'PUT') {
        const { name, contactNumber, email, destinationId, languages, note } = req.body
        if (!name || !destinationId) {
          res.status(400).json({ message: 'Name and destination are required' })
          return
        }
        const existing = await queryOne('SELECT id FROM guides WHERE id = $1', [id])
        if (!existing) {
          res.status(404).json({ message: 'Guide not found' })
          return
        }
        const result = await query(
          `UPDATE guides SET name = $1, "contactNumber" = $2, email = $3, "destinationId" = $4, languages = $5, note = $6, "updatedAt" = NOW()
           WHERE id = $7 RETURNING *`,
          [name, contactNumber || null, email || null, destinationId, languages || null, note || null, id]
        )
        res.status(200).json(result[0])
      } else if (req.method === 'DELETE') {
        const existing = await queryOne('SELECT id FROM guides WHERE id = $1', [id])
        if (!existing) {
          res.status(404).json({ message: 'Guide not found' })
          return
        }
        await query('DELETE FROM guides WHERE id = $1', [id])
        res.status(200).json({ message: 'Guide deleted successfully' })
      } else {
        res.status(405).json({ message: 'Method not allowed' })
      }
    }
  } catch (error: any) {
    console.error('Guides API error:', error)
    res.status(500).json({ message: error.message || 'Failed to process request' })
  }
}
