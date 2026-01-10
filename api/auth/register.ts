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
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      res.status(400).json({ message: 'Email, password, and name are required' })
      return
    }

    // Check if user already exists
    const existingUser = await queryOne('SELECT * FROM users WHERE email = $1', [email])
    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists' })
      return
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const result = await query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, "createdAt", "updatedAt"',
      [email, hashedPassword, name]
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
