import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateUser, generateToken } from '../lib/auth'
import { initDb } from '../lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  try {
    // Initialize database on first request
    await initDb()
  } catch (dbError: any) {
    console.error('❌ Database initialization failed in login:', dbError)
    res.status(500).json({ 
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
    })
    return
  }

  try {
    const { email, username, password } = req.body
    
    // Support both 'email' and 'username' field names from frontend
    const identifier = email || username

    console.log('Login attempt (Vercel):', { 
      email: email?.substring(0, 10), 
      username: username?.substring(0, 10), 
      identifier: identifier?.substring(0, 10), 
      hasPassword: !!password 
    })

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
