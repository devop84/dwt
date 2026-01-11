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

    if (!id) {
      if (req.method === 'GET') {
        const destinations = await query('SELECT * FROM destinations ORDER BY name ASC')
        res.status(200).json(destinations)
      } else if (req.method === 'POST') {
        const { name, coordinates, prefeitura, state, cep, description } = req.body
        if (!name) {
          res.status(400).json({ message: 'Name is required' })
          return
        }
        const destinationId = randomUUID()
        const result = await query(
          `INSERT INTO destinations (id, name, coordinates, prefeitura, state, cep, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [destinationId, name, coordinates || null, prefeitura || null, state || null, cep || null, description || null]
        )
        res.status(201).json(result[0])
      } else {
        res.status(405).json({ message: 'Method not allowed' })
      }
    } else {
      if (req.method === 'GET') {
        const destination = await queryOne('SELECT * FROM destinations WHERE id = $1', [id])
        if (!destination) {
          res.status(404).json({ message: 'Destination not found' })
          return
        }
        res.status(200).json(destination)
      } else if (req.method === 'PUT') {
        const { name, coordinates, prefeitura, state, cep, description } = req.body
        if (!name) {
          res.status(400).json({ message: 'Name is required' })
          return
        }
        const existing = await queryOne('SELECT id FROM destinations WHERE id = $1', [id])
        if (!existing) {
          res.status(404).json({ message: 'Destination not found' })
          return
        }
        const result = await query(
          `UPDATE destinations SET name = $1, coordinates = $2, prefeitura = $3, state = $4, cep = $5, description = $6, "updatedAt" = NOW()
           WHERE id = $7 RETURNING *`,
          [name, coordinates || null, prefeitura || null, state || null, cep || null, description || null, id]
        )
        res.status(200).json(result[0])
      } else if (req.method === 'DELETE') {
        const existing = await queryOne('SELECT id FROM destinations WHERE id = $1', [id])
        if (!existing) {
          res.status(404).json({ message: 'Destination not found' })
          return
        }
        await query('DELETE FROM destinations WHERE id = $1', [id])
        res.status(200).json({ message: 'Destination deleted successfully' })
      } else {
        res.status(405).json({ message: 'Method not allowed' })
      }
    }
  } catch (error: any) {
    console.error('Destinations API error:', error)
    res.status(500).json({ message: error.message || 'Failed to process request' })
  }
}
