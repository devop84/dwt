# Quick Fix: Vercel Not Deploying

## ❌ Vercel Rate Limit Hit (100 deployments/day)

**Error**: "Resource is limited - try again in 23 hours"

### Solution Options:

1. **Wait 24 hours** - The limit resets daily
2. **Upgrade to Pro plan** - Unlimited deployments ($20/month)
3. **Reduce deployment frequency** - Only deploy when necessary
4. **Use preview deployments** - These count separately
5. **Deploy locally and test** - Use `npm run dev` for development

### How to Reduce Deployments:

- Only commit and push when you have meaningful changes
- Use feature branches and deploy from main/master only
- Disable auto-deploy for draft PRs in Vercel settings
- Test locally before pushing to avoid failed deployments

---

## Most Common Issue: Vercel Not Connected to GitHub

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Click on your project** (or create new if needed)
3. **Go to Settings → Git**
4. **Check if GitHub is connected:**
   - If NOT connected: Click "Connect Git Repository" → Select your repo
   - If connected: Check the branch (should be `main` or `master`)

5. **Verify Auto-deploy is ON:**
   - In Settings → Git → Production Branch
   - Make sure "Automatically deploy" is enabled

6. **Test by pushing:**
   ```bash
   git add .
   git commit -m "Trigger deployment"
   git push origin main
   ```

## If Still Not Working:

### Option 1: Manual Deploy
1. Go to Vercel Dashboard → Deployments
2. Click "Redeploy" on any deployment
3. Or click "Deploy" → "Deploy from GitHub"

### Option 2: Reconnect Repository
1. Settings → Git → Disconnect repository
2. Connect Git Repository again
3. Select your GitHub repo
4. Configure:
   - Framework: Vite
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`

### Option 3: Check GitHub Webhook
1. Go to GitHub repo → Settings → Webhooks
2. Look for Vercel webhook
3. Check if it's active and recent deliveries show success

## Required Environment Variables in Vercel:

Go to Vercel Dashboard → Settings → Environment Variables and add:
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - Your JWT secret key

Make sure to set them for **Production**, **Preview**, and **Development** environments.
