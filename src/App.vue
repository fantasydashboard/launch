<template>
  <div class="min-h-screen transition-colors overflow-x-hidden" style="background: radial-gradient(circle at top, #1c2030, #05060a 55%);">
    
    <!-- Show Landing Page for non-authenticated users -->
    <template v-if="!authStore.isAuthenticated">
      <!-- Simple Header for Landing Page -->
      <header class="fixed top-0 left-0 right-0 z-50 border-b border-dark-border/50" style="background: rgba(10, 12, 20, 0.9); backdrop-filter: blur(10px);">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <!-- Logo -->
            <div class="flex items-center gap-2 sm:gap-3">
              <img src="/ufd-logo.png" alt="UFD Logo" class="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
              <div>
                <h1 class="text-base sm:text-lg font-bold text-dark-text">
                  <span class="hidden sm:inline">Ultimate Fantasy Dashboard</span>
                  <span class="sm:hidden">UFD</span>
                </h1>
              </div>
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
      <!-- Top Header (Darker color) - Slides away on scroll -->
      <header 
        class="fixed top-0 left-0 right-0 z-30 transition-transform duration-300"
        :class="isScrolled ? '-translate-y-full' : 'translate-y-0'"
        style="background: #0a0b10;"
      >
        <!-- Gradient overlay for logo area -->
        <div 
          class="absolute left-0 top-0 bottom-0 pointer-events-none"
          style="width: 240px; background: linear-gradient(to right, #0a0b10 0%, #0a0b10 100px, transparent 240px); z-index: 1;"
        ></div>
        
        <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-end h-10 sm:h-11">
            <!-- Right side: Title + League Dropdown + User Menu -->
            <div class="flex items-center gap-3 sm:gap-4">
              <!-- Title -->
              <h1 class="hidden md:block text-sm lg:text-base font-bold text-white tracking-wider uppercase whitespace-nowrap">
                ULTIMATE FANTASY DASHBOARD
              </h1>
              <h1 class="block md:hidden text-[9px] sm:text-xs font-bold text-white tracking-wider uppercase whitespace-nowrap">
                ULTIMATE FANTASY DASHBOARD
              </h1>
              
              <!-- League Dropdown -->
              <div class="relative" ref="leagueDropdownRef">
                <button
                  @click="showLeagueDropdown = !showLeagueDropdown"
                  class="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 hover:border-white/40 transition-colors min-w-0 sm:min-w-[180px]"
                >
                  <template v-if="leagueStore.currentLeague">
                    <div class="w-5 h-5 flex-shrink-0">
                      <img 
                        v-if="leagueStore.activePlatform === 'yahoo'" 
                        src="/logos/yahoo-fantasy.svg" 
                        alt="Yahoo" 
                        class="w-5 h-5 object-contain"
                      />
                      <img 
                        v-else-if="leagueStore.activePlatform === 'sleeper'" 
                        src="/logos/sleeper.svg" 
                        alt="Sleeper" 
                        class="w-5 h-5 object-contain"
                      />
                      <div v-else class="w-5 h-5 rounded bg-gray-600 flex items-center justify-center">
                        <span class="text-[8px] font-bold text-white">ESPN</span>
                      </div>
                    </div>
                    <span class="text-white font-medium truncate max-w-[60px] sm:max-w-[120px] text-sm">
                      {{ leagueStore.currentLeague.name }}
                    </span>
                  </template>
                  <template v-else-if="leagueStore.isDemoMode">
                    <div class="w-5 h-5 rounded-full bg-cyan-500/30 flex items-center justify-center flex-shrink-0">
                      <span class="text-xs">👀</span>
                    </div>
                    <span class="text-cyan-300 font-medium hidden sm:inline text-sm">Demo</span>
                  </template>
                  <template v-else>
                    <div class="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                      <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span class="text-white font-medium hidden sm:inline text-sm">Add League</span>
                  </template>
                  <svg class="w-4 h-4 text-white/60 ml-auto flex-shrink-0 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <!-- League Dropdown Menu -->
                <div 
                  v-if="showLeagueDropdown"
                  class="absolute top-full right-0 mt-2 w-80 bg-dark-card border border-dark-border rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <!-- All Leagues (grouped by sport) -->
                  <div v-if="leagueStore.savedLeagues.length > 0" class="max-h-96 overflow-y-auto">
                    <!-- Football Leagues -->
                    <div v-if="footballLeagues.length > 0" class="p-2">
                      <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2">
                        <img src="/logos/UFD_Football.png" alt="Football" class="w-5 h-5 object-contain" />
                        <span>Football</span>
                        <span class="text-green-400 ml-auto">{{ footballLeagues.length }}</span>
                      </div>
                      <div
                        v-for="league in footballLeagues"
                        :key="league.league_id"
                        class="group flex items-center gap-2 rounded-lg transition-colors"
                        :class="leagueStore.activeLeagueId === league.league_id ? 'bg-primary/10' : 'hover:bg-dark-border/50'"
                      >
                        <button
                          @click="selectLeagueWithSport(league)"
                          class="flex-1 flex items-center gap-3 px-3 py-2"
                        >
                          <div class="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                            <img v-if="league.platform === 'yahoo'" src="/logos/yahoo-fantasy.svg" alt="Yahoo" class="w-6 h-6 object-contain" />
                            <img v-else-if="league.platform === 'sleeper'" src="/logos/sleeper.svg" alt="Sleeper" class="w-6 h-6 object-contain" />
                            <div v-else class="w-6 h-6 rounded bg-red-600 flex items-center justify-center">
                              <span class="text-[8px] font-bold text-white">ESPN</span>
                            </div>
                          </div>
                          <div class="flex-1 text-left min-w-0">
                            <div class="font-medium text-dark-text text-sm truncate">{{ league.league_name }}</div>
                            <div class="text-xs text-dark-textMuted">{{ league.season }} • {{ getPlatformName(league.platform) }}</div>
                          </div>
                          <svg v-if="leagueStore.activeLeagueId === league.league_id" class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                          </svg>
                        </button>
                        <button @click.stop="confirmRemoveLeague(league)" class="p-2 opacity-0 group-hover:opacity-100 hover:text-red-400 text-dark-textMuted transition-all" title="Remove league">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    
                    <!-- Baseball Leagues -->
                    <div v-if="baseballLeagues.length > 0" class="p-2" :class="footballLeagues.length > 0 ? 'border-t border-dark-border/50' : ''">
                      <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2">
                        <img src="/logos/UFD_Baseball.png" alt="Baseball" class="w-5 h-5 object-contain" />
                        <span>Baseball</span>
                        <span class="text-blue-400 ml-auto">{{ baseballLeagues.length }}</span>
                      </div>
                      <div
                        v-for="league in baseballLeagues"
                        :key="league.league_id"
                        class="group flex items-center gap-2 rounded-lg transition-colors"
                        :class="leagueStore.activeLeagueId === league.league_id ? 'bg-primary/10' : 'hover:bg-dark-border/50'"
                      >
                        <button @click="selectLeagueWithSport(league)" class="flex-1 flex items-center gap-3 px-3 py-2">
                          <div class="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                            <img v-if="league.platform === 'yahoo'" src="/logos/yahoo-fantasy.svg" alt="Yahoo" class="w-6 h-6 object-contain" />
                            <img v-else-if="league.platform === 'sleeper'" src="/logos/sleeper.svg" alt="Sleeper" class="w-6 h-6 object-contain" />
                            <div v-else class="w-6 h-6 rounded bg-red-600 flex items-center justify-center"><span class="text-[8px] font-bold text-white">ESPN</span></div>
                          </div>
                          <div class="flex-1 text-left min-w-0">
                            <div class="font-medium text-dark-text text-sm truncate">{{ league.league_name }}</div>
                            <div class="text-xs text-dark-textMuted">{{ league.season }} • {{ getPlatformName(league.platform) }}</div>
                          </div>
                          <svg v-if="leagueStore.activeLeagueId === league.league_id" class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                        </button>
                        <button @click.stop="confirmRemoveLeague(league)" class="p-2 opacity-0 group-hover:opacity-100 hover:text-red-400 text-dark-textMuted transition-all" title="Remove league">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    
                    <!-- Basketball Leagues -->
                    <div v-if="basketballLeagues.length > 0" class="p-2" :class="(footballLeagues.length > 0 || baseballLeagues.length > 0) ? 'border-t border-dark-border/50' : ''">
                      <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2">
                        <img src="/logos/UFD_Basketball.png" alt="Basketball" class="w-5 h-5 object-contain" />
                        <span>Basketball</span>
                        <span class="text-orange-400 ml-auto">{{ basketballLeagues.length }}</span>
                      </div>
                      <div
                        v-for="league in basketballLeagues"
                        :key="league.league_id"
                        class="group flex items-center gap-2 rounded-lg transition-colors"
                        :class="leagueStore.activeLeagueId === league.league_id ? 'bg-primary/10' : 'hover:bg-dark-border/50'"
                      >
                        <button @click="selectLeagueWithSport(league)" class="flex-1 flex items-center gap-3 px-3 py-2">
                          <div class="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                            <img v-if="league.platform === 'yahoo'" src="/logos/yahoo-fantasy.svg" alt="Yahoo" class="w-6 h-6 object-contain" />
                            <img v-else-if="league.platform === 'sleeper'" src="/logos/sleeper.svg" alt="Sleeper" class="w-6 h-6 object-contain" />
                            <div v-else class="w-6 h-6 rounded bg-red-600 flex items-center justify-center"><span class="text-[8px] font-bold text-white">ESPN</span></div>
                          </div>
                          <div class="flex-1 text-left min-w-0">
                            <div class="font-medium text-dark-text text-sm truncate">{{ league.league_name }}</div>
                            <div class="text-xs text-dark-textMuted">{{ league.season }} • {{ getPlatformName(league.platform) }}</div>
                          </div>
                          <svg v-if="leagueStore.activeLeagueId === league.league_id" class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                        </button>
                        <button @click.stop="confirmRemoveLeague(league)" class="p-2 opacity-0 group-hover:opacity-100 hover:text-red-400 text-dark-textMuted transition-all" title="Remove league">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    
                    <!-- Hockey Leagues -->
                    <div v-if="hockeyLeagues.length > 0" class="p-2" :class="(footballLeagues.length > 0 || baseballLeagues.length > 0 || basketballLeagues.length > 0) ? 'border-t border-dark-border/50' : ''">
                      <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2">
                        <img src="/logos/UFD_Hockey.png" alt="Hockey" class="w-5 h-5 object-contain" />
                        <span>Hockey</span>
                        <span class="text-blue-500 ml-auto">{{ hockeyLeagues.length }}</span>
                      </div>
                      <div
                        v-for="league in hockeyLeagues"
                        :key="league.league_id"
                        class="group flex items-center gap-2 rounded-lg transition-colors"
                        :class="leagueStore.activeLeagueId === league.league_id ? 'bg-primary/10' : 'hover:bg-dark-border/50'"
                      >
                        <button @click="selectLeagueWithSport(league)" class="flex-1 flex items-center gap-3 px-3 py-2">
                          <div class="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                            <img v-if="league.platform === 'yahoo'" src="/logos/yahoo-fantasy.svg" alt="Yahoo" class="w-6 h-6 object-contain" />
                            <img v-else-if="league.platform === 'sleeper'" src="/logos/sleeper.svg" alt="Sleeper" class="w-6 h-6 object-contain" />
                            <div v-else class="w-6 h-6 rounded bg-red-600 flex items-center justify-center"><span class="text-[8px] font-bold text-white">ESPN</span></div>
                          </div>
                          <div class="flex-1 text-left min-w-0">
                            <div class="font-medium text-dark-text text-sm truncate">{{ league.league_name }}</div>
                            <div class="text-xs text-dark-textMuted">{{ league.season }} • {{ getPlatformName(league.platform) }}</div>
                          </div>
                          <svg v-if="leagueStore.activeLeagueId === league.league_id" class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                        </button>
                        <button @click.stop="confirmRemoveLeague(league)" class="p-2 opacity-0 group-hover:opacity-100 hover:text-red-400 text-dark-textMuted transition-all" title="Remove league">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div v-if="leagueStore.savedLeagues.length > 0" class="border-t border-dark-border/50"></div>
                  
                  <!-- Add League Button -->
                  <div class="p-2">
                    <button @click="openAddLeagueModal" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-border/50 transition-colors text-primary">
                      <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                      </div>
                      <div class="text-left">
                        <div class="font-medium text-sm">Add a League</div>
                        <div class="text-xs text-dark-textMuted">Connect Sleeper or Yahoo</div>
                      </div>
                    </button>
                  </div>
                  
                  <!-- Demo Mode Option -->
                  <div class="border-t border-dark-border/50 p-2">
                    <button @click="enableDemoMode" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-border/50 transition-colors" :class="leagueStore.isDemoMode ? 'bg-cyan-500/10' : ''">
                      <div class="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center"><span class="text-sm">👀</span></div>
                      <div class="text-left">
                        <div class="font-medium text-sm text-cyan-400">Demo Mode</div>
                        <div class="text-xs text-dark-textMuted">Preview with sample data</div>
                      </div>
                      <svg v-if="leagueStore.isDemoMode" class="w-4 h-4 text-cyan-400 ml-auto" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- User Menu -->
              <div class="hidden sm:flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <span class="text-[10px] font-bold text-white">{{ userInitials }}</span>
                </div>
                <span class="text-xs text-white/80 hidden md:inline">{{ displayName }}</span>
              </div>
              <button
                @click="handleSignOut"
                class="hidden sm:block p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                title="Sign out"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Navigation Menu (Sport-colored) - Always sticky, consistent height -->
      <nav 
        class="fixed left-0 right-0 z-40 transition-all duration-300 h-14 sm:h-16"
        :class="isScrolled ? 'top-0' : 'top-10 sm:top-11'"
        :style="{ backgroundColor: sportStore.primaryColor }"
      >
        <!-- Gradient overlay for logo area - pushed further right -->
        <div 
          class="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-300"
          :style="{
            width: '240px',
            background: `linear-gradient(to right, #0a0b10 0%, #0a0b10 ${isScrolled ? '70px' : '100px'}, transparent 240px)`,
            zIndex: 1
          }"
        ></div>
        
        <div class="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-end h-full gap-2">
            <!-- Mobile/Tablet: League Dropdown + Menu Button (shows below lg breakpoint) -->
            <div class="lg:hidden flex items-center gap-2">
              <!-- Mobile League Dropdown -->
              <button
                @click="showMobileMenu = true"
                class="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/40 rounded-full text-white text-xs font-medium max-w-[140px] sm:max-w-[180px]"
              >
                <template v-if="leagueStore.currentLeague">
                  <div class="w-4 h-4 flex-shrink-0">
                    <img v-if="leagueStore.activePlatform === 'yahoo'" src="/logos/yahoo-fantasy.svg" alt="Yahoo" class="w-4 h-4 object-contain" />
                    <img v-else-if="leagueStore.activePlatform === 'sleeper'" src="/logos/sleeper.svg" alt="Sleeper" class="w-4 h-4 object-contain" />
                    <div v-else class="w-4 h-4 rounded bg-gray-600 flex items-center justify-center"><span class="text-[6px] font-bold text-white">ESPN</span></div>
                  </div>
                  <span class="truncate">{{ leagueStore.currentLeague.name }}</span>
                </template>
                <template v-else-if="leagueStore.isDemoMode">
                  <span class="text-cyan-300">👀 Demo</span>
                </template>
                <template v-else>
                  <span class="text-white/70">Select League</span>
                </template>
                <svg class="w-3 h-3 text-white/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <!-- Dashboards Button -->
              <button
                @click="showMobileMenu = true"
                class="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 rounded-full text-white font-semibold text-sm"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>Dashboards</span>
              </button>
            </div>
            
            <!-- Desktop: Right-aligned pill-style tabs (lg and up) -->
            <div class="hidden lg:flex items-center gap-4">
              <!-- Demo Mode Banner -->
              <div v-if="leagueStore.isDemoMode" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30">
                <span class="text-sm">👀</span>
                <span class="text-white text-xs font-medium">Demo Mode</span>
                <button @click="openAddLeagueModal" class="text-xs text-white/80 hover:text-white underline ml-1">Connect →</button>
              </div>
              
              <div class="inline-flex items-center gap-1 bg-black/40 rounded-full p-1">
                <router-link
                  v-for="tab in tabs"
                  :key="tab.path"
                  :to="tab.path"
                  class="px-3 lg:px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-200"
                  :class="[
                    $route.path === tab.path
                      ? 'bg-white text-gray-900 shadow-md'
                      : 'text-white/80 hover:text-white hover:bg-white/20'
                  ]"
                >
                  {{ tab.name }}
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      <!-- Sport Logo - Floating on top, shrinks on scroll -->
      <div 
        class="fixed left-1 sm:left-2 lg:left-3 z-50 pointer-events-none transition-all duration-300"
        :style="{ top: isScrolled ? '2px' : '2px' }"
      >
        <img 
          :src="sportStore.sportLogo" 
          :alt="sportStore.sportLabel"
          class="object-contain drop-shadow-lg transition-all duration-300"
          :class="isScrolled ? 'w-[52px] h-[52px] sm:w-[56px] sm:h-[56px] lg:w-[60px] lg:h-[60px]' : 'w-20 h-20 sm:w-24 sm:h-24 lg:w-[104px] lg:h-[104px]'"
        />
      </div>
      
      <!-- Spacer for fixed header -->
      <div class="h-[96px] sm:h-[108px]"></div>
      
      <!-- Content fade gradient -->
      <div class="h-8 w-full pointer-events-none -mb-8 relative z-10" style="background: linear-gradient(to bottom, #0a0b10, transparent);"></div>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div v-if="leagueStore.error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 shadow-lg">
          <p class="text-red-800 dark:text-red-200 font-medium">{{ leagueStore.error }}</p>
        </div>

        <div v-if="leagueStore.isLoading" class="flex items-center justify-center py-24">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-4"></div>
            <p class="text-dark-textMuted">Loading league data...</p>
          </div>
        </div>

        <router-view v-else />
      </main>
      
      <AppFooter />
      
      <!-- Full Screen Mobile Menu -->
      <Teleport to="body">
        <Transition
          enter-active-class="transition-transform duration-300 ease-out"
          enter-from-class="translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transition-transform duration-200 ease-in"
          leave-from-class="translate-x-0"
          leave-to-class="translate-x-full"
        >
          <div 
            v-if="showMobileMenu"
            class="fixed inset-0 z-[60] bg-dark-bg flex flex-col"
          >
            <!-- Mobile Menu Header -->
            <div class="flex items-center justify-between p-4 border-b border-dark-border">
              <div class="flex items-center gap-3">
                <img :src="sportStore.sportLogo" :alt="sportStore.sportLabel" class="w-10 h-10 object-contain" />
                <span class="text-lg font-bold text-white">Menu</span>
              </div>
              <button 
                @click="showMobileMenu = false"
                class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors"
              >
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <!-- League Selector in Mobile Menu -->
            <div class="p-4 border-b border-dark-border">
              <div class="text-xs text-dark-textMuted uppercase tracking-wider mb-2">Current League</div>
              <button
                @click="showMobileLeagueSelect = !showMobileLeagueSelect"
                class="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-dark-card border border-dark-border"
              >
                <div class="flex items-center gap-3">
                  <template v-if="leagueStore.currentLeague">
                    <div class="w-8 h-8 flex-shrink-0">
                      <img v-if="leagueStore.activePlatform === 'yahoo'" src="/logos/yahoo-fantasy.svg" alt="Yahoo" class="w-8 h-8 object-contain" />
                      <img v-else-if="leagueStore.activePlatform === 'sleeper'" src="/logos/sleeper.svg" alt="Sleeper" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="text-left">
                      <div class="font-semibold text-white">{{ leagueStore.currentLeague.name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ getPlatformName(leagueStore.activePlatform) }}</div>
                    </div>
                  </template>
                  <template v-else-if="leagueStore.isDemoMode">
                    <div class="w-8 h-8 rounded-full bg-cyan-500/30 flex items-center justify-center"><span>👀</span></div>
                    <span class="font-semibold text-cyan-400">Demo Mode</span>
                  </template>
                  <template v-else>
                    <div class="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
                      <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <span class="font-semibold text-primary">Add a League</span>
                  </template>
                </div>
                <svg class="w-5 h-5 text-dark-textMuted" :class="showMobileLeagueSelect ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <!-- Mobile League List -->
              <div v-if="showMobileLeagueSelect" class="mt-2 max-h-48 overflow-y-auto rounded-xl bg-dark-elevated border border-dark-border">
                <button
                  v-for="league in leagueStore.savedLeagues"
                  :key="league.league_id"
                  @click="selectLeagueWithSport(league); showMobileLeagueSelect = false"
                  class="w-full flex items-center gap-3 p-3 hover:bg-dark-border/50 transition-colors"
                  :class="leagueStore.activeLeagueId === league.league_id ? 'bg-primary/10' : ''"
                >
                  <div class="w-6 h-6 flex-shrink-0">
                    <img v-if="league.platform === 'yahoo'" src="/logos/yahoo-fantasy.svg" alt="Yahoo" class="w-6 h-6 object-contain" />
                    <img v-else-if="league.platform === 'sleeper'" src="/logos/sleeper.svg" alt="Sleeper" class="w-6 h-6 object-contain" />
                  </div>
                  <div class="flex-1 text-left">
                    <div class="font-medium text-white text-sm">{{ league.league_name }}</div>
                    <div class="text-xs text-dark-textMuted">{{ league.season }}</div>
                  </div>
                  <svg v-if="leagueStore.activeLeagueId === league.league_id" class="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                </button>
                <button
                  @click="openAddLeagueModal; showMobileMenu = false"
                  class="w-full flex items-center gap-3 p-3 hover:bg-dark-border/50 transition-colors text-primary border-t border-dark-border/50"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                  <span class="font-medium">Add a League</span>
                </button>
              </div>
            </div>
            
            <!-- Navigation Items -->
            <div class="flex-1 overflow-y-auto p-4">
              <div class="text-xs text-dark-textMuted uppercase tracking-wider mb-3">Dashboards</div>
              <div class="space-y-2">
                <router-link
                  v-for="tab in tabs"
                  :key="tab.path"
                  :to="tab.path"
                  @click="showMobileMenu = false"
                  class="flex items-center justify-between p-4 rounded-xl transition-colors"
                  :class="[
                    $route.path === tab.path
                      ? 'bg-primary text-gray-900'
                      : 'bg-dark-card text-white hover:bg-dark-border/50'
                  ]"
                >
                  <span class="text-lg font-bold">{{ tab.name }}</span>
                  <svg class="w-5 h-5" :class="$route.path === tab.path ? 'text-gray-900' : 'text-dark-textMuted'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </router-link>
              </div>
            </div>
            
            <!-- Mobile Menu Footer -->
            <div class="p-4 border-t border-dark-border">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span class="text-sm font-bold text-primary">{{ userInitials }}</span>
                  </div>
                  <div>
                    <div class="font-medium text-white">{{ displayName }}</div>
                    <div class="text-xs text-dark-textMuted">{{ authStore.user?.email }}</div>
                  </div>
                </div>
                <button
                  @click="handleSignOut; showMobileMenu = false"
                  class="p-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </template>

    <!-- Auth Modal -->
    <AuthModal 
      :show="showAuthModal" 
      :mode="authMode"
      @close="showAuthModal = false"
      @success="handleAuthSuccess"
      @switch-mode="authMode = authMode === 'login' ? 'signup' : 'login'"
    />

    <!-- Add League Modal -->
    <AddLeagueModal 
      :isOpen="showAddLeagueModal"
      @close="showAddLeagueModal = false"
      @league-added="handleLeagueAdded"
      @yahoo-league-added="handleYahooLeagueAdded"
    />
    
    <!-- Remove League Confirmation -->
    <Teleport to="body">
      <div 
        v-if="leagueToRemove"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
        @click.self="leagueToRemove = null"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-dark-border/50 p-6">
          <h3 class="text-lg font-bold text-dark-text mb-2">Remove League?</h3>
          <p class="text-dark-textMuted text-sm mb-4">
            Are you sure you want to remove <span class="text-white font-medium">{{ leagueToRemove.league_name }}</span> from your dashboard?
          </p>
          <div class="flex gap-3">
            <button @click="leagueToRemove = null" class="flex-1 px-4 py-2 rounded-lg bg-dark-border text-dark-text font-medium hover:bg-dark-border/70 transition-colors">Cancel</button>
            <button @click="removeLeague" class="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">Remove</button>
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
import { useSportStore, type Sport } from '@/stores/sport'
import AuthModal from '@/components/AuthModal.vue'
import LandingPage from '@/components/LandingPage.vue'
import AddLeagueModal from '@/components/AddLeagueModal.vue'
import AppFooter from '@/components/AppFooter.vue'

const router = useRouter()
const leagueStore = useLeagueStore()
const darkModeStore = useDarkModeStore()
const authStore = useAuthStore()
const sportStore = useSportStore()

const showAuthModal = ref(false)
const authMode = ref<'login' | 'signup'>('signup')
const showLeagueDropdown = ref(false)
const showAddLeagueModal = ref(false)
const showMobileMenu = ref(false)
const showMobileLeagueSelect = ref(false)
const leagueDropdownRef = ref<HTMLElement | null>(null)
const leagueToRemove = ref<any>(null)
const isScrolled = ref(false)

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

const displayName = computed(() => authStore.profile?.full_name || authStore.user?.email?.split('@')[0] || 'User')
const userInitials = computed(() => {
  const name = authStore.profile?.full_name || authStore.user?.email || ''
  if (!name) return '?'
  const parts = name.split(' ')
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase()
})

const footballLeagues = computed(() => leagueStore.savedLeagues.filter(l => (l.sport || 'football') === 'football'))
const baseballLeagues = computed(() => leagueStore.savedLeagues.filter(l => l.sport === 'baseball'))
const basketballLeagues = computed(() => leagueStore.savedLeagues.filter(l => l.sport === 'basketball'))
const hockeyLeagues = computed(() => leagueStore.savedLeagues.filter(l => l.sport === 'hockey'))

function getPlatformName(platform: string | undefined): string {
  switch (platform) {
    case 'yahoo': return 'Yahoo'
    case 'sleeper': return 'Sleeper'
    case 'espn': return 'ESPN'
    default: return 'Unknown'
  }
}

function openAddLeagueModal() {
  showLeagueDropdown.value = false
  showAddLeagueModal.value = true
}

async function selectLeagueWithSport(league: any) {
  showLeagueDropdown.value = false
  leagueStore.disableDemoMode()
  const leagueSport = league.sport || 'football'
  if (leagueSport !== sportStore.activeSport) {
    sportStore.setSport(leagueSport as Sport)
    leagueStore.setActiveSport(leagueSport as Sport)
  }
  await leagueStore.setActiveLeague(league.league_id)
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
    await leagueStore.saveLeague(league, leagueStore.currentUsername, authStore.user.id, sportStore.activeSport)
    leagueStore.disableDemoMode()
    await leagueStore.setActiveLeague(league.league_id)
  }
}

async function handleYahooLeagueAdded(league: any) {
  showAddLeagueModal.value = false
  if (!authStore.user?.id) return
  try {
    const leagueSport = league.sport || sportStore.activeSport
    await leagueStore.saveYahooLeague(league, authStore.user.id, leagueSport)
    if (leagueSport !== sportStore.activeSport) {
      sportStore.setSport(leagueSport)
      leagueStore.setActiveSport(leagueSport)
    }
    leagueStore.disableDemoMode()
    await leagueStore.setActiveLeague(league.league_key)
  } catch (err) {
    console.error('Failed to add Yahoo league:', err)
  }
}

async function handleSignOut() {
  await authStore.signOut()
  leagueStore.reset()
}

function handleScroll() {
  isScrolled.value = window.scrollY > 20
}

function handleClickOutside(event: MouseEvent) {
  if (leagueDropdownRef.value && !leagueDropdownRef.value.contains(event.target as Node)) {
    showLeagueDropdown.value = false
  }
}

onMounted(async () => {
  darkModeStore.init()
  await authStore.initialize()
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', handleScroll, { passive: true })
  if (authStore.isAuthenticated && authStore.user?.id) {
    await leagueStore.loadSavedLeagues(authStore.user.id)
    if (!leagueStore.hasSavedLeagues && !leagueStore.activeLeagueId) {
      leagueStore.enableDemoMode()
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', handleScroll)
})

watch(() => authStore.isAuthenticated, async (isAuth) => {
  if (isAuth && authStore.user?.id) {
    await leagueStore.loadSavedLeagues(authStore.user.id)
    if (!leagueStore.hasSavedLeagues && !leagueStore.activeLeagueId) {
      leagueStore.enableDemoMode()
    }
  }
})

watch(() => router.currentRoute.value.path, () => {
  showMobileMenu.value = false
})
</script>
