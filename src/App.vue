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
                  {{ leagueStore.isDemoMode ? 'Demo Mode - Explore the Dashboard' : 'League History & Analytics' }}
                </p>
              </div>
            </div>

            <!-- League selector and controls -->
            <div class="flex items-center gap-4">
              <!-- League Dropdown -->
              <div class="relative" ref="leagueDropdownRef">
                <button
                  @click="showLeagueDropdown = !showLeagueDropdown"
                  class="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-card border border-dark-border hover:border-primary/50 transition-colors min-w-[220px]"
                >
                  <template v-if="leagueStore.currentLeague">
                    <div class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span class="text-xs font-bold text-primary">{{ leagueStore.currentLeague.name.substring(0, 2).toUpperCase() }}</span>
                    </div>
                    <span class="text-dark-text font-medium truncate">
                      {{ leagueStore.currentLeague.name }}
                    </span>
                  </template>
                  <template v-else-if="leagueStore.isDemoMode">
                    <div class="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <span class="text-sm">👀</span>
                    </div>
                    <span class="text-cyan-400 font-medium">Demo Mode</span>
                  </template>
                  <template v-else>
                    <div class="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <svg class="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span class="text-primary font-medium">Connect Sleeper</span>
                  </template>
                  <svg class="w-4 h-4 text-dark-textMuted ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <!-- Dropdown Menu -->
                <div 
                  v-if="showLeagueDropdown"
                  class="absolute top-full right-0 mt-2 w-80 bg-dark-card border border-dark-border rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <!-- Saved Leagues -->
                  <div v-if="leagueStore.savedLeagues.length > 0" class="p-2">
                    <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                      <span>Your Leagues</span>
                      <span class="text-primary">{{ leagueStore.savedLeagues.length }}</span>
                    </div>
                    <div
                      v-for="league in leagueStore.savedLeagues"
                      :key="league.league_id"
                      class="group flex items-center gap-2 rounded-lg transition-colors"
                      :class="leagueStore.activeLeagueId === league.league_id ? 'bg-primary/10' : 'hover:bg-dark-border/50'"
                    >
                      <button
                        @click="selectLeague(league.league_id)"
                        class="flex-1 flex items-center gap-3 px-3 py-2"
                      >
                        <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span class="text-xs font-bold text-primary">{{ league.league_name.substring(0, 2).toUpperCase() }}</span>
                        </div>
                        <div class="flex-1 text-left min-w-0">
                          <div class="font-medium text-dark-text text-sm truncate">{{ league.league_name }}</div>
                          <div class="text-xs text-dark-textMuted">{{ league.season }} • {{ league.sleeper_username }}</div>
                        </div>
                        <span v-if="league.is_primary" class="text-xs text-primary">★</span>
                        <svg v-if="leagueStore.activeLeagueId === league.league_id" class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                      </button>
                      <!-- Remove Button -->
                      <button
                        @click.stop="confirmRemoveLeague(league)"
                        class="p-2 opacity-0 group-hover:opacity-100 hover:text-red-400 text-dark-textMuted transition-all"
                        title="Remove league"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
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
                      <div class="text-left">
                        <div class="font-medium text-sm">Connect Sleeper League</div>
                        <div class="text-xs text-dark-textMuted">Add a new league to your dashboard</div>
                      </div>
                    </button>
                  </div>
                  
                  <!-- Demo Mode Option -->
                  <div class="border-t border-dark-border/50 p-2">
                    <button
                      @click="enableDemoMode"
                      class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-border/50 transition-colors"
                      :class="leagueStore.isDemoMode ? 'bg-cyan-500/10' : ''"
                    >
                      <div class="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <span class="text-sm">👀</span>
                      </div>
                      <div class="flex-1 text-left">
                        <div class="font-medium text-dark-text text-sm">Demo Mode</div>
                        <div class="text-xs text-dark-textMuted">Explore with sample data</div>
                      </div>
                      <svg v-if="leagueStore.isDemoMode" class="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
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
          <div v-if="leagueStore.isDemoMode" class="inline-flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30">
            <span class="text-sm">👀</span>
            <span class="text-cyan-400 text-xs font-medium">Demo Mode</span>
            <button 
              @click="showAddLeagueModal = true"
              class="text-xs text-cyan-300 hover:text-white underline ml-1"
            >
              Connect your league →
            </button>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div v-if="leagueStore.error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 shadow-lg">
          <p class="text-red-800 dark:text-red-200 font-medium">{{ leagueStore.error }}</p>
        </div>

        <!-- Loading State -->
        <div v-if="leagueStore.isLoading" class="flex items-center justify-center py-24">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-4"></div>
            <p class="text-dark-textMuted">Loading league data...</p>
          </div>
        </div>

        <!-- Show router view -->
        <router-view v-else />
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
    
    <!-- Remove League Confirmation -->
    <Teleport to="body">
      <div 
        v-if="leagueToRemove" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="leagueToRemove = null"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-dark-border/50 p-6">
          <h3 class="text-lg font-bold text-dark-text mb-2">Remove League?</h3>
          <p class="text-dark-textMuted text-sm mb-4">
            Are you sure you want to remove <span class="text-white font-medium">{{ leagueToRemove.league_name }}</span> from your dashboard?
          </p>
          <div class="flex gap-3">
            <button
              @click="leagueToRemove = null"
              class="flex-1 px-4 py-2 rounded-lg bg-dark-border text-dark-text font-medium hover:bg-dark-border/70 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="removeLeague"
              class="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
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
const leagueToRemove = ref<any>(null)

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
}

function confirmRemoveLeague(league: any) {
  leagueToRemove.value = league
  showLeagueDropdown.value = false
}

async function removeLeague() {
  if (!leagueToRemove.value) return
  await leagueStore.removeLeague(leagueToRemove.value.league_id, authStore.user?.id)
  leagueToRemove.value = null
}

async function handleAuthSuccess() {
  showAuthModal.value = false
  
  if (authStore.user?.id) {
    await leagueStore.loadSavedLeagues(authStore.user.id)
    
    // If no saved leagues, enable demo mode
    if (!leagueStore.hasSavedLeagues && !leagueStore.activeLeagueId) {
      leagueStore.enableDemoMode()
    }
  }
}

async function handleLeagueAdded(league: any) {
  showAddLeagueModal.value = false
  
  if (authStore.user?.id && leagueStore.currentUsername) {
    await leagueStore.saveLeague(league, leagueStore.currentUsername, authStore.user.id)
    leagueStore.disableDemoMode()
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
  
  document.addEventListener('click', handleClickOutside)
  
  // Load saved leagues if authenticated
  if (authStore.isAuthenticated && authStore.user?.id) {
    await leagueStore.loadSavedLeagues(authStore.user.id)
    
    // If no saved leagues and no active league, enable demo mode
    if (!leagueStore.hasSavedLeagues && !leagueStore.activeLeagueId) {
      leagueStore.enableDemoMode()
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Watch for auth changes
watch(() => authStore.isAuthenticated, async (isAuth) => {
  if (isAuth && authStore.user?.id) {
    await leagueStore.loadSavedLeagues(authStore.user.id)
    if (!leagueStore.hasSavedLeagues && !leagueStore.activeLeagueId) {
      leagueStore.enableDemoMode()
    }
  }
})
</script>
