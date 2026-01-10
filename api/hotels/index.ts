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
        const hotels = await prisma.hotel.findMany({
          orderBy: { name: 'asc' },
        })

        return res.status(200).json(hotels)
      }

      if (req.method === 'POST') {
        const { name, address, description, phone, email, rating } = req.body

        const hotel = await prisma.hotel.create({
          data: {
            name,
            address,
            description,
            phone,
            email,
            rating: rating ? parseInt(rating) : null,
          },
        })

        return res.status(201).json(hotel)
      }

      return res.status(405).json({ message: 'Method not allowed' })
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Failed to process request' })
    }
  })
}