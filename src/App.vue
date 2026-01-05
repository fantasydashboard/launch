<template>
  <div class="min-h-screen transition-colors overflow-x-hidden overscroll-none" style="background: radial-gradient(circle at top, #1c2030, #05060a 55%);">
    
    <!-- Show Landing Page for non-authenticated users -->
    <template v-if="!authStore.isAuthenticated">
      <!-- Simple Header for Landing Page -->
      <header class="fixed top-0 left-0 right-0 z-50 border-b border-dark-border/50" style="background: rgba(10, 12, 20, 0.95); backdrop-filter: blur(10px);">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <!-- Logo -->
            <div class="flex items-center gap-2 sm:gap-3">
              <img src="/ufd-logo-full.png" alt="Ultimate Fantasy Dashboard" class="h-10 sm:h-12 object-contain" />
            </div>

            <!-- Auth Buttons -->
            <div class="flex items-center gap-2 sm:gap-3">
              <button
                @click="showAuthModal = true; authMode = 'login'"
                class="px-3 sm:px-4 py-2 rounded-lg text-gray-300 hover:text-white font-medium transition-colors text-sm sm:text-base"
              >
                Sign In
              </button>
              <button
                @click="showAuthModal = true; authMode = 'signup'"
                class="px-3 sm:px-4 py-2 rounded-lg bg-primary text-gray-900 font-semibold hover:bg-primary/90 transition-colors text-sm sm:text-base"
              >
                <span class="hidden sm:inline">Get Started</span>
                <span class="sm:hidden">Start</span>
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
      <!-- Combined Header Container -->
      <div class="relative z-40">
        <!-- Top Header Bar (Dark) - Short, scrolls away naturally -->
        <header 
          class="relative hidden lg:block"
          style="background: #0a0c14; height: 36px;"
        >
          <div class="flex items-center justify-end h-9 px-4 xl:px-8">
            <!-- Sport Title (Desktop) -->
            <div class="flex items-center gap-6">
              <h1 class="text-xs xl:text-sm font-bold tracking-wide">
                <span style="color: #22c55e;">FANTASY {{ currentSportName.toUpperCase() }}</span>
                <span class="text-dark-textMuted mx-2">—</span>
                <span class="text-dark-text">ULTIMATE DASHBOARD</span>
              </h1>
            </div>

            <!-- League Dropdown -->
            <div class="relative ml-6" ref="leagueDropdownRef">
              <button
                @click="showLeagueDropdown = !showLeagueDropdown"
                class="flex items-center gap-2 px-2 py-1 rounded-lg bg-dark-card/50 border border-dark-border/50 hover:border-primary/50 transition-colors"
              >
                <template v-if="leagueStore.currentLeague">
                  <div 
                    class="w-4 h-4 flex-shrink-0 rounded flex items-center justify-center"
                    :class="leagueStore.activePlatform === 'yahoo' ? 'bg-purple-600' : ''"
                    :style="leagueStore.activePlatform !== 'yahoo' ? { background: getLeagueTypeColor(leagueStore.currentLeague.settings?.type) } : {}"
                  >
                    <span v-if="leagueStore.activePlatform === 'yahoo'" class="text-[8px] font-bold text-white">Y!</span>
                    <svg v-else class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <span class="text-dark-text font-medium text-xs truncate max-w-[100px] xl:max-w-[150px]">
                    {{ leagueStore.currentLeague.name }}
                  </span>
                </template>
                <template v-else-if="leagueStore.isDemoMode">
                  <span class="text-cyan-400 font-medium text-xs">Demo</span>
                </template>
                <template v-else>
                  <span class="text-primary font-medium text-xs">Add League</span>
                </template>
                <svg class="w-3 h-3 text-dark-textMuted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <!-- League Dropdown Menu -->
              <div 
                v-if="showLeagueDropdown"
                class="absolute top-full right-0 mt-2 w-80 bg-dark-card border border-dark-border rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <!-- All Leagues grouped by sport -->
                <div v-if="leagueStore.allLeagues.length > 0" class="max-h-80 overflow-y-auto">
                  <template v-for="sport in availableSports" :key="sport">
                    <div v-if="getLeaguesBySport(sport).length > 0" class="p-2">
                      <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2">
                        <span>{{ getSportEmoji(sport) }}</span>
                        <span>{{ sport }} Leagues</span>
                        <span class="text-primary ml-auto">{{ getLeaguesBySport(sport).length }}</span>
                      </div>
                      <div
                        v-for="league in getLeaguesBySport(sport)"
                        :key="league.league_id"
                        @click="selectLeague(league.league_id)"
                        :class="[
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group',
                          leagueStore.activeLeagueId === league.league_id 
                            ? 'bg-primary/10 border border-primary/30' 
                            : 'hover:bg-dark-border/30'
                        ]"
                      >
                        <div 
                          class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          :class="league.platform === 'yahoo' ? 'bg-purple-600' : ''"
                          :style="league.platform !== 'yahoo' ? { background: getLeagueTypeColor(league.settings?.type) } : {}"
                        >
                          <span v-if="league.platform === 'yahoo'" class="text-xs font-bold text-white">Y!</span>
                          <svg v-else class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="font-medium text-dark-text text-sm truncate">{{ league.name }}</div>
                          <div class="text-xs text-dark-textMuted">
                            {{ league.season }} · {{ league.total_rosters || league.num_teams }} teams
                          </div>
                        </div>
                        <button
                          @click.stop="confirmRemoveLeague(league)"
                          class="p-1.5 rounded-lg text-dark-textMuted hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove league"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </template>
                </div>
                
                <!-- Demo Mode -->
                <div class="border-t border-dark-border p-2">
                  <button
                    @click="enableDemoMode"
                    :class="[
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                      leagueStore.isDemoMode 
                        ? 'bg-cyan-500/10 border border-cyan-500/30' 
                        : 'hover:bg-dark-border/30'
                    ]"
                  >
                    <div class="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <span class="text-sm">👀</span>
                    </div>
                    <div class="text-left">
                      <div class="font-medium text-cyan-400 text-sm">Demo Mode</div>
                      <div class="text-xs text-dark-textMuted">Explore with sample data</div>
                    </div>
                  </button>
                </div>
                
                <!-- Add League -->
                <div class="border-t border-dark-border p-2">
                  <button
                    @click="showAddLeagueModal = true; showLeagueDropdown = false"
                    class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    <div class="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div class="text-left">
                      <div class="font-medium text-primary text-sm">Add League</div>
                      <div class="text-xs text-dark-textMuted">Connect Sleeper or Yahoo</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- User Menu -->
            <div class="relative ml-3" data-user-menu>
              <button 
                @click="showUserMenu = !showUserMenu"
                class="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-dark-border/30 transition-colors"
              >
                <div class="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
                  <span class="text-[10px] font-bold text-gray-900">{{ userInitials }}</span>
                </div>
                <span class="hidden xl:inline text-xs text-dark-text font-medium">{{ displayName }}</span>
              </button>
              
              <!-- User Dropdown -->
              <div 
                v-if="showUserMenu"
                class="absolute top-full right-0 mt-2 w-48 bg-dark-card border border-dark-border rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <div class="p-3 border-b border-dark-border">
                  <div class="font-medium text-dark-text text-sm truncate">{{ displayName }}</div>
                  <div class="text-xs text-dark-textMuted truncate">{{ authStore.user?.email }}</div>
                </div>
                <button
                  @click="handleSignOut; showUserMenu = false"
                  class="w-full flex items-center gap-2 px-3 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Menu Header Bar (Green) - STICKY at top -->
        <nav 
          class="sticky top-0 z-40 overflow-visible"
          style="background: #22c55e; height: 56px;"
        >
          <!-- Logo Container - Extends up into dark header space via negative margin -->
          <div 
            class="absolute left-0 bottom-0 z-50 hidden lg:flex items-end pl-4 xl:pl-6 transition-all duration-300"
            :style="{ 
              marginTop: isScrolled ? '0' : '-36px',
              height: isScrolled ? '56px' : '92px'
            }"
          >
            <!-- Dark gradient behind logo -->
            <div 
              class="absolute inset-0 -left-4 xl:-left-6 transition-all duration-300"
              :style="{ 
                background: 'linear-gradient(to right, #0a0c14 0%, #0a0c14 65%, transparent 100%)', 
                width: isScrolled ? '260px' : '380px'
              }"
            ></div>
            <img 
              src="/ufd-logo-full.png" 
              alt="Ultimate Fantasy Dashboard" 
              class="relative z-10 object-contain mb-1 transition-all duration-300"
              :style="{ height: isScrolled ? '44px' : '82px' }"
            />
          </div>

          <!-- Dark gradient on left when scrolled -->
          <div 
            v-if="isScrolled"
            class="absolute left-0 top-0 bottom-0 hidden lg:block pointer-events-none"
            style="background: linear-gradient(to right, #0a0c14 0%, #0a0c14 60%, transparent 100%); width: 260px;"
          ></div>
          
          <div class="flex items-center justify-end h-14 px-4 xl:px-8 relative">
            <!-- Mobile/Tablet: Logo + Dashboards Button -->
            <div class="lg:hidden flex items-center justify-between w-full">
              <img src="/ufd-logo-full.png" alt="UFD" class="h-10 object-contain" />
              <button 
                @click="showMobileMenu = true"
                class="flex items-center gap-2 px-4 py-2 bg-black/20 rounded-lg text-white font-semibold text-sm"
              >
                <span>Dashboards</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            
            <!-- Desktop: Menu Items in rounded container with proper spacing -->
            <div class="hidden lg:flex items-center">
              <div class="inline-flex items-center gap-1 bg-black/30 rounded-full px-2 py-1.5">
                <router-link
                  v-for="tab in tabs"
                  :key="tab.path"
                  :to="tab.path"
                  class="px-3 xl:px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-200"
                  :class="[
                    tab.isUltimate 
                      ? ($route.path === tab.path 
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 shadow-md' 
                          : 'text-yellow-300 border border-yellow-400/50 hover:bg-yellow-500/20')
                      : ($route.path === tab.path
                          ? 'bg-white text-gray-900 shadow-md'
                          : 'text-white hover:bg-white/15')
                  ]"
                >
                  {{ tab.name }}
                </router-link>
              </div>
              
              <!-- Demo Mode Banner (Desktop) - shown when scrolled since top header is hidden -->
              <div v-if="leagueStore.isDemoMode && isScrolled" class="ml-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20">
                <span class="text-white text-xs font-medium">Demo</span>
                <button 
                  @click="showAddLeagueModal = true"
                  class="text-xs text-yellow-300 hover:text-white underline"
                >
                  Connect →
                </button>
              </div>
              
              <!-- League & User controls when scrolled (since top header is hidden) -->
              <div v-if="isScrolled" class="ml-4 flex items-center gap-2">
                <!-- Compact League Selector -->
                <button
                  @click="showLeagueDropdown = !showLeagueDropdown"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 text-white text-xs font-medium hover:bg-black/30 transition-colors"
                >
                  <span class="truncate max-w-[100px]">{{ leagueStore.currentLeague?.name || 'Demo' }}</span>
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <!-- Compact User -->
                <button 
                  @click="showUserMenu = !showUserMenu"
                  class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <span class="text-xs font-bold text-white">{{ userInitials }}</span>
                </button>
              </div>
            </div>
            
            <!-- Demo Mode Banner (Desktop, not scrolled) -->
            <div v-if="leagueStore.isDemoMode && !isScrolled" class="hidden lg:inline-flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full bg-black/20">
              <span class="text-white text-xs font-medium">Demo Mode</span>
              <button 
                @click="showAddLeagueModal = true"
                class="text-xs text-yellow-300 hover:text-white underline"
              >
                Connect league →
              </button>
            </div>
          </div>
        </nav>
        
      </div>

      <!-- Mobile Full-Screen Menu Overlay -->
      <Teleport to="body">
        <div 
          v-if="showMobileMenu"
          class="fixed inset-0 z-[100] sm:hidden"
          style="background: #0a0c14;"
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b border-dark-border">
            <img src="/ufd-logo-full.png" alt="UFD" class="h-10 object-contain" />
            <button 
              @click="showMobileMenu = false"
              class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors"
            >
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Sport Title -->
          <div class="px-4 py-3 border-b border-dark-border/50">
            <span class="text-primary font-bold">{{ currentSportName.toUpperCase() }}</span>
            <span class="text-dark-textMuted mx-2">—</span>
            <span class="text-dark-text font-medium">DASHBOARD</span>
          </div>
          
          <!-- Menu Items -->
          <div class="p-4 space-y-2">
            <router-link
              v-for="tab in tabs"
              :key="tab.path"
              :to="tab.path"
              @click="showMobileMenu = false"
              class="flex items-center justify-between p-4 rounded-xl transition-all"
              :class="[
                tab.isUltimate 
                  ? ($route.path === tab.path 
                      ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' 
                      : 'border border-yellow-500/20 hover:bg-yellow-500/10')
                  : ($route.path === tab.path
                      ? 'bg-primary/10 border border-primary/30'
                      : 'border border-dark-border hover:bg-dark-border/30')
              ]"
            >
              <span 
                class="text-lg font-bold"
                :class="[
                  tab.isUltimate ? 'text-yellow-500' : ($route.path === tab.path ? 'text-primary' : 'text-dark-text')
                ]"
              >
                {{ tab.name }}
              </span>
              <svg 
                class="w-5 h-5"
                :class="[
                  tab.isUltimate ? 'text-yellow-500' : ($route.path === tab.path ? 'text-primary' : 'text-dark-textMuted')
                ]"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </router-link>
          </div>
          
          <!-- Demo Mode Banner (Mobile) -->
          <div v-if="leagueStore.isDemoMode" class="mx-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-cyan-400 font-bold">Demo Mode</span>
            </div>
            <button 
              @click="showAddLeagueModal = true; showMobileMenu = false"
              class="text-sm text-cyan-300 hover:text-white underline"
            >
              Connect your league →
            </button>
          </div>
          
          <!-- User Info at Bottom -->
          <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-border">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
                  <span class="text-sm font-bold text-gray-900">{{ userInitials }}</span>
                </div>
                <div>
                  <div class="font-medium text-dark-text">{{ displayName }}</div>
                  <div class="text-xs text-dark-textMuted">{{ authStore.user?.email }}</div>
                </div>
              </div>
              <button
                @click="handleSignOut"
                class="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Main Content -->
      <main class="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
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

      <!-- Footer -->
      <AppFooter />
    </template>

    <!-- Auth Modal -->
    <AuthModal 
      v-model:show="showAuthModal" 
      :mode="authMode"
      @success="handleAuthSuccess"
    />
    
    <!-- Add League Modal -->
    <AddLeagueModal 
      v-if="showAddLeagueModal"
      @close="showAddLeagueModal = false"
      @league-added="handleLeagueAdded"
      @yahoo-league-added="handleYahooLeagueAdded"
    />
    
    <!-- Remove League Confirmation -->
    <Teleport to="body">
      <div v-if="leagueToRemove" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div class="bg-dark-card border border-dark-border rounded-xl p-6 max-w-sm w-full shadow-xl">
          <h3 class="text-lg font-bold text-dark-text mb-2">Remove League?</h3>
          <p class="text-dark-textMuted mb-4">
            Are you sure you want to remove <span class="text-dark-text font-medium">{{ leagueToRemove?.name }}</span>? You can always add it back later.
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
    
    <!-- Dev Mode Panel (Admin Only) -->
    <DevModePanel />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { useDarkModeStore } from '@/stores/darkMode'
import { useAuthStore } from '@/stores/auth'
import { useSportStore, type Sport } from '@/stores/sport'
import AuthModal from '@/components/AuthModal.vue'
import LandingPage from '@/components/LandingPage.vue'
import AddLeagueModal from '@/components/AddLeagueModal.vue'
import AppFooter from '@/components/AppFooter.vue'
import DevModePanel from '@/components/DevModePanel.vue'

const router = useRouter()
const route = useRoute()
const leagueStore = useLeagueStore()
const darkModeStore = useDarkModeStore()
const authStore = useAuthStore()
const sportStore = useSportStore()

const showAuthModal = ref(false)
const authMode = ref<'login' | 'signup'>('signup')
const showLeagueDropdown = ref(false)
const showUserMenu = ref(false)
const showAddLeagueModal = ref(false)
const showMobileMenu = ref(false)
const leagueDropdownRef = ref<HTMLElement | null>(null)
const leagueToRemove = ref<any>(null)
const isScrolled = ref(false)

const tabs = [
  { name: 'Home', path: '/' },
  { name: 'Power Rankings', path: '/power-rankings' },
  { name: 'Matchups', path: '/matchups' },
  { name: 'History', path: '/history' },
  { name: 'Draft', path: '/draft' },
  { name: 'Compare', path: '/performance-comparison' },
  { name: 'Free Tools', path: '/free-tools' },
  { name: 'Ultimate Tools', path: '/ultimate-tools', isUltimate: true }
]

// Available sports for grouping leagues
const availableSports = ['football', 'baseball', 'basketball', 'hockey']

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

// Get current sport name based on active league
const currentSportName = computed(() => {
  // First check the league store's active sport (derived from selected league)
  if (leagueStore.activeSport) {
    return leagueStore.activeSport
  }
  // Fallback to sport store
  return sportStore.activeSport || 'football'
})

// Get leagues by sport
function getLeaguesBySport(sport: string) {
  return leagueStore.allLeagues.filter(league => {
    // Determine league sport from platform or stored sport
    const leagueSport = league.sport || (league.platform === 'sleeper' ? 'football' : 'baseball')
    return leagueSport === sport
  })
}

// Get sport emoji
function getSportEmoji(sport: string): string {
  const emojis: Record<string, string> = {
    football: '🏈',
    baseball: '⚾',
    basketball: '🏀',
    hockey: '🏒'
  }
  return emojis[sport] || '🏆'
}

// League type helpers
function getLeagueTypeColor(leagueType: number | undefined): string {
  switch (leagueType) {
    case 2: return '#a855f7' // Purple for dynasty
    case 1: return '#f97316' // Orange for keeper
    default: return '#06b6d4' // Cyan for redraft
  }
}

async function selectLeague(leagueId: string) {
  showLeagueDropdown.value = false
  leagueStore.disableDemoMode()
  await leagueStore.setActiveLeague(leagueId)
  
  // Auto-detect sport from selected league and update sport store
  const league = leagueStore.allLeagues.find(l => l.league_id === leagueId)
  if (league) {
    const sport = league.sport || (league.platform === 'sleeper' ? 'football' : 'baseball')
    sportStore.setSport(sport as Sport)
    leagueStore.setActiveSport(sport as Sport)
  }
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
    
    // Auto-set sport to football for Sleeper leagues
    sportStore.setSport('football')
    leagueStore.setActiveSport('football')
  }
}

async function handleYahooLeagueAdded(league: any) {
  showAddLeagueModal.value = false
  
  if (!authStore.user?.id) {
    console.error('Not authenticated')
    return
  }
  
  try {
    // Detect sport from Yahoo league
    const sport = league.sport || sportStore.activeSport
    await leagueStore.saveYahooLeague(league, authStore.user.id, sport)
    
    leagueStore.disableDemoMode()
    await leagueStore.setActiveLeague(league.league_key)
    
    // Update sport
    sportStore.setSport(sport as Sport)
    leagueStore.setActiveSport(sport as Sport)
  } catch (err) {
    console.error('Failed to add Yahoo league:', err)
  }
}

async function handleSignOut() {
  showMobileMenu.value = false
  showUserMenu.value = false
  await authStore.signOut()
  leagueStore.reset()
}

// Handle scroll for header shrinking
function handleScroll() {
  isScrolled.value = window.scrollY > 20
}

// Close dropdowns when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  
  if (leagueDropdownRef.value && !leagueDropdownRef.value.contains(target)) {
    showLeagueDropdown.value = false
  }
  
  if (showUserMenu.value && !target.closest('[data-user-menu]')) {
    showUserMenu.value = false
  }
}

onMounted(async () => {
  darkModeStore.init()
  await authStore.initialize()
  
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', handleScroll)
  
  if (authStore.isAuthenticated && authStore.user?.id) {
    await leagueStore.loadSavedLeagues(authStore.user.id)
    leagueStore.refreshYahooLeagues(authStore.user.id)
    
    if (!leagueStore.hasSavedLeagues && !leagueStore.activeLeagueId) {
      leagueStore.enableDemoMode()
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', handleScroll)
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

// Close mobile menu on route change
watch(() => route.path, () => {
  showMobileMenu.value = false
})
</script>
