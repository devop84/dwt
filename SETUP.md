# Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install API dependencies
cd api
npm install
cd ..
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Database (get from Neon.tech)
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# JWT Secret (generate a random string for production)
JWT_SECRET="your-super-secret-jwt-key-change-this"

# API URL (for local development)
VITE_API_URL="http://localhost:3000/api"
```

### 3. Set Up Database

1. Create a Neon database at https://neon.tech
2. Copy the connection string
3. Add it to `.env` as `DATABASE_URL`
4. Run Prisma commands:

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

### 4. Start Development Server

```bash
# Start Vite dev server (frontend)
npm run dev

# Or start with Vercel (frontend + API)
npx vercel dev
```

## Creating Your First Admin User

1. Register through the app (creates a CLIENT by default)
2. Open Prisma Studio:
   ```bash
   npm run db:studio
   ```
3. Navigate to Users table
4. Find your user and change `role` from `CLIENT` to `ADMIN`
5. Save changes

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to https://vercel.com
2. Click "Import Project"
3. Select your GitHub repository
4. Configure:
   - Framework Preset: Vite
   - Build Command: `npm run build && npm run db:generate`
   - Output Directory: `dist`
   - Install Command: `npm install`

### 3. Set Environment Variables in Vercel

In Vercel dashboard → Settings → Environment Variables:

- `DATABASE_URL`: Your Neon connection string
- `JWT_SECRET`: A strong random string (you can generate one)
- `VITE_API_URL`: Leave empty (will use relative paths)

### 4. Deploy

Click "Deploy" and wait for the build to complete.

## Troubleshooting

### Database Connection Issues

- Ensure your DATABASE_URL includes `?sslmode=require`
- Check that Neon allows connections from your IP
- Verify credentials are correct

### API Not Working

- Check that API routes are in `/api` folder
- Verify `vercel.json` has correct rewrites
- Check browser console for CORS errors

### Build Errors

- Make sure all dependencies are installed
- Run `npm run db:generate` before building
- Check that all TypeScript errors are resolved

## Next Steps

- Add more spots and hotels
- Create your first downwinder
- Add guides to downwinders
- Set up logistics items
- Invite clients to book