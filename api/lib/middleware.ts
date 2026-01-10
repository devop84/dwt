import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from './auth'
import { prisma } from './db'
import type { UserRole } from '@prisma/client'

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
) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    })

    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    req.user = user
    await handler(req, res)
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: VercelResponse, handler: (req: AuthRequest, res: VercelResponse) => Promise<void> | void) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    handler(req, res)
  }
}