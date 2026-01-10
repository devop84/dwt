import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate, type AuthRequest } from '../lib/middleware'
import { prisma } from '../lib/db'

export default async function handler(req: AuthRequest, res: VercelResponse) {
  return authenticate(req, res, async () => {
    try {
      const { id } = req.query

      if (req.method === 'GET') {
        const downwinder = await prisma.downwinder.findUnique({
          where: { id: id as string },
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
        })

        if (!downwinder) {
          return res.status(404).json({ message: 'Downwinder not found' })
        }

        return res.status(200).json(downwinder)
      }

      if (req.method === 'PUT') {
        const { title, description, startDate, endDate, maxClients, status, hotelId } = req.body

        const downwinder = await prisma.downwinder.update({
          where: { id: id as string },
          data: {
            ...(title && { title }),
            ...(description !== undefined && { description }),
            ...(startDate && { startDate: new Date(startDate) }),
            ...(endDate && { endDate: new Date(endDate) }),
            ...(maxClients && { maxClients: parseInt(maxClients) }),
            ...(status && { status }),
            ...(hotelId !== undefined && { hotelId: hotelId || null }),
          },
          include: {
            createdBy: {
              select: { id: true, name: true, email: true, role: true },
            },
            hotel: true,
          },
        })

        return res.status(200).json(downwinder)
      }

      if (req.method === 'DELETE') {
        await prisma.downwinder.delete({
          where: { id: id as string },
        })

        return res.status(204).send(null)
      }

      return res.status(405).json({ message: 'Method not allowed' })
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Downwinder not found' })
      }
      return res.status(500).json({ message: error.message || 'Failed to process request' })
    }
  })
}