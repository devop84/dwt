import type { VercelResponse } from '@vercel/node'
import { verifyToken } from '../lib/auth'
import { query, initDb } from '../lib/db'

export default async function handler(req: any, res: VercelResponse): Promise<void> {
  // Initialize database on first request
  await initDb()
  
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

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

    // Fetch all clients
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
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch clients' })
  }
}
