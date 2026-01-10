import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate, requireRole, type AuthRequest } from '../lib/middleware'
import { prisma } from '../lib/db'
import { UserRole } from '@prisma/client'

export default async function handler(req: AuthRequest, res: VercelResponse) {
  return authenticate(req, res, async (req: AuthRequest, res: VercelResponse) => {
    if (!req.user || ![UserRole.ADMIN, UserRole.GUIDE].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    try {
      if (req.method === 'GET') {
        const clients = await prisma.user.findMany({
          where: {
            role: UserRole.CLIENT,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { name: 'asc' },
        })

        return res.status(200).json(clients)
      }

      return res.status(405).json({ message: 'Method not allowed' })
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Failed to process request' })
    }
  })
}