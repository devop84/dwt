# Troubleshooting 404 Error for /api/clients

## ✅ Database Connection: VERIFIED
- Database is connected and working
- Clients table has been created successfully
- All required columns are present

## 🔍 Common Causes of 404 Error

### 1. **Local Development: API Server Not Running**

**Problem**: The Express server (`server.js`) is not running on port 5000.

**Solution**:
```bash
# Make sure you're running the full dev command:
npm run dev

# This starts both:
# - Vite dev server (port 3000) - frontend
# - Express server (port 5000) - API
```

**Check if server is running**:
- Open http://localhost:5000/api/test-db
- Should return database connection info
- If you get "connection refused", the server is not running

### 2. **Vercel Deployment: Route Not Deployed**

**Problem**: The serverless function might not be deployed yet.

**Solution**:
1. Make sure `api/clients/index.ts` is committed to git
2. Push to GitHub to trigger Vercel deployment
3. Check Vercel dashboard → Functions tab
4. Verify `api/clients/index.ts` appears in the functions list

### 3. **Authentication Token Missing**

**Problem**: The API requires authentication, but token is not being sent.

**Check**:
- Open browser DevTools → Network tab
- Look for the `/api/clients` request
- Check if `Authorization: Bearer <token>` header is present
- If missing, you need to log in first

### 4. **Wrong Base URL**

**Problem**: Frontend is trying to reach wrong API endpoint.

**Check**:
- In `src/lib/api.ts`, `baseURL` should be `/api`
- In local dev, Vite proxy forwards `/api/*` to `http://localhost:5000/api/*`
- In production (Vercel), `/api/*` routes to serverless functions

## 🧪 Quick Test

### Test Database Connection:
```bash
node scripts/test-clients-db.js
```

### Test API Endpoint (if server is running):
```bash
# First, get a token by logging in, then:
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/clients
```

### Test in Browser:
1. Open http://localhost:3000
2. Log in
3. Navigate to Clients page
4. Open DevTools → Network tab
5. Check the `/api/clients` request:
   - Status should be 200 (not 404)
   - Response should be an empty array `[]` (no clients yet)

## 📝 Current Status

✅ Database: Connected  
✅ Clients Table: Created  
✅ API Route (Local): Configured in `server.js`  
✅ API Route (Vercel): Configured in `api/clients/index.ts`  
✅ Frontend: Configured in `src/pages/ClientsList.tsx`  

## 🚀 Next Steps

1. **If running locally**: Make sure `npm run dev` is running
2. **If on Vercel**: Push your changes and wait for deployment
3. **Check browser console**: Look for the exact error message
4. **Verify authentication**: Make sure you're logged in before accessing `/clients`
