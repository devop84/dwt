import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '../../lib/auth.js'
import { queryOne, initDb } from '../../lib/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.status(200).end()
    return
  }

  console.log('🔐 Me route called:', { method: req.method, url: req.url })
  
  await initDb()

  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

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

  try {
    const user = await queryOne(
      'SELECT id, email, username, name, "createdAt", "updatedAt" FROM users WHERE id = $1',
      [decoded.userId]
    )

    if (!user) {
      res.status(404).json({ message: 'User not found' })
      return
    }

    res.status(200).json(user)
  } catch (error: any) {
    console.error('Me route error:', error)
    res.status(500).json({ message: error.message || 'Internal server error' })
  }
}
