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
      <!-- Top Header (Dark card color) - Slides away on scroll -->
      <header 
        class="fixed top-0 left-0 right-0 z-30 transition-transform duration-300"
        :class="isScrolled ? '-translate-y-full' : 'translate-y-0'"
        style="background: #11131a;"
      >
        <!-- Gradient overlay behind content - lowest layer -->
        <div 
          class="absolute left-0 top-0 bottom-0 pointer-events-none"
          style="width: 220px; background: linear-gradient(to right, #11131a 0%, #11131a 140px, transparent 220px); z-index: 1;"
        ></div>
        
        <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-10 sm:h-11 pl-28 sm:pl-36 lg:pl-44">
            <!-- Title -->
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
        <!-- Gradient overlay behind content - lowest layer -->
        <div 
          class="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-300"
          :style="{
            width: '220px',
            background: `linear-gradient(to right, #11131a 0%, #11131a ${isScrolled ? '100px' : '140px'}, transparent 220px)`,
            zIndex: 1
          }"
        ></div>
        
        <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            class="flex items-center justify-between transition-all duration-300 pl-28 sm:pl-36 lg:pl-44"
            :class="isScrolled ? 'h-14 sm:h-16' : 'h-12 sm:h-14'"
          >
            <!-- Navigation Tabs -->
            <div class="flex-1 overflow-hidden">
              <!-- Mobile: Scrollable tabs -->
              <div class="sm:hidden overflow-x-auto scrollbar-hide -mr-4 pr-4">
                <div class="flex items-center gap-1 min-w-max">
                  <router-link
                    v-for="tab in tabs"
                    :key="tab.path"
                    :to="tab.path"
                    class="flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 whitespace-nowrap"
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
                    @click="showAddLeagueModal = true"
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
                  <div 
                    class="w-5 h-5 flex-shrink-0 rounded flex items-center justify-center"
                    :class="leagueStore.activePlatform === 'yahoo' ? 'bg-purple-600' : ''"
                    :style="leagueStore.activePlatform !== 'yahoo' ? { background: getLeagueTypeColor(leagueStore.currentLeague.settings?.type) } : {}"
                  >
                    <span v-if="leagueStore.activePlatform === 'yahoo'" class="text-[10px] font-bold text-white">Y!</span>
                    <svg v-else class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
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
                <div v-if="leagueStore.savedLeagues.length > 0" class="max-h-80 overflow-y-auto">
                  <!-- Football Leagues -->
                  <div v-if="footballLeagues.length > 0" class="p-2">
                    <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2">
                      <span class="w-4 h-4 rounded-full" style="background: #22c55e;"></span>
                      <span>Football</span>
                      <span class="text-primary ml-auto">{{ footballLeagues.length }}</span>
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
                        <div 
                          class="w-5 h-5 flex-shrink-0 rounded flex items-center justify-center"
                          :class="league.platform === 'yahoo' ? 'bg-purple-600' : ''"
                          :style="league.platform !== 'yahoo' ? { background: getLeagueTypeColor(league.league_type) } : {}"
                        >
                          <span v-if="league.platform === 'yahoo'" class="text-[10px] font-bold text-white">Y!</span>
                          <svg v-else class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                        <div class="flex-1 text-left min-w-0">
                          <div class="font-medium text-dark-text text-sm truncate">{{ league.league_name }}</div>
                          <div class="text-xs text-dark-textMuted">
                            {{ league.season }} • 
                            <span v-if="league.platform === 'yahoo'" class="text-purple-400">Yahoo</span>
                            <span v-else>{{ league.sleeper_username }}</span>
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
                  <div v-if="baseballLeagues.length > 0" class="p-2 border-t border-dark-border/50">
                    <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2">
                      <span class="w-4 h-4 rounded-full" style="background: #3B9FE8;"></span>
                      <span>Baseball</span>
                      <span class="text-primary ml-auto">{{ baseballLeagues.length }}</span>
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
                        <div 
                          class="w-5 h-5 flex-shrink-0 rounded flex items-center justify-center"
                          :class="league.platform === 'yahoo' ? 'bg-purple-600' : ''"
                          :style="league.platform !== 'yahoo' ? { background: getLeagueTypeColor(league.league_type) } : {}"
                        >
                          <span v-if="league.platform === 'yahoo'" class="text-[10px] font-bold text-white">Y!</span>
                          <svg v-else class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                        <div class="flex-1 text-left min-w-0">
                          <div class="font-medium text-dark-text text-sm truncate">{{ league.league_name }}</div>
                          <div class="text-xs text-dark-textMuted">
                            {{ league.season }} • 
                            <span v-if="league.platform === 'yahoo'" class="text-purple-400">Yahoo</span>
                            <span v-else>{{ league.sleeper_username }}</span>
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
                  <div v-if="basketballLeagues.length > 0" class="p-2 border-t border-dark-border/50">
                    <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2">
                      <span class="w-4 h-4 rounded-full" style="background: #f97316;"></span>
                      <span>Basketball</span>
                      <span class="text-primary ml-auto">{{ basketballLeagues.length }}</span>
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
                        <div class="w-5 h-5 flex-shrink-0 rounded bg-purple-600 flex items-center justify-center">
                          <span class="text-[10px] font-bold text-white">Y!</span>
                        </div>
                        <div class="flex-1 text-left min-w-0">
                          <div class="font-medium text-dark-text text-sm truncate">{{ league.league_name }}</div>
                          <div class="text-xs text-dark-textMuted">{{ league.season }}</div>
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
                  <div v-if="hockeyLeagues.length > 0" class="p-2 border-t border-dark-border/50">
                    <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2">
                      <span class="w-4 h-4 rounded-full" style="background: #3b82f6;"></span>
                      <span>Hockey</span>
                      <span class="text-primary ml-auto">{{ hockeyLeagues.length }}</span>
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
                        <div class="w-5 h-5 flex-shrink-0 rounded bg-purple-600 flex items-center justify-center">
                          <span class="text-[10px] font-bold text-white">Y!</span>
                        </div>
                        <div class="flex-1 text-left min-w-0">
                          <div class="font-medium text-dark-text text-sm truncate">{{ league.league_name }}</div>
                          <div class="text-xs text-dark-textMuted">{{ league.season }}</div>
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
                    @click="showAddLeagueModal = true; showLeagueDropdown = false"
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
      
      <!-- Sport Logo - Floating on top, shrinks on scroll -->
      <div 
        class="fixed z-50 pointer-events-none transition-all duration-300"
        :class="isScrolled ? 'left-3 sm:left-4 lg:left-5' : 'left-4 sm:left-5 lg:left-6'"
        :style="{
          top: isScrolled ? '50%' : 'calc((40px + 56px) / 2)',
          transform: isScrolled ? 'translateY(-50%)' : 'translateY(-50%)'
        }"
      >
        <img 
          :src="sportStore.sportLogo" 
          :alt="sportStore.sportLabel"
          class="object-contain drop-shadow-lg transition-all duration-300"
          :class="isScrolled ? 'w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16' : 'w-24 h-24 sm:w-28 sm:h-28 lg:w-36 lg:h-36'"
        />
      </div>
      
      <!-- Spacer for fixed header -->
      <div class="h-[88px] sm:h-[100px]"></div>
      
      <!-- Content fade gradient -->
      <div 
        class="h-8 w-full pointer-events-none -mb-8 relative z-10"
        style="background: linear-gradient(to bottom, #11131a, transparent);"
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
      v-if="showAddLeagueModal" 
      @close="showAddLeagueModal = false"
      @league-added="handleLeagueAdded"
      @yahoo-league-added="handleYahooLeagueAdded"
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
const leagueDropdownRef = ref<HTMLElement | null>(null)
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

// League type helpers - 0 = redraft, 1 = keeper, 2 = dynasty
function getLeagueTypeColor(leagueType: number | undefined): string {
  switch (leagueType) {
    case 2: return '#a855f7' // Purple for dynasty
    case 1: return '#f97316' // Orange for keeper
    default: return '#06b6d4' // Cyan/turquoise for redraft
  }
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
    await leagueStore.saveLeague(league, leagueStore.currentUsername, authStore.user.id)
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
})
</script>
