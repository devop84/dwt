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

    const { id } = req.query

    if (req.method === 'GET') {
      const guide = await queryOne(
        `SELECT 
          g.id,
          g.name,
          g."contactNumber",
          g.email,
          g."destinationId",
          g.languages,
          g.note,
          g."createdAt",
          g."updatedAt",
          d.name as "destinationName"
        FROM guides g
        LEFT JOIN destinations d ON g."destinationId" = d.id
        WHERE g.id = $1`,
        [id as string]
      )

      if (!guide) {
        res.status(404).json({ message: 'Guide not found' })
        return
      }

      res.status(200).json(guide)
    } else if (req.method === 'PUT') {
      const { name, contactNumber, email, destinationId, languages, note } = req.body

      if (!name) {
        res.status(400).json({ message: 'Name is required' })
        return
      }

      if (!destinationId) {
        res.status(400).json({ message: 'Destination is required' })
        return
      }

      const existing = await queryOne('SELECT id FROM guides WHERE id = $1', [id as string])
      if (!existing) {
        res.status(404).json({ message: 'Guide not found' })
        return
      }

      const result = await query(
        `UPDATE guides 
         SET name = $1, "contactNumber" = $2, email = $3, "destinationId" = $4, languages = $5, note = $6, "updatedAt" = NOW()
         WHERE id = $7
         RETURNING id, name, "contactNumber", email, "destinationId", languages, note, "createdAt", "updatedAt"`,
        [name, contactNumber || null, email || null, destinationId, languages || null, note || null, id as string]
      )

      res.status(200).json(result[0])
    } else if (req.method === 'DELETE') {
      const existing = await queryOne('SELECT id FROM guides WHERE id = $1', [id as string])
      if (!existing) {
        res.status(404).json({ message: 'Guide not found' })
        return
      }

      await query('DELETE FROM guides WHERE id = $1', [id as string])
      res.status(200).json({ message: 'Guide deleted successfully' })
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Guide API error:', error)
    res.status(500).json({ message: error.message || 'Failed to process request' })
  }
}
