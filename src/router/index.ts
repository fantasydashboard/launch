import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
      path: '/tools',
      redirect: '/free-tools'
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue')
    }
  ]
})

// Navigation guard for auth-required routes
router.beforeEach((to, from, next) => {
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

export default router
