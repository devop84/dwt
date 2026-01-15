import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyToken } from '../lib/auth.js'
import { query, queryOne, initDb } from '../lib/db.js'
import { randomUUID } from 'crypto'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.status(200).end()
    return
  }

  console.log('🚀 API Handler called:', { 
    url: req.url, 
    method: req.method,
    query: req.query
  })
  
  await initDb()

  try {
    // Parse path from URL (for rewrites, path comes from URL)
    const url = req.url || ''
    const urlPath = url.split('?')[0] // Remove query string
    const match = urlPath.match(/^\/api\/(.+)$/)
    
    if (!match) {
      res.status(404).json({ message: 'API route not found', url, urlPath })
      return
    }
    
    const fullPath = match[1]
    const pathArray = fullPath.split('/').filter(Boolean)
    
    console.log('API Route Debug:', { 
      url, 
      urlPath,
      fullPath,
      pathArray, 
      method: req.method
    })
    
    let route = pathArray.length > 0 ? pathArray[0] : null
    let id = pathArray.length > 1 ? pathArray[1] : null
    
    // Health check endpoint
    if (route === 'health' || fullPath === 'health') {
      res.status(200).json({ status: 'ok', message: 'API handler is working', pathArray, url })
      return
    }
    
    // If no route found, return 404 early
    if (!route) {
      res.status(404).json({ 
        message: 'API route not found', 
        debug: { pathArray, url, urlPath }
      })
      return
    }

    // Auth routes (no auth required)
    if (route === 'auth') {
      const authAction = pathArray.length > 1 ? pathArray[1] : null
      console.log('🔐 Auth route detected:', { route, authAction, pathArray, method: req.method })
      
      if (authAction === 'login') {
        if (req.method !== 'POST') {
          res.status(405).json({ message: 'Method not allowed', received: req.method, expected: 'POST' })
          return
        }
        
        const { email, username, password } = req.body
        const identifier = email || username

        if (!identifier || !password) {
          res.status(400).json({ message: 'Email/Username and password are required' })
          return
        }

        const { authenticateUser, generateToken } = await import('../lib/auth.js')
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

        const existingEmail = await queryOne('SELECT * FROM users WHERE email = $1', [email])
        if (existingEmail) {
          res.status(400).json({ message: 'User with this email already exists' })
          return
        }

        const existingUsername = await queryOne('SELECT * FROM users WHERE username = $1', [username])
        if (existingUsername) {
          res.status(400).json({ message: 'Username is already taken' })
          return
        }

        const { hashPassword, generateToken } = await import('../lib/auth.js')
        const hashedPassword = await hashPassword(password)
        const userId = randomUUID()

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

      res.status(404).json({ message: 'Auth action not found', authAction })
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
            SELECT h.*, l.name as "locationName"
            FROM hotels h
            LEFT JOIN locations l ON h."locationId" = l.id
            ORDER BY h.name ASC
          `)
          res.status(200).json(hotels)
        } else if (req.method === 'POST') {
          const { name, rating, priceRange, locationId, description, contactNumber, email, address, coordinates } = req.body
          if (!name || !locationId) {
            res.status(400).json({ message: 'Name and location are required' })
            return
          }
          const hotelId = randomUUID()
          const result = await query(
            `INSERT INTO hotels (id, name, rating, "priceRange", "locationId", description, "contactNumber", email, address, coordinates)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [hotelId, name, rating || null, priceRange || null, locationId, description || null, contactNumber || null, email || null, address || null, coordinates || null]
          )
          res.status(201).json(result[0])
        } else {
          res.status(405).json({ message: 'Method not allowed' })
        }
      } else {
        if (req.method === 'GET') {
          const hotel = await queryOne(
            `SELECT h.*, l.name as "locationName" FROM hotels h
             LEFT JOIN locations l ON h."locationId" = l.id WHERE h.id = $1`,
            [id]
          )
          if (!hotel) {
            res.status(404).json({ message: 'Hotel not found' })
            return
          }
          res.status(200).json(hotel)
        } else if (req.method === 'PUT') {
          const { name, rating, priceRange, locationId, description, contactNumber, email, address, coordinates } = req.body
          if (!name || !locationId) {
            res.status(400).json({ message: 'Name and location are required' })
            return
          }
          const existing = await queryOne('SELECT id FROM hotels WHERE id = $1', [id])
          if (!existing) {
            res.status(404).json({ message: 'Hotel not found' })
            return
          }
          const result = await query(
            `UPDATE hotels SET name = $1, rating = $2, "priceRange" = $3, "locationId" = $4, description = $5,
             "contactNumber" = $6, email = $7, address = $8, coordinates = $9, "updatedAt" = NOW()
             WHERE id = $10 RETURNING *`,
            [name, rating || null, priceRange || null, locationId, description || null, contactNumber || null, email || null, address || null, coordinates || null, id]
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

    // Locations
    if (route === 'locations') {
      if (!id) {
        if (req.method === 'GET') {
          const locations = await query('SELECT * FROM locations ORDER BY name ASC')
          res.status(200).json(locations)
        } else if (req.method === 'POST') {
          const { name, coordinates, prefeitura, state, cep, description } = req.body
          if (!name) {
            res.status(400).json({ message: 'Name is required' })
            return
          }
          const locationId = randomUUID()
          const result = await query(
            `INSERT INTO locations (id, name, coordinates, prefeitura, state, cep, description)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [locationId, name, coordinates || null, prefeitura || null, state || null, cep || null, description || null]
          )
          res.status(201).json(result[0])
        } else {
          res.status(405).json({ message: 'Method not allowed' })
        }
      } else {
        if (req.method === 'GET') {
          const location = await queryOne('SELECT * FROM locations WHERE id = $1', [id])
          if (!location) {
            res.status(404).json({ message: 'Location not found' })
            return
          }
          res.status(200).json(location)
        } else if (req.method === 'PUT') {
          const { name, coordinates, prefeitura, state, cep, description } = req.body
          if (!name) {
            res.status(400).json({ message: 'Name is required' })
            return
          }
          const existing = await queryOne('SELECT id FROM locations WHERE id = $1', [id])
          if (!existing) {
            res.status(404).json({ message: 'Location not found' })
            return
          }
          const result = await query(
            `UPDATE locations SET name = $1, coordinates = $2, prefeitura = $3, state = $4, cep = $5, description = $6, "updatedAt" = NOW()
             WHERE id = $7 RETURNING *`,
            [name, coordinates || null, prefeitura || null, state || null, cep || null, description || null, id]
          )
          res.status(200).json(result[0])
        } else if (req.method === 'DELETE') {
          const existing = await queryOne('SELECT id FROM locations WHERE id = $1', [id])
          if (!existing) {
            res.status(404).json({ message: 'Location not found' })
            return
          }
          await query('DELETE FROM locations WHERE id = $1', [id])
          res.status(200).json({ message: 'Location deleted successfully' })
        } else {
          res.status(405).json({ message: 'Method not allowed' })
        }
      }
      return
    }

    // Staff
    if (route === 'staff') {
      if (!id) {
        if (req.method === 'GET') {
          const staff = await query(`
            SELECT 
              g.id,
              g.name,
              g."contactNumber",
              g.email,
              g."locationId",
              g.languages,
              g.note,
              g."createdAt",
              g."updatedAt",
              d.name as "locationName"
            FROM staff g
            LEFT JOIN locations d ON g."locationId" = d.id
            ORDER BY g.name ASC
          `)
          res.status(200).json(staff)
        } else if (req.method === 'POST') {
          const { name, contactNumber, email, locationId, languages, note } = req.body
          if (!name) {
            res.status(400).json({ message: 'Name is required' })
            return
          }
          if (!locationId) {
            res.status(400).json({ message: 'Destination is required' })
            return
          }
          const staffId = randomUUID()
          const result = await query(
            `INSERT INTO staff (id, name, "contactNumber", email, "locationId", languages, note)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, name, "contactNumber", email, "locationId", languages, note, "createdAt", "updatedAt"`,
            [staffId, name, contactNumber || null, email || null, locationId, languages || null, note || null]
          )
          res.status(201).json(result[0])
        } else {
          res.status(405).json({ message: 'Method not allowed' })
        }
      } else {
        if (req.method === 'GET') {
          const staffMember = await queryOne(
            `SELECT 
              g.id,
              g.name,
              g."contactNumber",
              g.email,
              g."locationId",
              g.languages,
              g.note,
              g."createdAt",
              g."updatedAt",
              d.name as "locationName"
            FROM staff g
            LEFT JOIN locations d ON g."locationId" = d.id
            WHERE g.id = $1`,
            [id]
          )
          if (!staffMember) {
            res.status(404).json({ message: 'Staff not found' })
            return
          }
          res.status(200).json(staffMember)
        } else if (req.method === 'PUT') {
          const { name, contactNumber, email, locationId, languages, note } = req.body
          if (!name) {
            res.status(400).json({ message: 'Name is required' })
            return
          }
          if (!locationId) {
            res.status(400).json({ message: 'Destination is required' })
            return
          }
          const existing = await queryOne('SELECT id FROM staff WHERE id = $1', [id])
          if (!existing) {
            res.status(404).json({ message: 'Staff not found' })
            return
          }
          const result = await query(
            `UPDATE staff SET name = $1, "contactNumber" = $2, email = $3, "locationId" = $4, languages = $5, note = $6, "updatedAt" = NOW()
             WHERE id = $7 RETURNING *`,
            [name, contactNumber || null, email || null, locationId, languages || null, note || null, id]
          )
          res.status(200).json(result[0])
        } else if (req.method === 'DELETE') {
          const existing = await queryOne('SELECT id FROM staff WHERE id = $1', [id])
          if (!existing) {
            res.status(404).json({ message: 'Staff not found' })
            return
          }
          await query('DELETE FROM staff WHERE id = $1', [id])
          res.status(200).json({ message: 'Staff deleted successfully' })
        } else {
          res.status(405).json({ message: 'Method not allowed' })
        }
      }
      return
    }

    // Vehicles
    if (route === 'vehicles') {
      console.log('🚗 Vehicles route matched:', { route, id, method: req.method, pathArray })
      if (!id) {
        if (req.method === 'GET') {
          console.log('📋 Fetching all vehicles...')
          const vehicles = await query(`
            SELECT v.*, loc.name as "locationName", tp.name as "thirdPartyName"
            FROM vehicles v
            LEFT JOIN locations loc ON v."locationId" = loc.id
            LEFT JOIN third_parties tp ON v."thirdPartyId" = tp.id
            ORDER BY v.type ASC, v."createdAt" DESC
          `)
          console.log(`✅ Found ${vehicles.length} vehicles`)
          res.status(200).json(vehicles)
          return
        } else if (req.method === 'POST') {
          const { type, vehicleOwner, locationId, thirdPartyId, note } = req.body
          if (!type || !vehicleOwner) {
            res.status(400).json({ message: 'Type and vehicle owner are required' })
            return
          }
          if (!['car4x4', 'boat', 'quadbike', 'carSedan', 'outro'].includes(type)) {
            res.status(400).json({ message: 'Invalid vehicle type' })
            return
          }
          if (!['company', 'third-party'].includes(vehicleOwner)) {
            res.status(400).json({ message: 'Invalid vehicle owner' })
            return
          }
          if (vehicleOwner === 'third-party' && !thirdPartyId) {
            res.status(400).json({ message: 'Third party ID is required when vehicle owner is third-party' })
            return
          }
          const vehicleId = randomUUID()
          const result = await query(
            `INSERT INTO vehicles (id, type, "vehicleOwner", "locationId", "thirdPartyId", note)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [vehicleId, type, vehicleOwner, locationId || null, vehicleOwner === 'third-party' ? thirdPartyId : null, note || null]
          )
          res.status(201).json(result[0])
          return
        } else {
          res.status(405).json({ message: 'Method not allowed' })
          return
        }
      } else {
        if (req.method === 'GET') {
          const vehicle = await queryOne(
            `SELECT v.*, loc.name as "locationName", tp.name as "thirdPartyName" 
             FROM vehicles v
             LEFT JOIN locations loc ON v."locationId" = loc.id
             LEFT JOIN third_parties tp ON v."thirdPartyId" = tp.id
             WHERE v.id = $1`,
            [id]
          )
          if (!vehicle) {
            res.status(404).json({ message: 'Vehicle not found' })
            return
          }
          res.status(200).json(vehicle)
          return
        } else if (req.method === 'PUT') {
          const { type, vehicleOwner, locationId, thirdPartyId, note } = req.body
          if (!type || !vehicleOwner) {
            res.status(400).json({ message: 'Type and vehicle owner are required' })
            return
          }
          if (!['car4x4', 'boat', 'quadbike', 'carSedan', 'outro'].includes(type)) {
            res.status(400).json({ message: 'Invalid vehicle type' })
            return
          }
          if (!['company', 'third-party'].includes(vehicleOwner)) {
            res.status(400).json({ message: 'Invalid vehicle owner' })
            return
          }
          if (vehicleOwner === 'third-party' && !thirdPartyId) {
            res.status(400).json({ message: 'Third party ID is required when vehicle owner is third-party' })
            return
          }
          const existing = await queryOne('SELECT id FROM vehicles WHERE id = $1', [id])
          if (!existing) {
            res.status(404).json({ message: 'Vehicle not found' })
            return
          }
          const result = await query(
            `UPDATE vehicles SET type = $1, "vehicleOwner" = $2, "locationId" = $3, "thirdPartyId" = $4, note = $5, "updatedAt" = NOW()
             WHERE id = $6 RETURNING *`,
            [type, vehicleOwner, locationId || null, vehicleOwner === 'third-party' ? thirdPartyId : null, note || null, id]
          )
          res.status(200).json(result[0])
          return
        } else if (req.method === 'DELETE') {
          const existing = await queryOne('SELECT id FROM vehicles WHERE id = $1', [id])
          if (!existing) {
            res.status(404).json({ message: 'Vehicle not found' })
            return
          }
          await query('DELETE FROM vehicles WHERE id = $1', [id])
          res.status(200).json({ message: 'Vehicle deleted successfully' })
          return
        } else {
          res.status(405).json({ message: 'Method not allowed' })
          return
        }
      }
      return
    }

    // Third Parties
    // Handle hyphenated route - check if route is "third" and next is "parties"
    if (route === 'third' && pathArray.length > 1 && pathArray[1] === 'parties') {
      route = 'third-parties'
      id = pathArray.length > 2 ? pathArray[2] : null
    }
    
    if (route === 'third-parties') {
      if (!id) {
        if (req.method === 'GET') {
          const thirdParties = await query(`
            SELECT id, name, "contactNumber", email, note, "createdAt", "updatedAt"
            FROM third_parties
            ORDER BY "createdAt" DESC
          `)
          res.status(200).json(thirdParties)
        } else if (req.method === 'POST') {
          const { name, contactNumber, email, note } = req.body
          if (!name) {
            res.status(400).json({ message: 'Name is required' })
            return
          }
          const thirdPartyId = randomUUID()
          const result = await query(
            `INSERT INTO third_parties (id, name, "contactNumber", email, note)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, "contactNumber", email, note, "createdAt", "updatedAt"`,
            [thirdPartyId, name, contactNumber || null, email || null, note || null]
          )
          res.status(201).json(result[0])
        } else {
          res.status(405).json({ message: 'Method not allowed' })
        }
      } else {
        if (req.method === 'GET') {
          const thirdParty = await queryOne('SELECT * FROM third_parties WHERE id = $1', [id])
          if (!thirdParty) {
            res.status(404).json({ message: 'Third party not found' })
            return
          }
          res.status(200).json(thirdParty)
        } else if (req.method === 'PUT') {
          const { name, contactNumber, email, note } = req.body
          if (!name) {
            res.status(400).json({ message: 'Name is required' })
            return
          }
          const existing = await queryOne('SELECT id FROM third_parties WHERE id = $1', [id])
          if (!existing) {
            res.status(404).json({ message: 'Third party not found' })
            return
          }
          const result = await query(
            `UPDATE third_parties SET name = $1, "contactNumber" = $2, email = $3, note = $4, "updatedAt" = NOW()
             WHERE id = $5 RETURNING *`,
            [name, contactNumber || null, email || null, note || null, id]
          )
          res.status(200).json(result[0])
        } else if (req.method === 'DELETE') {
          const existing = await queryOne('SELECT id FROM third_parties WHERE id = $1', [id])
          if (!existing) {
            res.status(404).json({ message: 'Third party not found' })
            return
          }
          await query('DELETE FROM third_parties WHERE id = $1', [id])
          res.status(200).json({ message: 'Third party deleted successfully' })
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

          if (!['client', 'hotel', 'staff', 'company', 'third-party'].includes(entityType)) {
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
              } else if (account.entityType === 'staff') {
                const entity = await queryOne('SELECT name FROM staff WHERE id = $1', [account.entityId])
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

    // Routes
    if (route === 'routes') {
      // /routes
      if (!id) {
        if (req.method === 'GET') {
          const { status, startDate, endDate } = req.query as { status?: string, startDate?: string, endDate?: string }
          let sql = `
            SELECT 
              id, name, description, start_date, end_date, duration, status,
              total_distance, estimated_cost, actual_cost, currency, notes,
              "createdAt", "updatedAt"
            FROM routes
            WHERE 1=1
          `
          const params: any[] = []
          let paramCount = 1
          if (status) {
            sql += ` AND status = $${paramCount++}`
            params.push(status)
          }
          if (startDate) {
            sql += ` AND start_date >= $${paramCount++}`
            params.push(startDate)
          }
          if (endDate) {
            sql += ` AND end_date <= $${paramCount++}`
            params.push(endDate)
          }
          sql += ` ORDER BY "createdAt" DESC`
          const rows = await query(sql, params.length > 0 ? params : undefined)
          const routes = rows.map((routeRow: any) => ({
            id: routeRow.id,
            name: routeRow.name,
            description: routeRow.description,
            startDate: routeRow.start_date,
            endDate: routeRow.end_date,
            duration: routeRow.duration,
            status: routeRow.status,
            totalDistance: routeRow.total_distance,
            estimatedCost: routeRow.estimated_cost,
            actualCost: routeRow.actual_cost,
            currency: routeRow.currency,
            notes: routeRow.notes,
            createdAt: routeRow.createdAt,
            updatedAt: routeRow.updatedAt
          }))
          res.status(200).json(routes)
          return
        }
        if (req.method === 'POST') {
          const { name, description, startDate, endDate, duration, status, totalDistance, estimatedCost, actualCost, currency, notes } = req.body
          if (!name) {
            res.status(400).json({ message: 'Route name is required' })
            return
          }
          const routeId = randomUUID()
          const result = await query(
            `INSERT INTO routes (id, name, description, start_date, end_date, duration, status, total_distance, estimated_cost, actual_cost, currency, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [
              routeId,
              name,
              description || null,
              startDate || null,
              endDate || null,
              duration || null,
              status || 'draft',
              totalDistance || 0,
              estimatedCost || 0,
              actualCost || 0,
              currency || 'BRL',
              notes || null
            ]
          )
          res.status(201).json(result[0])
          return
        }
        res.status(405).json({ message: 'Method not allowed' })
        return
      }

      const subRoute = pathArray.length > 2 ? pathArray[2] : null

      // /routes/:id
      if (!subRoute) {
        if (req.method === 'GET') {
          const routeRow = await queryOne('SELECT * FROM routes WHERE id = $1', [id])
          if (!routeRow) {
            res.status(404).json({ message: 'Route not found' })
            return
          }
          const routeData = {
            id: routeRow.id,
            name: routeRow.name,
            description: routeRow.description,
            startDate: routeRow.start_date,
            endDate: routeRow.end_date,
            duration: routeRow.duration,
            status: routeRow.status,
            totalDistance: routeRow.total_distance,
            estimatedCost: routeRow.estimated_cost,
            actualCost: routeRow.actual_cost,
            currency: routeRow.currency,
            notes: routeRow.notes,
            createdAt: routeRow.createdAt,
            updatedAt: routeRow.updatedAt
          }

          const segmentsResult = await query(
            `SELECT 
              rs.*,
              l1.name as from_destination_name,
              l2.name as to_destination_name
            FROM route_segments rs
            LEFT JOIN locations l1 ON rs.from_destination_id = l1.id
            LEFT JOIN locations l2 ON rs.to_destination_id = l2.id
            WHERE rs.route_id = $1
            ORDER BY rs.segment_order, rs.day_number`,
            [id]
          )

          const segmentIds = segmentsResult.map((s: any) => s.id)
          const stopsResult = segmentIds.length > 0 ? await query(
            `SELECT 
              rss.*,
              l.name as location_name
            FROM route_segment_stops rss
            LEFT JOIN locations l ON rss.location_id = l.id
            WHERE rss.segment_id = ANY($1::uuid[])
            ORDER BY rss.segment_id, rss.stop_order`,
            [segmentIds]
          ) : []

          const logisticsResult = await query(
            `SELECT 
              rl.*,
              CASE 
                WHEN rl.entity_type = 'hotel' THEN h.name
                WHEN rl.entity_type = 'third-party' THEN tp.name
                WHEN rl.entity_type = 'vehicle' THEN v.type || ' - ' || CASE 
                  WHEN v."vehicleOwner" = 'company' THEN 'Company'
                  WHEN v."vehicleOwner" = 'hotel' THEN COALESCE(h.name, 'Hotel')
                  ELSE COALESCE(tp.name, 'Third Party')
                END
                WHEN rl.entity_type = 'location' THEN l.name
                ELSE NULL
              END as entity_name
            FROM route_logistics rl
            LEFT JOIN vehicles v ON rl.entity_type = 'vehicle' AND rl.entity_id = v.id
            LEFT JOIN hotels h ON (rl.entity_type = 'hotel' AND rl.entity_id = h.id) OR (rl.entity_type = 'vehicle' AND v."hotelId" = h.id)
            LEFT JOIN third_parties tp ON (rl.entity_type = 'third-party' AND rl.entity_id = tp.id) OR (rl.entity_type = 'vehicle' AND v."thirdPartyId" = tp.id)
            LEFT JOIN locations l ON rl.entity_type = 'location' AND rl.entity_id = l.id
            WHERE rl.route_id = $1`,
            [id]
          )

          const participantsResult = await query(
            `SELECT 
              rp.*,
              c.name as client_name,
              g.name as guide_name
            FROM route_participants rp
            LEFT JOIN clients c ON rp.client_id = c.id
            LEFT JOIN staff g ON rp.guide_id = g.id
            WHERE rp.route_id = $1`,
            [id]
          )

          const transactionsResult = await query(
            `SELECT 
              rt.*,
              a1."accountHolderName" as from_account_name,
              a2."accountHolderName" as to_account_name
            FROM route_transactions rt
            LEFT JOIN accounts a1 ON rt.from_account_id = a1.id
            LEFT JOIN accounts a2 ON rt.to_account_id = a2.id
            WHERE rt.route_id = $1
            ORDER BY rt.transaction_date DESC, rt."createdAt" DESC`,
            [id]
          )

          const segments = segmentsResult.map((seg: any) => {
            const stops = stopsResult
              .filter((stop: any) => stop.segment_id === seg.id)
              .map((stop: any) => ({
                id: stop.id,
                segmentId: stop.segment_id,
                locationId: stop.location_id,
                stopOrder: stop.stop_order,
                notes: stop.notes,
                createdAt: stop.createdAt,
                updatedAt: stop.updatedAt,
                locationName: stop.location_name
              }))
              .sort((a: any, b: any) => a.stopOrder - b.stopOrder)

            return {
              id: seg.id,
              routeId: seg.route_id,
              dayNumber: seg.day_number,
              segmentDate: seg.segment_date,
              fromDestinationId: seg.from_destination_id,
              toDestinationId: seg.to_destination_id,
              distance: seg.distance,
              segmentOrder: seg.segment_order,
              notes: seg.notes,
              createdAt: seg.createdAt,
              updatedAt: seg.updatedAt,
              fromDestinationName: seg.from_destination_name,
              toDestinationName: seg.to_destination_name,
              stops
            }
          })

          const logistics = logisticsResult.map((log: any) => ({
            id: log.id,
            routeId: log.route_id,
            segmentId: log.segment_id,
            logisticsType: log.logistics_type,
            entityType: log.entity_type,
            entityId: log.entity_id,
            itemName: log.item_name,
            quantity: log.quantity,
            cost: log.cost,
            date: log.date,
            driverPilotName: log.driver_pilot_name,
            isOwnVehicle: log.is_own_vehicle,
            vehicleType: log.vehicle_type,
            notes: log.notes,
            createdAt: log.createdAt,
            updatedAt: log.updatedAt,
            entityName: log.entity_name
          }))

          const participants = participantsResult.map((p: any) => ({
            id: p.id,
            routeId: p.route_id,
            clientId: p.client_id,
            guideId: p.guide_id,
            role: p.role,
            isOptional: p.is_optional,
            notes: p.notes,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            clientName: p.client_name,
            guideName: p.guide_name
          }))

          const transactions = transactionsResult.map((t: any) => ({
            id: t.id,
            routeId: t.route_id,
            transactionDate: t.transaction_date,
            amount: t.amount,
            currency: t.currency,
            paymentMethod: t.payment_method,
            type: t.type,
            description: t.description,
            fromAccountId: t.from_account_id,
            toAccountId: t.to_account_id,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            fromAccountName: t.from_account_name,
            toAccountName: t.to_account_name
          }))

          res.status(200).json({
            ...routeData,
            segments,
            logistics,
            participants,
            transactions
          })
          return
        }
        if (req.method === 'PUT') {
          const { name, description, startDate, endDate, duration, status, totalDistance, estimatedCost, actualCost, currency, notes } = req.body
          const existing = await queryOne('SELECT id FROM routes WHERE id = $1', [id])
          if (!existing) {
            res.status(404).json({ message: 'Route not found' })
            return
          }
          const result = await query(
            `UPDATE routes 
             SET name = $1, description = $2, start_date = $3, end_date = $4, duration = $5, status = $6, total_distance = $7, estimated_cost = $8, actual_cost = $9, currency = $10, notes = $11, "updatedAt" = NOW()
             WHERE id = $12 RETURNING *`,
            [
              name,
              description || null,
              startDate || null,
              endDate || null,
              duration || null,
              status || 'draft',
              totalDistance || 0,
              estimatedCost || 0,
              actualCost || 0,
              currency || 'BRL',
              notes || null,
              id
            ]
          )
          res.status(200).json(result[0])
          return
        }
        if (req.method === 'DELETE') {
          const existing = await queryOne('SELECT id FROM routes WHERE id = $1', [id])
          if (!existing) {
            res.status(404).json({ message: 'Route not found' })
            return
          }
          await query('DELETE FROM routes WHERE id = $1', [id])
          res.status(200).json({ message: 'Route deleted successfully' })
          return
        }
        res.status(405).json({ message: 'Method not allowed' })
        return
      }

      // /routes/:id/duplicate
      if (subRoute === 'duplicate') {
        if (req.method !== 'POST') {
          res.status(405).json({ message: 'Method not allowed' })
          return
        }
        const { name } = req.body
        const routeRow = await queryOne('SELECT * FROM routes WHERE id = $1', [id])
        if (!routeRow) {
          res.status(404).json({ message: 'Route not found' })
          return
        }
        const newRouteId = randomUUID()
        const result = await query(
          `INSERT INTO routes (id, name, description, start_date, end_date, duration, status, total_distance, estimated_cost, actual_cost, currency, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING *`,
          [
            newRouteId,
            name || `${routeRow.name} (Copy)`,
            routeRow.description,
            routeRow.start_date,
            routeRow.end_date,
            routeRow.duration,
            routeRow.status,
            routeRow.total_distance,
            routeRow.estimated_cost,
            routeRow.actual_cost,
            routeRow.currency,
            routeRow.notes
          ]
        )
        res.status(201).json(result[0])
        return
      }

      // /routes/:routeId/segments...
      if (subRoute === 'segments') {
        const segmentId = pathArray.length > 3 ? pathArray[3] : null
        const segmentSubRoute = pathArray.length > 4 ? pathArray[4] : null

        if (!segmentId) {
          if (req.method === 'GET') {
            const segments = await query(
              `SELECT 
                rs.*,
                l1.name as from_destination_name,
                l2.name as to_destination_name
              FROM route_segments rs
              LEFT JOIN locations l1 ON rs.from_destination_id = l1.id
              LEFT JOIN locations l2 ON rs.to_destination_id = l2.id
              WHERE rs.route_id = $1
              ORDER BY rs.segment_order, rs.day_number`,
              [id]
            )

            const segmentIds = segments.map((s: any) => s.id)
            const stopsResult = segmentIds.length > 0 ? await query(
              `SELECT 
                rss.*,
                l.name as location_name
              FROM route_segment_stops rss
              LEFT JOIN locations l ON rss.location_id = l.id
              WHERE rss.segment_id = ANY($1::uuid[])
              ORDER BY rss.segment_id, rss.stop_order`,
              [segmentIds]
            ) : []

            const formatted = segments.map((seg: any) => {
              const stops = stopsResult
                .filter((stop: any) => stop.segment_id === seg.id)
                .map((stop: any) => ({
                  id: stop.id,
                  segmentId: stop.segment_id,
                  locationId: stop.location_id,
                  stopOrder: stop.stop_order,
                  notes: stop.notes,
                  createdAt: stop.createdAt,
                  updatedAt: stop.updatedAt,
                  locationName: stop.location_name
                }))
                .sort((a: any, b: any) => a.stopOrder - b.stopOrder)

              return {
                id: seg.id,
                routeId: seg.route_id,
                dayNumber: seg.day_number,
                segmentDate: seg.segment_date,
                fromDestinationId: seg.from_destination_id,
                toDestinationId: seg.to_destination_id,
                distance: seg.distance,
                segmentOrder: seg.segment_order,
                notes: seg.notes,
                createdAt: seg.createdAt,
                updatedAt: seg.updatedAt,
                fromDestinationName: seg.from_destination_name,
                toDestinationName: seg.to_destination_name,
                stops
              }
            })
            res.status(200).json(formatted)
            return
          }
          if (req.method === 'POST') {
            const { dayNumber, fromDestinationId, toDestinationId, distance, segmentOrder, notes } = req.body

            const maxDayResult = await query(
              'SELECT COALESCE(MAX(day_number), 0) as max_day FROM route_segments WHERE route_id = $1',
              [id]
            )
            const maxDay = parseInt(maxDayResult[0]?.max_day) || 0
            const dayNum = dayNumber || maxDay + 1
            const segOrder = segmentOrder !== undefined ? segmentOrder : maxDay

            const routeResult = await query('SELECT start_date FROM routes WHERE id = $1', [id])
            const startDate = routeResult[0]?.start_date
            let segmentDateStr = null
            if (startDate) {
              const segmentDate = new Date(startDate)
              segmentDate.setDate(segmentDate.getDate() + dayNum - 1)
              segmentDateStr = segmentDate.toISOString().split('T')[0]
            }

            const newSegmentId = randomUUID()
            await query(
              `INSERT INTO route_segments (id, route_id, day_number, segment_date, from_destination_id, to_destination_id, distance, segment_order, notes)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                newSegmentId,
                id,
                dayNum,
                segmentDateStr,
                fromDestinationId || null,
                toDestinationId || null,
                distance || 0,
                segOrder,
                notes || null
              ]
            )

            const result = await query(
              `SELECT 
                rs.*,
                l1.name as from_destination_name,
                l2.name as to_destination_name
              FROM route_segments rs
              LEFT JOIN locations l1 ON rs.from_destination_id = l1.id
              LEFT JOIN locations l2 ON rs.to_destination_id = l2.id
              WHERE rs.id = $1`,
              [newSegmentId]
            )

            const stopsResult = await query(
              `SELECT 
                rss.*,
                l.name as location_name
              FROM route_segment_stops rss
              LEFT JOIN locations l ON rss.location_id = l.id
              WHERE rss.segment_id = $1
              ORDER BY rss.stop_order`,
              [newSegmentId]
            )

            const seg = result[0]
            const stops = stopsResult.map((stop: any) => ({
              id: stop.id,
              segmentId: stop.segment_id,
              locationId: stop.location_id,
              stopOrder: stop.stop_order,
              notes: stop.notes,
              createdAt: stop.createdAt,
              updatedAt: stop.updatedAt,
              locationName: stop.location_name
            }))

            res.status(201).json({
              id: seg.id,
              routeId: seg.route_id,
              dayNumber: seg.day_number,
              segmentDate: seg.segment_date,
              fromDestinationId: seg.from_destination_id,
              toDestinationId: seg.to_destination_id,
              distance: seg.distance,
              segmentOrder: seg.segment_order,
              notes: seg.notes,
              createdAt: seg.createdAt,
              updatedAt: seg.updatedAt,
              fromDestinationName: seg.from_destination_name,
              toDestinationName: seg.to_destination_name,
              stops
            })
            return
          }
          res.status(405).json({ message: 'Method not allowed' })
          return
        }

        if (segmentId === 'reorder') {
          if (req.method !== 'PUT') {
            res.status(405).json({ message: 'Method not allowed' })
            return
          }
          const { segmentOrders } = req.body
          if (!Array.isArray(segmentOrders)) {
            res.status(400).json({ message: 'segmentOrders must be an array' })
            return
          }
          for (const item of segmentOrders) {
            await query(
              `UPDATE route_segments SET segment_order = $1 WHERE id = $2 AND route_id = $3`,
              [item.segmentOrder, item.id, id]
            )
          }
          res.status(200).json({ message: 'Segment order updated successfully' })
          return
        }

        if (segmentSubRoute === 'stops') {
          const stopId = pathArray.length > 5 ? pathArray[5] : null
          const stopSubRoute = pathArray.length > 6 ? pathArray[6] : null

          if (!stopId) {
            if (req.method === 'GET') {
              const stops = await query(
                `SELECT 
                  rss.*,
                  l.name as location_name
                FROM route_segment_stops rss
                LEFT JOIN locations l ON rss.location_id = l.id
                WHERE rss.segment_id = $1
                ORDER BY rss.stop_order`,
                [segmentId]
              )
              const formatted = stops.map((stop: any) => ({
                id: stop.id,
                segmentId: stop.segment_id,
                locationId: stop.location_id,
                stopOrder: stop.stop_order,
                notes: stop.notes,
                createdAt: stop.createdAt,
                updatedAt: stop.updatedAt,
                locationName: stop.location_name
              }))
              res.status(200).json(formatted)
              return
            }
            if (req.method === 'POST') {
              const { locationId, stopOrder, notes } = req.body
              if (!locationId) {
                res.status(400).json({ message: 'Location ID is required' })
                return
              }
              const stopId = randomUUID()
              const result = await query(
                `INSERT INTO route_segment_stops (id, segment_id, location_id, stop_order, notes)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [stopId, segmentId, locationId, stopOrder || 1, notes || null]
              )
              res.status(201).json(result[0])
              return
            }
            res.status(405).json({ message: 'Method not allowed' })
            return
          }

          if (stopId === 'reorder') {
            if (req.method !== 'PUT') {
              res.status(405).json({ message: 'Method not allowed' })
              return
            }
            const { stopOrders } = req.body
            if (!Array.isArray(stopOrders)) {
              res.status(400).json({ message: 'stopOrders must be an array' })
              return
            }
            for (const item of stopOrders) {
              await query(
                `UPDATE route_segment_stops SET stop_order = $1 WHERE id = $2 AND segment_id = $3`,
                [item.stopOrder, item.id, segmentId]
              )
            }
            res.status(200).json({ message: 'Stop order updated successfully' })
            return
          }

          if (stopSubRoute === null) {
            if (req.method === 'DELETE') {
              const existing = await queryOne('SELECT id FROM route_segment_stops WHERE id = $1 AND segment_id = $2', [stopId, segmentId])
              if (!existing) {
                res.status(404).json({ message: 'Stop not found' })
                return
              }
              await query('DELETE FROM route_segment_stops WHERE id = $1', [stopId])
              res.status(200).json({ message: 'Stop deleted successfully' })
              return
            }
            res.status(405).json({ message: 'Method not allowed' })
            return
          }
        }

        if (segmentSubRoute === 'participants') {
          const participantId = pathArray.length > 5 ? pathArray[5] : null
          if (!participantId) {
            if (req.method === 'GET') {
              const participants = await query(
                `SELECT 
                  rp.*,
                  c.name as client_name,
                  g.name as guide_name
                FROM route_segment_participants rsp
                JOIN route_participants rp ON rsp.participant_id = rp.id
                LEFT JOIN clients c ON rp.client_id = c.id
                LEFT JOIN staff g ON rp.guide_id = g.id
                WHERE rsp.segment_id = $1`,
                [segmentId]
              )
              const formatted = participants.map((p: any) => ({
                id: p.id,
                routeId: p.route_id,
                clientId: p.client_id,
                guideId: p.guide_id,
                role: p.role,
                isOptional: p.is_optional,
                notes: p.notes,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
                clientName: p.client_name,
                guideName: p.guide_name
              }))
              res.status(200).json(formatted)
              return
            }
            if (req.method === 'POST') {
              const { participantId } = req.body
              if (!participantId) {
                res.status(400).json({ message: 'Participant ID is required' })
                return
              }
              const result = await query(
                `INSERT INTO route_segment_participants (segment_id, participant_id)
                 VALUES ($1, $2)
                 ON CONFLICT (segment_id, participant_id) DO NOTHING
                 RETURNING *`,
                [segmentId, participantId]
              )
              if (result.length === 0) {
                res.status(409).json({ message: 'Participant already in segment' })
                return
              }
              res.status(201).json({ message: 'Participant added to segment' })
              return
            }
            res.status(405).json({ message: 'Method not allowed' })
            return
          }
          if (req.method === 'DELETE') {
            await query('DELETE FROM route_segment_participants WHERE segment_id = $1 AND participant_id = $2', [segmentId, participantId])
            res.status(200).json({ message: 'Participant removed from segment' })
            return
          }
          res.status(405).json({ message: 'Method not allowed' })
          return
        }

        if (segmentSubRoute === 'accommodations') {
          const accommodationId = pathArray.length > 5 ? pathArray[5] : null
          const accommodationSubRoute = pathArray.length > 6 ? pathArray[6] : null

          if (!accommodationId) {
            if (req.method === 'GET') {
              const accommodations = await query(
                `SELECT 
                  rsa.*,
                  h.name as hotel_name
                FROM route_segment_accommodations rsa
                LEFT JOIN hotels h ON rsa.hotel_id = h.id
                WHERE rsa.segment_id = $1
                ORDER BY rsa."createdAt" ASC`,
                [segmentId]
              )
              const rooms = await query(
                `SELECT * FROM route_segment_accommodation_rooms WHERE accommodation_id IN (
                  SELECT id FROM route_segment_accommodations WHERE segment_id = $1
                )`,
                [segmentId]
              )
              const roomParticipants = await query(
                `SELECT 
                  rsarp.*,
                  rp.role,
                  COALESCE(c.name, g.name, 'Staff') as participant_name
                FROM route_segment_accommodation_room_participants rsarp
                LEFT JOIN route_participants rp ON rsarp.participant_id = rp.id
                LEFT JOIN clients c ON rp.client_id = c.id
                LEFT JOIN staff g ON rp.guide_id = g.id
                WHERE rsarp.room_id IN (
                  SELECT id FROM route_segment_accommodation_rooms WHERE accommodation_id IN (
                    SELECT id FROM route_segment_accommodations WHERE segment_id = $1
                  )
                )`,
                [segmentId]
              )
              const formatted = accommodations.map((acc: any) => ({
                id: acc.id,
                segmentId: acc.segment_id,
                hotelId: acc.hotel_id,
                clientType: acc.client_type,
                notes: acc.notes,
                createdAt: acc.createdAt,
                updatedAt: acc.updatedAt,
                hotelName: acc.hotel_name,
                rooms: rooms
                  .filter((room: any) => room.accommodation_id === acc.id)
                  .map((room: any) => ({
                    id: room.id,
                    accommodationId: room.accommodation_id,
                    roomType: room.room_type,
                    roomNumber: room.room_number,
                    capacity: room.capacity,
                    costPerNight: room.cost_per_night,
                    notes: room.notes,
                    createdAt: room.createdAt,
                    updatedAt: room.updatedAt,
                    participants: roomParticipants
                      .filter((rp: any) => rp.room_id === room.id)
                      .map((rp: any) => ({
                        id: rp.id,
                        roomId: rp.room_id,
                        participantId: rp.participant_id,
                        isCouple: rp.is_couple,
                        createdAt: rp.createdAt,
                        participantName: rp.participant_name,
                        participantRole: rp.role
                      }))
                  }))
              }))
              res.status(200).json(formatted)
              return
            }
            if (req.method === 'POST') {
              const { hotelId, clientType, notes } = req.body
              if (!hotelId || !clientType) {
                res.status(400).json({ message: 'Hotel and client type are required' })
                return
              }
              const accommodationId = randomUUID()
              const result = await query(
                `INSERT INTO route_segment_accommodations (id, segment_id, hotel_id, client_type, notes)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [accommodationId, segmentId, hotelId, clientType, notes || null]
              )
              res.status(201).json(result[0])
              return
            }
            res.status(405).json({ message: 'Method not allowed' })
            return
          }

          if (accommodationSubRoute === 'rooms') {
            const roomId = pathArray.length > 7 ? pathArray[7] : null
            if (!roomId) {
              if (req.method === 'POST') {
                const { roomType, roomNumber, capacity, costPerNight, notes, participants } = req.body
                const roomId = randomUUID()
                const result = await query(
                  `INSERT INTO route_segment_accommodation_rooms (id, accommodation_id, room_type, room_number, capacity, cost_per_night, notes)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)
                   RETURNING *`,
                  [roomId, accommodationId, roomType, roomNumber || null, capacity || null, costPerNight || 0, notes || null]
                )
                if (Array.isArray(participants) && participants.length > 0) {
                  for (const p of participants) {
                    await query(
                      `INSERT INTO route_segment_accommodation_room_participants (room_id, participant_id, is_couple)
                       VALUES ($1, $2, $3)`,
                      [roomId, p.participantId, p.isCouple || false]
                    )
                  }
                }
                res.status(201).json(result[0])
                return
              }
              res.status(405).json({ message: 'Method not allowed' })
              return
            }

            if (req.method === 'PUT') {
              const { roomType, roomNumber, capacity, costPerNight, notes, participants } = req.body
              const existing = await queryOne(
                `SELECT id FROM route_segment_accommodation_rooms WHERE id = $1 AND accommodation_id = $2`,
                [roomId, accommodationId]
              )
              if (!existing) {
                res.status(404).json({ message: 'Room not found' })
                return
              }
              const result = await query(
                `UPDATE route_segment_accommodation_rooms
                 SET room_type = $1, room_number = $2, capacity = $3, cost_per_night = $4, notes = $5, "updatedAt" = NOW()
                 WHERE id = $6 RETURNING *`,
                [roomType, roomNumber || null, capacity || null, costPerNight || 0, notes || null, roomId]
              )
              await query(`DELETE FROM route_segment_accommodation_room_participants WHERE room_id = $1`, [roomId])
              if (Array.isArray(participants) && participants.length > 0) {
                for (const p of participants) {
                  await query(
                    `INSERT INTO route_segment_accommodation_room_participants (room_id, participant_id, is_couple)
                     VALUES ($1, $2, $3)`,
                    [roomId, p.participantId, p.isCouple || false]
                  )
                }
              }
              res.status(200).json(result[0])
              return
            }

            if (req.method === 'DELETE') {
              const existing = await queryOne(
                `SELECT id FROM route_segment_accommodation_rooms WHERE id = $1 AND accommodation_id = $2`,
                [roomId, accommodationId]
              )
              if (!existing) {
                res.status(404).json({ message: 'Room not found' })
                return
              }
              await query(`DELETE FROM route_segment_accommodation_rooms WHERE id = $1`, [roomId])
              res.status(200).json({ message: 'Room deleted successfully' })
              return
            }

            res.status(405).json({ message: 'Method not allowed' })
            return
          }

          if (req.method === 'DELETE' && accommodationSubRoute === null) {
            const existing = await queryOne(
              `SELECT id FROM route_segment_accommodations WHERE id = $1 AND segment_id = $2`,
              [accommodationId, segmentId]
            )
            if (!existing) {
              res.status(404).json({ message: 'Accommodation not found' })
              return
            }
            await query(`DELETE FROM route_segment_accommodations WHERE id = $1`, [accommodationId])
            res.status(200).json({ message: 'Accommodation deleted successfully' })
            return
          }

          res.status(405).json({ message: 'Method not allowed' })
          return
        }

        if (req.method === 'PUT' || req.method === 'DELETE') {
          if (req.method === 'PUT') {
            const { dayNumber, segmentDate, fromDestinationId, toDestinationId, distance, segmentOrder, notes } = req.body
            const existing = await queryOne(
              `SELECT id FROM route_segments WHERE id = $1 AND route_id = $2`,
              [segmentId, id]
            )
            if (!existing) {
              res.status(404).json({ message: 'Segment not found' })
              return
            }
            const result = await query(
              `UPDATE route_segments 
               SET day_number = $1, segment_date = $2, from_destination_id = $3, to_destination_id = $4, distance = $5, segment_order = $6, notes = $7, "updatedAt" = NOW()
               WHERE id = $8 RETURNING *`,
              [
                dayNumber || 1,
                segmentDate || null,
                fromDestinationId || null,
                toDestinationId || null,
                distance || 0,
                segmentOrder || 1,
                notes || null,
                segmentId
              ]
            )
            res.status(200).json(result[0])
            return
          }
          if (req.method === 'DELETE') {
            const existing = await queryOne(
              `SELECT id FROM route_segments WHERE id = $1 AND route_id = $2`,
              [segmentId, id]
            )
            if (!existing) {
              res.status(404).json({ message: 'Segment not found' })
              return
            }
            await query(`DELETE FROM route_segments WHERE id = $1`, [segmentId])
            res.status(200).json({ message: 'Segment deleted successfully' })
            return
          }
        }
      }

      // /routes/:routeId/logistics
      if (subRoute === 'logistics') {
        const logisticsId = pathArray.length > 3 ? pathArray[3] : null
        if (!logisticsId) {
          if (req.method === 'GET') {
            const logistics = await query(
              `SELECT 
                rl.*,
                CASE 
                  WHEN rl.entity_type = 'hotel' THEN h.name
                  WHEN rl.entity_type = 'third-party' THEN tp.name
                  WHEN rl.entity_type = 'vehicle' THEN v.type || ' - ' || CASE 
                    WHEN v."vehicleOwner" = 'company' THEN 'Company'
                    WHEN v."vehicleOwner" = 'hotel' THEN COALESCE(h.name, 'Hotel')
                    ELSE COALESCE(tp.name, 'Third Party')
                  END
                  WHEN rl.entity_type = 'location' THEN l.name
                  ELSE NULL
                END as entity_name
              FROM route_logistics rl
              LEFT JOIN vehicles v ON rl.entity_type = 'vehicle' AND rl.entity_id = v.id
              LEFT JOIN hotels h ON (rl.entity_type = 'hotel' AND rl.entity_id = h.id) OR (rl.entity_type = 'vehicle' AND v."hotelId" = h.id)
              LEFT JOIN third_parties tp ON (rl.entity_type = 'third-party' AND rl.entity_id = tp.id) OR (rl.entity_type = 'vehicle' AND v."thirdPartyId" = tp.id)
              LEFT JOIN locations l ON rl.entity_type = 'location' AND rl.entity_id = l.id
              WHERE rl.route_id = $1`,
              [id]
            )
            const formatted = logistics.map((log: any) => ({
              id: log.id,
              routeId: log.route_id,
              segmentId: log.segment_id,
              logisticsType: log.logistics_type,
              entityType: log.entity_type,
              entityId: log.entity_id,
              itemName: log.item_name,
              quantity: log.quantity,
              cost: log.cost,
              date: log.date,
              driverPilotName: log.driver_pilot_name,
              isOwnVehicle: log.is_own_vehicle,
              vehicleType: log.vehicle_type,
              notes: log.notes,
              createdAt: log.createdAt,
              updatedAt: log.updatedAt,
              entityName: log.entity_name
            }))
            res.status(200).json(formatted)
            return
          }
          if (req.method === 'POST') {
            const { segmentId, logisticsType, entityId, entityType, itemName, quantity, cost, date, driverPilotName, isOwnVehicle, vehicleType, notes } = req.body
            if (!logisticsType || !entityType) {
              res.status(400).json({ message: 'logisticsType and entityType are required' })
              return
            }
            if (logisticsType !== 'lunch' && logisticsType !== 'extra-cost' && !entityId) {
              res.status(400).json({ message: 'entityId is required' })
              return
            }
            if ((logisticsType === 'lunch' || logisticsType === 'extra-cost') && !itemName) {
              res.status(400).json({ message: 'itemName is required for this type' })
              return
            }
            const logisticsId = randomUUID()
            const result = await query(
              `INSERT INTO route_logistics (id, route_id, segment_id, logistics_type, entity_id, entity_type, item_name, quantity, cost, date, driver_pilot_name, is_own_vehicle, vehicle_type, notes)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
               RETURNING *`,
              [
                logisticsId,
                id,
                segmentId || null,
                logisticsType,
                entityId || null,
                entityType,
                itemName || null,
                quantity || 1,
                cost || 0,
                date || null,
                driverPilotName || null,
                isOwnVehicle || false,
                vehicleType || null,
                notes || null
              ]
            )
            res.status(201).json(result[0])
            return
          }
          res.status(405).json({ message: 'Method not allowed' })
          return
        }

        if (req.method === 'PUT') {
          const { segmentId, logisticsType, entityId, entityType, itemName, quantity, cost, date, driverPilotName, isOwnVehicle, vehicleType, notes } = req.body
          const existing = await queryOne(
            `SELECT id FROM route_logistics WHERE id = $1 AND route_id = $2`,
            [logisticsId, id]
          )
          if (!existing) {
            res.status(404).json({ message: 'Logistics not found' })
            return
          }
          const result = await query(
            `UPDATE route_logistics 
             SET segment_id = $1, logistics_type = $2, entity_id = $3, entity_type = $4, item_name = $5, quantity = $6, cost = $7, date = $8, driver_pilot_name = $9, is_own_vehicle = $10, vehicle_type = $11, notes = $12, "updatedAt" = NOW()
             WHERE id = $13 RETURNING *`,
            [
              segmentId || null,
              logisticsType,
              entityId || null,
              entityType,
              itemName || null,
              quantity || 1,
              cost || 0,
              date || null,
              driverPilotName || null,
              isOwnVehicle || false,
              vehicleType || null,
              notes || null,
              logisticsId
            ]
          )
          res.status(200).json(result[0])
          return
        }

        if (req.method === 'DELETE') {
          const existing = await queryOne('SELECT id FROM route_logistics WHERE id = $1 AND route_id = $2', [logisticsId, id])
          if (!existing) {
            res.status(404).json({ message: 'Logistics not found' })
            return
          }
          await query(`DELETE FROM route_logistics WHERE id = $1`, [logisticsId])
          res.status(200).json({ message: 'Logistics deleted successfully' })
          return
        }

        res.status(405).json({ message: 'Method not allowed' })
        return
      }

      // /routes/:routeId/participants
      if (subRoute === 'participants') {
        const participantId = pathArray.length > 3 ? pathArray[3] : null
        const participantSubRoute = pathArray.length > 4 ? pathArray[4] : null

        if (!participantId) {
          if (req.method === 'GET') {
            const participants = await query(
              `SELECT 
                rp.*,
                c.name as client_name,
                g.name as guide_name
              FROM route_participants rp
              LEFT JOIN clients c ON rp.client_id = c.id
              LEFT JOIN staff g ON rp.guide_id = g.id
              WHERE rp.route_id = $1`,
              [id]
            )
            const formatted = participants.map((p: any) => ({
              id: p.id,
              routeId: p.route_id,
              clientId: p.client_id,
              guideId: p.guide_id,
              role: p.role,
              isOptional: p.is_optional,
              notes: p.notes,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
              clientName: p.client_name,
              guideName: p.guide_name
            }))
            res.status(200).json(formatted)
            return
          }
          if (req.method === 'POST') {
            const { clientId, guideId, role, isOptional, notes } = req.body
            if (!clientId && !guideId) {
              res.status(400).json({ message: 'Client or Staff is required' })
              return
            }
            if (clientId && guideId) {
              res.status(400).json({ message: 'Cannot assign both client and staff to the same participant' })
              return
            }
            const participantId = randomUUID()
            const result = await query(
              `INSERT INTO route_participants (id, route_id, client_id, guide_id, role, is_optional, notes)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               RETURNING *`,
              [
                participantId,
                id,
                clientId || null,
                guideId || null,
                role || null,
                isOptional || false,
                notes || null
              ]
            )
            res.status(201).json(result[0])
            return
          }
          res.status(405).json({ message: 'Method not allowed' })
          return
        }

        if (participantSubRoute === 'segments') {
          if (req.method !== 'PUT') {
            res.status(405).json({ message: 'Method not allowed' })
            return
          }
          const { segmentIds } = req.body
          if (!Array.isArray(segmentIds)) {
            res.status(400).json({ message: 'segmentIds must be an array' })
            return
          }
          await query(`DELETE FROM route_segment_participants WHERE participant_id = $1`, [participantId])
          for (const segmentId of segmentIds) {
            await query(
              `INSERT INTO route_segment_participants (segment_id, participant_id)
               VALUES ($1, $2)
               ON CONFLICT (segment_id, participant_id) DO NOTHING`,
              [segmentId, participantId]
            )
          }
          res.status(200).json({ message: 'Participant segments updated successfully' })
          return
        }

        if (req.method === 'PUT') {
          const { clientId, guideId, role, isOptional, notes } = req.body
          const existing = await queryOne(
            `SELECT id FROM route_participants WHERE id = $1 AND route_id = $2`,
            [participantId, id]
          )
          if (!existing) {
            res.status(404).json({ message: 'Participant not found' })
            return
          }
          const result = await query(
            `UPDATE route_participants
             SET client_id = $1, guide_id = $2, role = $3, is_optional = $4, notes = $5, "updatedAt" = NOW()
             WHERE id = $6 RETURNING *`,
            [
              clientId || null,
              guideId || null,
              role || null,
              isOptional || false,
              notes || null,
              participantId
            ]
          )
          res.status(200).json(result[0])
          return
        }

        if (req.method === 'DELETE') {
          const existing = await queryOne(
            `SELECT id FROM route_participants WHERE id = $1 AND route_id = $2`,
            [participantId, id]
          )
          if (!existing) {
            res.status(404).json({ message: 'Participant not found' })
            return
          }
          await query(`DELETE FROM route_participants WHERE id = $1`, [participantId])
          res.status(200).json({ message: 'Participant removed successfully' })
          return
        }

        res.status(405).json({ message: 'Method not allowed' })
        return
      }

      // /routes/:routeId/transactions
      if (subRoute === 'transactions') {
        if (req.method === 'GET') {
          const transactions = await query(
            `SELECT 
              rt.*,
              a1."accountHolderName" as from_account_name,
              a2."accountHolderName" as to_account_name
            FROM route_transactions rt
            LEFT JOIN accounts a1 ON rt.from_account_id = a1.id
            LEFT JOIN accounts a2 ON rt.to_account_id = a2.id
            WHERE rt.route_id = $1
            ORDER BY rt.transaction_date DESC, rt."createdAt" DESC`,
            [id]
          )
          const formatted = transactions.map((t: any) => ({
            id: t.id,
            routeId: t.route_id,
            transactionDate: t.transaction_date,
            amount: t.amount,
            currency: t.currency,
            paymentMethod: t.payment_method,
            type: t.type,
            description: t.description,
            fromAccountId: t.from_account_id,
            toAccountId: t.to_account_id,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            fromAccountName: t.from_account_name,
            toAccountName: t.to_account_name
          }))
          res.status(200).json(formatted)
          return
        }

        if (req.method === 'POST') {
          const { transactionDate, amount, currency, paymentMethod, type, description, fromAccountId, toAccountId } = req.body
          if (!transactionDate || !amount || !type) {
            res.status(400).json({ message: 'Transaction date, amount and type are required' })
            return
          }
          const transactionId = randomUUID()
          const result = await query(
            `INSERT INTO route_transactions (id, route_id, transaction_date, amount, currency, payment_method, type, description, from_account_id, to_account_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
              transactionId,
              id,
              transactionDate,
              amount,
              currency || 'BRL',
              paymentMethod || null,
              type,
              description || null,
              fromAccountId || null,
              toAccountId || null
            ]
          )
          res.status(201).json(result[0])
          return
        }

        res.status(405).json({ message: 'Method not allowed' })
        return
      }

      // /routes/:routeId/transfers
      if (subRoute === 'transfers') {
        const transferId = pathArray.length > 3 ? pathArray[3] : null
        const transferSubRoute = pathArray.length > 4 ? pathArray[4] : null

        if (!transferId) {
          if (req.method === 'GET') {
            const transfersResult = await query(
              `SELECT 
                rt.*,
                l1.name as from_location_name,
                l2.name as to_location_name
              FROM route_transfers rt
              LEFT JOIN locations l1 ON rt.from_location_id = l1.id
              LEFT JOIN locations l2 ON rt.to_location_id = l2.id
              WHERE rt.route_id = $1
              ORDER BY rt.transfer_date, rt."createdAt"`,
              [id]
            )

            const transferIds = transfersResult.map((t: any) => t.id)
            const vehiclesResult = transferIds.length > 0 ? await query(
              `SELECT 
                rtv.*,
                v.type as vehicle_type,
                CASE 
                  WHEN v."vehicleOwner" = 'company' THEN 'Company'
                  WHEN v."vehicleOwner" = 'hotel' THEN h.name
                  ELSE tp.name
                END as vehicle_owner,
                tp.name as third_party_name,
                h.name as hotel_name
              FROM route_transfer_vehicles rtv
              LEFT JOIN vehicles v ON rtv.vehicle_id = v.id
              LEFT JOIN third_parties tp ON v."thirdPartyId" = tp.id
              LEFT JOIN hotels h ON v."hotelId" = h.id
              WHERE rtv.transfer_id = ANY($1::uuid[])`,
              [transferIds]
            ) : []

            const participantsResult = transferIds.length > 0 ? await query(
              `SELECT 
                rtp.*,
                rp.role,
                COALESCE(c.name, g.name, 'Staff') as participant_name
              FROM route_transfer_participants rtp
              LEFT JOIN route_participants rp ON rtp.participant_id = rp.id
              LEFT JOIN clients c ON rp.client_id = c.id
              LEFT JOIN staff g ON rp.guide_id = g.id
              WHERE rtp.transfer_id = ANY($1::uuid[])`,
              [transferIds]
            ) : []

            const transfers = transfersResult.map((transfer: any) => {
              const vehicles = vehiclesResult
                .filter((v: any) => v.transfer_id === transfer.id)
                .map((v: any) => ({
                  id: v.id,
                  transferId: v.transfer_id,
                  vehicleId: v.vehicle_id,
                  driverPilotName: v.driver_pilot_name,
                  quantity: v.quantity,
                  cost: v.cost,
                  isOwnVehicle: v.is_own_vehicle,
                  notes: v.notes,
                  createdAt: v.createdAt,
                  updatedAt: v.updatedAt,
                  vehicleName: `${v.vehicle_type} - ${v.vehicle_owner || 'Unknown'}`,
                  vehicleType: v.vehicle_type,
                  thirdPartyName: v.third_party_name,
                  hotelName: v.hotel_name
                }))

              const participants = participantsResult
                .filter((p: any) => p.transfer_id === transfer.id)
                .map((p: any) => ({
                  id: p.id,
                  transferId: p.transfer_id,
                  participantId: p.participant_id,
                  createdAt: p.createdAt,
                  participantName: p.participant_name,
                  participantRole: p.role
                }))

              return {
                id: transfer.id,
                routeId: transfer.route_id,
                transferDate: transfer.transfer_date,
                fromLocationId: transfer.from_location_id,
                toLocationId: transfer.to_location_id,
                totalCost: parseFloat(transfer.total_cost),
                notes: transfer.notes,
                createdAt: transfer.createdAt,
                updatedAt: transfer.updatedAt,
                fromLocationName: transfer.from_location_name,
                toLocationName: transfer.to_location_name,
                vehicles,
                participants
              }
            })

            res.status(200).json(transfers)
            return
          }
          if (req.method === 'POST') {
            const { transferDate, fromLocationId, toLocationId, notes, vehicles, participants } = req.body
            if (!transferDate || !fromLocationId || !toLocationId) {
              res.status(400).json({ message: 'transferDate, fromLocationId, and toLocationId are required' })
              return
            }
            if (fromLocationId === toLocationId) {
              res.status(400).json({ message: 'fromLocationId and toLocationId must be different' })
              return
            }

            const newTransferId = randomUUID()
            await query(
              `INSERT INTO route_transfers (id, route_id, transfer_date, from_location_id, to_location_id, notes)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [newTransferId, id, transferDate, fromLocationId, toLocationId, notes || null]
            )

            if (vehicles && Array.isArray(vehicles) && vehicles.length > 0) {
              for (const vehicle of vehicles) {
                if (!vehicle.vehicleId) continue
                await query(
                  `INSERT INTO route_transfer_vehicles (id, transfer_id, vehicle_id, driver_pilot_name, quantity, cost, is_own_vehicle, notes)
                   VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
                  [
                    newTransferId,
                    vehicle.vehicleId,
                    vehicle.driverPilotName || null,
                    vehicle.quantity || 1,
                    vehicle.cost || 0,
                    vehicle.isOwnVehicle || false,
                    vehicle.notes || null
                  ]
                )
              }
            }

            if (participants && Array.isArray(participants) && participants.length > 0) {
              for (const participantId of participants) {
                if (!participantId) continue
                await query(
                  `INSERT INTO route_transfer_participants (id, transfer_id, participant_id)
                   VALUES (gen_random_uuid(), $1, $2)
                   ON CONFLICT (transfer_id, participant_id) DO NOTHING`,
                  [newTransferId, participantId]
                )
              }
            }

            const fullTransferResult = await query(
              `SELECT 
                rt.*,
                l1.name as from_location_name,
                l2.name as to_location_name
              FROM route_transfers rt
              LEFT JOIN locations l1 ON rt.from_location_id = l1.id
              LEFT JOIN locations l2 ON rt.to_location_id = l2.id
              WHERE rt.id = $1`,
              [newTransferId]
            )

            const vehiclesResult = await query(
              `SELECT 
                rtv.*,
                v.type as vehicle_type,
                CASE 
                  WHEN v."vehicleOwner" = 'company' THEN 'Company'
                  WHEN v."vehicleOwner" = 'hotel' THEN h.name
                  ELSE tp.name
                END as vehicle_owner,
                tp.name as third_party_name,
                h.name as hotel_name
              FROM route_transfer_vehicles rtv
              LEFT JOIN vehicles v ON rtv.vehicle_id = v.id
              LEFT JOIN third_parties tp ON v."thirdPartyId" = tp.id
              LEFT JOIN hotels h ON v."hotelId" = h.id
              WHERE rtv.transfer_id = $1`,
              [newTransferId]
            )

            const participantsResult = await query(
              `SELECT 
                rtp.*,
                rp.role,
                COALESCE(c.name, g.name, 'Staff') as participant_name
              FROM route_transfer_participants rtp
              LEFT JOIN route_participants rp ON rtp.participant_id = rp.id
              LEFT JOIN clients c ON rp.client_id = c.id
              LEFT JOIN staff g ON rp.guide_id = g.id
              WHERE rtp.transfer_id = $1`,
              [newTransferId]
            )

            const transfer = fullTransferResult[0]
            const transferVehicles = vehiclesResult.map((v: any) => ({
              id: v.id,
              transferId: v.transfer_id,
              vehicleId: v.vehicle_id,
              driverPilotName: v.driver_pilot_name,
              quantity: v.quantity,
              cost: v.cost,
              isOwnVehicle: v.is_own_vehicle,
              notes: v.notes,
              createdAt: v.createdAt,
              updatedAt: v.updatedAt,
              vehicleName: `${v.vehicle_type} - ${v.vehicle_owner === 'Company' ? 'Company' : (v.third_party_name || 'Third Party')}`,
              vehicleType: v.vehicle_type,
              thirdPartyName: v.third_party_name
            }))

            const transferParticipants = participantsResult.map((p: any) => ({
              id: p.id,
              transferId: p.transfer_id,
              participantId: p.participant_id,
              createdAt: p.createdAt,
              participantName: p.participant_name,
              participantRole: p.role
            }))

            res.status(201).json({
              id: transfer.id,
              routeId: transfer.route_id,
              transferDate: transfer.transfer_date,
              fromLocationId: transfer.from_location_id,
              toLocationId: transfer.to_location_id,
              totalCost: parseFloat(transfer.total_cost),
              notes: transfer.notes,
              createdAt: transfer.createdAt,
              updatedAt: transfer.updatedAt,
              fromLocationName: transfer.from_location_name,
              toLocationName: transfer.to_location_name,
              vehicles: transferVehicles,
              participants: transferParticipants
            })
            return
          }
          res.status(405).json({ message: 'Method not allowed' })
          return
        }

        if (transferSubRoute === 'vehicles') {
          const transferVehicleId = pathArray.length > 5 ? pathArray[5] : null
          if (!transferVehicleId) {
            if (req.method !== 'POST') {
              res.status(405).json({ message: 'Method not allowed' })
              return
            }
            const { vehicleId, driverPilotName, quantity, cost, isOwnVehicle, notes } = req.body
            if (!vehicleId) {
              res.status(400).json({ message: 'vehicleId is required' })
              return
            }
            const transferCheck = await queryOne(
              'SELECT id FROM route_transfers WHERE id = $1 AND route_id = $2',
              [transferId, id]
            )
            if (!transferCheck) {
              res.status(404).json({ message: 'Transfer not found' })
              return
            }

            const newVehicleId = randomUUID()
            await query(
              `INSERT INTO route_transfer_vehicles (id, transfer_id, vehicle_id, driver_pilot_name, quantity, cost, is_own_vehicle, notes)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [newVehicleId, transferId, vehicleId, driverPilotName || null, quantity || 1, cost || 0, isOwnVehicle || false, notes || null]
            )

            const vehicleResult = await query(
              `SELECT 
                rtv.*,
                v.type as vehicle_type,
                CASE 
                  WHEN v."vehicleOwner" = 'company' THEN 'Company'
                  WHEN v."vehicleOwner" = 'hotel' THEN h.name
                  ELSE tp.name
                END as vehicle_owner,
                tp.name as third_party_name,
                h.name as hotel_name
              FROM route_transfer_vehicles rtv
              LEFT JOIN vehicles v ON rtv.vehicle_id = v.id
              LEFT JOIN third_parties tp ON v."thirdPartyId" = tp.id
              LEFT JOIN hotels h ON v."hotelId" = h.id
              WHERE rtv.id = $1`,
              [newVehicleId]
            )
            const v = vehicleResult[0]
            res.status(201).json({
              id: v.id,
              transferId: v.transfer_id,
              vehicleId: v.vehicle_id,
              driverPilotName: v.driver_pilot_name,
              quantity: v.quantity,
              cost: v.cost,
              isOwnVehicle: v.is_own_vehicle,
              notes: v.notes,
              createdAt: v.createdAt,
              updatedAt: v.updatedAt,
              vehicleName: `${v.vehicle_type} - ${v.vehicle_owner === 'Company' ? 'Company' : (v.third_party_name || 'Third Party')}`,
              vehicleType: v.vehicle_type,
              thirdPartyName: v.third_party_name
            })
            return
          }

          if (req.method === 'DELETE') {
            const transferCheck = await queryOne(
              'SELECT id FROM route_transfers WHERE id = $1 AND route_id = $2',
              [transferId, id]
            )
            if (!transferCheck) {
              res.status(404).json({ message: 'Transfer not found' })
              return
            }
            const result = await query(
              'DELETE FROM route_transfer_vehicles WHERE id = $1 AND transfer_id = $2 RETURNING id',
              [transferVehicleId, transferId]
            )
            if (result.length === 0) {
              res.status(404).json({ message: 'Vehicle not found in transfer' })
              return
            }
            res.status(200).json({ message: 'Vehicle removed from transfer successfully' })
            return
          }

          res.status(405).json({ message: 'Method not allowed' })
          return
        }

        if (transferSubRoute === 'participants') {
          const transferParticipantId = pathArray.length > 5 ? pathArray[5] : null
          if (!transferParticipantId) {
            if (req.method !== 'POST') {
              res.status(405).json({ message: 'Method not allowed' })
              return
            }
            const { participantId } = req.body
            if (!participantId) {
              res.status(400).json({ message: 'participantId is required' })
              return
            }
            const transferCheck = await queryOne(
              'SELECT id FROM route_transfers WHERE id = $1 AND route_id = $2',
              [transferId, id]
            )
            if (!transferCheck) {
              res.status(404).json({ message: 'Transfer not found' })
              return
            }
            const participantCheck = await queryOne(
              'SELECT id FROM route_participants WHERE id = $1 AND route_id = $2',
              [participantId, id]
            )
            if (!participantCheck) {
              res.status(404).json({ message: 'Participant not found in route' })
              return
            }
            const participantId_uuid = randomUUID()
            const result = await query(
              `INSERT INTO route_transfer_participants (id, transfer_id, participant_id)
               VALUES ($1, $2, $3)
               ON CONFLICT (transfer_id, participant_id) DO NOTHING
               RETURNING *`,
              [participantId_uuid, transferId, participantId]
            )
            if (result.length === 0) {
              res.status(409).json({ message: 'Participant already in transfer' })
              return
            }
            const participantResult = await queryOne(
              `SELECT 
                rtp.*,
                rp.role,
                COALESCE(c.name, g.name, 'Staff') as participant_name
              FROM route_transfer_participants rtp
              LEFT JOIN route_participants rp ON rtp.participant_id = rp.id
              LEFT JOIN clients c ON rp.client_id = c.id
              LEFT JOIN staff g ON rp.guide_id = g.id
              WHERE rtp.id = $1`,
              [participantId_uuid]
            )
            const p = participantResult
            res.status(201).json({
              id: p.id,
              transferId: p.transfer_id,
              participantId: p.participant_id,
              createdAt: p.createdAt,
              participantName: p.participant_name,
              participantRole: p.role
            })
            return
          }

          if (req.method === 'DELETE') {
            const transferCheck = await queryOne(
              'SELECT id FROM route_transfers WHERE id = $1 AND route_id = $2',
              [transferId, id]
            )
            if (!transferCheck) {
              res.status(404).json({ message: 'Transfer not found' })
              return
            }
            const result = await query(
              'DELETE FROM route_transfer_participants WHERE id = $1 AND transfer_id = $2 RETURNING id',
              [transferParticipantId, transferId]
            )
            if (result.length === 0) {
              res.status(404).json({ message: 'Participant not found in transfer' })
              return
            }
            res.status(200).json({ message: 'Participant removed from transfer successfully' })
            return
          }

          res.status(405).json({ message: 'Method not allowed' })
          return
        }

        if (transferSubRoute === null) {
          if (req.method === 'GET') {
            const transferResult = await query(
              `SELECT 
                rt.*,
                l1.name as from_location_name,
                l2.name as to_location_name
              FROM route_transfers rt
              LEFT JOIN locations l1 ON rt.from_location_id = l1.id
              LEFT JOIN locations l2 ON rt.to_location_id = l2.id
              WHERE rt.id = $1 AND rt.route_id = $2`,
              [transferId, id]
            )
            if (transferResult.length === 0) {
              res.status(404).json({ message: 'Transfer not found' })
              return
            }
            const transfer = transferResult[0]

            const vehiclesResult = await query(
              `SELECT 
                rtv.*,
                v.type as vehicle_type,
                CASE 
                  WHEN v."vehicleOwner" = 'company' THEN 'Company'
                  WHEN v."vehicleOwner" = 'hotel' THEN h.name
                  ELSE tp.name
                END as vehicle_owner,
                tp.name as third_party_name,
                h.name as hotel_name
              FROM route_transfer_vehicles rtv
              LEFT JOIN vehicles v ON rtv.vehicle_id = v.id
              LEFT JOIN third_parties tp ON v."thirdPartyId" = tp.id
              LEFT JOIN hotels h ON v."hotelId" = h.id
              WHERE rtv.transfer_id = $1`,
              [transferId]
            )

            const participantsResult = await query(
              `SELECT 
                rtp.*,
                rp.role,
                COALESCE(c.name, g.name, 'Staff') as participant_name
              FROM route_transfer_participants rtp
              LEFT JOIN route_participants rp ON rtp.participant_id = rp.id
              LEFT JOIN clients c ON rp.client_id = c.id
              LEFT JOIN staff g ON rp.guide_id = g.id
              WHERE rtp.transfer_id = $1`,
              [transferId]
            )

            const vehicles = vehiclesResult.map((v: any) => ({
              id: v.id,
              transferId: v.transfer_id,
              vehicleId: v.vehicle_id,
              driverPilotName: v.driver_pilot_name,
              quantity: v.quantity,
              cost: v.cost,
              isOwnVehicle: v.is_own_vehicle,
              notes: v.notes,
              createdAt: v.createdAt,
              updatedAt: v.updatedAt,
              vehicleName: `${v.vehicle_type} - ${v.vehicle_owner === 'Company' ? 'Company' : (v.third_party_name || 'Third Party')}`,
              vehicleType: v.vehicle_type,
              thirdPartyName: v.third_party_name
            }))

            const participants = participantsResult.map((p: any) => ({
              id: p.id,
              transferId: p.transfer_id,
              participantId: p.participant_id,
              createdAt: p.createdAt,
              participantName: p.participant_name,
              participantRole: p.role
            }))

            res.status(200).json({
              id: transfer.id,
              routeId: transfer.route_id,
              transferDate: transfer.transfer_date,
              fromLocationId: transfer.from_location_id,
              toLocationId: transfer.to_location_id,
              totalCost: parseFloat(transfer.total_cost),
              notes: transfer.notes,
              createdAt: transfer.createdAt,
              updatedAt: transfer.updatedAt,
              fromLocationName: transfer.from_location_name,
              toLocationName: transfer.to_location_name,
              vehicles,
              participants
            })
            return
          }

          if (req.method === 'PUT') {
            const { transferDate, fromLocationId, toLocationId, notes, vehicles, participants } = req.body
            if (!transferDate || !fromLocationId || !toLocationId) {
              res.status(400).json({ message: 'transferDate, fromLocationId, and toLocationId are required' })
              return
            }
            if (fromLocationId === toLocationId) {
              res.status(400).json({ message: 'fromLocationId and toLocationId must be different' })
              return
            }
            const result = await query(
              `UPDATE route_transfers
               SET transfer_date = $1, from_location_id = $2, to_location_id = $3, notes = $4, "updatedAt" = NOW()
               WHERE id = $5 AND route_id = $6
               RETURNING *`,
              [transferDate, fromLocationId, toLocationId, notes || null, transferId, id]
            )
            if (result.length === 0) {
              res.status(404).json({ message: 'Transfer not found' })
              return
            }

            await query('DELETE FROM route_transfer_vehicles WHERE transfer_id = $1', [transferId])
            await query('DELETE FROM route_transfer_participants WHERE transfer_id = $1', [transferId])

            if (vehicles && Array.isArray(vehicles) && vehicles.length > 0) {
              for (const vehicle of vehicles) {
                if (!vehicle.vehicleId) continue
                await query(
                  `INSERT INTO route_transfer_vehicles (id, transfer_id, vehicle_id, driver_pilot_name, quantity, cost, is_own_vehicle, notes)
                   VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
                  [
                    transferId,
                    vehicle.vehicleId,
                    vehicle.driverPilotName || null,
                    vehicle.quantity || 1,
                    vehicle.cost || 0,
                    vehicle.isOwnVehicle || false,
                    vehicle.notes || null
                  ]
                )
              }
            }

            if (participants && Array.isArray(participants) && participants.length > 0) {
              for (const participantId of participants) {
                if (!participantId) continue
                await query(
                  `INSERT INTO route_transfer_participants (id, transfer_id, participant_id)
                   VALUES (gen_random_uuid(), $1, $2)
                   ON CONFLICT (transfer_id, participant_id) DO NOTHING`,
                  [transferId, participantId]
                )
              }
            }

            const updatedTransfer = result[0]
            res.status(200).json(updatedTransfer)
            return
          }

          if (req.method === 'DELETE') {
            const result = await query(
              'DELETE FROM route_transfers WHERE id = $1 AND route_id = $2 RETURNING id',
              [transferId, id]
            )
            if (result.length === 0) {
              res.status(404).json({ message: 'Transfer not found' })
              return
            }
            res.status(200).json({ message: 'Transfer deleted successfully' })
            return
          }
        }

        res.status(405).json({ message: 'Method not allowed' })
        return
      }

      res.status(404).json({ message: 'Route not found', route, pathArray })
      return
    }

    res.status(404).json({ message: 'Route not found', route, pathArray })
  } catch (error: any) {
    console.error('API Handler Error:', error)
    res.status(500).json({ message: error.message || 'Internal server error' })
  }
}
