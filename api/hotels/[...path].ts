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
    } else {
      if (req.method === 'GET') {
        const hotel = await queryOne(
          `SELECT h.*, d.name as "destinationName" FROM hotels h
           LEFT JOIN destinations d ON h."destinationId" = d.id WHERE h.id = $1`,
          [id]
        )
        if (!hotel) {
          res.status(404).json({ message: 'Hotel not found' })
          return
        }
        res.status(200).json(hotel)
      } else if (req.method === 'PUT') {
        const { name, rating, priceRange, destinationId, description, contactNumber, email, address, coordinates } = req.body
        if (!name || !destinationId) {
          res.status(400).json({ message: 'Name and destination are required' })
          return
        }
        const existing = await queryOne('SELECT id FROM hotels WHERE id = $1', [id])
        if (!existing) {
          res.status(404).json({ message: 'Hotel not found' })
          return
        }
        const result = await query(
          `UPDATE hotels SET name = $1, rating = $2, "priceRange" = $3, "destinationId" = $4, description = $5,
           "contactNumber" = $6, email = $7, address = $8, coordinates = $9, "updatedAt" = NOW()
           WHERE id = $10 RETURNING *`,
          [name, rating || null, priceRange || null, destinationId, description || null, contactNumber || null, email || null, address || null, coordinates || null, id]
        )
        res.status(200).json(result[0])
      } else if (req.method === 'DELETE') {
        const existing = await queryOne('SELECT id FROM hotels WHERE id = $1', [id])
        if (!existing) {
          res.status(404).json({ message: 'Hotel not found' })
          return
        }
        await query('DELETE FROM hotels WHERE id = $1', [id])
        res.status(200).json({ message: 'Hotel deleted successfully' })
      } else {
        res.status(405).json({ message: 'Method not allowed' })
      }
    }
  } catch (error: any) {
    console.error('Hotels API error:', error)
    res.status(500).json({ message: error.message || 'Failed to process request' })
  }
}
