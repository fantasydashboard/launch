<template>
  <div class="min-h-screen transition-colors" style="background: radial-gradient(circle at top, #1c2030, #05060a 55%);">
    <!-- Header -->
    <header class="border-b border-dark-border shadow-soft" style="background: linear-gradient(135deg, rgba(19, 22, 32, 0.98), rgba(10, 12, 20, 0.98)); border: 1px solid #2a2f42;">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
          <!-- Logo -->
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full flex items-center justify-center shadow-lg" style="background: radial-gradient(circle at 30% 20%, #ffe091, #f5c451 50%, #f09c1f); color: #1e1a0f; box-shadow: 0 0 0 2px rgba(245, 196, 81, 0.4);">
              <span class="font-extrabold text-xl">FD</span>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-dark-text">Fantasy Dashboard</h1>
              <p class="text-xs text-dark-textMuted">League History & Analytics</p>
            </div>
          </div>

          <!-- League selector and controls -->
          <div class="flex items-center gap-4">
            <div v-if="!leagueStore.activeLeagueId" class="flex items-center gap-3">
              <input
                v-model="username"
                type="text"
                placeholder="Enter Sleeper Username"
                class="input w-56"
                @keyup.enter="loadLeagues"
              />
              <button
                @click="loadLeagues"
                :disabled="leagueStore.isLoading"
                class="btn-primary"
              >
                {{ leagueStore.isLoading ? 'Loading...' : 'Load Leagues' }}
              </button>
            </div>

            <select
              v-if="leagueStore.leagues.length > 0"
              v-model="selectedLeague"
              @change="changeLeague"
              class="select min-w-[200px]"
            >
              <option value="">Select League</option>
              <option v-for="league in leagueStore.leagues" :key="league.league_id" :value="league.league_id">
                {{ league.name }}
              </option>
            </select>

            <!-- Auth Button -->
            <div v-if="authStore.isConfigured">
              <button
                v-if="!authStore.isAuthenticated"
                @click="showAuthModal = true"
                class="px-4 py-2 rounded-xl bg-primary text-gray-900 font-semibold hover:bg-primary/90 transition-colors"
              >
                Sign In
              </button>
              <div v-else class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span class="text-sm font-bold text-primary">{{ userInitials }}</span>
                  </div>
                  <span class="text-sm text-dark-text hidden sm:inline">{{ authStore.profile?.full_name || authStore.user?.email }}</span>
                </div>
                <button
                  @click="handleSignOut"
                  class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors text-dark-textMuted hover:text-dark-text"
                  title="Sign out"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>

            <button
              @click="darkModeStore.toggle"
              class="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-border transition-all duration-200"
              title="Toggle dark mode"
            >
              <svg v-if="darkModeStore.isDark" class="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
              </svg>
              <svg v-else class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <nav v-if="leagueStore.activeLeagueId" class="border-b border-dark-border" style="background: linear-gradient(135deg, rgba(19, 22, 32, 0.98), rgba(10, 12, 20, 0.98)); border: 1px solid #2a2f42;">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div class="inline-flex items-center gap-2 bg-dark-bg/50 rounded-full p-1.5 border border-dark-border">
          <router-link
            v-for="tab in tabs"
            :key="tab.path"
            :to="tab.path"
            class="px-6 py-2.5 text-sm font-semibold rounded-full transition-all duration-200"
            :class="[
              $route.path === tab.path
                ? 'bg-primary text-gray-900 shadow-md'
                : 'text-dark-textSecondary hover:text-dark-text hover:bg-dark-border/50'
            ]"
          >
            {{ tab.name }}
          </router-link>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div v-if="leagueStore.error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 shadow-lg">
        <p class="text-red-800 dark:text-red-200 font-medium">{{ leagueStore.error }}</p>
      </div>

      <div v-if="!leagueStore.activeLeagueId" class="text-center py-24">
        <div class="text-gray-300 dark:text-gray-700 mb-6">
          <svg class="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-3">Welcome to Fantasy Dashboard</h2>
        <p class="text-lg text-gray-600 dark:text-gray-400">Enter your Sleeper username above to get started</p>
      </div>

      <router-view v-else />
    </main>

    <!-- Auth Modal -->
    <AuthModal 
      :is-open="showAuthModal" 
      @close="showAuthModal = false"
      @success="showAuthModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { useDarkModeStore } from '@/stores/darkMode'
import { useAuthStore } from '@/stores/auth'
import AuthModal from '@/components/AuthModal.vue'

const router = useRouter()
const leagueStore = useLeagueStore()
const darkModeStore = useDarkModeStore()
const authStore = useAuthStore()

const username = ref('')
const selectedLeague = ref('')
const showAuthModal = ref(false)

const tabs = [
  { name: 'Home', path: '/' },
  { name: 'Power Rankings', path: '/power-rankings' },
  { name: 'Matchups', path: '/matchups' },
  { name: 'Projections', path: '/projections' },
  { name: 'History', path: '/history' },
  { name: 'Draft', path: '/draft' },
  { name: 'Compare', path: '/performance-comparison' },
  { name: 'Tools', path: '/tools' }
]

const userInitials = computed(() => {
  const name = authStore.profile?.full_name || authStore.user?.email || ''
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
})

async function loadLeagues() {
  if (!username.value.trim()) return
  try {
    await leagueStore.fetchUserLeagues(username.value)
  } catch (e) {
    console.error('Failed to load leagues:', e)
  }
}

async function changeLeague() {
  if (!selectedLeague.value) return
  try {
    await leagueStore.setActiveLeague(selectedLeague.value)
    if (router.currentRoute.value.path !== '/') {
      const currentPath = router.currentRoute.value.path
      await router.push('/')
      await nextTick()
      await router.push(currentPath)
    }
  } catch (e) {
    console.error('Failed to load league:', e)
  }
}

async function handleSignOut() {
  await authStore.signOut()
}

onMounted(() => {
  darkModeStore.init()
  authStore.initialize()
})
</script>
