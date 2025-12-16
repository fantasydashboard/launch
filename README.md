# 🏈 Fantasy Football Dashboard

A powerful fantasy football analytics dashboard built with Vue 3, featuring Sleeper integration, advanced player rankings, draft analysis, and more.

![Vue.js](https://img.shields.io/badge/Vue.js-3.4-4FC08D?logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?logo=supabase)

## ✨ Features

- **📊 Rest of Season Rankings** - Customizable player rankings with 15+ toggleable factors
- **📅 Weekly Start/Sit Helper** - Matchup-based weekly rankings
- **🏆 Draft Analysis** - Comprehensive draft grades and value analysis
- **📈 League History** - Historical stats and trends
- **🔄 Trade Analyzer** - Evaluate trade values
- **👥 Power Rankings** - Team strength analysis
- **🎛️ Customizable Factors** - Tune rankings to your strategy

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/fantasy-dashboard.git
cd fantasy-dashboard

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📦 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/fantasy-dashboard.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Vue.js settings

3. **Add Environment Variables** (in Vercel dashboard)
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Deploy!**
   - Click "Deploy"
   - Your app will be live at `https://your-project.vercel.app`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | For auth | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | For auth | Supabase anonymous key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | For payments | Stripe publishable key |

## 🔐 Setting Up Authentication (Supabase)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Copy URL and anon key to your environment variables

2. **Run Database Migrations**
   ```sql
   -- Create profiles table
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users(id) PRIMARY KEY,
     email TEXT NOT NULL,
     full_name TEXT,
     avatar_url TEXT,
     sleeper_user_id TEXT,
     subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
     subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due')),
     stripe_customer_id TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Enable RLS
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

   -- Profiles policy
   CREATE POLICY "Users can view own profile" ON profiles
     FOR SELECT USING (auth.uid() = id);
   
   CREATE POLICY "Users can update own profile" ON profiles
     FOR UPDATE USING (auth.uid() = id);
   ```

3. **Configure Auth Providers** (optional)
   - In Supabase dashboard, go to Authentication > Providers
   - Enable Google and/or Discord
   - Add OAuth credentials

## 💳 Setting Up Payments (Stripe)

1. **Create Stripe Account**
   - Go to [stripe.com](https://stripe.com)
   - Get your API keys from the dashboard

2. **Create Products/Prices**
   - Create subscription products in Stripe dashboard
   - Note the price IDs for your tiers

3. **Add Webhook** (for subscription events)
   - Add endpoint: `https://your-domain.com/api/stripe-webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.*`

## 🛠️ Development

### Project Structure

```
src/
├── components/     # Reusable Vue components
├── views/          # Page components
├── stores/         # Pinia stores
├── services/       # API services
├── lib/            # External integrations (Supabase, etc.)
├── types/          # TypeScript types
└── utils/          # Utility functions
```

### Key Files

- `src/stores/auth.ts` - Authentication state management
- `src/stores/league.ts` - League data management
- `src/services/sleeper.ts` - Sleeper API integration
- `src/services/rankingFactors.ts` - Ranking calculation logic

### Build Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run type-check # TypeScript check
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🙏 Acknowledgments

- [Sleeper API](https://docs.sleeper.com) for fantasy data
- [Supabase](https://supabase.com) for authentication
- [Vercel](https://vercel.com) for hosting
- [Tailwind CSS](https://tailwindcss.com) for styling

---

Built with ❤️ by [Limelight Creative](https://limelightcreative.com)
