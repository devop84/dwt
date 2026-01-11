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

    const path = req.query.path as string[]
    const id = path && path.length > 0 ? path[0] : null

    // Collection operations (GET all, POST)
    if (!id) {
      if (req.method === 'GET') {
        const clients = await query(`
          SELECT 
            id,
            name,
            "contactNumber",
            email,
            "dateOfBirth",
            nationality,
            note,
            "IDNumber",
            "createdAt",
            "updatedAt"
          FROM clients
          ORDER BY "createdAt" DESC
        `)
        res.status(200).json(clients)
      } else if (req.method === 'POST') {
        const { name, contactNumber, email, dateOfBirth, nationality, note, IDNumber } = req.body

        if (!name) {
          res.status(400).json({ message: 'Name is required' })
          return
        }

        const clientId = randomUUID()
        const result = await query(
          `INSERT INTO clients (id, name, "contactNumber", email, "dateOfBirth", nationality, note, "IDNumber")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, name, "contactNumber", email, "dateOfBirth", nationality, note, "IDNumber", "createdAt", "updatedAt"`,
          [clientId, name, contactNumber || null, email || null, dateOfBirth || null, nationality || null, note || null, IDNumber || null]
        )
        res.status(201).json(result[0])
      } else {
        res.status(405).json({ message: 'Method not allowed' })
      }
    } 
    // Single item operations (GET, PUT, DELETE)
    else {
      if (req.method === 'GET') {
        const client = await queryOne(
          `SELECT 
            id,
            name,
            "contactNumber",
            email,
            "dateOfBirth",
            nationality,
            note,
            "IDNumber",
            "createdAt",
            "updatedAt"
          FROM clients
          WHERE id = $1`,
          [id]
        )

        if (!client) {
          res.status(404).json({ message: 'Client not found' })
          return
        }

        res.status(200).json(client)
      } else if (req.method === 'PUT') {
        const { name, contactNumber, email, dateOfBirth, nationality, note, IDNumber } = req.body

        if (!name) {
          res.status(400).json({ message: 'Name is required' })
          return
        }

        const existing = await queryOne('SELECT id FROM clients WHERE id = $1', [id])
        if (!existing) {
          res.status(404).json({ message: 'Client not found' })
          return
        }

        const result = await query(
          `UPDATE clients 
           SET name = $1, "contactNumber" = $2, email = $3, "dateOfBirth" = $4, nationality = $5, note = $6, "IDNumber" = $7, "updatedAt" = NOW()
           WHERE id = $8
           RETURNING id, name, "contactNumber", email, "dateOfBirth", nationality, note, "IDNumber", "createdAt", "updatedAt"`,
          [name, contactNumber || null, email || null, dateOfBirth || null, nationality || null, note || null, IDNumber || null, id]
        )

        res.status(200).json(result[0])
      } else if (req.method === 'DELETE') {
        const existing = await queryOne('SELECT id FROM clients WHERE id = $1', [id])
        if (!existing) {
          res.status(404).json({ message: 'Client not found' })
          return
        }

        await query('DELETE FROM clients WHERE id = $1', [id])
        res.status(200).json({ message: 'Client deleted successfully' })
      } else {
        res.status(405).json({ message: 'Method not allowed' })
      }
    }
  } catch (error: any) {
    console.error('Clients API error:', error)
    res.status(500).json({ message: error.message || 'Failed to process request' })
  }
}
