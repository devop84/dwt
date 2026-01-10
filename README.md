# Downwinder Tour App

Simple authentication app with login and signup pages.

## Local Development

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon or local)
- Vercel CLI installed globally (optional): `npm install -g vercel`

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="your-postgresql-connection-string"
   JWT_SECRET="your-secret-key-here"
   ```

3. **Set up the database:**
   ```bash
   npm run db:push
   ```
   This will create the `users` table in your database.

4. **Generate Prisma Client:**
   ```bash
   npm run db:generate
   ```

### Running the Development Server

**IMPORTANT:** For local development with API routes, you MUST use `vercel dev`:

```bash
npm run dev:full
```

Or:

```bash
npx vercel dev
```

This will:
- Start the Vite frontend dev server
- Serve the API routes at `/api/*`
- Make everything available at `http://localhost:3000` (or the port Vercel assigns)

**DO NOT use `npm run dev` alone** - it only runs Vite and won't serve API routes, causing 404 errors.

### Available Scripts

- `npm run dev` - Run Vite dev server only (frontend only, no API routes)
- `npm run dev:full` - Run full-stack dev server with Vite + API routes (recommended)
- `npm run build` - Build for production
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database

## Project Structure

```
.
├── api/              # Vercel serverless functions
│   ├── auth/         # Authentication endpoints
│   └── lib/          # Shared utilities
├── src/
│   ├── components/   # React components
│   ├── contexts/     # React contexts (AuthContext)
│   ├── lib/          # Client-side utilities
│   ├── pages/        # Page components
│   └── types/        # TypeScript types
└── prisma/           # Database schema
```

## Environment Variables

Set these in your `.env` file for local development, or in Vercel dashboard for production:

- `DATABASE_URL` - PostgreSQL connection string (required)
- `JWT_SECRET` - Secret key for JWT tokens (required)
- `VITE_API_URL` - Optional, override API base URL

## Deployment

The app is configured for Vercel deployment. Just push to your GitHub repository and Vercel will automatically deploy.

Make sure to set the environment variables in the Vercel dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add `DATABASE_URL` and `JWT_SECRET`
