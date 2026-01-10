import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate, type AuthRequest } from '../lib/middleware'
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
        const spot = await prisma.spot.findUnique({
          where: { id: id as string },
        })

        if (!spot) {
          res.status(404).json({ message: 'Spot not found' })
          return
        }

        res.status(200).json(spot)
        return
      }

      if (req.method === 'PUT') {
        const { name, location, description, difficulty, conditions, latitude, longitude } =
          req.body

        const spot = await prisma.spot.update({
          where: { id: id as string },
          data: {
            ...(name && { name }),
            ...(location && { location }),
            ...(description !== undefined && { description }),
            ...(difficulty !== undefined && { difficulty }),
            ...(conditions !== undefined && { conditions }),
            ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
            ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
          },
        })

        res.status(200).json(spot)
        return
      }

      if (req.method === 'DELETE') {
        await prisma.spot.delete({
          where: { id: id as string },
        })

        res.status(204).send(null)
        return
      }

      res.status(405).json({ message: 'Method not allowed' })
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ message: 'Spot not found' })
        return
      }
      res.status(500).json({ message: error.message || 'Failed to process request' })
    }
  })
}
