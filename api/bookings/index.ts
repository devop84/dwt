import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate, type AuthRequest } from '../lib/middleware'
import { prisma } from '../lib/db'
import { UserRole } from '@prisma/client'

export default async function handler(req: AuthRequest, res: VercelResponse): Promise<void> {
  await authenticate(req, res, async (req: AuthRequest, res: VercelResponse) => {
    try {
        if (req.method === 'GET') {
        if (!req.user) {
          res.status(401).json({ message: 'Unauthorized' })
          return
        }

        let bookings

        if (req.user.role === UserRole.CLIENT) {
          // Clients only see their own bookings
          bookings = await prisma.booking.findMany({
            where: { clientId: req.user.id },
            include: {
              downwinder: {
                include: {
                  hotel: true,
                  spots: { include: { spot: true } },
                },
              },
              client: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          })
        } else {
          // Admins and guides see all bookings
          bookings = await prisma.booking.findMany({
            include: {
              downwinder: {
                include: {
                  hotel: true,
                  spots: { include: { spot: true } },
                },
              },
              client: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          })
        }

        res.status(200).json(bookings)
        return
      }

      if (req.method === 'POST') {
        if (!req.user) {
          res.status(401).json({ message: 'Unauthorized' })
          return
        }

        const { downwinderId, status, notes } = req.body
        const clientId = req.user.role === UserRole.CLIENT ? req.user.id : req.body.clientId

        if (!downwinderId || !clientId) {
          res.status(400).json({ message: 'Downwinder ID and client ID are required' })
          return
        }

        const booking = await prisma.booking.create({
          data: {
            downwinderId,
            clientId,
            status: status || 'pending',
            notes,
          },
          include: {
            downwinder: true,
            client: {
              select: { id: true, name: true, email: true },
            },
          },
        })

        res.status(201).json(booking)
        return
      }

      res.status(405).json({ message: 'Method not allowed' })
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to process request' })
    }
  })
}