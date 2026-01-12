import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateUser, generateToken } from '../../lib/auth.js'
import { initDb } from '../../lib/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.status(200).end()
    return
  }

  console.log('🔐 Login route called:', { method: req.method, url: req.url })
  
  await initDb()

  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed', received: req.method, expected: 'POST' })
    return
  }

  const { email, username, password } = req.body
  const identifier = email || username

  if (!identifier || !password) {
    res.status(400).json({ message: 'Email/Username and password are required' })
    return
  }

  try {
    const user = await authenticateUser(identifier, password)
    const token = generateToken(user.id, user.email)
    
    const { password: _, ...userWithoutPassword } = user
    res.status(200).json({ token, user: userWithoutPassword })
  } catch (error: any) {
    console.error('Login error:', error)
    res.status(401).json({ message: error.message || 'Invalid credentials' })
  }
}
