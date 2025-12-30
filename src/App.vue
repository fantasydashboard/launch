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
        <!-- Gradient overlay behind content - for logo area only -->
        <div 
          class="absolute left-0 top-0 bottom-0 pointer-events-none"
          style="width: 200px; background: linear-gradient(to right, #0a0b10 0%, #0a0b10 80px, transparent 200px); z-index: 1;"
        ></div>
        
        <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-10 sm:h-11">
            <!-- Title - aligns with page content -->
            <div class="flex items-center">
              <h1 class="text-xs sm:text-sm lg:text-base font-bold text-white tracking-wider uppercase">
                <span class="hidden sm:inline">ULTIMATE FANTASY DASHBOARD</span>
                <span class="sm:hidden">UFD</span>
              </h1>
            </div>

            <!-- User Menu -->
            <div class="flex items-center gap-2 sm:gap-3">
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
              
              <!-- Mobile User Menu Button -->
              <button
                @click="showMobileUserMenu = !showMobileUserMenu"
                class="sm:hidden p-1 rounded-lg hover:bg-white/10 transition-colors"
                data-mobile-user-menu
              >
                <div class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <span class="text-[10px] font-bold text-white">{{ userInitials }}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Mobile User Dropdown -->
        <div 
          v-if="showMobileUserMenu" 
          class="sm:hidden absolute right-4 top-10 bg-dark-elevated border border-dark-border rounded-xl shadow-xl z-50 w-48 overflow-hidden"
          data-mobile-user-menu
        >
          <div class="p-3 border-b border-dark-border">
            <div class="font-medium text-dark-text text-sm truncate">{{ displayName }}</div>
            <div class="text-xs text-dark-textMuted truncate">{{ authStore.user?.email }}</div>
          </div>
          <button
            @click="handleSignOut; showMobileUserMenu = false"
            class="w-full flex items-center gap-2 px-3 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors text-sm"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <!-- Navigation Menu (Sport-colored) - Always sticky -->
      <nav 
        class="fixed left-0 right-0 z-40 transition-all duration-300"
        :class="isScrolled ? 'top-0' : 'top-10 sm:top-11'"
        :style="{ backgroundColor: sportStore.primaryColor }"
      >
        <!-- Gradient overlay behind content - for logo area only -->
        <div 
          class="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-300"
          :style="{
            width: '200px',
            background: `linear-gradient(to right, #0a0b10 0%, #0a0b10 ${isScrolled ? '60px' : '80px'}, transparent 200px)`,
            zIndex: 1
          }"
        ></div>
        
        <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            class="flex items-center justify-between transition-all duration-300"
            :class="isScrolled ? 'h-16 sm:h-18 lg:h-20' : 'h-14 sm:h-16'"
          >
            <!-- Navigation Tabs -->
            <div class="flex-1 overflow-hidden">
              <!-- Mobile: Dashboard Button -->
              <div class="sm:hidden relative" ref="mobileMenuRef">
                <button
                  @click="showMobileMenu = !showMobileMenu"
                  class="flex items-center gap-2 px-4 py-2 bg-black/20 rounded-full text-white font-semibold text-sm"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span>Dashboards</span>
                  <svg class="w-3 h-3" :class="showMobileMenu ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <!-- Mobile Menu Dropdown -->
                <div 
                  v-if="showMobileMenu"
                  class="absolute top-full left-0 mt-2 w-56 bg-dark-card border border-dark-border rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <div class="p-2">
                    <router-link
                      v-for="tab in tabs"
                      :key="tab.path"
                      :to="tab.path"
                      @click="showMobileMenu = false"
                      class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
                      :class="[
                        $route.path === tab.path
                          ? 'bg-primary/20 text-primary'
                          : 'text-dark-text hover:bg-dark-border/50'
                      ]"
                    >
                      <span class="text-lg">{{ getTabIcon(tab.name) }}</span>
                      <span class="font-medium text-sm">{{ tab.name }}</span>
                    </router-link>
                  </div>
                </div>
              </div>
              
              <!-- Desktop: Pill-style tabs -->
              <div class="hidden sm:flex items-center gap-4">
                <div class="inline-flex items-center gap-1 bg-black/20 rounded-full p-1">
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
                
                <!-- Demo Mode Banner -->
                <div v-if="leagueStore.isDemoMode" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30">
                  <span class="text-sm">👀</span>
                  <span class="text-white text-xs font-medium">Demo Mode</span>
                  <button 
                    @click="openAddLeagueModal"
                    class="text-xs text-white/80 hover:text-white underline ml-1"
                  >
                    Connect →
                  </button>
                </div>
              </div>
            </div>
            
            <!-- League Dropdown - Right side of nav -->
            <div class="relative ml-2 sm:ml-4" ref="leagueDropdownRef">
              <button
                @click="showLeagueDropdown = !showLeagueDropdown"
                class="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-black/20 border border-white/20 hover:border-white/40 transition-colors min-w-0 sm:min-w-[180px]"
              >
                <template v-if="leagueStore.currentLeague">
                  <!-- Platform Icon -->
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
              
              <!-- Dropdown Menu -->
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
                        <!-- Platform Logo -->
                        <div class="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                          <img 
                            v-if="league.platform === 'yahoo'" 
                            src="/logos/yahoo-fantasy.svg" 
                            alt="Yahoo" 
                            class="w-6 h-6 object-contain"
                          />
                          <img 
                            v-else-if="league.platform === 'sleeper'" 
                            src="/logos/sleeper.svg" 
                            alt="Sleeper" 
                            class="w-6 h-6 object-contain"
                          />
                          <div v-else class="w-6 h-6 rounded bg-red-600 flex items-center justify-center">
                            <span class="text-[8px] font-bold text-white">ESPN</span>
                          </div>
                        </div>
                        <div class="flex-1 text-left min-w-0">
                          <div class="font-medium text-dark-text text-sm truncate">{{ league.league_name }}</div>
                          <div class="text-xs text-dark-textMuted">
                            {{ league.season }} • {{ getPlatformName(league.platform) }}
                          </div>
                        </div>
                        <svg v-if="leagueStore.activeLeagueId === league.league_id" class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                      </button>
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
                      <button
                        @click="selectLeagueWithSport(league)"
                        class="flex-1 flex items-center gap-3 px-3 py-2"
                      >
                        <div class="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                          <img 
                            v-if="league.platform === 'yahoo'" 
                            src="/logos/yahoo-fantasy.svg" 
                            alt="Yahoo" 
                            class="w-6 h-6 object-contain"
                          />
                          <img 
                            v-else-if="league.platform === 'sleeper'" 
                            src="/logos/sleeper.svg" 
                            alt="Sleeper" 
                            class="w-6 h-6 object-contain"
                          />
                          <div v-else class="w-6 h-6 rounded bg-red-600 flex items-center justify-center">
                            <span class="text-[8px] font-bold text-white">ESPN</span>
                          </div>
                        </div>
                        <div class="flex-1 text-left min-w-0">
                          <div class="font-medium text-dark-text text-sm truncate">{{ league.league_name }}</div>
                          <div class="text-xs text-dark-textMuted">
                            {{ league.season }} • {{ getPlatformName(league.platform) }}
                          </div>
                        </div>
                        <svg v-if="leagueStore.activeLeagueId === league.league_id" class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                      </button>
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
                      <button
                        @click="selectLeagueWithSport(league)"
                        class="flex-1 flex items-center gap-3 px-3 py-2"
                      >
                        <div class="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                          <img 
                            v-if="league.platform === 'yahoo'" 
                            src="/logos/yahoo-fantasy.svg" 
                            alt="Yahoo" 
                            class="w-6 h-6 object-contain"
                          />
                          <img 
                            v-else-if="league.platform === 'sleeper'" 
                            src="/logos/sleeper.svg" 
                            alt="Sleeper" 
                            class="w-6 h-6 object-contain"
                          />
                          <div v-else class="w-6 h-6 rounded bg-red-600 flex items-center justify-center">
                            <span class="text-[8px] font-bold text-white">ESPN</span>
                          </div>
                        </div>
                        <div class="flex-1 text-left min-w-0">
                          <div class="font-medium text-dark-text text-sm truncate">{{ league.league_name }}</div>
                          <div class="text-xs text-dark-textMuted">
                            {{ league.season }} • {{ getPlatformName(league.platform) }}
                          </div>
                        </div>
                        <svg v-if="leagueStore.activeLeagueId === league.league_id" class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                      </button>
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
                      <button
                        @click="selectLeagueWithSport(league)"
                        class="flex-1 flex items-center gap-3 px-3 py-2"
                      >
                        <div class="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                          <img 
                            v-if="league.platform === 'yahoo'" 
                            src="/logos/yahoo-fantasy.svg" 
                            alt="Yahoo" 
                            class="w-6 h-6 object-contain"
                          />
                          <img 
                            v-else-if="league.platform === 'sleeper'" 
                            src="/logos/sleeper.svg" 
                            alt="Sleeper" 
                            class="w-6 h-6 object-contain"
                          />
                          <div v-else class="w-6 h-6 rounded bg-red-600 flex items-center justify-center">
                            <span class="text-[8px] font-bold text-white">ESPN</span>
                          </div>
                        </div>
                        <div class="flex-1 text-left min-w-0">
                          <div class="font-medium text-dark-text text-sm truncate">{{ league.league_name }}</div>
                          <div class="text-xs text-dark-textMuted">
                            {{ league.season }} • {{ getPlatformName(league.platform) }}
                          </div>
                        </div>
                        <svg v-if="leagueStore.activeLeagueId === league.league_id" class="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                      </button>
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
                </div>
                
                <!-- Divider -->
                <div v-if="leagueStore.savedLeagues.length > 0" class="border-t border-dark-border/50"></div>
                
                <!-- Add League Button -->
                <div class="p-2">
                  <button
                    @click="openAddLeagueModal"
                    class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-dark-border/50 transition-colors text-primary"
                  >
                    <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div class="text-left">
                      <div class="font-medium text-sm">Add a League</div>
                      <div class="text-xs text-dark-textMuted">Connect Sleeper or Yahoo</div>
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
                    <div class="text-left">
                      <div class="font-medium text-sm text-cyan-400">Demo Mode</div>
                      <div class="text-xs text-dark-textMuted">Preview with sample data</div>
                    </div>
                    <svg v-if="leagueStore.isDemoMode" class="w-4 h-4 text-cyan-400 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      <!-- Sport Logo - Floating on top, shrinks on scroll, stays within header bounds -->
      <div 
        class="fixed left-1 sm:left-2 lg:left-3 z-50 pointer-events-none transition-all duration-300"
        :style="{
          top: isScrolled ? '4px' : '2px'
        }"
      >
        <img 
          :src="sportStore.sportLogo" 
          :alt="sportStore.sportLabel"
          class="object-contain drop-shadow-lg transition-all duration-300"
          :class="isScrolled ? 'w-14 h-14 sm:w-16 sm:h-16 lg:w-18 lg:h-18' : 'w-20 h-20 sm:w-24 sm:h-24 lg:w-[104px] lg:h-[104px]'"
        />
      </div>
      
      <!-- Spacer for fixed header -->
      <div class="h-[96px] sm:h-[108px]"></div>
      
      <!-- Content fade gradient -->
      <div 
        class="h-8 w-full pointer-events-none -mb-8 relative z-10"
        style="background: linear-gradient(to bottom, #0a0b10, transparent);"
      ></div>

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
      
      <!-- Footer -->
      <AppFooter />
    </template>

    <!-- Auth Modal - Outside template blocks so it's always available -->
    <AuthModal 
      :show="showAuthModal" 
      :mode="authMode"
      @close="showAuthModal = false"
      @success="handleAuthSuccess"
      @switch-mode="authMode = authMode === 'login' ? 'signup' : 'login'"
    />

    <!-- Add League Modal - Component has its own Teleport -->
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
const showMobileUserMenu = ref(false)
const showMobileMenu = ref(false)
const leagueDropdownRef = ref<HTMLElement | null>(null)
const mobileMenuRef = ref<HTMLElement | null>(null)
const leagueToRemove = ref<any>(null)

// Scroll state
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

// Group leagues by sport
const footballLeagues = computed(() => 
  leagueStore.savedLeagues.filter(l => (l.sport || 'football') === 'football')
)
const baseballLeagues = computed(() => 
  leagueStore.savedLeagues.filter(l => l.sport === 'baseball')
)
const basketballLeagues = computed(() => 
  leagueStore.savedLeagues.filter(l => l.sport === 'basketball')
)
const hockeyLeagues = computed(() => 
  leagueStore.savedLeagues.filter(l => l.sport === 'hockey')
)

// Tab icons for mobile menu
function getTabIcon(tabName: string): string {
  const icons: Record<string, string> = {
    'Home': '🏠',
    'Power Rankings': '📊',
    'Matchups': '⚔️',
    'Projections': '🎯',
    'History': '📜',
    'Draft': '📝',
    'Compare': '⚖️',
    'Tools': '🛠️'
  }
  return icons[tabName] || '📌'
}

// Platform name helper
function getPlatformName(platform: string | undefined): string {
  switch (platform) {
    case 'yahoo': return 'Yahoo'
    case 'sleeper': return 'Sleeper'
    case 'espn': return 'ESPN'
    default: return 'Unknown'
  }
}

// Open Add League Modal
function openAddLeagueModal() {
  console.log('Opening add league modal')
  showLeagueDropdown.value = false
  showAddLeagueModal.value = true
}

// Select league AND switch sport automatically
async function selectLeagueWithSport(league: any) {
  showLeagueDropdown.value = false
  leagueStore.disableDemoMode()
  
  // Switch sport based on league's sport
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
    
    // If no saved leagues, enable demo mode
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
  
  if (!authStore.user?.id) {
    console.error('Not authenticated')
    return
  }
  
  try {
    // Save the Yahoo league with current sport
    await leagueStore.saveYahooLeague(league, authStore.user.id, sportStore.activeSport)
    
    // Set it as active
    leagueStore.disableDemoMode()
    await leagueStore.setActiveLeague(league.league_key)
    
    console.log('Yahoo league added and activated:', league.name)
  } catch (err) {
    console.error('Failed to add Yahoo league:', err)
  }
}

async function handleSignOut() {
  await authStore.signOut()
  leagueStore.reset()
}

// Scroll handler
function handleScroll() {
  isScrolled.value = window.scrollY > 20
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (leagueDropdownRef.value && !leagueDropdownRef.value.contains(event.target as Node)) {
    showLeagueDropdown.value = false
  }
  if (mobileMenuRef.value && !mobileMenuRef.value.contains(event.target as Node)) {
    showMobileMenu.value = false
  }
  // Close mobile user menu when clicking outside
  const target = event.target as HTMLElement
  if (showMobileUserMenu.value && !target.closest('[data-mobile-user-menu]')) {
    showMobileUserMenu.value = false
  }
}

onMounted(async () => {
  darkModeStore.init()
  await authStore.initialize()
  
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', handleScroll, { passive: true })
  
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
watch(() => router.currentRoute.value.path, () => {
  showMobileUserMenu.value = false
  showMobileMenu.value = false
})
</script>
