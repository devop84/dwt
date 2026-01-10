# Deployment Checklist

## Environment Variables on Vercel

Make sure you have the following environment variables set in your Vercel project dashboard:

### Required:
- `DATABASE_URL` - Your PostgreSQL connection string (from Neon)
- `JWT_SECRET` - A secure random string for JWT tokens

### Important - DO NOT SET:
- ❌ **DO NOT** set `VITE_API_URL` in Vercel environment variables unless you want to override the API URL
- ❌ **NEVER** set `VITE_API_URL` to `http://localhost:3000/api` or any localhost URL

### How to Set Environment Variables:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - `DATABASE_URL` = `your-neon-postgresql-connection-string`
   - `JWT_SECRET` = `your-secret-key-here` (use a strong random string)
4. **DO NOT** add `VITE_API_URL` unless you have a specific reason

## How API Routes Work

- **Production on Vercel**: API routes are automatically served at `https://your-domain.vercel.app/api/*`
- **Local Development**: Use `npm run dev:full` (runs `vercel dev`) to serve API routes
- **Relative Paths**: The app uses `/api` as a relative path, which works in both production and development

## If You See Localhost in Production

If your app is trying to connect to `localhost` in production:

1. **Check Vercel Environment Variables**: 
   - Go to Settings → Environment Variables
   - Look for `VITE_API_URL`
   - If it's set to localhost, DELETE IT
   - Only set `VITE_API_URL` if you want to use a different production API URL

2. **Redeploy**: After removing/changing environment variables, trigger a new deployment

3. **Clear Browser Cache**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R) or clear cache

4. **Check the Build**: Make sure the build is using the correct API URL
