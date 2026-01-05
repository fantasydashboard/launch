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
              
              <!-- ESPN Coming Soon -->
              <div class="w-full flex items-center gap-4 p-4 rounded-xl bg-dark-bg/30 border border-dark-border/30 opacity-50 cursor-not-allowed">
                <div class="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center flex-shrink-0">
                  <span class="text-xl font-bold text-white">E</span>
                </div>
                <div class="flex-1">
                  <div class="font-semibold text-dark-text">ESPN Fantasy</div>
                  <div class="text-xs text-dark-textMuted">Coming soon</div>
                </div>
                <span class="text-xs px-2 py-1 rounded-full bg-dark-border text-dark-textMuted">Soon</span>
              </div>
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
              <div class="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                <span class="text-sm font-bold text-white">Y!</span>
              </div>
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
                <div class="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                  <span class="text-sm font-bold text-white">Y!</span>
                </div>
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
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-3"></div>
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

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'league-added', league: SleeperLeague): void
  (e: 'yahoo-league-added', league: GroupedYahooLeague & { sport: Sport }): void
}>()

const leagueStore = useLeagueStore()
const platformsStore = usePlatformsStore()
const sportStore = useSportStore()
const authStore = useAuthStore()

const step = ref(0)
const selectedPlatform = ref<'sleeper' | 'yahoo' | null>(null)
const username = ref('')
const loading = ref(false)
const loadingYahooLeagues = ref(false)
const errorMessage = ref('')
const availableLeagues = ref<SleeperLeague[]>([])
const showYahooAccountMenu = ref(false)

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
    
    // Fetch platforms status
    if (authStore.isAuthenticated) {
      await platformsStore.fetchConnectedPlatforms()
    }
  }
}, { immediate: true })

function selectPlatform(platform: 'sleeper' | 'yahoo') {
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
    const response = await fetch(`https://api.sleeper.app/v1/user/${username.value}`)
    if (!response.ok) {
      errorMessage.value = 'User not found'
      return
    }
    
    const user = await response.json()
    if (!user?.user_id) {
      errorMessage.value = 'User not found'
      return
    }
    
    // Save username for later
    leagueStore.setCurrentUsername(username.value)
    
    // Get leagues for current NFL season
    const leaguesResponse = await fetch(
      `https://api.sleeper.app/v1/user/${user.user_id}/leagues/nfl/2024`
    )
    
    if (!leaguesResponse.ok) {
      errorMessage.value = 'Failed to fetch leagues'
      return
    }
    
    availableLeagues.value = await leaguesResponse.json()
    
    if (availableLeagues.value.length === 0) {
      errorMessage.value = 'No leagues found for this user in the 2024 season'
      return
    }
    
    step.value = 2
  } catch (err) {
    console.error('Error searching leagues:', err)
    errorMessage.value = 'An error occurred. Please try again.'
  } finally {
    loading.value = false
  }
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
</script>
