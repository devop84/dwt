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
      const destination = await queryOne(
        `SELECT 
          id,
          name,
          coordinates,
          prefeitura,
          state,
          cep,
          description,
          "createdAt",
          "updatedAt"
        FROM destinations
        WHERE id = $1`,
        [id as string]
      )

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

      const existing = await queryOne('SELECT id FROM destinations WHERE id = $1', [id as string])
      if (!existing) {
        res.status(404).json({ message: 'Destination not found' })
        return
      }

      const result = await query(
        `UPDATE destinations 
         SET name = $1, coordinates = $2, prefeitura = $3, state = $4, cep = $5, description = $6, "updatedAt" = NOW()
         WHERE id = $7
         RETURNING id, name, coordinates, prefeitura, state, cep, description, "createdAt", "updatedAt"`,
        [name, coordinates || null, prefeitura || null, state || null, cep || null, description || null, id as string]
      )

      res.status(200).json(result[0])
    } else if (req.method === 'DELETE') {
      const existing = await queryOne('SELECT id FROM destinations WHERE id = $1', [id as string])
      if (!existing) {
        res.status(404).json({ message: 'Destination not found' })
        return
      }

      await query('DELETE FROM destinations WHERE id = $1', [id as string])
      res.status(200).json({ message: 'Destination deleted successfully' })
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Destination API error:', error)
    res.status(500).json({ message: error.message || 'Failed to process request' })
  }
}
