import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  console.log('✅ Test route called:', { method: req.method, url: req.url })
  res.status(200).json({ message: 'Test route works!', method: req.method, url: req.url })
}
