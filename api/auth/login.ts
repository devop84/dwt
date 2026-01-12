import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateUser, generateToken } from '../lib/auth.js'
import { initDb } from '../lib/db.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  try {
    await initDb()
  } catch (dbError: any) {
    console.error('❌ Database initialization failed in login:', dbError)
    const errorMessage = dbError?.message || String(dbError)
    const isDbUrlMissing = errorMessage.includes('DATABASE_URL') || errorMessage.includes('not set')
    
    res.status(500).json({ 
      message: isDbUrlMissing 
        ? 'Database configuration error. Please check environment variables.'
        : 'Database connection failed',
      error: errorMessage.includes('DATABASE_URL') ? 'DATABASE_URL not configured' : undefined
    })
    return
  }

  try {
    const { email, username, password } = req.body
    const identifier = email || username

    if (!identifier || !password) {
      res.status(400).json({ message: 'Email/Username and password are required' })
      return
    }

    const user = await authenticateUser(identifier, password)
    const token = generateToken(user.id, user.email)
    
    const { password: _, ...userWithoutPassword } = user
    res.status(200).json({ token, user: userWithoutPassword })
  } catch (error: any) {
    console.error('Login error:', error)
    res.status(401).json({ message: error.message || 'Invalid credentials' })
  }
}
