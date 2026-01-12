import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '../lib/auth.js'
import { query, queryOne, initDb } from '../lib/db.js'
import { randomUUID } from 'crypto'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  console.log('✅ Drivers API route hit:', req.method, req.url)
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
      const result = await query(`
        SELECT d.*, dest.name as "destinationName"
        FROM drivers d
        LEFT JOIN destinations dest ON d."destinationId" = dest.id
        ORDER BY d.name
      `)
      res.status(200).json(result)
    } else if (req.method === 'POST') {
      const { name, contactNumber, email, destinationId, languages, vehicle, note } = req.body
      if (!name || !destinationId) {
        res.status(400).json({ message: 'Name and destination are required' })
        return
      }
      const driverId = randomUUID()
      const result = await query(
        `INSERT INTO drivers (id, name, "contactNumber", email, "destinationId", languages, vehicle, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [driverId, name, contactNumber || null, email || null, destinationId, languages || null, vehicle || null, note || null]
      )
      res.status(201).json(result[0])
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Drivers API error:', error)
    res.status(500).json({ message: error.message || 'Internal server error' })
  }
}
