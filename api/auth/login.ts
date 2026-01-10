import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticateUser, generateToken } from '../lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { email, username, password } = req.body
    const emailOrUsername = email || username

    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: 'Email/Username and password are required' })
    }

    const user = await authenticateUser(emailOrUsername, password)
    const token = generateToken(user.id, user.email, user.role)

    const { password: _, ...userWithoutPassword } = user

    return res.status(200).json({
      token,
      user: userWithoutPassword,
    })
  } catch (error: any) {
    return res.status(401).json({ message: error.message || 'Authentication failed' })
  }
}