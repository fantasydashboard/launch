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
          <div class="text-4xl mb-2">{{ sportStore.sportIcon }}</div>
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
              class="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border/50 text-dark-text placeholder-dark-textMuted focus:border-primary focus:outline-none"
              placeholder="Enter your Sleeper username"
              @keyup.enter="searchSleeperLeagues"
            />
            <p class="text-xs text-dark-textMuted mt-2">
              This is your username on the Sleeper app
            </p>
            
            <!-- Error Message -->
            <div v-if="errorMessage" class="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p class="text-sm text-red-400">{{ errorMessage }}</p>
            </div>
            
            <button
              @click="searchSleeperLeagues"
              :disabled="loading || !username.trim()"
              class="w-full mt-4 px-4 py-3 rounded-xl bg-primary text-gray-900 font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span v-if="loading" class="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></span>
              <span v-else>Find My Leagues</span>
            </button>
          </div>
          
          <!-- Step 1: Yahoo - Not Connected -->
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
            
            <div class="text-center py-6">
              <div class="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center mx-auto mb-4">
                <span class="text-3xl font-bold text-white">Y!</span>
              </div>
              <h3 class="text-lg font-semibold text-dark-text mb-2">Sign in with Yahoo</h3>
              <p class="text-sm text-dark-textMuted mb-6">
                You'll be redirected to Yahoo to sign in securely. We'll only access your fantasy leagues.
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
          
          <!-- Step 1: Yahoo - Connected, show leagues -->
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
            
            <!-- Yahoo Leagues List -->
            <div v-else class="space-y-2 max-h-64 overflow-y-auto">
              <button
                v-for="league in yahooLeagues"
                :key="league.league_key"
                @click="selectYahooLeague(league)"
                class="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-bg/50 border border-dark-border/50 hover:border-purple-500/50 hover:bg-dark-border/30 transition-all text-left"
              >
                <div class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <span class="text-sm font-bold text-purple-400">{{ league.name.substring(0, 2).toUpperCase() }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-dark-text truncate">{{ league.name }}</div>
                  <div class="text-xs text-dark-textMuted">
                    {{ league.num_teams }} teams • {{ league.season }} Season
                  </div>
                </div>
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <div v-if="yahooLeagues.length === 0 && !loadingYahooLeagues" class="text-center py-8 text-dark-textMuted">
                <p>No {{ sportStore.sportLabel }} leagues found</p>
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
              <span class="text-sm text-dark-textMuted">Select a league for <span class="text-primary font-medium">{{ username }}</span></span>
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
              
              <div v-if="availableLeagues.length === 0" class="text-center py-8 text-dark-textMuted">
                <p>No leagues found for this season</p>
                <p class="text-sm mt-1">Try a different username</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Close Button -->
        <button
          @click="$emit('close')"
          class="absolute top-4 right-4 p-2 rounded-lg hover:bg-dark-border/50 transition-colors"
        >
          <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { usePlatformsStore } from '@/stores/platforms'
import { useSportStore } from '@/stores/sport'
import { yahooService } from '@/services/yahoo'
import { useAuthStore } from '@/stores/auth'
import type { SleeperLeague } from '@/types/sleeper'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'league-added', league: SleeperLeague): void
  (e: 'yahoo-league-added', league: any): void
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
const yahooLeagues = ref<any[]>([])
const showYahooAccountMenu = ref(false)

// Reset when modal opens
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    step.value = 0
    selectedPlatform.value = null
    username.value = ''
    errorMessage.value = ''
    availableLeagues.value = []
    yahooLeagues.value = []
    showYahooAccountMenu.value = false
    
    // Fetch platforms status
    if (authStore.isAuthenticated) {
      await platformsStore.fetchConnectedPlatforms()
    }
  }
})

function selectPlatform(platform: 'sleeper' | 'yahoo') {
  selectedPlatform.value = platform
  step.value = 1
  
  if (platform === 'yahoo' && platformsStore.isYahooConnected) {
    loadYahooLeagues()
  }
}

async function searchSleeperLeagues() {
  if (!username.value.trim()) return
  
  loading.value = true
  errorMessage.value = ''
  
  try {
    const leagues = await leagueStore.fetchUserLeagues(username.value)
    
    // Filter out leagues that are already saved
    const savedIds = new Set(leagueStore.savedLeagues.map(l => l.league_id))
    availableLeagues.value = leagues.filter(l => !savedIds.has(l.league_id))
    
    if (availableLeagues.value.length === 0 && leagues.length > 0) {
      errorMessage.value = 'All your leagues are already added!'
    } else if (leagues.length === 0) {
      errorMessage.value = 'No leagues found for this username'
    } else {
      step.value = 2
    }
  } catch (err) {
    errorMessage.value = 'Could not find user. Check the username and try again.'
  } finally {
    loading.value = false
  }
}

function selectSleeperLeague(league: SleeperLeague) {
  emit('league-added', league)
}

function connectYahoo() {
  // Close modal and redirect to Yahoo OAuth
  emit('close')
  platformsStore.connectYahoo()
}

function switchYahooAccount() {
  // Disconnect and reconnect
  emit('close')
  platformsStore.connectYahoo()
}

async function loadYahooLeagues() {
  if (!authStore.user?.id) return
  
  loadingYahooLeagues.value = true
  
  try {
    // Initialize Yahoo service
    const initialized = await yahooService.initialize(authStore.user.id)
    if (!initialized) {
      console.error('Failed to initialize Yahoo service')
      return
    }
    
    // Fetch leagues for current sport
    const sport = sportStore.activeSport
    yahooLeagues.value = await yahooService.getLeagues(sport)
  } catch (err) {
    console.error('Error loading Yahoo leagues:', err)
  } finally {
    loadingYahooLeagues.value = false
  }
}

async function syncYahooLeagues() {
  loadingYahooLeagues.value = true
  try {
    await platformsStore.syncYahooLeagues(sportStore.activeSport)
    await loadYahooLeagues()
  } finally {
    loadingYahooLeagues.value = false
  }
}

function selectYahooLeague(league: any) {
  emit('yahoo-league-added', league)
}
</script>
