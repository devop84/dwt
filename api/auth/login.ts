import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateUser, generateToken } from '../lib/auth'
import { initDb } from '../lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Initialize database on first request
  await initDb()
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  try {
    const { email, username, password } = req.body
    
    // Support both 'email' and 'username' field names
    const identifier = email || username

    if (!identifier || !password) {
      res.status(400).json({ message: 'Email/Username and password are required' })
      return
    }

    // authenticateUser now accepts identifier (email or username)
    const user = await authenticateUser(identifier, password)
    const token = generateToken(user.id, user.email)
    
    const { password: _, ...userWithoutPassword } = user

    res.status(200).json({
      token,
      user: userWithoutPassword,
    })
  } catch (error: any) {
    console.error('Login error:', error)
    const statusCode = error.message === 'Invalid credentials' ? 401 : 500
    res.status(statusCode).json({
      message: error.message || 'Authentication failed',
    })
  }
}
