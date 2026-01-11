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
                <div class="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span class="text-2xl">💤</span>
                </div>
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
                <div class="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <span class="text-2xl font-bold text-white">Y!</span>
                </div>
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
              
              <!-- ESPN Option -->
              <button
                @click="selectPlatform('espn')"
                class="w-full flex items-center gap-4 p-4 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-red-500/50 hover:bg-dark-border/30 transition-all text-left"
              >
                <div class="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
                  <span class="text-xl font-bold text-white">E</span>
                </div>
                <div class="flex-1">
                  <div class="font-semibold text-dark-text">ESPN Fantasy</div>
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
              <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span class="text-lg">💤</span>
              </div>
              <span class="text-sm text-dark-textMuted">Connect Sleeper</span>
            </div>
            
            <label class="block text-sm font-medium text-dark-textMuted mb-2">
              Sleeper Username
            </label>
            <div class="relative">
              <input
                v-model="username"
                type="text"
                placeholder="Enter your Sleeper username"
                class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-dark-text focus:outline-none focus:border-primary placeholder-dark-textMuted/50"
                @keyup.enter="searchSleeperLeagues"
              />
            </div>
            
            <p v-if="errorMessage" class="mt-2 text-sm text-red-400">
              {{ errorMessage }}
            </p>
            
            <button
              @click="searchSleeperLeagues"
              :disabled="!username.trim() || loading"
              class="mt-4 w-full py-3 bg-primary text-gray-900 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span v-if="loading" class="animate-spin">⏳</span>
              <span v-else>Find Leagues</span>
            </button>
          </div>

          <!-- Step 1: Yahoo Leagues (auto-loads if connected) -->
          <div v-else-if="step === 1 && selectedPlatform === 'yahoo'">
            <div class="flex items-center justify-between gap-2 mb-4">
              <div class="flex items-center gap-2">
                <button @click="step = 0" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                  <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div class="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                  <span class="text-sm font-bold text-white">Y!</span>
                </div>
                <span class="text-sm text-dark-textMuted">Yahoo Leagues</span>
              </div>
              
              <!-- Account menu -->
              <div v-if="platformsStore.isYahooConnected" class="relative">
                <button 
                  @click="showYahooAccountMenu = !showYahooAccountMenu"
                  class="text-xs text-dark-textMuted hover:text-dark-text transition-colors flex items-center gap-1"
                >
                  <span>Account</span>
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div 
                  v-if="showYahooAccountMenu" 
                  class="absolute right-0 mt-1 w-40 bg-dark-bg border border-dark-border rounded-lg shadow-lg z-10"
                >
                  <button
                    @click="switchYahooAccount"
                    class="w-full px-3 py-2 text-xs text-left text-dark-textMuted hover:text-dark-text hover:bg-dark-border/50 transition-colors rounded-lg"
                  >
                    Switch Account
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Show connect button if not connected -->
            <div v-if="!platformsStore.isYahooConnected" class="text-center py-8">
              <p class="text-dark-textMuted mb-4">Connect your Yahoo account to see your leagues</p>
              <button
                @click="connectYahoo"
                class="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
              >
                Sign in with Yahoo
              </button>
            </div>
            
            <!-- Loading state -->
            <div v-else-if="loadingYahooLeagues" class="text-center py-12">
              <div class="animate-spin text-4xl mb-4">⏳</div>
              <p class="text-dark-textMuted">Loading your Yahoo leagues...</p>
            </div>
            
            <!-- Yahoo leagues list -->
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
                      {{ league.num_teams }} teams • 
                      <span v-if="league.seasons_count > 1">{{ league.seasons_count }} seasons</span>
                      <span v-else>{{ league.season }}</span>
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
                      {{ league.num_teams }} teams • 
                      <span v-if="league.seasons_count > 1">{{ league.seasons_count }} seasons</span>
                      <span v-else>{{ league.season }}</span>
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
                      {{ league.num_teams }} teams • 
                      <span v-if="league.seasons_count > 1">{{ league.seasons_count }} seasons</span>
                      <span v-else>{{ league.season }}</span>
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
                      {{ league.num_teams }} teams • 
                      <span v-if="league.seasons_count > 1">{{ league.seasons_count }} seasons</span>
                      <span v-else>{{ league.season }}</span>
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
          <div v-else-if="step === 1 && selectedPlatform === 'espn'">
            <div class="flex items-center gap-2 mb-4">
              <button @click="step = 0" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div class="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                <span class="text-sm font-bold text-white">E</span>
              </div>
              <span class="text-sm text-dark-textMuted">Connect ESPN</span>
            </div>
            
            <label class="block text-sm font-medium text-dark-textMuted mb-2">
              ESPN League ID
            </label>
            <div class="relative">
              <input
                v-model="espnLeagueId"
                type="text"
                placeholder="e.g., 12345678"
                class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-xl text-dark-text focus:outline-none focus:border-red-500 placeholder-dark-textMuted/50"
                @keyup.enter="searchEspnLeague"
              />
            </div>
            <p class="mt-1 text-xs text-dark-textMuted">
              Find this in your ESPN league URL: fantasy.espn.com/...?leagueId=<span class="text-red-400">12345678</span>
            </p>
            
            <!-- Private league toggle -->
            <div class="mt-4">
              <button
                @click="showEspnCookies = !showEspnCookies"
                class="flex items-center gap-2 text-sm text-dark-textMuted hover:text-dark-text transition-colors"
              >
                <svg 
                  class="w-4 h-4 transition-transform" 
                  :class="showEspnCookies ? 'rotate-90' : ''"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                <span>Private league? Add cookies</span>
              </button>
              
              <div v-if="showEspnCookies" class="mt-3 space-y-3 pl-6 border-l-2 border-dark-border">
                <div>
                  <label class="block text-xs font-medium text-dark-textMuted mb-1">espn_s2 Cookie</label>
                  <input
                    v-model="espnS2"
                    type="text"
                    placeholder="Paste espn_s2 value"
                    class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text text-sm focus:outline-none focus:border-red-500 placeholder-dark-textMuted/50"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-dark-textMuted mb-1">SWID Cookie</label>
                  <input
                    v-model="espnSwid"
                    type="text"
                    placeholder="Paste SWID value (with curly braces)"
                    class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text text-sm focus:outline-none focus:border-red-500 placeholder-dark-textMuted/50"
                  />
                </div>
                <p class="text-xs text-dark-textMuted">
                  <a href="https://www.espn.com" target="_blank" class="text-red-400 hover:underline">
                    How to find these cookies →
                  </a>
                </p>
              </div>
            </div>
            
            <p v-if="errorMessage" class="mt-3 text-sm text-red-400">
              {{ errorMessage }}
            </p>
            
            <button
              @click="searchEspnLeague"
              :disabled="!espnLeagueId.trim() || loading"
              class="mt-4 w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span v-if="loading" class="animate-spin">⏳</span>
              <span v-else>Find League</span>
            </button>
          </div>

          <!-- Step 2: ESPN - League Found, Confirm Add -->
          <div v-else-if="step === 2 && selectedPlatform === 'espn' && discoveredEspnLeague">
            <div class="flex items-center gap-2 mb-4">
              <button @click="step = 1; discoveredEspnLeague = null" class="p-1 hover:bg-dark-border/50 rounded-lg transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span class="text-sm text-dark-textMuted">League Found!</span>
            </div>
            
            <!-- League Card -->
            <div class="p-4 rounded-xl bg-dark-bg/50 border border-red-500/30">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" :class="getSportBgColor(discoveredEspnLeague.sport)">
                  <span class="text-2xl">{{ getSportEmoji(discoveredEspnLeague.sport) }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-dark-text text-lg truncate">{{ discoveredEspnLeague.name }}</div>
                  <div class="text-sm text-dark-textMuted flex items-center gap-2">
                    <span class="capitalize">{{ discoveredEspnLeague.sport }}</span>
                    <span>•</span>
                    <span v-if="discoveredEspnLeague.seasons.length > 1">
                      {{ discoveredEspnLeague.seasons.length }} seasons ({{ oldestEspnSeason }}-{{ newestEspnSeason }})
                    </span>
                    <span v-else>{{ newestEspnSeason }} season</span>
                  </div>
                </div>
              </div>
              
              <!-- Seasons list -->
              <div v-if="discoveredEspnLeague.seasons.length > 1" class="mt-3 pt-3 border-t border-dark-border/50">
                <div class="text-xs text-dark-textMuted mb-2">Seasons found:</div>
                <div class="flex flex-wrap gap-1">
                  <span 
                    v-for="s in discoveredEspnLeague.seasons" 
                    :key="s.season"
                    class="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs"
                  >
                    {{ s.season }}
                  </span>
                </div>
              </div>
              
              <!-- Private league warning -->
              <div v-if="!discoveredEspnLeague.isPublic" class="mt-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div class="flex items-center gap-2 text-yellow-400 text-xs">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Private league - cookies required for full data</span>
                </div>
              </div>
            </div>
            
            <button
              @click="addEspnLeague"
              class="mt-4 w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add League</span>
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
            
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <button
                v-for="league in availableLeagues"
                :key="league.league_id"
                @click="selectSleeperLeague(league)"
                class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-primary/50 hover:bg-dark-border/30 transition-all text-left"
              >
                <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span class="text-sm font-bold text-primary">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                  <div class="text-xs text-dark-textMuted">
                    {{ league.total_rosters }} teams • {{ league.season }} Season
                  </div>
                </div>
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
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
import { useSportStore, type Sport } from '@/stores/sport'
import { yahooService } from '@/services/yahoo'
import { espnService } from '@/services/espn'
import { useAuthStore } from '@/stores/auth'
import type { SleeperLeague } from '@/types/sleeper'

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
}

interface DiscoveredEspnLeague {
  sport: Sport
  leagueId: string
  name: string
  isPublic: boolean
  seasons: Array<{
    season: number
    league: any
  }>
}

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'league-added', league: SleeperLeague): void
  (e: 'yahoo-league-added', league: GroupedYahooLeague & { sport: Sport }): void
  (e: 'espn-league-added', league: {
    leagueId: string
    sport: Sport
    season: number
    league: {
      id: number
      name: string
      size: number
      scoringType: string
      isPublic: boolean
    }
    allSeasons: Array<{ season: number; league: any }>
  }): void
}>()

const leagueStore = useLeagueStore()
const platformsStore = usePlatformsStore()
const sportStore = useSportStore()
const authStore = useAuthStore()

const step = ref(0)
const selectedPlatform = ref<'sleeper' | 'yahoo' | 'espn' | null>(null)
const username = ref('')
const loading = ref(false)
const loadingYahooLeagues = ref(false)
const errorMessage = ref('')
const availableLeagues = ref<SleeperLeague[]>([])
const showYahooAccountMenu = ref(false)

// ESPN state
const espnLeagueId = ref('')
const espnS2 = ref('')
const espnSwid = ref('')
const showEspnCookies = ref(false)
const discoveredEspnLeague = ref<DiscoveredEspnLeague | null>(null)

// Store leagues by sport
const yahooLeaguesBySport = ref<Record<Sport, any[]>>({
  football: [],
  baseball: [],
  basketball: [],
  hockey: []
})

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
      }))
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

// ESPN computed
const newestEspnSeason = computed(() => {
  if (!discoveredEspnLeague.value?.seasons.length) return ''
  return Math.max(...discoveredEspnLeague.value.seasons.map(s => s.season))
})

const oldestEspnSeason = computed(() => {
  if (!discoveredEspnLeague.value?.seasons.length) return ''
  return Math.min(...discoveredEspnLeague.value.seasons.map(s => s.season))
})

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
    espnS2.value = ''
    espnSwid.value = ''
    showEspnCookies.value = false
    discoveredEspnLeague.value = null
    
    // Fetch platforms status
    if (authStore.isAuthenticated) {
      await platformsStore.fetchConnectedPlatforms()
    }
  }
}, { immediate: true })

function selectPlatform(platform: 'sleeper' | 'yahoo' | 'espn') {
  selectedPlatform.value = platform
  step.value = 1
  
  if (platform === 'yahoo' && platformsStore.isYahooConnected) {
    loadAllYahooLeagues()
  }
}

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
    
    // Get leagues for current NFL season (use current year, or previous year if before September)
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-indexed
    // NFL season starts in September, so before September use previous year
    const seasonYear = currentMonth < 8 ? currentYear - 1 : currentYear
    
    console.log('Fetching Sleeper leagues for season:', seasonYear, 'user_id:', user.user_id)
    
    const leaguesResponse = await fetch(
      `https://api.sleeper.app/v1/user/${user.user_id}/leagues/nfl/${seasonYear}`
    )
    
    console.log('Leagues response status:', leaguesResponse.status)
    
    if (!leaguesResponse.ok) {
      errorMessage.value = 'Failed to fetch leagues. Please try again.'
      return
    }
    
    const leaguesData = await leaguesResponse.json()
    console.log('Leagues data:', leaguesData)
    
    availableLeagues.value = leaguesData || []
    
    if (availableLeagues.value.length === 0) {
      errorMessage.value = `No leagues found for this user in the ${seasonYear} NFL season`
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

async function searchEspnLeague() {
  if (!espnLeagueId.value.trim()) return
  
  loading.value = true
  errorMessage.value = ''
  
  try {
    // Initialize ESPN service
    if (authStore.user?.id) {
      await espnService.initialize(authStore.user.id)
    }
    
    // Set credentials if provided
    if (espnS2.value && espnSwid.value) {
      espnService.setCredentials(espnS2.value, espnSwid.value)
      // Store for future use
      platformsStore.storeEspnCredentials(espnS2.value, espnSwid.value)
    }
    
    console.log('Discovering ESPN league:', espnLeagueId.value)
    
    // Use the new discovery method
    const result = await espnService.discoverLeague(espnLeagueId.value)
    
    if (!result) {
      errorMessage.value = 'League not found. Please check the league ID and try again.'
      return
    }
    
    // Check if private and we need cookies
    if (!result.isPublic && !espnService.hasCredentials()) {
      errorMessage.value = 'This is a private league. Please add your ESPN cookies (espn_s2 and SWID) above.'
      showEspnCookies.value = true
      return
    }
    
    discoveredEspnLeague.value = result
    step.value = 2
    
  } catch (err: any) {
    console.error('Error searching ESPN league:', err)
    if (err.message?.includes('private') || err.message?.includes('403')) {
      errorMessage.value = 'This is a private league. Please add your ESPN cookies above.'
      showEspnCookies.value = true
    } else {
      errorMessage.value = err?.message || 'Failed to find league. Please check the ID and try again.'
    }
  } finally {
    loading.value = false
  }
}

function addEspnLeague() {
  if (!discoveredEspnLeague.value) return
  
  const mostRecentSeason = discoveredEspnLeague.value.seasons[0]
  
  emit('espn-league-added', {
    leagueId: discoveredEspnLeague.value.leagueId,
    sport: discoveredEspnLeague.value.sport,
    season: mostRecentSeason.season,
    league: {
      id: mostRecentSeason.league.id,
      name: discoveredEspnLeague.value.name,
      size: mostRecentSeason.league.size || 0,
      scoringType: mostRecentSeason.league.scoringType || 'H2H_POINTS',
      isPublic: discoveredEspnLeague.value.isPublic
    },
    allSeasons: discoveredEspnLeague.value.seasons
  })
}

function selectSleeperLeague(league: SleeperLeague) {
  emit('league-added', league)
}

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

// Helper functions for sport display
function getSportEmoji(sport: Sport): string {
  const emojis: Record<Sport, string> = {
    football: '🏈',
    baseball: '⚾',
    basketball: '🏀',
    hockey: '🏒'
  }
  return emojis[sport] || '🏆'
}

function getSportBgColor(sport: Sport): string {
  const colors: Record<Sport, string> = {
    football: 'bg-green-500/20',
    baseball: 'bg-red-500/20',
    basketball: 'bg-orange-500/20',
    hockey: 'bg-blue-500/20'
  }
  return colors[sport] || 'bg-gray-500/20'
}
</script>
