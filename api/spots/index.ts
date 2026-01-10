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
        const spots = await prisma.spot.findMany({
          orderBy: { name: 'asc' },
        })

        res.status(200).json(spots)
        return
      }

      if (req.method === 'POST') {
        const { name, location, description, difficulty, conditions, latitude, longitude } =
          req.body

        const spot = await prisma.spot.create({
          data: {
            name,
            location,
            description,
            difficulty,
            conditions,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
          },
        })

        res.status(201).json(spot)
        return
      }

      res.status(405).json({ message: 'Method not allowed' })
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to process request' })
    }
  })
}