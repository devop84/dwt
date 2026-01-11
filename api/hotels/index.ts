import { VercelRequest, VercelResponse } from '@vercel/node'
import { initDb, query } from '../lib/db.js'
import { randomUUID } from 'crypto'
import { verifyToken } from '../lib/auth.js'

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
      // Fetch all hotels with destination name
      const hotels = await query(`
        SELECT 
          h.id,
          h.name,
          h.rating,
          h."priceRange",
          h."destinationId",
          h.note,
          h."contactNumber",
          h.email,
          h.address,
          h.coordinates,
          h."createdAt",
          h."updatedAt",
          d.name as "destinationName"
        FROM hotels h
        LEFT JOIN destinations d ON h."destinationId" = d.id
        ORDER BY h.name ASC
      `)
      res.status(200).json(hotels)
    } else if (req.method === 'POST') {
      // Create a new hotel
      const { name, rating, priceRange, destinationId, note, contactNumber, email, address, coordinates } = req.body

      if (!name) {
        res.status(400).json({ message: 'Name is required' })
        return
      }

      if (!destinationId) {
        res.status(400).json({ message: 'Destination is required' })
        return
      }

      const hotelId = randomUUID()
      const result = await query(
        `INSERT INTO hotels (id, name, rating, "priceRange", "destinationId", note, "contactNumber", email, address, coordinates)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, name, rating, "priceRange", "destinationId", note, "contactNumber", email, address, coordinates, "createdAt", "updatedAt"`,
        [hotelId, name, rating || null, priceRange || null, destinationId, note || null, contactNumber || null, email || null, address || null, coordinates || null]
      )
      res.status(201).json(result[0])
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Hotels error:', error)
    res.status(500).json({ message: error.message || 'Failed to process request' })
  }
}
