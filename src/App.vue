<template>
  <div class="min-h-screen transition-colors" style="background: radial-gradient(circle at top, #1c2030, #05060a 55%);">
    
    <!-- Show Landing Page for non-authenticated users -->
    <template v-if="!authStore.isAuthenticated">
      <!-- Simple Header for Landing Page -->
      <header class="fixed top-0 left-0 right-0 z-50 border-b border-dark-border/50" style="background: rgba(10, 12, 20, 0.9); backdrop-filter: blur(10px);">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <!-- Logo -->
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg" style="background: radial-gradient(circle at 30% 20%, #ffe091, #f5c451 50%, #f09c1f); color: #1e1a0f;">
                <span class="font-extrabold text-lg">FD</span>
              </div>
              <div>
                <h1 class="text-lg font-bold text-dark-text">Fantasy Dashboard</h1>
              </div>
            </div>

            <!-- Auth Buttons -->
            <div class="flex items-center gap-3">
              <button
                @click="showAuthModal = true; authMode = 'login'"
                class="px-4 py-2 rounded-lg text-gray-300 hover:text-white font-medium transition-colors"
              >
                Sign In
              </button>
              <button
                @click="showAuthModal = true; authMode = 'signup'"
                class="px-4 py-2 rounded-lg bg-primary text-gray-900 font-semibold hover:bg-primary/90 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <!-- Landing Page Content (with padding for fixed header) -->
      <div class="pt-16">
        <LandingPage @open-signup="showAuthModal = true; authMode = 'signup'" />
      </div>
    </template>

    <!-- Show Full App for authenticated users -->
    <template v-else>
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
                <p class="text-xs text-dark-textMuted">
                  {{ leagueStore.isDemoMode ? 'Demo Mode' : 'League History & Analytics' }}
                </p>
              </div>
            </div>

            <!-- League selector and controls -->
            <div class="flex items-center gap-4">
              <!-- League Dropdown -->
              <div class="relative" ref="leagueDropdownRef">
                <button
                  @click="showLeagueDropdown = !showLeagueDropdown"
                  class="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-card border border-dark-border hover:border-primary/50 transition-colors min-w-[200px]"
                >
                  <span v-if="leagueStore.currentLeague" class="text-dark-text font-medium truncate">
                    {{ leagueStore.currentLeague.name }}
                  </span>
                  <span v-else-if="leagueStore.isDemoMode" class="text-primary font-medium">
                    Demo League
                  </span>
                  <span v-else class="text-dark-textMuted">
                    Select League
                  </span>
                  <svg class="w-4 h-4 text-dark-textMuted ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <!-- Dropdown Menu -->
                <div 
                  v-if="showLeagueDropdown"
                  class="absolute top-full left-0 mt-2 w-72 bg-dark-card border border-dark-border rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <!-- Saved Leagues -->
                  <div v-if="leagueStore.savedLeagues.length > 0" class="p-2">
                    <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1">Your Leagues</div>
                    <button
                      v-for="league in leagueStore.savedLeagues"
                      :key="league.league_id"
                      @click="selectLeague(league.league_id)"
                      class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-border/50 transition-colors"
                      :class="leagueStore.activeLeagueId === league.league_id ? 'bg-primary/10 border border-primary/30' : ''"
                    >
                      <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span class="text-xs font-bold text-primary">{{ league.league_name.substring(0, 2).toUpperCase() }}</span>
                      </div>
                      <div class="flex-1 text-left">
                        <div class="font-medium text-dark-text text-sm truncate">{{ league.league_name }}</div>
                        <div class="text-xs text-dark-textMuted">{{ league.season }} Season</div>
                      </div>
                      <span v-if="league.is_primary" class="text-xs text-primary">★</span>
                    </button>
                  </div>
                  
                  <!-- Divider -->
                  <div v-if="leagueStore.savedLeagues.length > 0" class="border-t border-dark-border/50"></div>
                  
                  <!-- Add League Button -->
                  <div class="p-2">
                    <button
                      @click="showAddLeagueModal = true; showLeagueDropdown = false"
                      class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-border/50 transition-colors text-primary"
                    >
                      <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <span class="font-medium text-sm">Add Another League</span>
                    </button>
                  </div>
                  
                  <!-- Demo Mode Option -->
                  <div class="border-t border-dark-border/50 p-2">
                    <button
                      @click="enableDemoMode"
                      class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-border/50 transition-colors"
                      :class="leagueStore.isDemoMode ? 'bg-cyan-500/10 border border-cyan-500/30' : ''"
                    >
                      <div class="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <span class="text-sm">👀</span>
                      </div>
                      <div class="flex-1 text-left">
                        <div class="font-medium text-dark-text text-sm">Demo Mode</div>
                        <div class="text-xs text-dark-textMuted">Explore with sample data</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <!-- User Menu -->
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span class="text-sm font-bold text-primary">{{ userInitials }}</span>
                  </div>
                  <span class="text-sm text-dark-text hidden sm:inline">{{ displayName }}</span>
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

      <!-- Navigation Tabs - Always show when logged in -->
      <nav class="border-b border-dark-border" style="background: linear-gradient(135deg, rgba(19, 22, 32, 0.98), rgba(10, 12, 20, 0.98)); border: 1px solid #2a2f42;">
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
          
          <!-- Demo Mode Banner -->
          <div v-if="leagueStore.isDemoMode" class="inline-flex items-center gap-2 ml-4 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium">
            <span>👀</span>
            <span>Viewing Demo Data</span>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div v-if="leagueStore.error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 shadow-lg">
          <p class="text-red-800 dark:text-red-200 font-medium">{{ leagueStore.error }}</p>
        </div>

        <!-- Show router view - it will handle demo mode vs real data -->
        <router-view />
      </main>
    </template>

    <!-- Auth Modal -->
    <AuthModal 
      :is-open="showAuthModal" 
      :initial-mode="authMode"
      @close="showAuthModal = false"
      @success="handleAuthSuccess"
    />
    
    <!-- Add League Modal -->
    <AddLeagueModal
      :is-open="showAddLeagueModal"
      @close="showAddLeagueModal = false"
      @league-added="handleLeagueAdded"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { useDarkModeStore } from '@/stores/darkMode'
import { useAuthStore } from '@/stores/auth'
import AuthModal from '@/components/AuthModal.vue'
import LandingPage from '@/components/LandingPage.vue'
import AddLeagueModal from '@/components/AddLeagueModal.vue'

const router = useRouter()
const leagueStore = useLeagueStore()
const darkModeStore = useDarkModeStore()
const authStore = useAuthStore()

const showAuthModal = ref(false)
const authMode = ref<'login' | 'signup'>('signup')
const showLeagueDropdown = ref(false)
const showAddLeagueModal = ref(false)
const leagueDropdownRef = ref<HTMLElement | null>(null)

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

const displayName = computed(() => {
  return authStore.profile?.full_name || authStore.user?.email?.split('@')[0] || 'User'
})

const userInitials = computed(() => {
  const name = authStore.profile?.full_name || authStore.user?.email || ''
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
})

async function selectLeague(leagueId: string) {
  showLeagueDropdown.value = false
  leagueStore.disableDemoMode()
  await leagueStore.setActiveLeague(leagueId)
}

function enableDemoMode() {
  showLeagueDropdown.value = false
  leagueStore.enableDemoMode()
  leagueStore.activeLeagueId = null
  leagueStore.currentLeague = null
}

async function handleAuthSuccess() {
  showAuthModal.value = false
  // Load saved leagues after login
  if (authStore.user?.id) {
    await leagueStore.loadSavedLeagues(authStore.user.id)
    
    // If no saved leagues, enable demo mode
    if (!leagueStore.hasSavedLeagues) {
      leagueStore.enableDemoMode()
    }
  }
}

async function handleLeagueAdded(league: any) {
  showAddLeagueModal.value = false
  if (authStore.user?.id && leagueStore.currentUsername) {
    await leagueStore.saveLeague(league, leagueStore.currentUsername, authStore.user.id)
    await leagueStore.setActiveLeague(league.league_id)
  }
}

async function handleSignOut() {
  await authStore.signOut()
  leagueStore.reset()
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (leagueDropdownRef.value && !leagueDropdownRef.value.contains(event.target as Node)) {
    showLeagueDropdown.value = false
  }
}

onMounted(async () => {
  darkModeStore.init()
  await authStore.initialize()
  
  // Load saved leagues if authenticated
  if (authStore.isAuthenticated && authStore.user?.id) {
    await leagueStore.loadSavedLeagues(authStore.user.id)
    
    // If no saved leagues, enable demo mode
    if (!leagueStore.hasSavedLeagues) {
      leagueStore.enableDemoMode()
    }
  }
  
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Watch for auth changes
watch(() => authStore.isAuthenticated, async (isAuth) => {
  if (isAuth && authStore.user?.id) {
    await leagueStore.loadSavedLeagues(authStore.user.id)
    if (!leagueStore.hasSavedLeagues) {
      leagueStore.enableDemoMode()
    }
  }
})
</script>
