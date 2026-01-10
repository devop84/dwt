import type { VercelResponse } from '@vercel/node'
import { authenticate, type AuthRequest } from '../lib/middleware'
import { prisma } from '../lib/db'

export default async function handler(req: AuthRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  return authenticate(req, res, async (req: AuthRequest, res: VercelResponse) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' })
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      if (!user) {
        return res.status(404).json({ message: 'User not found' })
      }

      return res.status(200).json(user)
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Failed to fetch user' })
    }
  })
}