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
      const hotels = await query(`
        SELECT h.*, d.name as "destinationName"
        FROM hotels h
        LEFT JOIN destinations d ON h."destinationId" = d.id
        ORDER BY h.name ASC
      `)
      res.status(200).json(hotels)
    } else if (req.method === 'POST') {
      const { name, rating, priceRange, destinationId, description, contactNumber, email, address, coordinates } = req.body
      if (!name || !destinationId) {
        res.status(400).json({ message: 'Name and destination are required' })
        return
      }
      const hotelId = randomUUID()
      const result = await query(
        `INSERT INTO hotels (id, name, rating, "priceRange", "destinationId", description, "contactNumber", email, address, coordinates)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [hotelId, name, rating || null, priceRange || null, destinationId, description || null, contactNumber || null, email || null, address || null, coordinates || null]
      )
      res.status(201).json(result[0])
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Hotels API error:', error)
    res.status(500).json({ message: error.message || 'Failed to process request' })
  }
}
