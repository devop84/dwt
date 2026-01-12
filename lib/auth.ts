import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { queryOne, query } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string }
  } catch {
    return null
  }
}

export async function authenticateUser(identifier: string, password: string) {
  // Find user by email or username - case-insensitive
  const trimmedIdentifier = identifier.trim()
  const user = await queryOne(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)', 
    [trimmedIdentifier]
  )

  if (!user) {
    console.log(`❌ Authenticate failed - user not found: "${trimmedIdentifier}"`)
    throw new Error('Invalid credentials')
  }

  console.log(`✅ User found: ${user.email} (username: ${user.username})`)

  const isValid = await verifyPassword(password, user.password)
  if (!isValid) {
    console.log(`❌ Authenticate failed - wrong password for: "${trimmedIdentifier}"`)
    throw new Error('Invalid credentials')
  }

  console.log(`✅ Password verified for: ${user.username}`)
  return user
}
