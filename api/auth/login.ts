import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateUser, generateToken } from '../lib/auth.js'
import { initDb } from '../lib/db.js'

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
    const errorMessage = error?.message || String(error)
    const statusCode = errorMessage === 'Invalid credentials' ? 401 : 500
    
    // Provide more helpful error messages without exposing sensitive details
    let userMessage = errorMessage
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      userMessage = 'Database connection error. Please check server configuration.'
    } else if (errorMessage.includes('timeout')) {
      userMessage = 'Database connection timeout. Please try again.'
    } else if (errorMessage === 'Invalid credentials') {
      userMessage = 'Invalid email/username or password'
    }
    
    res.status(statusCode).json({
      message: userMessage || 'Authentication failed',
      code: error?.code || undefined // Include error code for debugging
    })
  }
}
