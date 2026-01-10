import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from './auth'
import { prisma } from './db'
import { UserRole } from '@prisma/client'

export interface AuthRequest extends VercelRequest {
  user?: {
    id: string
    email: string
    role: UserRole
  }
}

export async function authenticate(
  req: AuthRequest,
  res: VercelResponse,
  handler: (req: AuthRequest, res: VercelResponse) => Promise<void> | void
): Promise<void> {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      res.status(401).json({ message: 'Invalid token' })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    })

    if (!user) {
      res.status(401).json({ message: 'User not found' })
      return
    }

    req.user = user
    await handler(req, res)
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' })
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return async (req: AuthRequest, res: VercelResponse, handler: (req: AuthRequest, res: VercelResponse) => Promise<void> | void): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden' })
      return
    }

    await handler(req, res)
  }
}