<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="$emit('close')"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      
      <!-- Modal -->
      <div class="relative bg-dark-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-dark-border/50">
        <!-- Header -->
        <div class="p-6 text-center border-b border-dark-border/30">
          <div class="text-4xl mb-2">🏆</div>
          <h2 class="text-2xl font-bold text-dark-text">Add a League</h2>
          <p class="text-sm text-dark-textMuted mt-1">
            Connect your fantasy league to get started
          </p>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4">
          <!-- Step 0: Choose Platform -->
          <div v-if="step === 0">
            <p class="text-sm text-dark-textMuted mb-4 text-center">Choose your fantasy platform</p>
            
            <div class="space-y-3">
              <!-- Sleeper Option -->
              <button
                @click="selectPlatform('sleeper')"
                class="w-full flex items-center gap-4 p-4 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-blue-500/50 hover:bg-dark-border/30 transition-all text-left"
              >
                <img src="/sleeper.svg" alt="Sleeper" class="w-12 h-12 rounded-xl flex-shrink-0" />
                <div class="flex-1">
                  <div class="font-semibold text-dark-text">Sleeper</div>
                  <div class="text-xs text-dark-textMuted">Enter username to find leagues</div>
                </div>
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <!-- Yahoo Option -->
              <button
                @click="selectPlatform('yahoo')"
                class="w-full flex items-center gap-4 p-4 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-purple-500/50 hover:bg-dark-border/30 transition-all text-left"
              >
                <img src="/yahoo-fantasy.svg" alt="Yahoo" class="w-12 h-12 rounded-xl flex-shrink-0" />
                <div class="flex-1">
                  <div class="font-semibold text-dark-text flex items-center gap-2">
                    Yahoo Fantasy
                    <span v-if="platformsStore.isYahooConnected" class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                      Connected
                    </span>
                  </div>
                  <div class="text-xs text-dark-textMuted">
                    {{ platformsStore.isYahooConnected ? 'Select from your Yahoo leagues' : 'Sign in with Yahoo to connect' }}
                  </div>
                </div>
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <!-- ESPN Option (Now Enabled!) -->
              <button
                @click="selectPlatform('espn')"
                class="w-full flex items-center gap-4 p-4 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-[#0719b2]/50 hover:bg-dark-border/30 transition-all text-left"
              >
                <img src="/espn-logo.svg" alt="ESPN" class="w-12 h-12 rounded-xl flex-shrink-0" />
                <div class="flex-1">
                  <div class="font-semibold text-dark-text flex items-center gap-2">
                    ESPN Fantasy
                    <span v-if="platformsStore.hasEspnCredentials" class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                      Connected
                    </span>
                  </div>
                  <div class="text-xs text-dark-textMuted">Enter league ID to connect</div>
                </div>
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Step 1: Enter Sleeper Username -->
          <div v-if="step === 1 && selectedPlatform === 'sleeper'">
            <div class="flex items-center gap-2 mb-4">
              <button @click="step = 0" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <img src="/sleeper.svg" alt="Sleeper" class="w-8 h-8 rounded-lg" />
              <span class="text-sm text-dark-textMuted">Connect Sleeper</span>
            </div>
            
            <label class="block text-sm font-medium text-dark-textMuted mb-2">
              Sleeper Username
            </label>
            <input
              v-model="username"
              type="text"
              placeholder="Enter your Sleeper username"
              class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-dark-text"
              @keyup.enter="searchSleeperLeagues"
            />
            
            <div v-if="errorMessage" class="text-red-400 text-sm mt-2">
              {{ errorMessage }}
            </div>
            
            <button
              @click="searchSleeperLeagues"
              :disabled="!username.trim() || loading"
              class="w-full mt-4 px-4 py-3 rounded-xl bg-primary text-gray-900 font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <span v-if="loading">Searching...</span>
              <span v-else>Find Leagues</span>
            </button>
          </div>
          
          <!-- Step 1: Yahoo - Not connected -->
          <div v-if="step === 1 && selectedPlatform === 'yahoo' && !platformsStore.isYahooConnected">
            <div class="flex items-center gap-2 mb-4">
              <button @click="step = 0" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <img src="/yahoo-fantasy.svg" alt="Yahoo" class="w-8 h-8 rounded-lg" />
              <span class="text-sm text-dark-textMuted">Connect Yahoo</span>
            </div>
            
            <div class="text-center py-4">
              <p class="text-sm text-dark-textMuted mb-4">
                Sign in with Yahoo to view and connect your fantasy leagues
              </p>
              <button
                @click="connectYahoo"
                class="w-full px-4 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-500 transition-colors flex items-center justify-center gap-2"
              >
                <span>Sign in with Yahoo</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Step 1: Yahoo - Connected, show leagues grouped by sport -->
          <div v-if="step === 1 && selectedPlatform === 'yahoo' && platformsStore.isYahooConnected">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <button @click="step = 0" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                  <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <img src="/yahoo-fantasy.svg" alt="Yahoo" class="w-8 h-8 rounded-lg" />
                <span class="text-sm text-dark-textMuted">Yahoo Leagues</span>
              </div>
              <button
                @click="showYahooAccountMenu = !showYahooAccountMenu"
                class="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Account
              </button>
            </div>
            
            <!-- Yahoo Account Menu -->
            <div v-if="showYahooAccountMenu" class="mb-4 p-3 rounded-lg bg-dark-bg border border-dark-border">
              <p class="text-xs text-dark-textMuted mb-2">Yahoo Account</p>
              <div class="flex items-center justify-between">
                <span class="text-sm text-dark-text">Connected</span>
                <button
                  @click="switchYahooAccount"
                  class="text-xs px-3 py-1 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors"
                >
                  Switch Account
                </button>
              </div>
            </div>
            
            <!-- Loading -->
            <div v-if="loadingYahooLeagues" class="text-center py-8">
              <LoadingSpinner size="md" />
              <p class="text-sm text-dark-textMuted">Loading your Yahoo leagues...</p>
            </div>
            
            <!-- Yahoo Leagues List (grouped by sport) -->
            <div v-else class="space-y-3 max-h-80 overflow-y-auto">
              <!-- Football Leagues -->
              <div v-if="footballYahooLeagues.length > 0">
                <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2 sticky top-0 bg-dark-card">
                  <span class="text-base">🏈</span>
                  <span>Football</span>
                  <span class="text-green-400 ml-auto">{{ footballYahooLeagues.length }}</span>
                </div>
                <button
                  v-for="league in footballYahooLeagues"
                  :key="league.league_key"
                  @click="selectYahooLeague(league, 'football')"
                  class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-purple-500/50 hover:bg-dark-border/30 transition-all text-left"
                >
                  <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <span class="text-sm font-bold text-green-400">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                    <div class="text-xs text-dark-textMuted">
                      {{ formatScoringType(league, 'football') }} • {{ league.num_teams }} teams
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              <!-- Baseball Leagues -->
              <div v-if="baseballYahooLeagues.length > 0" :class="footballYahooLeagues.length > 0 ? 'border-t border-dark-border/50 pt-3' : ''">
                <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2 sticky top-0 bg-dark-card">
                  <span class="text-base">⚾</span>
                  <span>Baseball</span>
                  <span class="text-blue-400 ml-auto">{{ baseballYahooLeagues.length }}</span>
                </div>
                <button
                  v-for="league in baseballYahooLeagues"
                  :key="league.league_key"
                  @click="selectYahooLeague(league, 'baseball')"
                  class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-purple-500/50 hover:bg-dark-border/30 transition-all text-left"
                >
                  <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span class="text-sm font-bold text-blue-400">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                    <div class="text-xs text-dark-textMuted">
                      {{ formatScoringType(league, 'baseball') }} • {{ league.num_teams }} teams
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              <!-- Basketball Leagues -->
              <div v-if="basketballYahooLeagues.length > 0" :class="(footballYahooLeagues.length > 0 || baseballYahooLeagues.length > 0) ? 'border-t border-dark-border/50 pt-3' : ''">
                <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2 sticky top-0 bg-dark-card">
                  <span class="text-base">🏀</span>
                  <span>Basketball</span>
                  <span class="text-orange-400 ml-auto">{{ basketballYahooLeagues.length }}</span>
                </div>
                <button
                  v-for="league in basketballYahooLeagues"
                  :key="league.league_key"
                  @click="selectYahooLeague(league, 'basketball')"
                  class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-purple-500/50 hover:bg-dark-border/30 transition-all text-left"
                >
                  <div class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <span class="text-sm font-bold text-orange-400">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                    <div class="text-xs text-dark-textMuted">
                      {{ formatScoringType(league, 'basketball') }} • {{ league.num_teams }} teams
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              <!-- Hockey Leagues -->
              <div v-if="hockeyYahooLeagues.length > 0" :class="(footballYahooLeagues.length > 0 || baseballYahooLeagues.length > 0 || basketballYahooLeagues.length > 0) ? 'border-t border-dark-border/50 pt-3' : ''">
                <div class="text-xs text-dark-textMuted uppercase tracking-wider px-2 py-1 flex items-center gap-2 sticky top-0 bg-dark-card">
                  <span class="text-base">🏒</span>
                  <span>Hockey</span>
                  <span class="text-blue-500 ml-auto">{{ hockeyYahooLeagues.length }}</span>
                </div>
                <button
                  v-for="league in hockeyYahooLeagues"
                  :key="league.league_key"
                  @click="selectYahooLeague(league, 'hockey')"
                  class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-purple-500/50 hover:bg-dark-border/30 transition-all text-left"
                >
                  <div class="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                    <span class="text-sm font-bold text-blue-500">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                    <div class="text-xs text-dark-textMuted">
                      {{ formatScoringType(league, 'hockey') }} • {{ league.num_teams }} teams
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              <!-- No leagues found -->
              <div v-if="totalYahooLeagues === 0 && !loadingYahooLeagues" class="text-center py-8 text-dark-textMuted">
                <p>No Yahoo leagues found</p>
                <p class="text-sm mt-1">Try syncing or check your Yahoo account</p>
                <button
                  @click="syncYahooLeagues"
                  class="mt-4 px-4 py-2 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors text-sm"
                >
                  Sync Yahoo Leagues
                </button>
              </div>
            </div>
          </div>
          
          <!-- Step 1: ESPN - Enter League ID -->
          <div v-if="step === 1 && selectedPlatform === 'espn' && !espnNeedsCredentials">
            <div class="flex items-center gap-2 mb-4">
              <button @click="step = 0" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <img src="/espn-logo.svg" class="w-8 h-8 rounded-lg" alt="ESPN" />
              <span class="text-sm text-dark-textMuted">Connect ESPN League</span>
            </div>
            
            <!-- League ID Input -->
            <label class="block text-sm font-medium text-dark-textMuted mb-2">
              League ID
            </label>
            <input
              v-model="espnLeagueId"
              type="text"
              placeholder="e.g., 12345678"
              class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border focus:border-[#0719b2] focus:ring-1 focus:ring-[#0719b2] transition-colors text-dark-text"
              @keyup.enter="validateEspnLeague"
            />
            <p class="text-xs text-dark-textMuted mt-2">
              Find this in your ESPN league URL: fantasy.espn.com/.../<span class="text-[#0719b2]">leagueId</span>=12345678
            </p>
            
            <div v-if="errorMessage" class="text-red-400 text-sm mt-3">
              {{ errorMessage }}
            </div>
            
            <div v-if="espnDiscoveryStatus" class="text-dark-textMuted text-sm mt-3 flex items-center gap-2">
              <svg class="animate-spin h-4 w-4 text-[#0719b2]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ espnDiscoveryStatus }}
            </div>
            
            <button
              @click="validateEspnLeague"
              :disabled="!espnLeagueId.trim() || loading"
              class="w-full mt-4 px-4 py-3 rounded-xl bg-[#0719b2] text-white font-semibold hover:bg-[#0719b2]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <span v-if="loading">Discovering League...</span>
              <span v-else>Find League</span>
            </button>
          </div>
          
          <!-- Step 1b: ESPN - Private League, need credentials -->
          <div v-if="step === 1 && selectedPlatform === 'espn' && espnNeedsCredentials">
            <div class="flex items-center gap-2 mb-4">
              <button @click="espnNeedsCredentials = false; errorMessage = ''" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <img src="/espn-logo.svg" alt="ESPN" class="w-8 h-8 rounded-lg" />
              <span class="text-sm text-dark-textMuted">Connect ESPN Account</span>
            </div>
            
            <!-- Found League Info -->
            <div v-if="espnDiscoveredLeague" class="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p class="text-sm text-green-200 font-medium">Found: {{ espnDiscoveredLeague.name }}</p>
                  <p class="text-xs text-green-200/70">{{ espnDiscoveredLeague.size }} teams • {{ espnDiscoveredLeague.sport.toUpperCase() }}</p>
                </div>
              </div>
            </div>
            
            <!-- One-time Setup Notice -->
            <div class="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p class="text-sm text-blue-200 font-medium">One-time ESPN setup</p>
                  <p class="text-xs text-blue-200/70 mt-1">
                    To identify your team and highlight your players, we need your ESPN cookies. This is a <strong>one-time setup</strong> - future ESPN leagues will use these automatically.
                  </p>
                </div>
              </div>
            </div>
            
            <!-- ESPN S2 Cookie -->
            <label class="block text-sm font-medium text-dark-textMuted mb-2">
              espn_s2 Cookie
            </label>
            <textarea
              v-model="espnS2Cookie"
              placeholder="Paste your espn_s2 cookie value here..."
              rows="2"
              class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border focus:border-[#0719b2] focus:ring-1 focus:ring-[#0719b2] transition-colors text-dark-text text-xs font-mono resize-none"
            ></textarea>
            
            <!-- SWID Cookie -->
            <label class="block text-sm font-medium text-dark-textMuted mb-2 mt-3">
              SWID Cookie
            </label>
            <input
              v-model="espnSwidCookie"
              type="text"
              placeholder="{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}"
              class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border focus:border-[#0719b2] focus:ring-1 focus:ring-[#0719b2] transition-colors text-dark-text text-xs font-mono"
            />
            
            <!-- How to find cookies -->
            <button 
              @click="showCookieHelp = !showCookieHelp"
              class="text-xs text-[#0719b2] hover:text-[#0719b2]/80 mt-2 flex items-center gap-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How do I find these cookies?
            </button>
            
            <div v-if="showCookieHelp" class="mt-3 p-3 rounded-lg bg-dark-bg border border-dark-border text-xs text-dark-textMuted">
              <ol class="list-decimal list-inside space-y-2">
                <li>Log in to ESPN Fantasy in Chrome</li>
                <li>Press <kbd class="px-1.5 py-0.5 rounded bg-dark-border text-dark-text">F12</kbd> to open Developer Tools</li>
                <li>Go to <strong>Application</strong> → <strong>Cookies</strong> → <strong>espn.com</strong></li>
                <li>Find and copy <strong>espn_s2</strong> and <strong>SWID</strong> values</li>
              </ol>
            </div>
            
            <div v-if="errorMessage" class="text-red-400 text-sm mt-3">
              {{ errorMessage }}
            </div>
            
            <button
              @click="connectEspnPrivate"
              :disabled="!espnS2Cookie.trim() || !espnSwidCookie.trim() || loading"
              class="w-full mt-4 px-4 py-3 rounded-xl bg-[#0719b2] text-white font-semibold hover:bg-[#0719b2]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <span v-if="loading">Connecting...</span>
              <span v-else>Connect & Save</span>
            </button>
          </div>
          
          <!-- Step 2: Select Sleeper League -->
          <div v-else-if="step === 2 && selectedPlatform === 'sleeper'">
            <div class="flex items-center gap-2 mb-4">
              <button @click="step = 1" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span class="text-sm text-dark-textMuted">
                Found {{ availableLeagues.length }} league{{ availableLeagues.length !== 1 ? 's' : '' }} for <span class="text-primary">{{ username }}</span>
              </span>
            </div>
            
            <div class="space-y-3 max-h-80 overflow-y-auto">
              <!-- NFL Leagues -->
              <div v-if="sleeperNflLeagues.length > 0">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-lg">🏈</span>
                  <span class="text-sm font-medium text-dark-text">NFL</span>
                  <span class="text-green-400 ml-auto">{{ sleeperNflLeagues.length }}</span>
                </div>
                <div class="space-y-2">
                  <button
                    v-for="league in sleeperNflLeagues"
                    :key="league.league_id"
                    @click="selectSleeperLeague(league)"
                    class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-primary/50 hover:bg-dark-border/30 transition-all text-left"
                  >
                    <div class="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <span class="text-sm font-bold text-green-400">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                      <div class="text-xs text-dark-textMuted">
                        H2H Points • {{ league.total_rosters }} teams
                      </div>
                    </div>
                    <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <!-- NBA Leagues -->
              <div v-if="sleeperNbaLeagues.length > 0" :class="sleeperNflLeagues.length > 0 ? 'border-t border-dark-border/50 pt-3' : ''">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-lg">🏀</span>
                  <span class="text-sm font-medium text-dark-text">NBA</span>
                  <span class="text-orange-400 ml-auto">{{ sleeperNbaLeagues.length }}</span>
                </div>
                <div class="space-y-2">
                  <button
                    v-for="league in sleeperNbaLeagues"
                    :key="league.league_id"
                    @click="selectSleeperLeague(league)"
                    class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-primary/50 hover:bg-dark-border/30 transition-all text-left"
                  >
                    <div class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <span class="text-sm font-bold text-orange-400">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                      <div class="text-xs text-dark-textMuted">
                        H2H Points • {{ league.total_rosters }} teams
                      </div>
                    </div>
                    <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-dark-border/30 flex justify-end">
          <button
            @click="$emit('close')"
            class="px-4 py-2 text-sm font-medium text-dark-textMuted hover:text-dark-text transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { usePlatformsStore } from '@/stores/platforms'
import { useSportStore } from '@/stores/sport'
import { yahooService } from '@/services/yahoo'
import { espnService } from '@/services/espn'
import { useAuthStore } from '@/stores/auth'
import type { SleeperLeague } from '@/types/sleeper'
import type { Sport } from '@/types/supabase'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

interface GroupedYahooLeague {
  name: string
  league_key: string
  league_id: string
  num_teams: number
  season: string
  oldest_season: string
  seasons_count: number
  all_seasons: Array<{ league_key: string; season: string }>
  sport?: Sport
  scoring_type?: string
}

interface EspnLeagueResult {
  id: number
  name: string
  size: number
  scoringType: string
  isPublic: boolean
}

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'league-added', league: SleeperLeague): void
  (e: 'yahoo-league-added', league: GroupedYahooLeague & { sport: Sport }): void
  (e: 'espn-league-added', league: { leagueId: string; sport: Sport; season: number; league: EspnLeagueResult }): void
}>()

const leagueStore = useLeagueStore()
const platformsStore = usePlatformsStore()
const sportStore = useSportStore()
const authStore = useAuthStore()

// General state
const step = ref(0)
const selectedPlatform = ref<'sleeper' | 'yahoo' | 'espn' | null>(null)
const loading = ref(false)
const errorMessage = ref('')

// Sleeper state
const username = ref('')
const availableLeagues = ref<SleeperLeague[]>([])

// Yahoo state
const loadingYahooLeagues = ref(false)
const showYahooAccountMenu = ref(false)
const yahooLeaguesBySport = ref<Record<Sport, any[]>>({
  football: [],
  baseball: [],
  basketball: [],
  hockey: []
})

// ESPN state
const espnLeagueId = ref('')
const espnSport = ref<Sport>('football')
const espnSeason = ref(new Date().getFullYear())
const espnNeedsCredentials = ref(false)
const espnDiscoveryStatus = ref('')
const espnDiscoveredLeague = ref<any>(null)
const espnS2Cookie = ref('')
const espnSwidCookie = ref('')
const showCookieHelp = ref(false)

// Available sports for ESPN
const availableSports = [
  { id: 'football' as Sport, label: 'NFL', icon: '🏈' },
  { id: 'baseball' as Sport, label: 'MLB', icon: '⚾' },
  { id: 'basketball' as Sport, label: 'NBA', icon: '🏀' },
  { id: 'hockey' as Sport, label: 'NHL', icon: '🏒' }
]

// Calculate current season year based on sport
const currentSeasonYear = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  
  // Different sports have different season start months
  const seasonStartMonth: Record<Sport, number> = {
    football: 8,   // September
    baseball: 2,   // March
    basketball: 9, // October
    hockey: 9      // October
  }
  
  return month < seasonStartMonth[espnSport.value] ? year - 1 : year
})

// Available seasons (last 6 years)
const availableSeasons = computed(() => {
  const years = []
  const currentYear = new Date().getFullYear()
  for (let i = 0; i < 6; i++) {
    years.push(currentYear - i)
  }
  return years
})

// Format scoring type for display
function formatScoringType(league: any, sport?: string): string {
  const scoringType = league?.scoring_type || league?.scoringType || ''
  const type = scoringType.toLowerCase()
  
  // Handle ESPN-style explicit types (H2H_CATEGORY, H2H_POINTS, ROTO, TOTAL_POINTS)
  if (type === 'h2h_category' || type === 'h2h category') return 'H2H Categories'
  if (type === 'h2h_points' || type === 'h2h points') return 'H2H Points'
  if (type === 'total_points' || type === 'total points') return 'H2H Points'
  if (type === 'roto' || type === 'rotisserie') return 'Rotisserie'
  
  // Handle Yahoo-style types
  if (type === 'headpoint' || type === 'head_point') return 'H2H Points'
  if (type === 'head' || type === 'headone' || type === 'headcategory' || type === 'head_category') return 'H2H Categories'
  if (type === 'point' || type === 'points') return 'H2H Points'
  
  // Check if type contains keywords
  if (type.includes('roto')) return 'Rotisserie'
  if (type.includes('categor')) return 'H2H Categories'
  if (type.includes('point')) return 'H2H Points'
  
  // Default based on sport
  if (sport === 'baseball') return 'H2H Categories'
  
  return 'H2H Points'
}

// Group leagues by name for each sport
function groupLeagues(leagues: any[]): GroupedYahooLeague[] {
  const leaguesByName = new Map<string, any[]>()
  
  for (const league of leagues) {
    const name = league.name
    if (!leaguesByName.has(name)) {
      leaguesByName.set(name, [])
    }
    leaguesByName.get(name)!.push(league)
  }
  
  const grouped: GroupedYahooLeague[] = []
  
  for (const [name, seasons] of leaguesByName) {
    seasons.sort((a, b) => parseInt(b.season) - parseInt(a.season))
    
    const mostRecent = seasons[0]
    const oldest = seasons[seasons.length - 1]
    
    grouped.push({
      name,
      league_key: mostRecent.league_key,
      league_id: mostRecent.league_id,
      num_teams: mostRecent.num_teams,
      season: mostRecent.season,
      oldest_season: oldest.season,
      seasons_count: seasons.length,
      all_seasons: seasons.map(s => ({ 
        league_key: s.league_key, 
        season: s.season 
      })),
      scoring_type: mostRecent.scoring_type
    })
  }
  
  grouped.sort((a, b) => parseInt(b.season) - parseInt(a.season))
  return grouped
}

// Computed grouped leagues by sport
const footballYahooLeagues = computed(() => groupLeagues(yahooLeaguesBySport.value.football))
const baseballYahooLeagues = computed(() => groupLeagues(yahooLeaguesBySport.value.baseball))
const basketballYahooLeagues = computed(() => groupLeagues(yahooLeaguesBySport.value.basketball))
const hockeyYahooLeagues = computed(() => groupLeagues(yahooLeaguesBySport.value.hockey))

const totalYahooLeagues = computed(() => 
  footballYahooLeagues.value.length + 
  baseballYahooLeagues.value.length + 
  basketballYahooLeagues.value.length + 
  hockeyYahooLeagues.value.length
)

// Sleeper leagues by sport
const sleeperNflLeagues = computed(() => availableLeagues.value.filter(l => l.sport === 'nfl'))
const sleeperNbaLeagues = computed(() => availableLeagues.value.filter(l => l.sport === 'nba'))

// Reset when modal opens
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    step.value = 0
    selectedPlatform.value = null
    username.value = ''
    errorMessage.value = ''
    availableLeagues.value = []
    yahooLeaguesBySport.value = {
      football: [],
      baseball: [],
      basketball: [],
      hockey: []
    }
    showYahooAccountMenu.value = false
    
    // Reset ESPN state
    espnLeagueId.value = ''
    espnSport.value = 'football'
    espnSeason.value = currentSeasonYear.value
    espnNeedsCredentials.value = false
    espnS2Cookie.value = ''
    espnSwidCookie.value = ''
    espnDiscoveryStatus.value = ''
    espnDiscoveredLeague.value = null
    showCookieHelp.value = false
    
    // Fetch platforms status
    if (authStore.isAuthenticated) {
      await platformsStore.fetchConnectedPlatforms()
    }
  }
}, { immediate: true })

// Update season when sport changes
watch(espnSport, () => {
  espnSeason.value = currentSeasonYear.value
})

function selectPlatform(platform: 'sleeper' | 'yahoo' | 'espn') {
  selectedPlatform.value = platform
  step.value = 1
  
  if (platform === 'yahoo' && platformsStore.isYahooConnected) {
    loadAllYahooLeagues()
  }
}

// ============================================================
// Sleeper Methods
// ============================================================

async function searchSleeperLeagues() {
  if (!username.value.trim()) return
  
  loading.value = true
  errorMessage.value = ''
  
  try {
    console.log('Searching for Sleeper user:', username.value)
    const response = await fetch(`https://api.sleeper.app/v1/user/${username.value}`)
    console.log('User response status:', response.status)
    
    if (!response.ok) {
      errorMessage.value = 'User not found. Please check the username and try again.'
      return
    }
    
    const user = await response.json()
    console.log('User data:', user)
    
    if (!user?.user_id) {
      errorMessage.value = 'User not found. Please check the username and try again.'
      return
    }
    
    // Save username for later
    leagueStore.setCurrentUsername(username.value)
    
    // Calculate season years for each sport
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-indexed
    
    // NFL season starts in September
    const nflSeasonYear = currentMonth < 8 ? currentYear - 1 : currentYear
    // NBA season starts in October
    const nbaSeasonYear = currentMonth < 9 ? currentYear - 1 : currentYear
    
    console.log('Fetching Sleeper leagues - NFL:', nflSeasonYear, 'NBA:', nbaSeasonYear, 'user_id:', user.user_id)
    
    // Fetch both NFL and NBA leagues in parallel
    const [nflResponse, nbaResponse] = await Promise.allSettled([
      fetch(`https://api.sleeper.app/v1/user/${user.user_id}/leagues/nfl/${nflSeasonYear}`),
      fetch(`https://api.sleeper.app/v1/user/${user.user_id}/leagues/nba/${nbaSeasonYear}`)
    ])
    
    const allLeagues: any[] = []
    
    // Process NFL leagues
    if (nflResponse.status === 'fulfilled' && nflResponse.value.ok) {
      const nflLeagues = await nflResponse.value.json()
      console.log('NFL leagues:', nflLeagues?.length || 0)
      if (nflLeagues?.length > 0) {
        allLeagues.push(...nflLeagues.map((l: any) => ({ ...l, sport: 'nfl' })))
      }
    }
    
    // Process NBA leagues
    if (nbaResponse.status === 'fulfilled' && nbaResponse.value.ok) {
      const nbaLeagues = await nbaResponse.value.json()
      console.log('NBA leagues:', nbaLeagues?.length || 0)
      if (nbaLeagues?.length > 0) {
        allLeagues.push(...nbaLeagues.map((l: any) => ({ ...l, sport: 'nba' })))
      }
    }
    
    availableLeagues.value = allLeagues
    
    if (availableLeagues.value.length === 0) {
      errorMessage.value = `No leagues found for this user in the current NFL or NBA seasons`
      return
    }
    
    step.value = 2
  } catch (err: any) {
    console.error('Error searching leagues:', err)
    errorMessage.value = err?.message || 'An error occurred while connecting to Sleeper. Please try again.'
  } finally {
    loading.value = false
  }
}

function selectSleeperLeague(league: SleeperLeague) {
  emit('league-added', league)
}

// ============================================================
// Yahoo Methods
// ============================================================

function connectYahoo() {
  emit('close')
  platformsStore.connectYahoo()
}

async function switchYahooAccount() {
  await platformsStore.disconnectPlatform('yahoo')
  emit('close')
  platformsStore.connectYahoo()
}

async function loadAllYahooLeagues() {
  if (!authStore.user?.id) return
  
  loadingYahooLeagues.value = true
  
  try {
    const initialized = await yahooService.initialize(authStore.user.id)
    if (!initialized) {
      console.error('Failed to initialize Yahoo service')
      return
    }
    
    // Load leagues for all sports in parallel
    const sports: Sport[] = ['football', 'baseball', 'basketball', 'hockey']
    const results = await Promise.allSettled(
      sports.map(sport => yahooService.getLeagues(sport))
    )
    
    // Process results
    sports.forEach((sport, index) => {
      const result = results[index]
      if (result.status === 'fulfilled') {
        yahooLeaguesBySport.value[sport] = result.value
        console.log(`Loaded ${result.value.length} ${sport} leagues`)
      } else {
        console.error(`Failed to load ${sport} leagues:`, result.reason)
        yahooLeaguesBySport.value[sport] = []
      }
    })
  } catch (err) {
    console.error('Error loading Yahoo leagues:', err)
  } finally {
    loadingYahooLeagues.value = false
  }
}

async function syncYahooLeagues() {
  loadingYahooLeagues.value = true
  try {
    // Sync all sports
    const sports: Sport[] = ['football', 'baseball', 'basketball', 'hockey']
    await Promise.allSettled(
      sports.map(sport => platformsStore.syncYahooLeagues(sport))
    )
    await loadAllYahooLeagues()
  } finally {
    loadingYahooLeagues.value = false
  }
}

function selectYahooLeague(league: GroupedYahooLeague, sport: Sport) {
  emit('yahoo-league-added', { ...league, sport })
}

// ============================================================
// ESPN Methods
// ============================================================

async function validateEspnLeague() {
  if (!espnLeagueId.value.trim()) return
  
  loading.value = true
  errorMessage.value = ''
  espnDiscoveryStatus.value = 'Finding league...'
  
  try {
    // Initialize ESPN service
    if (authStore.user?.id) {
      console.log('[ESPN] Initializing service for user:', authStore.user.id)
      await espnService.initialize(authStore.user.id)
    } else {
      console.error('[ESPN] No user ID available')
      errorMessage.value = 'Please sign in first.'
      return
    }
    
    // Check if we have stored credentials
    const credentials = platformsStore.getEspnCredentials()
    if (credentials) {
      console.log('[ESPN] Using stored credentials')
      espnService.setCredentials(credentials.espn_s2, credentials.swid)
    }
    
    const leagueId = espnLeagueId.value.trim()
    console.log('[ESPN] Discovering league:', leagueId)
    
    // Quick discovery - just detect sport and get basic info
    const discovered = await espnService.discoverLeague(leagueId)
    
    console.log('[ESPN] Discovery result:', discovered)
    
    if (!discovered) {
      errorMessage.value = 'Could not find this league. Please check the League ID and make sure it\'s a public league. Check the browser console for more details.'
      return
    }
    
    // Ask for credentials if:
    // 1. League is private (required), OR
    // 2. First ESPN league ever (needed for "my team" highlighting)
    if (!credentials) {
      espnNeedsCredentials.value = true
      espnSport.value = discovered.sport
      espnDiscoveredLeague.value = discovered  // Store for later use
      errorMessage.value = ''
      espnDiscoveryStatus.value = ''
      return
    }
    
    console.log('[ESPN] League discovered:', discovered)
    espnSport.value = discovered.sport
    espnSeason.value = discovered.currentSeason
    
    // Save just the current season (fast - no re-fetch needed!)
    espnDiscoveryStatus.value = `Found ${discovered.name} - saving...`
    
    const syncResult = await platformsStore.syncEspnLeague(
      discovered.leagueId,
      discovered.sport,
      discovered.currentSeason,
      { name: discovered.name, size: discovered.size }
    )
    
    if (!syncResult.success) {
      errorMessage.value = syncResult.error || 'Failed to save league.'
      return
    }
    
    espnDiscoveryStatus.value = ''
    
    // Emit success
    emit('espn-league-added', {
      leagueId: discovered.leagueId,
      sport: discovered.sport,
      season: discovered.currentSeason,
      league: discovered
    })
    
  } catch (err: any) {
    console.error('[ESPN] Error discovering league:', err)
    
    if (err.message?.includes('private') || err.message?.includes('403') || err.message?.includes('401')) {
      espnNeedsCredentials.value = true
      errorMessage.value = ''
    } else if (err.message?.includes('Not authenticated') || err.message?.includes('sign in')) {
      errorMessage.value = 'Please sign in to add ESPN leagues.'
    } else if (err.message?.includes('timed out')) {
      errorMessage.value = 'Request timed out. ESPN servers may be slow. Please try again.'
    } else {
      errorMessage.value = err.message || 'An error occurred. Please try again.'
    }
  } finally {
    loading.value = false
    espnDiscoveryStatus.value = ''
  }
}

async function connectEspnPrivate() {
  if (!espnS2Cookie.value.trim() || !espnSwidCookie.value.trim()) return
  
  loading.value = true
  errorMessage.value = ''
  espnDiscoveryStatus.value = 'Validating credentials...'
  
  try {
    console.log('[ESPN] Connecting league with credentials')
    
    // Store and validate credentials
    const result = await platformsStore.storeEspnCredentials({
      espn_s2: espnS2Cookie.value.trim(),
      swid: espnSwidCookie.value.trim(),
      leagueId: espnLeagueId.value,
      sport: espnSport.value,
      season: espnSeason.value
    })
    
    if (!result.success) {
      errorMessage.value = result.error || 'Invalid credentials. Please check and try again.'
      espnDiscoveryStatus.value = ''
      return
    }
    
    // Use already-discovered league if available, otherwise re-discover
    let discovered = espnDiscoveredLeague.value
    if (!discovered) {
      espnDiscoveryStatus.value = 'Finding league...'
      discovered = await espnService.discoverLeague(espnLeagueId.value)
    }
    
    if (!discovered) {
      errorMessage.value = 'Could not access league. Please check your credentials.'
      espnDiscoveryStatus.value = ''
      return
    }
    
    console.log('[ESPN] League discovered:', discovered)
    espnSport.value = discovered.sport
    espnSeason.value = discovered.currentSeason
    
    // Save just the current season (no re-fetch needed!)
    espnDiscoveryStatus.value = `Found ${discovered.name} - saving...`
    
    const syncResult = await platformsStore.syncEspnLeague(
      discovered.leagueId,
      discovered.sport,
      discovered.currentSeason,
      { name: discovered.name, size: discovered.size }
    )
    
    if (!syncResult.success) {
      errorMessage.value = syncResult.error || 'Failed to save league.'
      return
    }
    
    espnDiscoveryStatus.value = ''
    
    // Emit success
    emit('espn-league-added', {
      leagueId: discovered.leagueId,
      sport: discovered.sport,
      season: discovered.currentSeason,
      league: discovered
    })
    
  } catch (err: any) {
    console.error('[ESPN] Error connecting private league:', err)
    errorMessage.value = err.message || 'Failed to connect. Please check your cookies and try again.'
  } finally {
    loading.value = false
    espnDiscoveryStatus.value = ''
  }
}
</script>
