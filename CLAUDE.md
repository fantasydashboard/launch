# Ultimate Fantasy Dashboard — Claude Code Context

## Stack
Vue 3 / TypeScript / Pinia / Supabase / Vercel
Project path: ~/projects/ultimate-fantasy-dashboard

## Deploy Command
npm run build && git add -A && git commit -m "..." && git push && npx vercel --prod

## Key Details
- Supabase project ref: ergxtydfgffqgkddclvr
- Meta Pixel ID: 1263598218581460
- ESPN Chrome Extension ID: dbjbbkdjodblojmhljgdbdlliogkhbjc
- Google OAuth uses implicit flow (flowType: 'implicit') — do not change to PKCE
- Edge functions deployed with --no-verify-jwt flag
- Vercel auto-deploy from GitHub is unreliable — always use npx vercel --prod explicitly

## Key File Locations
- ESPN service: src/services/espn.ts
- Yahoo service: src/services/yahoo.ts
- Sleeper service: src/services/sleeper.ts
- Main home component: src/components/UnifiedHomeComponent.vue
- Season view: src/views/UnifiedSeasonView.vue
- Category standings table: src/components/unified/CategoryStandingsTable.vue
- Admin panel: src/views/AdminView.vue
- Router: src/router/index.ts
- League store: src/stores/league.ts

## League Types
Supports ESPN, Yahoo, and Sleeper across football, baseball, basketball, and hockey.
Both points leagues and H2H category leagues supported.

## Known Quirks
- Safari ITP fix handled via Vercel serverless proxy
- ESPN category leagues use getCategoryStatsBreakdown() for per-stat wins
- Yahoo OAuth uses YahooCallbackView.vue
- zsh exclamation mark issues: write scripts to /tmp/fixN.py instead
