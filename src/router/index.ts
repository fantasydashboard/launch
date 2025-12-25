import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
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
      path: '/projections',
      name: 'projections',
      component: () => import('@/views/ProjectionsView.vue')
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/HistoryView.vue')
    },
    {
      path: '/draft',
      name: 'draft',
      component: () => import('@/views/DraftView.vue')
    },
    {
      path: '/dynasty',
      redirect: '/projections'
    },
    {
      path: '/performance-comparison',
      name: 'performance-comparison',
      component: () => import('@/views/PerformanceComparisonView.vue')
    },
    {
      path: '/tools',
      name: 'tools',
      component: () => import('@/views/ToolsView.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue')
    }
  ]
})

export default router
