import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '../lib/auth.js'
import { query, queryOne, initDb } from '../lib/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await initDb()

  try {
    // All routes require authentication
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

    const id = req.query.id as string

    if (req.method === 'GET') {
      const client = await queryOne('SELECT * FROM clients WHERE id = $1', [id])
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
        `UPDATE clients SET name = $1, "contactNumber" = $2, email = $3, "dateOfBirth" = $4, nationality = $5, note = $6, "IDNumber" = $7, "updatedAt" = NOW()
         WHERE id = $8 RETURNING *`,
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
  } catch (error: any) {
    console.error('Client API error:', error)
    res.status(500).json({ message: error.message || 'Internal server error' })
  }
}
