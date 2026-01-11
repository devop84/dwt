import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '../lib/auth.js'
import { query, queryOne, initDb } from '../lib/db.js'
import { randomUUID } from 'crypto'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await initDb()
  
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

    const path = req.query.path as string[]
    if (!path || path.length === 0) {
      res.status(404).json({ message: 'Invalid route' })
      return
    }

    const entityType = path[0] // clients, destinations, hotels, guides
    const id = path.length > 1 ? path[1] : null

    // Route to appropriate handler based on entity type
    switch (entityType) {
      case 'clients':
        await handleClients(req, res, id)
        break
      case 'destinations':
        await handleDestinations(req, res, id)
        break
      case 'hotels':
        await handleHotels(req, res, id)
        break
      case 'guides':
        await handleGuides(req, res, id)
        break
      default:
        res.status(404).json({ message: 'Entity type not found' })
    }
  } catch (error: any) {
    console.error('Entities API error:', error)
    res.status(500).json({ message: error.message || 'Failed to process request' })
  }
}

// Clients handlers
async function handleClients(req: VercelRequest, res: VercelResponse, id: string | null) {
  if (!id) {
    if (req.method === 'GET') {
      const clients = await query(`
        SELECT 
          id, name, "contactNumber", email, "dateOfBirth", nationality, note, "IDNumber", "createdAt", "updatedAt"
        FROM clients
        ORDER BY "createdAt" DESC
      `)
      res.status(200).json(clients)
    } else if (req.method === 'POST') {
      const { name, contactNumber, email, dateOfBirth, nationality, note, IDNumber } = req.body
      if (!name) {
        res.status(400).json({ message: 'Name is required' })
        return
      }
      const clientId = randomUUID()
      const result = await query(
        `INSERT INTO clients (id, name, "contactNumber", email, "dateOfBirth", nationality, note, "IDNumber")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, name, "contactNumber", email, "dateOfBirth", nationality, note, "IDNumber", "createdAt", "updatedAt"`,
        [clientId, name, contactNumber || null, email || null, dateOfBirth || null, nationality || null, note || null, IDNumber || null]
      )
      res.status(201).json(result[0])
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  } else {
    if (req.method === 'GET') {
      const client = await queryOne('SELECT * FROM clients WHERE id = $1', [id])
      if (!client) {
        res.status(404).json({ message: 'Client not found' })
        return
      }
      res.status(200).json(client)
    } else if (req.method === 'PUT') {
      const { name, contactNumber, email, dateOfBirth, nationality, note, IDNumber } = req.body
      if (!name) {
        res.status(400).json({ message: 'Name is required' })
        return
      }
      const existing = await queryOne('SELECT id FROM clients WHERE id = $1', [id])
      if (!existing) {
        res.status(404).json({ message: 'Client not found' })
        return
      }
      const result = await query(
        `UPDATE clients SET name = $1, "contactNumber" = $2, email = $3, "dateOfBirth" = $4, nationality = $5, note = $6, "IDNumber" = $7, "updatedAt" = NOW()
         WHERE id = $8 RETURNING *`,
        [name, contactNumber || null, email || null, dateOfBirth || null, nationality || null, note || null, IDNumber || null, id]
      )
      res.status(200).json(result[0])
    } else if (req.method === 'DELETE') {
      const existing = await queryOne('SELECT id FROM clients WHERE id = $1', [id])
      if (!existing) {
        res.status(404).json({ message: 'Client not found' })
        return
      }
      await query('DELETE FROM clients WHERE id = $1', [id])
      res.status(200).json({ message: 'Client deleted successfully' })
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  }
}

// Destinations handlers
async function handleDestinations(req: VercelRequest, res: VercelResponse, id: string | null) {
  if (!id) {
    if (req.method === 'GET') {
      const destinations = await query('SELECT * FROM destinations ORDER BY name ASC')
      res.status(200).json(destinations)
    } else if (req.method === 'POST') {
      const { name, coordinates, prefeitura, state, cep, description } = req.body
      if (!name) {
        res.status(400).json({ message: 'Name is required' })
        return
      }
      const destinationId = randomUUID()
      const result = await query(
        `INSERT INTO destinations (id, name, coordinates, prefeitura, state, cep, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [destinationId, name, coordinates || null, prefeitura || null, state || null, cep || null, description || null]
      )
      res.status(201).json(result[0])
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  } else {
    if (req.method === 'GET') {
      const destination = await queryOne('SELECT * FROM destinations WHERE id = $1', [id])
      if (!destination) {
        res.status(404).json({ message: 'Destination not found' })
        return
      }
      res.status(200).json(destination)
    } else if (req.method === 'PUT') {
      const { name, coordinates, prefeitura, state, cep, description } = req.body
      if (!name) {
        res.status(400).json({ message: 'Name is required' })
        return
      }
      const existing = await queryOne('SELECT id FROM destinations WHERE id = $1', [id])
      if (!existing) {
        res.status(404).json({ message: 'Destination not found' })
        return
      }
      const result = await query(
        `UPDATE destinations SET name = $1, coordinates = $2, prefeitura = $3, state = $4, cep = $5, description = $6, "updatedAt" = NOW()
         WHERE id = $7 RETURNING *`,
        [name, coordinates || null, prefeitura || null, state || null, cep || null, description || null, id]
      )
      res.status(200).json(result[0])
    } else if (req.method === 'DELETE') {
      const existing = await queryOne('SELECT id FROM destinations WHERE id = $1', [id])
      if (!existing) {
        res.status(404).json({ message: 'Destination not found' })
        return
      }
      await query('DELETE FROM destinations WHERE id = $1', [id])
      res.status(200).json({ message: 'Destination deleted successfully' })
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  }
}

// Hotels handlers
async function handleHotels(req: VercelRequest, res: VercelResponse, id: string | null) {
  if (!id) {
    if (req.method === 'GET') {
      const hotels = await query(`
        SELECT h.*, d.name as "destinationName"
        FROM hotels h
        LEFT JOIN destinations d ON h."destinationId" = d.id
        ORDER BY h.name ASC
      `)
      res.status(200).json(hotels)
    } else if (req.method === 'POST') {
      const { name, rating, priceRange, destinationId, description, contactNumber, email, address, coordinates } = req.body
      if (!name || !destinationId) {
        res.status(400).json({ message: 'Name and destination are required' })
        return
      }
      const hotelId = randomUUID()
      const result = await query(
        `INSERT INTO hotels (id, name, rating, "priceRange", "destinationId", description, "contactNumber", email, address, coordinates)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [hotelId, name, rating || null, priceRange || null, destinationId, description || null, contactNumber || null, email || null, address || null, coordinates || null]
      )
      res.status(201).json(result[0])
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  } else {
    if (req.method === 'GET') {
      const hotel = await queryOne(
        `SELECT h.*, d.name as "destinationName" FROM hotels h
         LEFT JOIN destinations d ON h."destinationId" = d.id WHERE h.id = $1`,
        [id]
      )
      if (!hotel) {
        res.status(404).json({ message: 'Hotel not found' })
        return
      }
      res.status(200).json(hotel)
    } else if (req.method === 'PUT') {
      const { name, rating, priceRange, destinationId, description, contactNumber, email, address, coordinates } = req.body
      if (!name || !destinationId) {
        res.status(400).json({ message: 'Name and destination are required' })
        return
      }
      const existing = await queryOne('SELECT id FROM hotels WHERE id = $1', [id])
      if (!existing) {
        res.status(404).json({ message: 'Hotel not found' })
        return
      }
      const result = await query(
        `UPDATE hotels SET name = $1, rating = $2, "priceRange" = $3, "destinationId" = $4, description = $5,
         "contactNumber" = $6, email = $7, address = $8, coordinates = $9, "updatedAt" = NOW()
         WHERE id = $10 RETURNING *`,
        [name, rating || null, priceRange || null, destinationId, description || null, contactNumber || null, email || null, address || null, coordinates || null, id]
      )
      res.status(200).json(result[0])
    } else if (req.method === 'DELETE') {
      const existing = await queryOne('SELECT id FROM hotels WHERE id = $1', [id])
      if (!existing) {
        res.status(404).json({ message: 'Hotel not found' })
        return
      }
      await query('DELETE FROM hotels WHERE id = $1', [id])
      res.status(200).json({ message: 'Hotel deleted successfully' })
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  }
}

// Guides handlers
async function handleGuides(req: VercelRequest, res: VercelResponse, id: string | null) {
  if (!id) {
    if (req.method === 'GET') {
      const guides = await query(`
        SELECT g.*, d.name as "destinationName"
        FROM guides g
        LEFT JOIN destinations d ON g."destinationId" = d.id
        ORDER BY g.name ASC
      `)
      res.status(200).json(guides)
    } else if (req.method === 'POST') {
      const { name, contactNumber, email, destinationId, languages, note } = req.body
      if (!name || !destinationId) {
        res.status(400).json({ message: 'Name and destination are required' })
        return
      }
      const guideId = randomUUID()
      const result = await query(
        `INSERT INTO guides (id, name, "contactNumber", email, "destinationId", languages, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [guideId, name, contactNumber || null, email || null, destinationId, languages || null, note || null]
      )
      res.status(201).json(result[0])
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  } else {
    if (req.method === 'GET') {
      const guide = await queryOne(
        `SELECT g.*, d.name as "destinationName" FROM guides g
         LEFT JOIN destinations d ON g."destinationId" = d.id WHERE g.id = $1`,
        [id]
      )
      if (!guide) {
        res.status(404).json({ message: 'Guide not found' })
        return
      }
      res.status(200).json(guide)
    } else if (req.method === 'PUT') {
      const { name, contactNumber, email, destinationId, languages, note } = req.body
      if (!name || !destinationId) {
        res.status(400).json({ message: 'Name and destination are required' })
        return
      }
      const existing = await queryOne('SELECT id FROM guides WHERE id = $1', [id])
      if (!existing) {
        res.status(404).json({ message: 'Guide not found' })
        return
      }
      const result = await query(
        `UPDATE guides SET name = $1, "contactNumber" = $2, email = $3, "destinationId" = $4, languages = $5, note = $6, "updatedAt" = NOW()
         WHERE id = $7 RETURNING *`,
        [name, contactNumber || null, email || null, destinationId, languages || null, note || null, id]
      )
      res.status(200).json(result[0])
    } else if (req.method === 'DELETE') {
      const existing = await queryOne('SELECT id FROM guides WHERE id = $1', [id])
      if (!existing) {
        res.status(404).json({ message: 'Guide not found' })
        return
      }
      await query('DELETE FROM guides WHERE id = $1', [id])
      res.status(200).json({ message: 'Guide deleted successfully' })
    } else {
      res.status(405).json({ message: 'Method not allowed' })
    }
  }
}
