import type { VercelRequest, VercelResponse } from '@vercel/node'
import { hashPassword, generateToken } from '../lib/auth'
import { prisma } from '../lib/db'
import { UserRole } from '@prisma/client'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  try {
    const { email, username, password, name, role = 'CLIENT' } = req.body

    if (!email || !password || !name) {
      res.status(400).json({ message: 'Email, password, and name are required' })
      return
    }

    // Check if user already exists by email
    const existingUserByEmail = await prisma.user.findUnique({ where: { email } })
    if (existingUserByEmail) {
      res.status(400).json({ message: 'User with this email already exists' })
      return
    }

    // Check if username is taken (if provided)
    if (username) {
      const existingUserByUsername = await prisma.user.findUnique({ where: { username } })
      if (existingUserByUsername) {
        res.status(400).json({ message: 'Username is already taken' })
        return
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user (default role is CLIENT, only admins can create other roles)
    const user = await prisma.user.create({
      data: {
        email,
        username: username || null,
        password: hashedPassword,
        name,
        role: role as UserRole,
      },
    })

    const token = generateToken(user.id, user.email, user.role)
    const { password: _, ...userWithoutPassword } = user

    res.status(201).json({
      token,
      user: userWithoutPassword,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Registration failed' })
  }
}