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

    if (req.method === 'GET') {
      const guides = await query(`
        SELECT 
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
        ORDER BY g.name ASC
      `)
      res.status(200).json(guides)
    } else if (req.method === 'POST') {
      const { name, contactNumber, email, destinationId, languages, note } = req.body

      if (!name) {
        res.status(400).json({ message: 'Name is required' })
        return
      }

      if (!destinationId) {
        res.status(400).json({ message: 'Destination is required' })
        return
      }

      const guideId = randomUUID()
      const result = await query(
        `INSERT INTO guides (id, name, "contactNumber", email, "destinationId", languages, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, "contactNumber", email, "destinationId", languages, note, "createdAt", "updatedAt"`,
        [guideId, name, contactNumber || null, email || null, destinationId, languages || null, note || null]
      )
      res.status(201).json(result[0])
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Guides API error:', error)
    res.status(500).json({ message: error.message || 'Failed to process request' })
  }
}
