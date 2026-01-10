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
      const { id } = req.query

      if (req.method === 'GET') {
        const hotel = await prisma.hotel.findUnique({
          where: { id: id as string },
        })

        if (!hotel) {
          res.status(404).json({ message: 'Hotel not found' })
          return
        }

        res.status(200).json(hotel)
        return
      }

      if (req.method === 'PUT') {
        const { name, address, description, phone, email, rating } = req.body

        const hotel = await prisma.hotel.update({
          where: { id: id as string },
          data: {
            ...(name && { name }),
            ...(address && { address }),
            ...(description !== undefined && { description }),
            ...(phone !== undefined && { phone }),
            ...(email !== undefined && { email }),
            ...(rating !== undefined && { rating: rating ? parseInt(rating) : null }),
          },
        })

        res.status(200).json(hotel)
        return
      }

      if (req.method === 'DELETE') {
        await prisma.hotel.delete({
          where: { id: id as string },
        })

        res.status(204).send(null)
        return
      }

      res.status(405).json({ message: 'Method not allowed' })
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'Hotel not found' })
        return
      }
      res.status(500).json({ message: error.message || 'Failed to process request' })
    }
  })
}