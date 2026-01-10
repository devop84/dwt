import type { VercelResponse } from '@vercel/node'
import { verifyToken } from '../lib/auth'
import { queryOne, initDb } from '../lib/db'

export default async function handler(req: any, res: VercelResponse): Promise<void> {
  // Initialize database on first request
  await initDb()
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

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

    const user = await queryOne(
      'SELECT id, email, name, "createdAt", "updatedAt" FROM users WHERE id = $1',
      [decoded.userId]
    )

    if (!user) {
      res.status(404).json({ message: 'User not found' })
      return
    }

    res.status(200).json(user)
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch user' })
  }
}
