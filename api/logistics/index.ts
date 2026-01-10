import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate, requireRole, type AuthRequest } from '../lib/middleware'
import { prisma } from '../lib/db'
import { UserRole, LogisticsType } from '@prisma/client'

export default async function handler(req: AuthRequest, res: VercelResponse) {
  return authenticate(req, res, async (req: AuthRequest, res: VercelResponse) => {
    if (!req.user || ![UserRole.ADMIN, UserRole.GUIDE].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    try {
      if (req.method === 'GET') {
        const { downwinderId } = req.query

        const logistics = await prisma.logistics.findMany({
          where: downwinderId ? { downwinderId: downwinderId as string } : undefined,
          orderBy: { createdAt: 'desc' },
        })

        return res.status(200).json(logistics)
      }

      if (req.method === 'POST') {
        const {
          downwinderId,
          type,
          name,
          description,
          quantity,
          cost,
          provider,
          contactInfo,
          status,
          startDate,
          endDate,
          notes,
        } = req.body

        if (!downwinderId || !type || !name) {
          return res.status(400).json({ message: 'Downwinder ID, type, and name are required' })
        }

        const logistics = await prisma.logistics.create({
          data: {
            downwinderId,
            type: type as LogisticsType,
            name,
            description,
            quantity: quantity ? parseInt(quantity) : 1,
            cost: cost ? parseFloat(cost) : null,
            provider,
            contactInfo,
            status: status || 'pending',
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            notes,
          },
        })

        return res.status(201).json(logistics)
      }

      return res.status(405).json({ message: 'Method not allowed' })
    } catch (error: any) {
      return res.status(500).json({ message: error.message || 'Failed to process request' })
    }
  })
}