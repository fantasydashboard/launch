# 🚀 Deployment Checklist

Follow these steps to get your Fantasy Football Dashboard live!

---

## Phase 1: Get the App Live (30 minutes)

### Step 1: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Create a new repository:
   - Name: `fantasy-football-dashboard`
   - Keep it **Private** (you can make it public later)
   - Don't initialize with README (we have one)

3. In your terminal, navigate to your project folder and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Fantasy Football Dashboard"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/fantasy-football-dashboard.git
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Find and import `fantasy-football-dashboard`
4. Vercel will auto-detect Vue.js - keep defaults
5. Click **"Deploy"**
6. Wait ~2 minutes for build

✅ **Your app is now live!** You'll get a URL like `fantasy-football-dashboard.vercel.app`

### Step 3: Custom Domain (Optional)

1. In Vercel, go to your project → Settings → Domains
2. Add your custom domain
3. Follow DNS instructions

---

## Phase 2: Add Authentication (45 minutes)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in:
   - Name: `fantasy-dashboard`
   - Database Password: (save this!)
   - Region: Choose closest to your users
4. Wait for project to initialize (~2 minutes)

### Step 2: Get API Keys

1. In Supabase, go to **Settings → API**
2. Copy these values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### Step 3: Add Keys to Vercel

1. In Vercel, go to your project → **Settings → Environment Variables**
2. Add:
   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | Your Supabase URL |
   | `VITE_SUPABASE_ANON_KEY` | Your anon key |

3. Click **Save**
4. Go to **Deployments** → Click "..." on latest → **Redeploy**

### Step 4: Run Database Migration

1. In Supabase, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and click **"Run"**

### Step 5: Configure Auth Providers (Optional)

**For Google Login:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
4. In Supabase → Authentication → Providers → Google
5. Enable and add Client ID + Secret

**For Discord Login:**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create application → OAuth2
3. Add redirect: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
4. In Supabase → Authentication → Providers → Discord
5. Enable and add Client ID + Secret

✅ **Authentication is now live!**

---

## Phase 3: Add Payments (Later)

### Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete account verification

### Step 2: Create Products

In Stripe Dashboard → Products:

| Product | Price | Price ID |
|---------|-------|----------|
| Pro Plan | $5/month | `price_xxx` |
| Premium Plan | $10/month | `price_xxx` |

### Step 3: Add Stripe Keys to Vercel

| Key | Value |
|-----|-------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_xxx` |
| `STRIPE_SECRET_KEY` | `sk_live_xxx` |

### Step 4: Set Up Webhook

1. In Stripe → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

---

## 📋 Quick Reference

### URLs

| Service | Dashboard URL |
|---------|---------------|
| Vercel | vercel.com/dashboard |
| Supabase | supabase.com/dashboard |
| Stripe | dashboard.stripe.com |
| GitHub | github.com |

### Environment Variables

```bash
# Required for Auth
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx

# Required for Payments
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
```

### Useful Commands

```bash
# Local development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🆘 Troubleshooting

### Build fails on Vercel

- Check Node version (needs 18+)
- Check for TypeScript errors: `npm run type-check`

### Auth not working

- Verify environment variables are set
- Check Supabase URL format (no trailing slash)
- Verify redirect URLs in OAuth providers

### Styles look wrong

- Clear browser cache
- Check Tailwind is properly configured

---

## Need Help?

- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- Supabase Docs: [supabase.com/docs](https://supabase.com/docs)
- Vue Docs: [vuejs.org](https://vuejs.org)
