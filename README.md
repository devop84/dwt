# Downwinder Tour Management System

A comprehensive web application for managing downwinder tours, built with Vite, React, TypeScript, and Tailwind CSS.

## Features

- **Authentication System**: Role-based access control (Admin, Guide, Client)
- **Downwinder Management**: Create, edit, and manage downwinder tours
- **Client Management**: View and manage client bookings
- **Spot Management**: Manage tour spots and locations
- **Hotel Management**: Track hotels and accommodations
- **Logistics Organization**: Manage cars, transfers, guides, food, boat support, quad bikes, and more
- **Booking System**: Handle client bookings for downwinders

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Vercel Serverless Functions (Node.js)
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Authentication**: JWT-based authentication
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon or local)
- Vercel CLI (optional, for local development)

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
cd api && npm install && cd ..
```

2. Set up environment variables:
Create a `.env` file in the root directory:
```env
DATABASE_URL="your-postgresql-connection-string"
JWT_SECRET="your-jwt-secret-key-change-this-in-production"
VITE_API_URL="http://localhost:3000/api"
```

3. Set up the database:
```bash
npm run db:generate
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Local API Development (Optional)

To test API endpoints locally with Vercel:

```bash
npx vercel dev
```

This will start both the frontend and API serverless functions.

## Project Structure

```
.
├── src/              # Frontend React application
│   ├── components/   # Reusable UI components
│   ├── pages/        # Page components
│   ├── lib/          # Utility functions and API clients
│   ├── types/        # TypeScript type definitions
│   ├── contexts/     # React contexts (Auth, etc.)
│   └── App.tsx       # Main app component
├── api/              # Vercel serverless functions
│   ├── auth/         # Authentication endpoints
│   ├── downwinders/  # Downwinder CRUD endpoints
│   ├── spots/        # Spot management endpoints
│   ├── hotels/       # Hotel management endpoints
│   ├── clients/      # Client management endpoints
│   ├── bookings/     # Booking endpoints
│   ├── logistics/    # Logistics endpoints
│   └── lib/          # Shared API utilities
├── prisma/           # Database schema and migrations
└── vercel.json       # Vercel configuration
```

## User Roles

- **ADMIN**: Full access to all features
- **GUIDE**: Can manage downwinders, spots, hotels, clients, and logistics
- **CLIENT**: Can view and book downwinders

## Deployment

### Deploy to Vercel

1. Push your code to GitHub

2. Import the repository in [Vercel](https://vercel.com)

3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `JWT_SECRET`: A secure random string for JWT signing (use a strong random string)
   - Optionally, set `VITE_API_URL` if you want to customize the API URL

4. Configure build settings:
   - Framework Preset: Vite
   - Build Command: `npm run build && npm run db:generate`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. Deploy!

### Setting up Neon Database

1. Create a project at [Neon](https://neon.tech)
2. Copy your connection string
3. Add it as `DATABASE_URL` in Vercel environment variables
4. Run migrations: The schema will be pushed on first deployment

### Initial Admin User

After deployment, you'll need to create an admin user. You can do this by:

1. Registering through the app (will create a CLIENT by default)
2. Manually updating the database to set role to ADMIN
3. Or creating a seed script to initialize an admin user

## Database Schema

The app uses Prisma with PostgreSQL. Key models include:

- **User**: Authentication and user profiles (roles: ADMIN, GUIDE, CLIENT)
- **Downwinder**: Tour information with dates, status, and capacity
- **Spot**: Locations where downwinders take place
- **Hotel**: Accommodation information
- **Booking**: Client bookings for downwinders
- **Logistics**: Various logistics items (cars, transfers, food, boats, etc.)
- **DownwinderSpot**: Many-to-many relationship between downwinders and spots
- **DownwinderGuide**: Many-to-many relationship between downwinders and guides

## API Endpoints

All API endpoints are prefixed with `/api`:

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `GET /api/downwinders` - List all downwinders
- `POST /api/downwinders` - Create downwinder
- `GET /api/downwinders/:id` - Get downwinder details
- `PUT /api/downwinders/:id` - Update downwinder
- `DELETE /api/downwinders/:id` - Delete downwinder
- Similar endpoints for `/api/spots`, `/api/hotels`, `/api/clients`, `/api/bookings`, `/api/logistics`

## Development

### Running Database Migrations

```bash
npm run db:migrate    # Create a new migration
npm run db:push       # Push schema changes without migration
npm run db:studio     # Open Prisma Studio (database GUI)
```

### TypeScript

The project uses strict TypeScript. Both frontend and API have their own `tsconfig.json` files.

## Security Notes

- Passwords are hashed using bcrypt
- JWT tokens expire after 7 days
- API routes are protected with authentication middleware
- Role-based access control enforced on sensitive endpoints

## License

MIT