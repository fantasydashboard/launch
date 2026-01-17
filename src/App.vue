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
              <img src="/UFD_V5.png" alt="Ultimate Fantasy Dashboard" class="h-10 sm:h-12 object-contain" />
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
                <span :style="{ color: sportColor }">FANTASY {{ currentSportName.toUpperCase() }}</span>
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
                  <img 
                    :src="leagueStore.activePlatform === 'yahoo' ? '/yahoo-fantasy.svg' : leagueStore.activePlatform === 'espn' ? '/espn-logo.svg' : '/sleeper.svg'" 
                    :alt="leagueStore.activePlatform"
                    class="w-5 h-5 rounded flex-shrink-0"
                  />
                  <span class="text-dark-text font-medium text-xs truncate max-w-[100px] xl:max-w-[150px]">
                    {{ leagueStore.currentLeague.name }}
                  </span>
                </template>
                <template v-else>
                  <span class="text-primary font-medium text-xs">Add League</span>
                </template>
                <svg class="w-3 h-3 text-dark-textMuted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <!-- League Dropdown Menu (only when not scrolled) -->
              <div 
                v-if="showLeagueDropdown && !isScrolled"
                class="absolute top-full right-0 mt-2 w-80 bg-dark-card border border-dark-border rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <!-- All Leagues grouped by sport -->
                <div v-if="leagueStore.allLeagues && leagueStore.allLeagues.length > 0" class="max-h-96 overflow-y-auto">
                  <template v-for="(sport, sportIndex) in sportOrder" :key="sport">
                    <template v-if="getLeaguesBySport(sport).length > 0">
                      <!-- Sport divider (not before first sport) -->
                      <div v-if="sportIndex > 0 && hasPreviousSportLeagues(sportIndex)" class="border-t border-dark-border"></div>
                      
                      <div class="p-2">
                        <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2">
                          <span>{{ getSportEmoji(sport) }}</span>
                          <span>{{ sport }}</span>
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
                          <!-- Platform Icon -->
                          <img 
                            :src="league.platform === 'yahoo' ? '/yahoo-fantasy.svg' : league.platform === 'espn' ? '/espn-logo.svg' : '/sleeper.svg'" 
                            :alt="league.platform"
                            class="w-8 h-8 rounded-lg flex-shrink-0"
                          />
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                              <span class="font-medium text-dark-text text-sm truncate">{{ league.league_name || league.name }}</span>
                              <!-- League Pass indicator -->
                              <span 
                                v-if="hasLeaguePass(league)" 
                                class="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 rounded"
                              >
                                PASS
                              </span>
                            </div>
                            <div class="text-xs text-dark-textMuted">
                              {{ league.season }} · {{ league.num_teams || league.total_rosters }} teams
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
                  </template>
                  
                  <!-- Add League (at bottom when leagues exist) -->
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
                
                <!-- No leagues - just show Add League -->
                <div v-else class="p-4">
                  <div class="text-center mb-4">
                    <div class="text-4xl mb-2">🏆</div>
                    <div class="text-dark-text font-medium">No Leagues Connected</div>
                    <div class="text-xs text-dark-textMuted">Add your first league to get started</div>
                  </div>
                  <button
                    @click="showAddLeagueModal = true; showLeagueDropdown = false"
                    class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary hover:bg-primary/90 transition-colors"
                  >
                    <svg class="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span class="font-semibold text-gray-900">Add League</span>
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
              
              <!-- User Dropdown (only when not scrolled) -->
              <div 
                v-if="showUserMenu && !isScrolled"
                class="absolute top-full right-0 mt-2 w-48 bg-dark-card border border-dark-border rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <div class="p-3 border-b border-dark-border">
                  <div class="font-medium text-dark-text text-sm truncate">{{ displayName }}</div>
                  <div class="text-xs text-dark-textMuted truncate">{{ authStore.user?.email }}</div>
                </div>
                <router-link
                  to="/settings"
                  @click="showUserMenu = false"
                  class="w-full flex items-center gap-2 px-3 py-2.5 text-dark-text hover:bg-dark-border/30 transition-colors text-sm"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Settings</span>
                </router-link>
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

        <!-- Menu Header Bar - Fixed at top when scrolled -->
        <nav 
          class="z-40 overflow-visible transition-all duration-300"
          :class="isScrolled ? 'fixed top-0 left-0 right-0' : 'relative'"
          :style="{ background: sportColor, height: '56px' }"
        >
          <!-- Logo Container - Fits within combined headers, never goes below green menu -->
          <div 
            class="absolute left-0 z-50 hidden lg:flex items-center pl-4 xl:pl-6 transition-all duration-300 ease-out"
            :style="{ 
              top: isScrolled ? '4px' : '-32px',
              height: isScrolled ? '48px' : '88px'
            }"
          >
            <!-- Dark gradient behind logo - full height coverage -->
            <div 
              class="absolute -left-4 xl:-left-6 transition-all duration-300 ease-out"
              :style="{ 
                background: 'linear-gradient(to right, #0a0c14 0%, #0a0c14 60%, transparent 100%)', 
                width: isScrolled ? '300px' : '420px',
                height: isScrolled ? '56px' : '92px',
                top: isScrolled ? '-4px' : '0'
              }"
            ></div>
            <img 
              src="/UFD_V5.png" 
              alt="Ultimate Fantasy Dashboard" 
              class="relative z-10 object-contain transition-all duration-300 ease-out"
              :style="{ height: isScrolled ? '44px' : '82px' }"
            />
          </div>

          <!-- Dark gradient on left when scrolled (for nav background) -->
          <div 
            class="absolute left-0 top-0 bottom-0 hidden lg:block pointer-events-none transition-opacity duration-300"
            :class="isScrolled ? 'opacity-100' : 'opacity-0'"
            style="background: linear-gradient(to right, #0a0c14 0%, #0a0c14 55%, transparent 100%); width: 300px;"
          ></div>
          
          <div class="flex items-center justify-end h-14 px-4 xl:px-8 relative">
            <!-- Mobile/Tablet: Logo + Dashboards Button + League Dropdown -->
            <div class="lg:hidden flex items-center justify-between w-full">
              <!-- Mobile logo with gradient background -->
              <div class="relative flex items-center">
                <div 
                  class="absolute -left-4 top-1/2 -translate-y-1/2"
                  style="background: linear-gradient(to right, #0a0c14 0%, #0a0c14 60%, transparent 100%); width: 160px; height: 56px;"
                ></div>
                <img src="/UFD_V5.png" alt="UFD" class="h-10 object-contain relative z-10" />
              </div>
              <div class="flex items-center gap-2">
                <button 
                  @click="showMobileMenu = true"
                  class="flex items-center gap-2 px-3 py-2 bg-black/20 rounded-lg text-white font-semibold text-sm"
                >
                  <span>Dashboards</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <!-- Mobile League Dropdown -->
                <div class="relative" ref="mobileLeagueDropdownRef">
                  <button
                    @click="showLeagueDropdown = !showLeagueDropdown"
                    class="flex items-center gap-1.5 px-3 py-2 bg-black/20 rounded-lg text-white text-sm"
                  >
                    <template v-if="leagueStore.currentLeague">
                      <img 
                        :src="leagueStore.activePlatform === 'yahoo' ? '/yahoo-fantasy.svg' : leagueStore.activePlatform === 'espn' ? '/espn-logo.svg' : '/sleeper.svg'" 
                        :alt="leagueStore.activePlatform"
                        class="w-5 h-5 rounded flex-shrink-0"
                      />
                      <span class="font-medium truncate max-w-[80px]">{{ leagueStore.currentLeague.name }}</span>
                    </template>
                    <template v-else>
                      <span class="text-primary font-medium">Add</span>
                    </template>
                    <svg class="w-3 h-3 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  <!-- Mobile League Dropdown Menu -->
                  <div 
                    v-if="showLeagueDropdown"
                    class="absolute top-full right-0 mt-2 w-72 bg-dark-card border border-dark-border rounded-xl shadow-xl z-[60] overflow-hidden"
                  >
                    <!-- All Leagues grouped by sport -->
                    <div v-if="leagueStore.allLeagues && leagueStore.allLeagues.length > 0" class="max-h-80 overflow-y-auto">
                      <template v-for="(sport, sportIndex) in sportOrder" :key="'mobile-' + sport">
                        <template v-if="getLeaguesBySport(sport).length > 0">
                          <!-- Sport divider -->
                          <div v-if="sportIndex > 0 && hasPreviousSportLeagues(sportIndex)" class="border-t border-dark-border"></div>
                          
                          <div class="p-2">
                            <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2">
                              <span>{{ getSportEmoji(sport) }}</span>
                              <span>{{ sport }}</span>
                            </div>
                            <div
                              v-for="league in getLeaguesBySport(sport)"
                              :key="'mobile-league-' + league.league_id"
                              @click="selectLeague(league.league_id)"
                              :class="[
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                                leagueStore.activeLeagueId === league.league_id
                                  ? 'bg-primary/10 border border-primary/30' 
                                  : 'hover:bg-dark-border/30 active:bg-dark-border/50'
                              ]"
                            >
                              <img 
                                :src="league.platform === 'yahoo' ? '/yahoo-fantasy.svg' : league.platform === 'espn' ? '/espn-logo.svg' : '/sleeper.svg'" 
                                :alt="league.platform"
                                class="w-8 h-8 rounded-lg flex-shrink-0"
                              />
                              <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                  <span class="font-medium text-dark-text text-sm truncate">{{ league.league_name || league.name }}</span>
                                  <span 
                                    v-if="hasLeaguePass(league)" 
                                    class="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 rounded"
                                  >
                                    PASS
                                  </span>
                                </div>
                                <div class="text-xs text-dark-textMuted">
                                  {{ league.season }} · {{ league.num_teams || league.total_rosters }} teams
                                </div>
                              </div>
                            </div>
                          </div>
                        </template>
                      </template>
                      
                      <!-- Add League -->
                      <div class="border-t border-dark-border p-2">
                        <button
                          @click="showAddLeagueModal = true; showLeagueDropdown = false"
                          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 active:bg-primary/20 transition-colors"
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
                    
                    <!-- No leagues -->
                    <div v-else class="p-4">
                      <div class="text-center mb-4">
                        <div class="text-4xl mb-2">🏆</div>
                        <div class="text-dark-text font-medium">No Leagues Connected</div>
                        <div class="text-xs text-dark-textMuted">Add your first league to get started</div>
                      </div>
                      <button
                        @click="showAddLeagueModal = true; showLeagueDropdown = false"
                        class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary hover:bg-primary/90 transition-colors"
                      >
                        <svg class="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span class="font-semibold text-gray-900">Add League</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
              
              <!-- League & User controls when scrolled (since top header is hidden) -->
              <div v-if="isScrolled" class="ml-4 flex items-center gap-2">
                <!-- Compact League Selector with Dropdown -->
                <div class="relative" ref="scrolledLeagueDropdownRef">
                  <button
                    @click="showLeagueDropdown = !showLeagueDropdown"
                    class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 text-white text-xs font-medium hover:bg-black/30 transition-colors"
                  >
                    <img 
                      :src="leagueStore.activePlatform === 'yahoo' ? '/yahoo-fantasy.svg' : leagueStore.activePlatform === 'espn' ? '/espn-logo.svg' : '/sleeper.svg'" 
                      :alt="leagueStore.activePlatform"
                      class="w-4 h-4 rounded flex-shrink-0"
                    />
                    <span class="truncate max-w-[100px]">{{ leagueStore.currentLeague?.name || 'Demo' }}</span>
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  <!-- Scrolled League Dropdown Menu -->
                  <div 
                    v-if="showLeagueDropdown"
                    class="absolute top-full right-0 mt-2 w-72 bg-dark-card border border-dark-border rounded-xl shadow-xl z-[60] overflow-hidden"
                  >
                    <!-- All Leagues grouped by sport -->
                    <div v-if="leagueStore.allLeagues && leagueStore.allLeagues.length > 0" class="max-h-80 overflow-y-auto">
                      <template v-for="(sport, sportIndex) in sportOrder" :key="'scrolled-' + sport">
                        <template v-if="getLeaguesBySport(sport).length > 0">
                          <div v-if="sportIndex > 0 && hasPreviousSportLeagues(sportIndex)" class="border-t border-dark-border"></div>
                          <div class="p-2">
                            <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2">
                              <span>{{ getSportEmoji(sport) }}</span>
                              <span>{{ sport }}</span>
                            </div>
                            <div
                              v-for="league in getLeaguesBySport(sport)"
                              :key="'scrolled-league-' + league.league_id"
                              @click="selectLeague(league.league_id)"
                              :class="[
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                                leagueStore.activeLeagueId === league.league_id
                                  ? 'bg-primary/10 border border-primary/30' 
                                  : 'hover:bg-dark-border/30'
                              ]"
                            >
                              <img 
                                :src="league.platform === 'yahoo' ? '/yahoo-fantasy.svg' : league.platform === 'espn' ? '/espn-logo.svg' : '/sleeper.svg'" 
                                :alt="league.platform"
                                class="w-8 h-8 rounded-lg flex-shrink-0"
                              />
                              <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                  <span class="font-medium text-dark-text text-sm truncate">{{ league.league_name || league.name }}</span>
                                  <span 
                                    v-if="hasLeaguePass(league)" 
                                    class="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 rounded"
                                  >
                                    PASS
                                  </span>
                                </div>
                                <div class="text-xs text-dark-textMuted">
                                  {{ league.season }} · {{ league.num_teams || league.total_rosters }} teams
                                </div>
                              </div>
                            </div>
                          </div>
                        </template>
                      </template>
                      
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
                            <div class="text-xs text-dark-textMuted">Connect Sleeper, Yahoo, or ESPN</div>
                          </div>
                        </button>
                      </div>
                    </div>
                    
                    <!-- No leagues -->
                    <div v-else class="p-4">
                      <div class="text-center mb-4">
                        <div class="text-4xl mb-2">🏆</div>
                        <div class="text-dark-text font-medium">No Leagues Connected</div>
                        <div class="text-xs text-dark-textMuted">Add your first league to get started</div>
                      </div>
                      <button
                        @click="showAddLeagueModal = true; showLeagueDropdown = false"
                        class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary hover:bg-primary/90 transition-colors"
                      >
                        <svg class="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span class="font-semibold text-gray-900">Add League</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                <!-- Compact User with Dropdown -->
                <div class="relative" data-user-menu>
                  <button 
                    @click="showUserMenu = !showUserMenu"
                    class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center hover:opacity-90 transition-opacity"
                  >
                    <span class="text-xs font-bold text-gray-900">{{ userInitials }}</span>
                  </button>
                  
                  <!-- Scrolled User Dropdown -->
                  <div 
                    v-if="showUserMenu"
                    class="absolute top-full right-0 mt-2 w-48 bg-dark-card border border-dark-border rounded-xl shadow-xl z-[60] overflow-hidden"
                  >
                    <div class="p-3 border-b border-dark-border">
                      <div class="font-medium text-dark-text text-sm truncate">{{ displayName }}</div>
                      <div class="text-xs text-dark-textMuted truncate">{{ authStore.user?.email }}</div>
                    </div>
                    <router-link
                      to="/settings"
                      @click="showUserMenu = false"
                      class="w-full flex items-center gap-2 px-3 py-2.5 text-dark-text hover:bg-dark-border/30 transition-colors text-sm"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Settings</span>
                    </router-link>
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
            </div>
          </div>
        </nav>
        
        <!-- Spacer when nav is fixed to prevent content jump -->
        <div v-if="isScrolled" class="h-14 hidden lg:block"></div>
      </div>

      <!-- Mobile Full-Screen Menu Overlay -->
      <Teleport to="body">
        <div 
          v-if="showMobileMenu"
          class="fixed inset-0 z-[100] lg:hidden"
          style="background: #0a0c14;"
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b border-dark-border">
            <img src="/UFD_V5.png" alt="UFD" class="h-10 object-contain" />
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
            <span class="font-bold" :style="{ color: sportColor }">{{ currentSportName.toUpperCase() }}</span>
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
          <LoadingSpinner size="lg" message="Loading league data..." />
        </div>

        <!-- Show router view -->
        <router-view v-else />
      </main>

      <!-- Footer -->
      <AppFooter />
    </template>

    <!-- Auth Modal -->
    <AuthModal 
      :isOpen="showAuthModal" 
      :initialMode="authMode"
      @close="showAuthModal = false"
      @success="handleAuthSuccess"
    />
    
    <!-- Add League Modal -->
    <AddLeagueModal 
      v-if="showAddLeagueModal"
      :isOpen="showAddLeagueModal"
      @close="showAddLeagueModal = false"
      @league-added="handleLeagueAdded"
      @yahoo-league-added="handleYahooLeagueAdded"
      @espn-league-added="handleEspnLeagueAdded"
    />
    
    <!-- Remove League Confirmation -->
    <Teleport to="body">
      <div v-if="leagueToRemove" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div class="bg-dark-card border border-dark-border rounded-xl p-6 max-w-sm w-full shadow-xl">
          <h3 class="text-lg font-bold text-dark-text mb-2">Remove League?</h3>
          <p class="text-dark-textMuted mb-4">
            Are you sure you want to remove <span class="text-dark-text font-medium">{{ leagueToRemove?.league_name || leagueToRemove?.name }}</span>? You can always add it back later.
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
import LoadingSpinner from '@/components/LoadingSpinner.vue'

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
const mobileLeagueDropdownRef = ref<HTMLElement | null>(null)
const scrolledLeagueDropdownRef = ref<HTMLElement | null>(null)
const leagueToRemove = ref<any>(null)
const isScrolled = ref(false)

const tabs = [
  { name: 'Season', path: '/' },
  { name: 'Power Rankings', path: '/power-rankings' },
  { name: 'Matchups', path: '/matchups' },
  { name: 'History', path: '/history' },
  { name: 'Draft', path: '/draft' },
  { name: 'Compare', path: '/performance-comparison' },
  { name: 'Free Tools', path: '/free-tools' },
  { name: 'Ultimate Tools', path: '/ultimate-tools', isUltimate: true }
]

// Available sports for grouping leagues
const sportOrder = ['football', 'basketball', 'baseball', 'hockey']
const availableSports = ['football', 'basketball', 'baseball', 'hockey']

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

// Get color based on active sport
const sportColor = computed(() => {
  const colors: Record<string, string> = {
    football: '#22c55e',   // Green
    baseball: '#ef4444',   // Red
    basketball: '#f97316', // Orange
    hockey: '#3b82f6'      // Blue
  }
  return colors[currentSportName.value] || '#22c55e'
})

// Get leagues by sport
function getLeaguesBySport(sport: string) {
  if (!leagueStore.allLeagues || !Array.isArray(leagueStore.allLeagues)) {
    return []
  }
  return leagueStore.allLeagues.filter(league => {
    // Determine league sport from platform or stored sport
    const leagueSport = league.sport || (league.platform === 'sleeper' ? 'football' : 'baseball')
    return leagueSport === sport
  })
}

// Check if any previous sports in order have leagues (for divider logic)
function hasPreviousSportLeagues(currentIndex: number): boolean {
  for (let i = 0; i < currentIndex; i++) {
    if (getLeaguesBySport(sportOrder[i]).length > 0) {
      return true
    }
  }
  return false
}

// Check if league has League Pass subscription
function hasLeaguePass(league: any): boolean {
  // TODO: Integrate with useFeatureAccess composable for real subscription check
  // For now, return false - will be implemented with subscription system
  return false
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

async function selectLeague(leagueId: string) {
  showLeagueDropdown.value = false
  leagueStore.disableDemoMode()
  await leagueStore.setActiveLeague(leagueId)
  
  // Auto-detect sport from selected league and update sport store
  const league = leagueStore.allLeagues.find(l => l.league_id === leagueId)
  if (league) {
    const sport = league.sport || 'football'
    sportStore.setSport(sport as Sport)
    leagueStore.setActiveSport(sport as Sport)
  }
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
    // If no leagues, user will be prompted to add one on the pages
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

async function handleEspnLeagueAdded(data: { leagueId: string; sport: string; season: number; league: any }) {
  showAddLeagueModal.value = false
  
  if (!authStore.user?.id) {
    console.error('Not authenticated')
    return
  }
  
  try {
    console.log('[ESPN] League added:', data)
    
    // Save to local state and Supabase
    const sport = data.sport as 'football' | 'baseball' | 'basketball' | 'hockey'
    await leagueStore.saveEspnLeague(
      data.leagueId,
      data.league?.name || `ESPN League ${data.leagueId}`,
      sport,
      data.season,
      data.league?.size,
      data.league?.scoringType
    )
    
    // Create league key for ESPN (format: espn_{sport}_{leagueId}_{season})
    const leagueKey = `espn_${data.sport}_${data.leagueId}_${data.season}`
    
    leagueStore.disableDemoMode()
    await leagueStore.setActiveLeague(leagueKey)
    
    // Update sport
    sportStore.setSport(sport)
    leagueStore.setActiveSport(sport)
    
    console.log('[ESPN] League activated:', leagueKey)
  } catch (err) {
    console.error('Failed to add ESPN league:', err)
  }
}

async function handleSignOut() {
  showMobileMenu.value = false
  showUserMenu.value = false
  await authStore.signOut()
  leagueStore.reset()
}

// Handle scroll for header behavior - triggers when top header scrolls away
function handleScroll() {
  isScrolled.value = window.scrollY > 36
}

// Close dropdowns when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  
  // Check all league dropdowns (desktop, mobile, and scrolled)
  const isInsideDesktopDropdown = leagueDropdownRef.value && leagueDropdownRef.value.contains(target)
  const isInsideMobileDropdown = mobileLeagueDropdownRef.value && mobileLeagueDropdownRef.value.contains(target)
  const isInsideScrolledDropdown = scrolledLeagueDropdownRef.value && scrolledLeagueDropdownRef.value.contains(target)
  
  if (!isInsideDesktopDropdown && !isInsideMobileDropdown && !isInsideScrolledDropdown) {
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
    
    // Sync sport store with league store's persisted sport
    if (leagueStore.activeSport) {
      sportStore.setSport(leagueStore.activeSport as Sport)
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
    
    // Sync sport store with league store's persisted sport
    if (leagueStore.activeSport) {
      sportStore.setSport(leagueStore.activeSport as Sport)
    }
  }
})

// Close mobile menu on route change
watch(() => route.path, () => {
  showMobileMenu.value = false
})
</script>
