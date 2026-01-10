import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate, requireRole, type AuthRequest } from '../lib/middleware'
import { prisma } from '../lib/db'
import { UserRole } from '@prisma/client'

export default async function handler(req: AuthRequest, res: VercelResponse): Promise<void> {
  await authenticate(req, res, async (req: AuthRequest, res: VercelResponse) => {
    if (!req.user || ![UserRole.ADMIN, UserRole.GUIDE].includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden' })
      return
    }

    try {
      if (req.method === 'GET') {
        const hotels = await prisma.hotel.findMany({
          orderBy: { name: 'asc' },
        })

        res.status(200).json(hotels)
        return
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

        res.status(201).json(hotel)
        return
      }

      res.status(405).json({ message: 'Method not allowed' })
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to process request' })
    }
  })
}