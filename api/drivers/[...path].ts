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
        const drivers = await query(`
          SELECT d.*, dest.name as "destinationName"
          FROM drivers d
          LEFT JOIN destinations dest ON d."destinationId" = dest.id
          ORDER BY d.name ASC
        `)
        res.status(200).json(drivers)
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
    } else {
      if (req.method === 'GET') {
        const driver = await queryOne(
          `SELECT d.*, dest.name as "destinationName" FROM drivers d
           LEFT JOIN destinations dest ON d."destinationId" = dest.id WHERE d.id = $1`,
          [id]
        )
        if (!driver) {
          res.status(404).json({ message: 'Driver not found' })
          return
        }
        res.status(200).json(driver)
      } else if (req.method === 'PUT') {
        const { name, contactNumber, email, destinationId, languages, vehicle, note } = req.body
        if (!name || !destinationId) {
          res.status(400).json({ message: 'Name and destination are required' })
          return
        }
        const existing = await queryOne('SELECT id FROM drivers WHERE id = $1', [id])
        if (!existing) {
          res.status(404).json({ message: 'Driver not found' })
          return
        }
        const result = await query(
          `UPDATE drivers SET name = $1, "contactNumber" = $2, email = $3, "destinationId" = $4, languages = $5, vehicle = $6, note = $7, "updatedAt" = NOW()
           WHERE id = $8 RETURNING *`,
          [name, contactNumber || null, email || null, destinationId, languages || null, vehicle || null, note || null, id]
        )
        res.status(200).json(result[0])
      } else if (req.method === 'DELETE') {
        const existing = await queryOne('SELECT id FROM drivers WHERE id = $1', [id])
        if (!existing) {
          res.status(404).json({ message: 'Driver not found' })
          return
        }
        await query('DELETE FROM drivers WHERE id = $1', [id])
        res.status(200).json({ message: 'Driver deleted successfully' })
      } else {
        res.status(405).json({ message: 'Method not allowed' })
      }
    }
  } catch (error: any) {
    console.error('Drivers API error:', error)
    res.status(500).json({ message: error.message || 'Failed to process request' })
  }
}
