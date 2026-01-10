import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate, type AuthRequest } from '../lib/middleware'
import { prisma } from '../lib/db'

export default async function handler(req: AuthRequest, res: VercelResponse) {
  return authenticate(req, res, async () => {
    try {
      if (req.method === 'GET') {
        const downwinders = await prisma.downwinder.findMany({
          include: {
            createdBy: {
              select: { id: true, name: true, email: true, role: true },
            },
            hotel: true,
            spots: {
              include: { spot: true },
            },
            bookings: {
              include: { client: { select: { id: true, name: true, email: true } } },
            },
            guides: {
              include: { guide: { select: { id: true, name: true, email: true } } },
            },
            logistics: true,
          },
          orderBy: { createdAt: 'desc' },
        })

        return res.status(200).json(downwinders)
      }

      if (req.method === 'POST') {
        if (!req.user) {
          return res.status(401).json({ message: 'Unauthorized' })
        }

        const { title, description, startDate, endDate, maxClients, status, hotelId } = req.body

        const downwinder = await prisma.downwinder.create({
          data: {
            title,
            description,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            maxClients: parseInt(maxClients) || 10,
            status: status || 'draft',
            createdById: req.user.id,
            hotelId: hotelId || null,
          },
          include: {
            createdBy: {
              select: { id: true, name: true, email: true, role: true },
            },
            hotel: true,
          },
        })

        return res.status(201).json(downwinder)
      }

      return res.status(405).json({ message: 'Method not allowed' })
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Failed to process request' })
    }
  })
}