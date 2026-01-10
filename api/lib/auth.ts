import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from './db'
import type { UserRole } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: string, email: string, role: UserRole): string {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { userId: string; email: string; role: UserRole } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: UserRole }
  } catch {
    return null
  }
}

export async function authenticateUser(emailOrUsername: string, password: string) {
  // Try to find user by email or username
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: emailOrUsername },
        { username: emailOrUsername }
      ]
    }
  })

  if (!user) {
    throw new Error('Invalid credentials')
  }

  const isValid = await verifyPassword(password, user.password)
  if (!isValid) {
    throw new Error('Invalid credentials')
  }

  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}