import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '../lib/auth.js'
import { query, queryOne, initDb } from '../lib/db.js'
import { randomUUID } from 'crypto'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  console.log('✅ Clients API route hit:', req.method, req.url)
  await initDb()

  try {
    // All routes require authentication
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No auth header')
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      console.log('❌ Invalid token')
      res.status(401).json({ message: 'Invalid token' })
      return
    }

    if (req.method === 'GET') {
      console.log('📋 Fetching clients from database...')
      const clients = await query(`
        SELECT id, name, "contactNumber", email, "dateOfBirth", nationality, note, "IDNumber", "createdAt", "updatedAt"
        FROM clients
        ORDER BY "createdAt" DESC
      `)
      console.log(`✅ Found ${clients.length} clients`)
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
  } catch (error: any) {
    console.error('Clients API error:', error)
    res.status(500).json({ message: error.message || 'Internal server error' })
  }
}
