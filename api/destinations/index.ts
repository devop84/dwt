import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '../lib/auth'
import { query, initDb } from '../lib/db'
import { randomUUID } from 'crypto'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Initialize database on first request
  await initDb()
  
  try {
    // Verify authentication
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
      // Fetch all destinations
      const destinations = await query(`
        SELECT 
          id,
          name,
          coordinates,
          prefeitura,
          state,
          cep,
          note,
          "createdAt",
          "updatedAt"
        FROM destinations
        ORDER BY name ASC
      `)

      res.status(200).json(destinations)
    } else if (req.method === 'POST') {
      // Create a new destination
      const { name, coordinates, prefeitura, state, cep, note } = req.body

      if (!name) {
        res.status(400).json({ message: 'Name is required' })
        return
      }

      const destinationId = randomUUID()
      const result = await query(
        `INSERT INTO destinations (id, name, coordinates, prefeitura, state, cep, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, coordinates, prefeitura, state, cep, note, "createdAt", "updatedAt"`,
        [destinationId, name, coordinates || null, prefeitura || null, state || null, cep || null, note || null]
      )

      res.status(201).json(result[0])
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Destinations API error:', error)
    res.status(500).json({ message: error.message || 'Failed to process request' })
  }
}
