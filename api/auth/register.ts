import type { VercelRequest, VercelResponse } from '@vercel/node'
import { hashPassword, generateToken } from '../lib/auth'
import { queryOne, query, initDb } from '../lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Initialize database on first request
  await initDb()
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  try {
    const { email, username, password, name } = req.body

    if (!email || !username || !password || !name) {
      res.status(400).json({ message: 'Email, username, password, and name are required' })
      return
    }

    // Check if email already exists
    const existingEmail = await queryOne('SELECT * FROM users WHERE email = $1', [email])
    if (existingEmail) {
      res.status(400).json({ message: 'User with this email already exists' })
      return
    }

    // Check if username already exists
    const existingUsername = await queryOne('SELECT * FROM users WHERE username = $1', [username])
    if (existingUsername) {
      res.status(400).json({ message: 'Username is already taken' })
      return
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Generate UUID (in Node.js)
    const { randomUUID } = await import('crypto')
    const userId = randomUUID()

    // Create user
    const result = await query(
      'INSERT INTO users (id, email, username, password, name) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username, name, "createdAt", "updatedAt"',
      [userId, email, username, hashedPassword, name]
    )
    const user = result[0]

    const token = generateToken(user.id, user.email)

    res.status(201).json({
      token,
      user,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Registration failed' })
  }
}
