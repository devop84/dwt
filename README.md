# Simple Vite + React Authentication App

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your-secret-key-change-in-production
   ```

3. **Test database connection:**
   ```bash
   npm run test:db
   ```

4. **Run locally:**
   ```bash
   npm run dev
   ```
   This starts both:
   - Frontend (Vite) at http://localhost:3000
   - API server (Express) at http://localhost:5000

## Project Structure

- `src/` - React frontend (Vite)
- `api/` - Vercel serverless functions (raw SQL with pg)

## Environment Variables

Set `DATABASE_URL` in Vercel dashboard or `.env` for local development.

## Deploy to Vercel

1. Push to GitHub
2. Connect repo to Vercel
3. Set `DATABASE_URL` in Vercel environment variables
4. Deploy

That's it!
