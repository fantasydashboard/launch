import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'instant' }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    // Sport-specific landing pages (public)
    {
      path: '/football',
      name: 'football-landing',
      component: () => import('@/views/SportLandingView.vue'),
      props: { sport: 'football' }
    },
    {
      path: '/baseball',
      name: 'baseball-landing',
      component: () => import('@/views/SportLandingView.vue'),
      props: { sport: 'baseball' }
    },
    {
      path: '/basketball',
      name: 'basketball-landing',
      component: () => import('@/views/SportLandingView.vue'),
      props: { sport: 'basketball' }
    },
    {
      path: '/hockey',
      name: 'hockey-landing',
      component: () => import('@/views/SportLandingView.vue'),
      props: { sport: 'hockey' }
    },
    // Pricing page (requires auth)
    {
      path: '/pricing',
      name: 'pricing',
      component: () => import('@/views/PricingView.vue'),
      meta: { requiresAuth: true }
    },
    // Upgrade routes (redirects to pricing with context)
    {
      path: '/upgrade/league',
      name: 'upgrade-league',
      redirect: '/pricing'
    },
    {
      path: '/upgrade/premium',
      name: 'upgrade-premium',
      redirect: '/pricing'
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('@/views/PrivacyView.vue'),
      meta: { public: true }
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('@/views/AuthCallbackView.vue')
    },
    {
      path: '/auth/yahoo-callback',
      name: 'yahoo-callback',
      component: () => import('@/views/YahooCallbackView.vue')
    },
    {
      path: '/auth/yahoo-error',
      name: 'yahoo-error',
      component: () => import('@/views/YahooErrorView.vue')
    },
    {
      path: '/standings',
      redirect: '/'
    },
    {
      path: '/power-rankings',
      name: 'power-rankings',
      component: () => import('@/views/PowerRankingsWrapper.vue')
    },
    {
      path: '/matchups',
      name: 'matchups',
      component: () => import('@/views/MatchupsWrapper.vue')
    },
    {
      path: '/my-team',
      name: 'my-team',
      component: () => import('@/views/MyTeamWrapper.vue')
    },
    {
      path: '/matchup',
      name: 'matchup',
      component: () => import('@/views/MatchupWrapper.vue')
    },
    {
      path: '/players',
      name: 'players',
      component: () => import('@/views/PlayersWrapper.vue')
    },
    {
      path: '/trades',
      name: 'trades',
      component: () => import('@/views/TradesWrapper.vue')
    },
    {
      path: '/ultimate-tools',
      name: 'ultimate-tools',
      component: () => import('@/views/ProjectionsWrapper.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/projections',
      redirect: '/ultimate-tools'
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/HistoryWrapper.vue')
    },
    {
      path: '/draft',
      name: 'draft',
      component: () => import('@/views/DraftWrapper.vue')
    },
    {
      path: '/dynasty',
      redirect: '/ultimate-tools'
    },
    {
      path: '/performance-comparison',
      name: 'performance-comparison',
      component: () => import('@/views/CompareWrapper.vue')
    },
    {
      path: '/free-tools',
      name: 'free-tools',
      component: () => import('@/views/ToolsView.vue')
    },
    {
      path: '/draftlottery',
      name: 'draft-lottery-tool',
      component: () => import('@/views/ToolsView.vue'),
      props: { initialTool: 'draft' }
    },
    { path: '/draftorder', redirect: '/draftlottery' },
    {
      path: '/schedulegenerator',
      name: 'schedule-generator-tool',
      component: () => import('@/views/ToolsView.vue'),
      props: { initialTool: 'schedule' }
    },
    {
      path: '/tools',
      redirect: '/free-tools'
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue')
    },
    // Unified views (new architecture)
    {
      path: '/unified/matchups',
      name: 'unified-matchups',
      component: () => import('@/views/UnifiedMatchupsView.vue')
    },
    {
      path: '/unified/season',
      name: 'unified-season',
      component: () => import('@/views/UnifiedSeasonView.vue'),
    },
    { path: '/signup', name: 'signup-page', component: () => import('@/views/SignupPage.vue') },
    { path: '/powerrankings', name: 'page-pr', component: () => import('@/views/PowerRankingsPage.vue') },
    { path: '/matchups-info', name: 'page-matchups', component: () => import('@/views/MatchupsPage.vue') },
    { path: '/draft-info', name: 'page-draft', component: () => import('@/views/DraftPage.vue') },
    { path: '/history-info', name: 'page-history', component: () => import('@/views/HistoryPage.vue') },
    { path: '/socialtemplates', name: 'social-templates', component: () => import('@/views/SocialTemplatesView.vue') },
    {
      path: '/recap',
      name: 'weekly-recap',
      component: () => import('@/views/WeeklyRecapView.vue')
    },
  { path: '/admin', name: 'admin', component: () => import('@/views/AdminView.vue') },
    // Demo league (no auth required, pre-baked The Pillars data)
    {
      path: '/demo',
      component: () => import('@/views/DemoLayout.vue'),
      children: [
        {
          path: '',
          name: 'demo-home',
          component: () => import('@/views/DemoHomeView.vue'),
        },
        {
          path: 'power-rankings',
          name: 'demo-power-rankings',
          component: () => import('@/views/DemoPowerRankingsView.vue'),
        },
        {
          path: 'matchups',
          name: 'demo-matchups',
          component: () => import('@/views/DemoMatchupsView.vue'),
        },
        {
          path: 'draft',
          name: 'demo-draft',
          component: () => import('@/views/DemoDraftView.vue'),
        },
        {
          path: 'history',
          name: 'demo-history',
          component: () => import('@/views/DemoHistoryView.vue'),
        },
      ],
    },
    // Internal brand exploration — wordmark mockups for The League
    // Beat in the real brand system. Hidden from production via the
    // existing hostname guard below. No auth (internal review only).
    {
      path: '/internal/logo-mockups',
      name: 'internal-logo-mockups',
      component: () => import('@/views/LogoMockupsView.vue'),
    },
    // Live league routes — your real connected leagues, no fixture
    // fallback. URL is keyed by the Supabase `leagues.id` UUID (not the
    // platform's league id) so the league switcher can deep-link without
    // exposing platform identifiers. The view looks up the row from the
    // leaguesNew store to pick the right adapter.
    {
      path: '/leagues/:leagueId',
      component: () => import('@/views/MyLeagueLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: (to) => `/leagues/${to.params.leagueId}/home` },
        {
          path: 'home',
          name: 'my-league-home',
          component: () => import('@/views/CategoryDemoHomeView.vue'),
        },
        {
          path: 'power-rankings',
          name: 'my-league-power-rankings',
          component: () => import('@/views/CategoryDemoPowerRankingsView.vue'),
        },
        {
          path: 'matchups',
          name: 'my-league-matchups',
          component: () => import('@/views/MatchupBattlePlanView.vue'),
        },
        {
          path: 'draft',
          name: 'my-league-draft',
          component: () => import('@/views/CategoryDemoDraftView.vue'),
        },
        {
          path: 'history',
          name: 'my-league-history',
          component: () => import('@/views/CategoryDemoHistoryView.vue'),
        },
        {
          path: 'league',
          name: 'my-league-league',
          component: () => import('@/views/LeagueWrapper.vue'),
        },
      ],
    },
    // Category-league demo (no auth required, pre-baked category baseball data)
    {
      path: '/demo-categories',
      component: () => import('@/views/CategoryDemoLayout.vue'),
      children: [
        // First-time visitors land on the connect picker. Direct
        // links to /demo-categories/home still render the fixture
        // demo (or live data when ?leagueId=&platform= is set).
        { path: '', redirect: '/demo-categories/connect' },
        {
          path: 'connect',
          name: 'demo-cat-connect',
          component: () => import('@/views/CategoryDemoConnectView.vue'),
        },
        {
          path: 'home',
          name: 'demo-cat-home',
          component: () => import('@/views/CategoryDemoHomeView.vue'),
        },
        {
          path: 'power-rankings',
          name: 'demo-cat-power-rankings',
          component: () => import('@/views/CategoryDemoPowerRankingsView.vue'),
        },
        {
          path: 'matchups',
          name: 'demo-cat-matchups',
          component: () => import('@/views/CategoryDemoMatchupsView.vue'),
        },
        {
          path: 'draft',
          name: 'demo-cat-draft',
          component: () => import('@/views/CategoryDemoDraftView.vue'),
        },
        {
          path: 'history',
          name: 'demo-cat-history',
          component: () => import('@/views/CategoryDemoHistoryView.vue'),
        },
        {
          path: 'league',
          name: 'demo-cat-league',
          component: () => import('@/views/LeagueWrapper.vue'),
        },
      ],
    },
]
})

// Navigation guard for auth-required routes
router.beforeEach((to, from, next) => {
  // Hide the in-progress category-league demo from the production domain.
  // Stays available on localhost and Vercel preview deployments for testing.
  if (to.path.startsWith('/demo-categories') && typeof window !== 'undefined') {
    const host = window.location.hostname
    const isProdHost =
      host === 'ultimatefantasydashboard.com' ||
      host === 'www.ultimatefantasydashboard.com'
    if (isProdHost) {
      next({ path: '/' })
      return
    }
  }
  // Same guard for the internal brand-exploration surface.
  if (to.path.startsWith('/internal') && typeof window !== 'undefined') {
    const host = window.location.hostname
    const isProdHost =
      host === 'ultimatefantasydashboard.com' ||
      host === 'www.ultimatefantasydashboard.com'
    if (isProdHost) {
      next({ path: '/' })
      return
    }
  }

  if (to.meta.requiresAuth) {
    const authStore = useAuthStore()

    if (!authStore.isAuthenticated) {
      // Redirect to home, the auth modal will be triggered there
      next({ path: '/', query: { redirect: to.fullPath, showLogin: 'true' } })
      return
    }
  }
  next()
})
router.afterEach(() => {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'PageView')
  }
})
export default router
