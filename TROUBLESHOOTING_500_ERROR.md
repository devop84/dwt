# Troubleshooting 500 Error on Login API

## Problem
The `/api/auth/login` endpoint returns a 500 error on Vercel-hosted deployment.

## Root Causes

### 1. Missing Environment Variables (Most Common)
The `DATABASE_URL` environment variable is not set in Vercel.

**⚠️ IMPORTANT: VITE_ Prefix vs No Prefix**

**For Vercel Serverless Functions (API routes):**
- Use `DATABASE_URL` (NO `VITE_` prefix)
- Use `JWT_SECRET` (NO `VITE_` prefix)
- These run in Node.js and access `process.env.DATABASE_URL` directly

**For Client-Side Code (Vite):**
- Use `VITE_` prefix (e.g., `VITE_API_URL`)
- Only for variables that need to be exposed to the browser
- ⚠️ **Never expose `DATABASE_URL` or `JWT_SECRET` to the client!**

**Solution:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables **WITHOUT** the `VITE_` prefix:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `JWT_SECRET` - Your JWT secret key
5. Make sure they're set for **Production**, **Preview**, and **Development** environments
6. Click **Save** and **Redeploy** your application

**Example DATABASE_URL format:**
```
postgresql://username:password@hostname:5432/database?sslmode=require
```

**Note:** If you have `VITE_DATABASE_URL` and `VITE_JWT_SECRET` set, you need to add `DATABASE_URL` and `JWT_SECRET` separately for the API routes to work. The serverless functions cannot access `VITE_` prefixed variables.

### 2. Database Connection Issues
- Database server might be unreachable from Vercel
- SSL certificate issues
- Firewall blocking connections
- Incorrect connection string

**Solution:**
- Verify your database allows connections from Vercel's IP addresses
- Check if your database requires SSL (most cloud databases do)
- Test the connection string locally

### 3. Database Tables Not Initialized
If the database connection works but tables don't exist, initialization might be failing silently.

**Solution:**
- Check Vercel function logs for initialization errors
- The improved error handling will now show detailed error messages

## Improved Error Handling

The following improvements have been made to help diagnose issues:

### 1. Better Error Logging
- Database connection errors are now logged with full details
- Missing environment variables throw clear error messages
- Database initialization steps are logged

### 2. Lazy Database Pool Initialization
- Database pool is only created when needed (at runtime)
- Environment variables are checked at runtime, not module load time
- This prevents module-load-time errors

### 3. Error Propagation
- Database initialization errors are properly propagated to API endpoints
- API endpoints return descriptive error messages
- Development mode shows detailed error information

## How to Check Logs

1. Go to Vercel Dashboard → Your Project → **Deployments**
2. Click on the latest deployment
3. Go to **Functions** tab
4. Click on `/api/auth/login`
5. Check the **Logs** tab for error messages

Look for:
- `❌ DATABASE_URL environment variable is not set!`
- `❌ DB init error: ...`
- `❌ Database initialization failed in login: ...`

## Quick Checklist

- [ ] `DATABASE_URL` is set in Vercel environment variables (**WITHOUT** `VITE_` prefix)
- [ ] `JWT_SECRET` is set in Vercel environment variables (**WITHOUT** `VITE_` prefix)
- [ ] Variables are set for **Production**, **Preview**, and **Development** environments
- [ ] Database allows connections from Vercel
- [ ] Connection string includes SSL parameters if required
- [ ] Tables exist (or can be created) in the database
- [ ] Vercel function logs show specific error messages
- [ ] Application has been **redeployed** after adding environment variables

## Testing Locally

To test if your environment variables are correct:

1. Create a `.env` file in the project root:
   ```
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_jwt_secret
   ```

2. Test the login endpoint:
   ```bash
   npm run dev
   ```

3. Try logging in through the UI or test the API directly

## Still Having Issues?

If you've verified all the above and still getting 500 errors:

1. Check the Vercel function logs for the specific error message
2. Verify the database connection string format is correct
3. Test database connectivity from a local machine using the same connection string
4. Check if your database provider has IP whitelisting enabled (disable it or add Vercel IPs)
5. Verify your database is running and accessible
