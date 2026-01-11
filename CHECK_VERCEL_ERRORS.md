# How to Check Vercel Errors and Fix the 500 Login Error

## Step 1: Check Vercel Function Logs

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`dwt-umber`)
3. Click on **Deployments** tab
4. Click on the **latest deployment** (the one at the top)
5. Click on **Functions** tab
6. Find `/api/auth/login` in the list
7. Click on it
8. Click on **Logs** tab

Look for error messages starting with:
- `❌ DATABASE_URL environment variable is not set!`
- `❌ Database initialization failed in login:`
- `❌ DB init error:`
- Any database connection errors

## Step 2: Verify Environment Variables in Vercel

1. In Vercel Dashboard → Your Project → **Settings**
2. Click on **Environment Variables**
3. Check that you have these variables **WITHOUT** `VITE_` prefix:
   - `DATABASE_URL` ✅ (should exist)
   - `JWT_SECRET` ✅ (should exist)

4. **Important**: These should be set for:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. If they're missing or have `VITE_` prefix:
   - Add `DATABASE_URL` (copy value from `VITE_DATABASE_URL` if needed)
   - Add `JWT_SECRET` (use the strong random string from `.env`)
   - **Make sure they don't have `VITE_` prefix!**
   - Click **Save**
   - **Redeploy** your application

## Step 3: Check Browser Console

After trying to login again, open your browser's Developer Console (F12) and check:

1. **Console Tab**: Look for error logs that start with "Login error:"
2. **Network Tab**: 
   - Click on the failed `/api/auth/login` request
   - Check the **Response** tab to see the error message
   - Check the **Headers** tab to verify the request is being sent correctly

## Step 4: Common Issues and Solutions

### Issue 1: "DATABASE_URL not configured"
**Solution**: Add `DATABASE_URL` environment variable in Vercel (without `VITE_` prefix)

### Issue 2: Database connection timeout
**Solution**: 
- Verify your database allows connections from Vercel
- Check if your database requires SSL (should be in connection string)
- Verify the connection string format

### Issue 3: "Invalid credentials"
**Solution**: This is actually a 401 error, not 500. Check:
- Username/email is correct
- Password is correct
- User exists in database

## Step 5: Redeploy After Changes

After adding/updating environment variables:
1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger a new deployment

## Step 6: Test Again

1. Try logging in again
2. Check browser console for error details
3. Check Vercel function logs again if it still fails

## Quick Verification Checklist

- [ ] `DATABASE_URL` exists in Vercel environment variables (no `VITE_` prefix)
- [ ] `JWT_SECRET` exists in Vercel environment variables (no `VITE_` prefix)
- [ ] Both are set for Production, Preview, and Development
- [ ] Application has been redeployed after adding variables
- [ ] Checked Vercel function logs for specific error
- [ ] Checked browser console for error details

## What to Share for Further Help

If you're still getting errors, please share:
1. The error message from Vercel function logs
2. The error message from browser console
3. A screenshot of your Vercel Environment Variables page (blur sensitive values)
4. Whether you've added `DATABASE_URL` and `JWT_SECRET` without `VITE_` prefix
