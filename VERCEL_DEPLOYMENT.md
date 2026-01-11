# Vercel Deployment Troubleshooting

## Issue: Vercel not deploying on GitHub push

### Step 1: Check Vercel Connection to GitHub

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Git**
4. Verify:
   - ✅ GitHub repository is connected
   - ✅ Branch is set correctly (usually `main` or `master`)
   - ✅ **Auto-deploy** is enabled

### Step 2: Verify Webhook is Active

1. In Vercel dashboard → **Settings** → **Git**
2. Check if webhook URL is present
3. You can test by clicking "Redeploy" manually

### Step 3: Check GitHub Repository Settings

1. Go to your GitHub repo → **Settings** → **Webhooks**
2. Verify Vercel webhook exists and is active
3. Check recent deliveries for errors

### Step 4: Manually Trigger Deployment

1. In Vercel dashboard, click **Deployments**
2. Click **Redeploy** on the latest deployment
3. Check build logs for errors

### Step 5: Check Build Logs

If deployment fails, check the build logs for:
- Missing environment variables (`DATABASE_URL`, `JWT_SECRET`)
- Build errors
- TypeScript errors
- Missing dependencies

### Step 6: Set Environment Variables

In Vercel dashboard → **Settings** → **Environment Variables**, ensure:
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - Your JWT secret key

Set them for **Production**, **Preview**, and **Development** environments.

### Step 7: Check vercel.json

Make sure `vercel.json` is committed to your repository and at the root level.

### Step 8: Force Reconnect GitHub

1. In Vercel dashboard → **Settings** → **Git**
2. Click **Disconnect** repository
3. Click **Connect Git Repository**
4. Re-select your GitHub repo
5. Configure settings:
   - Framework Preset: **Vite**
   - Root Directory: `./` (leave blank)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### Step 9: Verify Push to GitHub

Make sure you're actually pushing to the connected branch:
```bash
git status
git add .
git commit -m "Test deployment"
git push origin main  # or master, depending on your branch
```

### Step 10: Check Vercel CLI

If using Vercel CLI locally:
```bash
npx vercel --prod
```

## Common Issues

### Build Failing
- Check if all dependencies are in `package.json`
- Verify `npm run build` works locally
- Check TypeScript errors: `npm run lint`

### API Routes Not Working
- Ensure `/api` folder structure is correct
- Verify `@vercel/node` is in `devDependencies`
- Check API route files are `.ts` not `.js`

### Environment Variables Not Set
- Must be set in Vercel dashboard (not just `.env` file)
- `.env` files are ignored in production
