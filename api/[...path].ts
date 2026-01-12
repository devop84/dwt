import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from './lib/auth.js'
import { query, queryOne, initDb } from './lib/db.js'
import { randomUUID } from 'crypto'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await initDb()

  try {
    // Parse path from query parameter (Vercel catch-all routes)
    // For api/[...path].ts, Vercel puts path segments in req.query.path
    // It can be an array like ["auth", "login"] or a string like "auth/login" or "auth"
    const path = req.query.path as string[] | string | undefined
    let pathArray: string[] = []
    
    if (Array.isArray(path)) {
      // Already an array: ["auth", "login"]
      pathArray = path.filter(Boolean)
    } else if (typeof path === 'string') {
      // String might be "auth/login" or just "auth"
      pathArray = path.split('/').filter(Boolean)
    } else if (path) {
      pathArray = String(path).split('/').filter(Boolean)
    }
    
    // Fallback: parse from URL if path is not in query or empty
    if (pathArray.length === 0) {
      // Try to get from URL directly
      const url = req.url || ''
      const urlPath = url.split('?')[0] // Remove query string
      const match = urlPath.match(/^\/api\/(.+)$/)
      if (match) {
        pathArray = match[1].split('/').filter(Boolean)
      }
    }
    
    // Debug logging
    console.log('API Route Debug:', { 
      url: req.url, 
      queryPath: req.query.path,
      allQuery: req.query,
      pathArray, 
      method: req.method,
      headers: { host: req.headers.host }
    })
    
    const route = pathArray.length > 0 ? pathArray[0] : null
    const id = pathArray.length > 1 ? pathArray[1] : null
    
    // Health check endpoint
    if (route === 'health' || (pathArray.length === 0 && req.url?.includes('health'))) {
      res.status(200).json({ status: 'ok', message: 'API handler is working', pathArray, query: req.query })
      return
    }
    
    // If no route found, return 404 early with debug info
    if (!route) {
      console.log('No route found, returning 404')
      res.status(404).json({ 
        message: 'API route not found', 
        debug: { 
          pathArray, 
          queryPath: req.query.path, 
          url: req.url,
          allQuery: req.query,
          method: req.method
        } 
      })
      return
    }

    // Auth routes (no auth required)
    if (route === 'auth') {
      const authAction = pathArray.length > 1 ? pathArray[1] : null
      
      console.log('Auth route detected:', { route, authAction, pathArray, fullPath: req.query.path })
      
      if (authAction === 'login') {
        if (req.method !== 'POST') {
          res.status(405).json({ message: 'Method not allowed' })
          return
        }
        
        const { email, username, password } = req.body
        const identifier = email || username

        if (!identifier || !password) {
          res.status(400).json({ message: 'Email/Username and password are required' })
          return
        }

        // Import auth functions dynamically
        const { authenticateUser, generateToken } = await import('./lib/auth.js')
        const user = await authenticateUser(identifier, password)
        const token = generateToken(user.id, user.email)
        
        const { password: _, ...userWithoutPassword } = user
        res.status(200).json({ token, user: userWithoutPassword })
        return
      }

      if (authAction === 'register') {
        if (req.method !== 'POST') {
          res.status(405).json({ message: 'Method not allowed' })
          return
        }

        const { email, username, password, name } = req.body

        if (!email || !username || !password || !name) {
          res.status(400).json({ message: 'Email, username, password, and name are required' })
          return
        }

        // Check if email already exists
        const existingEmail = await queryOne('SELECT * FROM users WHERE email = $1', [email])
        if (existingEmail) {
          res.status(400).json({ message: 'User with this email already exists' })
          return
        }

        // Check if username already exists
        const existingUsername = await queryOne('SELECT * FROM users WHERE username = $1', [username])
        if (existingUsername) {
          res.status(400).json({ message: 'Username is already taken' })
          return
        }

        // Hash password
        const { hashPassword, generateToken } = await import('./lib/auth.js')
        const hashedPassword = await hashPassword(password)

        // Generate UUID
        const userId = randomUUID()

        // Create user
        const result = await query(
          'INSERT INTO users (id, email, username, password, name) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username, name, "createdAt", "updatedAt"',
          [userId, email, username, hashedPassword, name]
        )
        const user = result[0]

        const token = generateToken(user.id, user.email)
        res.status(201).json({ token, user })
        return
      }

      if (authAction === 'me') {
        if (req.method !== 'GET') {
          res.status(405).json({ message: 'Method not allowed' })
          return
        }

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

        const user = await queryOne(
          'SELECT id, email, username, name, "createdAt", "updatedAt" FROM users WHERE id = $1',
          [decoded.userId]
        )

        if (!user) {
          res.status(404).json({ message: 'User not found' })
          return
        }

        res.status(200).json(user)
        return
      }

      res.status(404).json({ message: 'Auth route not found' })
      return
    }

    // All other routes require authentication
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

    // Clients
    if (route === 'clients') {
      if (!id) {
        if (req.method === 'GET') {
          const clients = await query(`
            SELECT id, name, "contactNumber", email, "dateOfBirth", nationality, note, "IDNumber", "createdAt", "updatedAt"
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
      return
    }

    // Hotels
    if (route === 'hotels') {
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
      return
    }

    // Destinations
    if (route === 'destinations') {
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
      return
    }

    // Guides
    if (route === 'guides') {
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
      return
    }

    // Drivers
    if (route === 'drivers') {
      if (!id) {
        if (req.method === 'GET') {
          const drivers = await query(`
            SELECT d.*, dest.name as "destinationName"
            FROM drivers d
            LEFT JOIN destinations dest ON d."destinationId" = dest.id
            ORDER BY d.name ASC
          `)
          res.status(200).json(drivers)
        } else if (req.method === 'POST') {
          const { name, contactNumber, email, destinationId, languages, vehicle, note } = req.body
          if (!name || !destinationId) {
            res.status(400).json({ message: 'Name and destination are required' })
            return
          }
          const driverId = randomUUID()
          const result = await query(
            `INSERT INTO drivers (id, name, "contactNumber", email, "destinationId", languages, vehicle, note)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [driverId, name, contactNumber || null, email || null, destinationId, languages || null, vehicle || null, note || null]
          )
          res.status(201).json(result[0])
        } else {
          res.status(405).json({ message: 'Method not allowed' })
        }
      } else {
        if (req.method === 'GET') {
          const driver = await queryOne(
            `SELECT d.*, dest.name as "destinationName" FROM drivers d
             LEFT JOIN destinations dest ON d."destinationId" = dest.id WHERE d.id = $1`,
            [id]
          )
          if (!driver) {
            res.status(404).json({ message: 'Driver not found' })
            return
          }
          res.status(200).json(driver)
        } else if (req.method === 'PUT') {
          const { name, contactNumber, email, destinationId, languages, vehicle, note } = req.body
          if (!name || !destinationId) {
            res.status(400).json({ message: 'Name and destination are required' })
            return
          }
          const existing = await queryOne('SELECT id FROM drivers WHERE id = $1', [id])
          if (!existing) {
            res.status(404).json({ message: 'Driver not found' })
            return
          }
          const result = await query(
            `UPDATE drivers SET name = $1, "contactNumber" = $2, email = $3, "destinationId" = $4, languages = $5, vehicle = $6, note = $7, "updatedAt" = NOW()
             WHERE id = $8 RETURNING *`,
            [name, contactNumber || null, email || null, destinationId, languages || null, vehicle || null, note || null, id]
          )
          res.status(200).json(result[0])
        } else if (req.method === 'DELETE') {
          const existing = await queryOne('SELECT id FROM drivers WHERE id = $1', [id])
          if (!existing) {
            res.status(404).json({ message: 'Driver not found' })
            return
          }
          await query('DELETE FROM drivers WHERE id = $1', [id])
          res.status(200).json({ message: 'Driver deleted successfully' })
        } else {
          res.status(405).json({ message: 'Method not allowed' })
        }
      }
      return
    }

    // Caterers
    if (route === 'caterers') {
      if (!id) {
        if (req.method === 'GET') {
          const result = await query(`
            SELECT c.*, d.name as "destinationName"
            FROM caterers c
            LEFT JOIN destinations d ON c."destinationId" = d.id
            ORDER BY c.name
          `)
          res.json(result)
        } else if (req.method === 'POST') {
          const { name, contactNumber, email, type, destinationId, note } = req.body

          if (!name || !type) {
            res.status(400).json({ message: 'Name and type are required' })
            return
          }

          if (!['restaurant', 'hotel', 'particular'].includes(type)) {
            res.status(400).json({ message: 'Type must be restaurant, hotel, or particular' })
            return
          }

          const catererId = randomUUID()
          const result = await query(
            `INSERT INTO caterers (id, name, "contactNumber", email, type, "destinationId", note)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [catererId, name, contactNumber || null, email || null, type, destinationId || null, note || null]
          )
          res.status(201).json(result[0])
        } else {
          res.status(405).json({ message: 'Method not allowed' })
        }
      } else {
        if (req.method === 'GET') {
          const result = await queryOne(
            `SELECT c.*, d.name as "destinationName"
             FROM caterers c
             LEFT JOIN destinations d ON c."destinationId" = d.id
             WHERE c.id = $1`,
            [id]
          )
          if (!result) {
            res.status(404).json({ message: 'Caterer not found' })
            return
          }
          res.json(result)
        } else if (req.method === 'PUT') {
          const { name, contactNumber, email, type, destinationId, note } = req.body

          if (!name || !type) {
            res.status(400).json({ message: 'Name and type are required' })
            return
          }

          if (!['restaurant', 'hotel', 'particular'].includes(type)) {
            res.status(400).json({ message: 'Type must be restaurant, hotel, or particular' })
            return
          }

          const result = await query(
            `UPDATE caterers 
             SET name = $1, "contactNumber" = $2, email = $3, type = $4, "destinationId" = $5, note = $6, "updatedAt" = NOW()
             WHERE id = $7 RETURNING *`,
            [name, contactNumber || null, email || null, type, destinationId || null, note || null, id]
          )
          res.status(200).json(result[0])
        } else if (req.method === 'DELETE') {
          await query('DELETE FROM caterers WHERE id = $1', [id])
          res.status(204).end()
        } else {
          res.status(405).json({ message: 'Method not allowed' })
        }
      }
      return
    }

    // Accounts
    if (route === 'accounts') {
      if (!id) {
        if (req.method === 'GET') {
          const entityType = req.query.entityType as string | undefined
          const entityId = req.query.entityId as string | undefined

          let sql = `SELECT * FROM accounts WHERE 1=1`
          const params: any[] = []
          let paramIndex = 1

          if (entityType) {
            sql += ` AND "entityType" = $${paramIndex}`
            params.push(entityType)
            paramIndex++
          }

          if (entityId) {
            sql += ` AND "entityId" = $${paramIndex}`
            params.push(entityId)
            paramIndex++
          }

          sql += ` ORDER BY "isPrimary" DESC, "createdAt" ASC`

          const accounts = await query(sql, params.length > 0 ? params : undefined)
          res.status(200).json(accounts)
        } else if (req.method === 'POST') {
          const { entityType, entityId, accountType, accountHolderName, bankName, accountNumber, iban, swiftBic, routingNumber, currency, serviceName, isPrimary, note } = req.body
          
          if (!entityType || !accountHolderName) {
            res.status(400).json({ message: 'Entity type and account holder name are required' })
            return
          }

          if (entityType !== 'company' && !entityId) {
            res.status(400).json({ message: 'Entity ID is required for non-company accounts' })
            return
          }

          if (!['client', 'hotel', 'guide', 'driver', 'caterer', 'company'].includes(entityType)) {
            res.status(400).json({ message: 'Invalid entity type' })
            return
          }

          if (!accountType || !['bank', 'cash', 'online', 'other'].includes(accountType)) {
            res.status(400).json({ message: 'Account type must be bank, cash, online, or other' })
            return
          }

          if ((accountType === 'bank' || accountType === 'other') && !bankName) {
            res.status(400).json({ message: accountType === 'bank' ? 'Bank name is required for bank accounts' : 'Account name/description is required' })
            return
          }
          if (accountType === 'online' && !serviceName) {
            res.status(400).json({ message: 'Service name/tag is required for online accounts' })
            return
          }

          if (isPrimary) {
            if (entityType === 'company') {
              await query(
                `UPDATE accounts SET "isPrimary" = FALSE WHERE "entityType" = 'company' AND "entityId" IS NULL`
              )
            } else {
              await query(
                `UPDATE accounts SET "isPrimary" = FALSE WHERE "entityType" = $1 AND "entityId" = $2`,
                [entityType, entityId]
              )
            }
          }

          const accountId = randomUUID()
          const result = await query(
            `INSERT INTO accounts (id, "entityType", "entityId", "accountType", "accountHolderName", "bankName", "accountNumber", iban, "swiftBic", "routingNumber", currency, "serviceName", "isPrimary", note)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
            [
              accountId,
              entityType,
              entityType === 'company' ? null : entityId,
              accountType,
              accountHolderName,
              (accountType === 'cash') ? null : (bankName || null),
              accountNumber || null,
              iban || null,
              swiftBic || null,
              routingNumber || null,
              currency || null,
              serviceName || null,
              isPrimary || false,
              note || null
            ]
          )
          res.status(201).json(result[0])
        } else {
          res.status(405).json({ message: 'Method not allowed' })
        }
      } else {
        if (req.method === 'GET') {
          let account = await queryOne('SELECT * FROM accounts WHERE id = $1', [id])
          if (!account) {
            res.status(404).json({ message: 'Account not found' })
            return
          }
          
          if (account.entityId && account.entityType) {
            let entityName = null
            try {
              if (account.entityType === 'client') {
                const entity = await queryOne('SELECT name FROM clients WHERE id = $1', [account.entityId])
                entityName = entity?.name || null
              } else if (account.entityType === 'hotel') {
                const entity = await queryOne('SELECT name FROM hotels WHERE id = $1', [account.entityId])
                entityName = entity?.name || null
              } else if (account.entityType === 'guide') {
                const entity = await queryOne('SELECT name FROM guides WHERE id = $1', [account.entityId])
                entityName = entity?.name || null
              } else if (account.entityType === 'driver') {
                const entity = await queryOne('SELECT name FROM drivers WHERE id = $1', [account.entityId])
                entityName = entity?.name || null
              } else if (account.entityType === 'caterer') {
                const entity = await queryOne('SELECT name FROM caterers WHERE id = $1', [account.entityId])
                entityName = entity?.name || null
              }
            } catch (err) {
              console.error('Error fetching entity name:', err)
            }
            account = { ...account, entityName }
          }
          
          res.status(200).json(account)
        } else if (req.method === 'PUT') {
          const { entityType, entityId, accountType, accountHolderName, bankName, accountNumber, iban, swiftBic, routingNumber, currency, serviceName, isPrimary, note } = req.body
          
          if (!accountHolderName) {
            res.status(400).json({ message: 'Account holder name is required' })
            return
          }

          if (!accountType || !['bank', 'cash', 'online', 'other'].includes(accountType)) {
            res.status(400).json({ message: 'Account type must be bank, cash, online, or other' })
            return
          }

          if ((accountType === 'bank' || accountType === 'other') && !bankName) {
            res.status(400).json({ message: accountType === 'bank' ? 'Bank name is required for bank accounts' : 'Account name/description is required' })
            return
          }
          if (accountType === 'online' && !serviceName) {
            res.status(400).json({ message: 'Service name/tag is required for online accounts' })
            return
          }

          const existing = await queryOne('SELECT * FROM accounts WHERE id = $1', [id])
          if (!existing) {
            res.status(404).json({ message: 'Account not found' })
            return
          }

          if (isPrimary && (!existing.isPrimary)) {
            if (existing.entityType === 'company') {
              await query(
                `UPDATE accounts SET "isPrimary" = FALSE WHERE "entityType" = 'company' AND "entityId" IS NULL AND id != $1`,
                [id]
              )
            } else {
              await query(
                `UPDATE accounts SET "isPrimary" = FALSE WHERE "entityType" = $1 AND "entityId" = $2 AND id != $3`,
                [existing.entityType, existing.entityId, id]
              )
            }
          }

          const result = await query(
            `UPDATE accounts 
             SET "accountType" = $1, "accountHolderName" = $2, "bankName" = $3, "accountNumber" = $4, iban = $5, "swiftBic" = $6, "routingNumber" = $7, currency = $8, "serviceName" = $9, "isPrimary" = $10, note = $11, "updatedAt" = NOW()
             WHERE id = $12 RETURNING *`,
            [
              accountType,
              accountHolderName,
              (accountType === 'cash') ? null : (bankName || null),
              accountNumber || null,
              iban || null,
              swiftBic || null,
              routingNumber || null,
              currency || null,
              serviceName || null,
              isPrimary || false,
              note || null,
              id
            ]
          )
          res.status(200).json(result[0])
        } else if (req.method === 'DELETE') {
          const existing = await queryOne('SELECT id FROM accounts WHERE id = $1', [id])
          if (!existing) {
            res.status(404).json({ message: 'Account not found' })
            return
          }
          await query('DELETE FROM accounts WHERE id = $1', [id])
          res.status(200).json({ message: 'Account deleted successfully' })
        } else {
          res.status(405).json({ message: 'Method not allowed' })
        }
      }
      return
    }

    res.status(404).json({ message: 'Route not found' })
  } catch (error: any) {
    console.error('API error:', error)
    res.status(500).json({ message: error.message || 'Internal server error' })
  }
}
