import type { VercelRequest, VercelResponse } from '@vercel/node'
import { hashPassword, generateToken } from '../lib/auth'
import { prisma } from '../lib/db'
import type { UserRole } from '@prisma/client'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { email, password, name, role = 'CLIENT' } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user (default role is CLIENT, only admins can create other roles)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role as UserRole,
      },
    })

    const token = generateToken(user.id, user.email, user.role)
    const { password: _, ...userWithoutPassword } = user

    return res.status(201).json({
      token,
      user: userWithoutPassword,
    })
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Registration failed' })
  }
}