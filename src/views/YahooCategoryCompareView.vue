<template>
  <div class="space-y-6">
    <!-- Offseason Notice Banner - Only show when season is complete -->
    <div v-if="isSeasonComplete" class="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4 flex items-start gap-3">
      <div class="text-slate-400 text-xl flex-shrink-0">📅</div>
      <div>
        <p class="text-slate-200 font-semibold">It's the offseason</p>
        <p class="text-slate-400 text-sm mt-1">You're viewing last season's data ({{ currentSeason }}). The {{ Number(currentSeason) + 1 }} season will appear automatically once Week 1 begins.</p>
      </div>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Team Comparison</h1>
        <p class="text-base text-dark-textMuted">
          Compare any two teams head-to-head across all seasons
        </p>
      </div>
    </div>

    <!-- Team Selector -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-2">
            <span class="text-2xl">⚔️</span>
            <h2 class="card-title">Select Teams to Compare</h2>
          </div>
          <!-- Toggle for current members only -->
          <label class="flex items-center gap-2 cursor-pointer">
            <span class="text-sm text-dark-textMuted">Current members only</span>
            <div class="relative">
              <input type="checkbox" v-model="showCurrentMembersOnly" class="sr-only">
              <div :class="[
                'w-10 h-5 rounded-full transition-colors',
                showCurrentMembersOnly ? 'bg-yellow-400' : 'bg-dark-border'
              ]"></div>
              <div :class="[
                'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                showCurrentMembersOnly ? 'translate-x-5' : 'translate-x-0'
              ]"></div>
            </div>
          </label>
        </div>
        <p v-if="!showCurrentMembersOnly && allTeams.length > currentSeasonTeamIds.length" class="text-xs text-dark-textMuted mt-2">
          Showing all {{ allTeams.length }} teams from league history ({{ allTeams.length - currentSeasonTeamIds.length }} former members)
        </p>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Team 1 Selector -->
          <div>
            <label class="block text-sm font-semibold text-dark-text mb-2">Team 1</label>
            <select v-model="team1Key" class="select w-full" :disabled="isInitialLoading">
              <option value="">Select Team...</option>
              <option v-for="team in availableTeams1" :key="team.team_id" :value="team.team_key">
                {{ team.name }} ({{ team.seasons }} yr{{ team.seasons !== 1 ? 's' : '' }}){{ !currentSeasonTeamIds.includes(team.team_id) ? ' - former' : '' }}
              </option>
            </select>
          </div>

          <!-- Team 2 Selector -->
          <div>
            <label class="block text-sm font-semibold text-dark-text mb-2">Team 2</label>
            <select v-model="team2Key" class="select w-full" :disabled="isInitialLoading">
              <option value="">Select Team...</option>
              <option v-for="team in availableTeams2" :key="team.team_id" :value="team.team_key">
                {{ team.name }} ({{ team.seasons }} yr{{ team.seasons !== 1 ? 's' : '' }}){{ !currentSeasonTeamIds.includes(team.team_id) ? ' - former' : '' }}
              </option>
            </select>
          </div>
        </div>
        <p class="text-xs text-dark-textMuted mt-3">
          {{ availableTeams1.length }} teams available ({{ allTeams.length }} total, {{ currentSeasonTeamIds.length }} current)
          <span v-if="!showCurrentMembersOnly"> (including {{ allTeams.length - currentSeasonTeamIds.length }} former members)</span>
          <span v-if="isEspn" class="text-red-400 ml-2">• ESPN Mode</span>
        </p>
      </div>
    </div>

    <!-- Initial Loading State (loading historical data) -->
    <div v-if="isInitialLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <LoadingSpinner size="xl" />
        <div class="text-lg font-semibold text-dark-text mb-2">Loading League History</div>
        <div class="text-dark-textMuted text-sm">{{ loadingMessage }}</div>
        <div class="text-xs text-dark-textMuted/70 mt-2">This may take a minute for leagues with many seasons</div>
      </div>
    </div>

    <!-- Comparison Loading State -->
    <div v-else-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <LoadingSpinner size="xl" />
        <div class="text-lg font-semibold text-dark-text mb-2">Building Comparison</div>
        <div class="text-dark-textMuted text-sm">Analyzing head-to-head matchups...</div>
      </div>
    </div>

    <!-- Comparison Results -->
    <template v-if="!isLoading && !isInitialLoading && comparisonData">
      <!-- Simulated Data Banner for free users -->
      <SimulatedDataBanner v-if="!hasLeagueAccess" class="mb-6" />
      
      <!-- Gated Results Container -->
      <div class="relative">
        <!-- Content (visible but blurred for free users) -->
        <div :class="!hasLeagueAccess ? 'blur-sm select-none pointer-events-none' : ''">
          <!-- Tale of the Tape -->
          <div class="card">
            <div class="card-header">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">🥊</span>
                  <h2 class="card-title">Tale of the Tape</h2>
                </div>
                <button 
                  @click="downloadComparisonImage" 
                  :disabled="isDownloadingComparison"
                  class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm"
                  style="background: transparent; color: #facc15; border: 1px solid #facc15;"
                  @mouseover="$event.currentTarget.style.background = '#facc15'; $event.currentTarget.style.color = '#111827'"
                  @mouseout="$event.currentTarget.style.background = 'transparent'; $event.currentTarget.style.color = '#facc15'"
                >
                  <svg v-if="!isDownloadingComparison" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ isDownloadingComparison ? 'Saving...' : 'Share' }}
                </button>
              </div>
              <p class="card-subtitle mt-2">All-time category comparison across {{ seasonsLoaded }} season{{ seasonsLoaded !== 1 ? 's' : '' }}</p>
            </div>
            <div class="card-body">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Team 1 Stats -->
                <div class="text-center p-6 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 rounded-xl border-2 border-cyan-500/30">
                  <img 
                    :src="team1Data?.logo_url || defaultAvatar" 
                    :alt="team1Data?.name" 
                    class="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-cyan-500 object-cover" 
                    @error="handleImageError" 
                  />
                  <div class="font-bold text-2xl text-dark-text mb-4">{{ team1Data?.name }}</div>
                  
                  <div class="space-y-3 text-left">
                    <div class="flex justify-between">
                      <span class="text-dark-textMuted">🏆 Championships:</span>
                      <span class="font-bold text-dark-text">{{ comparisonData.team1.championships }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-dark-textMuted">🎯 Playoff Apps:</span>
                      <span class="font-bold text-dark-text">{{ comparisonData.team1.playoffAppearances }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-dark-textMuted">Record:</span>
                      <span class="font-bold text-dark-text">{{ comparisonData.team1.wins }}-{{ comparisonData.team1.losses }}-{{ comparisonData.team1.ties }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-dark-textMuted">Win %:</span>
                      <span class="font-bold text-dark-text">{{ comparisonData.team1.winPct.toFixed(1) }}%</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-dark-textMuted">Avg Cat/Week:</span>
                      <span class="font-bold text-dark-text">{{ comparisonData.team1.avgCatPerWeek.toFixed(1) }}</span>
                    </div>
                  </div>
                </div>

                <!-- VS Section -->
                <div class="flex flex-col items-center justify-center p-6">
                  <div class="text-6xl font-black text-dark-textMuted mb-4">VS</div>
                  
                  <!-- Head-to-Head Record -->
                  <div class="text-center mb-6">
                    <div class="text-sm text-dark-textMuted mb-2">Head-to-Head Record</div>
                    <div class="flex items-center justify-center gap-3">
                      <div class="text-center">
                        <div class="text-4xl font-bold" :class="comparisonData.h2h.team1Wins > comparisonData.h2h.team2Wins ? 'text-green-400' : 'text-dark-textMuted'">
                          {{ comparisonData.h2h.team1Wins }}
                        </div>
                        <div class="text-xs text-dark-textMuted">{{ getShortName(team1Data?.name) }}</div>
                      </div>
                      <div class="text-3xl text-dark-textMuted">-</div>
                      <div class="text-center">
                        <div class="text-4xl font-bold" :class="comparisonData.h2h.team2Wins > comparisonData.h2h.team1Wins ? 'text-green-400' : 'text-dark-textMuted'">
                          {{ comparisonData.h2h.team2Wins }}
                        </div>
                        <div class="text-xs text-dark-textMuted">{{ getShortName(team2Data?.name) }}</div>
                      </div>
                    </div>
                    <div v-if="comparisonData.h2h.ties > 0" class="text-xs text-dark-textMuted mt-1">
                      {{ comparisonData.h2h.ties }} tie(s)
                    </div>
                  </div>

                  <!-- Rivalry Stats -->
                  <div class="w-full space-y-2 text-sm">
                    <div class="flex justify-between p-2 bg-dark-border/20 rounded">
                      <span class="text-dark-textMuted">Total Meetings:</span>
                      <span class="font-semibold text-dark-text">{{ comparisonData.h2h.totalGames }}</span>
                    </div>
                    <div v-if="comparisonData.h2h.totalGames > 0" class="flex justify-between p-2 bg-dark-border/20 rounded">
                      <span class="text-dark-textMuted">Avg Category Margin:</span>
                      <span class="font-semibold text-dark-text">{{ comparisonData.h2h.avgMargin.toFixed(1) }}</span>
                    </div>
                  </div>
                </div>

                <!-- Team 2 Stats -->
                <div class="text-center p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl border-2 border-orange-500/30">
                  <img 
                    :src="team2Data?.logo_url || defaultAvatar" 
                    :alt="team2Data?.name" 
                    class="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-orange-500 object-cover" 
                    @error="handleImageError" 
                  />
                  <div class="font-bold text-2xl text-dark-text mb-4">{{ team2Data?.name }}</div>
                  
                  <div class="space-y-3 text-left">
                    <div class="flex justify-between">
                      <span class="text-dark-textMuted">🏆 Championships:</span>
                      <span class="font-bold text-dark-text">{{ comparisonData.team2.championships }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-dark-textMuted">🎯 Playoff Apps:</span>
                      <span class="font-bold text-dark-text">{{ comparisonData.team2.playoffAppearances }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-dark-textMuted">Record:</span>
                      <span class="font-bold text-dark-text">{{ comparisonData.team2.wins }}-{{ comparisonData.team2.losses }}-{{ comparisonData.team2.ties }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-dark-textMuted">Win %:</span>
                      <span class="font-bold text-dark-text">{{ comparisonData.team2.winPct.toFixed(1) }}%</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-dark-textMuted">Avg Cat/Week:</span>
                      <span class="font-bold text-dark-text">{{ comparisonData.team2.avgCatPerWeek.toFixed(1) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Matchups Chart (Line Graph - Last 5) -->
          <div class="card" v-if="rivalryHistory.length > 0">
            <div class="card-header">
              <div class="flex items-center gap-2">
                <span class="text-2xl">📈</span>
                <h2 class="card-title">Recent Matchups</h2>
              </div>
              <p class="card-subtitle mt-2">Categories won in last {{ Math.min(rivalryHistory.length, 5) }} head-to-head meetings</p>
            </div>
            <div class="card-body">
              <div ref="chartContainer" class="w-full" style="height: 350px;"></div>
            </div>
          </div>

          <!-- Rivalry History (All-Time) -->
          <div class="card" v-if="rivalryHistory.length > 0">
            <div class="card-header">
              <div class="flex items-center gap-2">
                <span class="text-2xl">📜</span>
                <h2 class="card-title">Rivalry History</h2>
              </div>
              <p class="card-subtitle mt-2">All {{ rivalryHistory.length }} head-to-head matchups across all seasons</p>
            </div>
            <div class="card-body">
              <div class="space-y-3 max-h-96 overflow-y-auto">
                <div 
                  v-for="(matchup, idx) in rivalryHistory" 
                  :key="idx"
                  class="p-4 bg-dark-border/20 rounded-lg border border-dark-border"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                      <div class="text-sm">
                        <span class="font-semibold text-dark-text">{{ matchup.season }} Week {{ matchup.week }}</span>
                        <span v-if="matchup.isPlayoff" class="ml-2 px-2 py-0.5 bg-yellow-400/20 text-yellow-400 text-xs rounded">
                          Playoff
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-6">
                      <div class="text-right">
                        <div class="text-xs text-dark-textMuted">{{ getShortName(team1Data?.name) }}</div>
                        <div class="font-bold text-lg" :class="matchup.team1Cats > matchup.team2Cats ? 'text-green-400' : matchup.team1Cats < matchup.team2Cats ? 'text-red-400' : 'text-dark-text'">
                          {{ matchup.team1Cats }}
                        </div>
                      </div>
                      <div class="text-dark-textMuted text-sm">cats</div>
                      <div class="text-left">
                        <div class="text-xs text-dark-textMuted">{{ getShortName(team2Data?.name) }}</div>
                        <div class="font-bold text-lg" :class="matchup.team2Cats > matchup.team1Cats ? 'text-green-400' : matchup.team2Cats < matchup.team1Cats ? 'text-red-400' : 'text-dark-text'">
                          {{ matchup.team2Cats }}
                        </div>
                      </div>
                      <div class="text-sm w-24 text-right">
                        <span v-if="matchup.team1Cats > matchup.team2Cats" class="text-cyan-400 font-bold">
                          {{ getShortName(team1Data?.name) }} +{{ matchup.team1Cats - matchup.team2Cats }}
                        </span>
                        <span v-else-if="matchup.team2Cats > matchup.team1Cats" class="text-orange-400 font-bold">
                          {{ getShortName(team2Data?.name) }} +{{ matchup.team2Cats - matchup.team1Cats }}
                        </span>
                        <span v-else class="text-dark-textMuted">Tie</span>
                      </div>
                    </div>
                  </div>
                  <!-- Category Breakdown (Tied categories shown) -->
                  <div v-if="matchup.tiedCats > 0" class="mt-2 text-xs text-dark-textMuted">
                    {{ matchup.tiedCats }} tied categories
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- No H2H matchups found -->
          <div v-if="rivalryHistory.length === 0" class="card">
            <div class="card-body text-center py-8">
              <p class="text-dark-textMuted">No head-to-head matchups found between these teams</p>
            </div>
          </div>
        </div><!-- End blur wrapper -->
        
        <!-- Upgrade Overlay for Free Users -->
        <div 
          v-if="!hasLeagueAccess" 
          class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-dark-bg via-dark-bg/80 to-transparent"
        >
          <div class="text-center p-8 max-w-md">
            <div class="text-5xl mb-4">🔒</div>
            <h3 class="text-2xl font-bold text-dark-text mb-3">Unlock Team Comparisons</h3>
            <p class="text-dark-textMuted mb-6">
              Get access to head-to-head records, category breakdowns, rivalry history, and comparison charts.
            </p>
            <div class="space-y-3">
              <button 
                @click="$router.push('/pricing')"
                class="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-gray-900 font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg"
              >
                Get League Pass
              </button>
              <p class="text-xs text-dark-textMuted">One-time payment • Your whole league gets access</p>
            </div>
          </div>
        </div>
      </div><!-- End relative container -->
    </template>

    <!-- Platform Badge -->
    <div class="flex justify-center mt-8">
      <div v-if="isEspn" class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#5b8def]/10 border border-[#5b8def]/30">
        <img src="/espn-logo.svg" alt="ESPN" class="w-5 h-5" />
        <span class="text-sm text-[#5b8def]">ESPN Fantasy Baseball • H2H Categories</span>
      </div>
      <div v-else class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 border border-purple-600/30">
        <img src="/yahoo-fantasy.svg" alt="Yahoo" class="w-5 h-5" />
        <span class="text-sm text-purple-300">Yahoo Fantasy Baseball • H2H Categories</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'
import { espnService } from '@/services/espn'
import ApexCharts from 'apexcharts'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import SimulatedDataBanner from '@/components/SimulatedDataBanner.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()
const { hasLeagueAccess } = useFeatureAccess()

// Platform detection
const isEspn = computed(() => leagueStore.activePlatform === 'espn')

// Season detection for offseason banner
const currentSeason = computed(() => leagueStore.currentLeague?.season || new Date().getFullYear().toString())
const isSeasonComplete = computed(() => {
  if (leagueStore.currentLeague?.status === 'complete') return true
  const yahooLeague = Array.isArray(leagueStore.yahooLeague) ? leagueStore.yahooLeague[0] : leagueStore.yahooLeague
  return yahooLeague?.is_finished === 1
})

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_1_y.png'

// Baseball game keys by year
const GAME_KEYS: Record<string, string> = {
  '2025': '458', '2024': '431', '2023': '422', '2022': '412',
  '2021': '404', '2020': '398', '2019': '388', '2018': '378',
  '2017': '370', '2016': '357', '2015': '346', '2014': '328',
  '2013': '308', '2012': '283', '2011': '268', '2010': '253'
}

// State
const isLoading = ref(false)
const isInitialLoading = ref(true)
const loadingMessage = ref('Initializing...')
const isDownloadingComparison = ref(false)
const team1Key = ref('')
const team2Key = ref('')
const allTeams = ref<any[]>([]) // All teams across all seasons
const currentSeasonTeamIds = ref<string[]>([]) // Team IDs in current season
const showCurrentMembersOnly = ref(true) // Toggle for dropdown filter
const numCategories = ref(10)
const seasonsLoaded = ref(0)

// Historical data storage
const historicalData = ref<Record<string, { standings: any[], matchups: any[] }>>({})
const teamIdMapping = ref<Record<string, { name: string, logo_url: string, team_keys: string[] }>>({}) // Maps team_id to all their team_keys across seasons

const team1Data = ref<any>(null)
const team2Data = ref<any>(null)
const comparisonData = ref<any>(null)
const rivalryHistory = ref<any[]>([])

const chartContainer = ref<HTMLElement | null>(null)
let chartInstance: ApexCharts | null = null

// Helper to extract team_id from team_key (e.g., "431.l.12345.t.3" -> "3")
function getTeamId(teamKey: string): string {
  if (isEspn.value) {
    // ESPN team keys are like "espn_12345_2024_3" -> extract team number "3"
    const parts = teamKey.split('_')
    return parts[parts.length - 1] || teamKey
  }
  const parts = teamKey.split('.t.')
  return parts[1] || teamKey
}

// Parse ESPN league key to extract leagueId and season
// Format: espn_{sport}_{leagueId}_{season} (e.g., espn_baseball_12345_2024)
function parseEspnLeagueKey(leagueKey: string): { leagueId: string; season: number; sport: string } {
  const parts = leagueKey.split('_')
  // parts[0] = "espn", parts[1] = sport, parts[2] = leagueId, parts[3] = season
  return {
    sport: parts[1] || 'baseball',
    leagueId: parts[2] || '',
    season: parseInt(parts[3]) || new Date().getFullYear()
  }
}

// Computed - filter teams based on toggle and exclude already-selected team
const availableTeams1 = computed(() => {
  let teams = allTeams.value
  if (showCurrentMembersOnly.value) {
    teams = teams.filter(t => currentSeasonTeamIds.value.includes(t.team_id))
  }
  return teams.filter(t => t.team_id !== getTeamId(team2Key.value))
})

const availableTeams2 = computed(() => {
  let teams = allTeams.value
  if (showCurrentMembersOnly.value) {
    teams = teams.filter(t => currentSeasonTeamIds.value.includes(t.team_id))
  }
  return teams.filter(t => t.team_id !== getTeamId(team1Key.value))
})

// Methods
function handleImageError(event: Event) {
  (event.target as HTMLImageElement).src = defaultAvatar
}

function getShortName(name: string | undefined): string {
  if (!name) return '?'
  const words = name.split(' ')
  if (words.length >= 2) {
    return words[0].substring(0, 1) + '. ' + words.slice(1).join(' ').substring(0, 8)
  }
  return name.substring(0, 10)
}

async function loadHistoricalData() {
  console.log('=== CATEGORY COMPARE: loadHistoricalData START ===')
  isInitialLoading.value = true
  loadingMessage.value = 'Initializing...'
  
  try {
    const leagueKey = leagueStore.activeLeagueId
    console.log('League key:', leagueKey)
    if (!leagueKey) {
      console.log('No league key, returning early')
      isInitialLoading.value = false
      return
    }
    
    // Extract league ID from current league key (e.g., "431.l.12345" -> "12345")
    const leagueId = leagueKey.split('.l.')[1]
    loadingMessage.value = `Loading league ${leagueId} history...`
    
    // Load league settings to get number of categories
    try {
      const settings = await yahooService.getLeagueSettings(leagueKey)
      console.log('League settings response:', settings)
      
      const statCats = settings?.stat_categories || []
      console.log('All stat categories:', statCats.length, statCats)
      
      // Filter to only scoring categories (exclude display-only stats)
      const scoringCats = statCats.filter((cat: any) => {
        const isDisplayOnly = cat.is_only_display_stat === '1' || cat.is_only_display_stat === 1
        return !isDisplayOnly
      })
      
      console.log('Scoring categories:', scoringCats.length, scoringCats.map((c: any) => c.display_name || c.name))
      
      if (scoringCats.length > 0) {
        numCategories.value = scoringCats.length
      }
      console.log('League has', numCategories.value, 'scoring categories for chart max')
    } catch (e) {
      console.log('Could not load league settings, using default 10 categories:', e)
    }
    
    // Load ALL historical seasons
    const data: Record<string, any> = {}
    const years = Object.keys(GAME_KEYS).sort((a, b) => parseInt(b) - parseInt(a))
    
    console.log('=== Starting Historical Data Load ===')
    console.log('League ID:', leagueId)
    let successCount = 0
    let failCount = 0
    
    for (const year of years) {
      const yearGameKey = GAME_KEYS[year]
      const yearLeagueKey = `${yearGameKey}.l.${leagueId}`
      
      loadingMessage.value = `Loading ${year} season... (${successCount} found)`
      console.log(`Attempting to load ${year} with key: ${yearLeagueKey}`)
      
      try {
        const standings = await yahooService.getStandings(yearLeagueKey)
        
        if (standings && standings.length > 0) {
          console.log(`✓ Loaded ${year} season: ${standings.length} teams`)
          successCount++
          
          // Determine champion (rank 1)
          const champion = standings.find((t: any) => t.rank === 1)
          if (champion) champion.is_champion = true
          
          // Mark teams that made playoffs
          for (const team of standings) {
            team.made_playoffs = team.playoff_seed !== null && team.playoff_seed !== undefined && team.playoff_seed !== ''
          }
          
          data[year] = { standings, matchups: [] }
          
          // Build team mapping by NAME (team_id is NOT consistent across seasons in Yahoo)
          for (const team of standings) {
            const teamName = team.name.trim()
            if (!teamIdMapping.value[teamName]) {
              teamIdMapping.value[teamName] = {
                name: teamName,
                logo_url: team.logo_url,
                team_keys: [],
                current_season_key: null // Track if in current season
              }
            }
            teamIdMapping.value[teamName].team_keys.push(team.team_key)
            // Update logo to most recent if available
            if (team.logo_url) teamIdMapping.value[teamName].logo_url = team.logo_url
          }
          
          // Track current season teams (first successfully loaded = most recent)
          if (Object.keys(data).length === 1) {
            currentSeasonTeamIds.value = standings.map((team: any) => team.name.trim())
            // Mark current season keys
            for (const team of standings) {
              const teamName = team.name.trim()
              if (teamIdMapping.value[teamName]) {
                teamIdMapping.value[teamName].current_season_key = team.team_key
              }
            }
          }
          
          // Load matchups for this season
          try {
            loadingMessage.value = `Loading ${year} matchups...`
            const allMatchups: any[] = []
            const totalWeeks = 25
            let consecutiveFailures = 0
            
            for (let week = 1; week <= totalWeeks; week++) {
              try {
                const weekMatchups = await yahooService.getCategoryMatchups(yearLeagueKey, week)
                if (weekMatchups && weekMatchups.length > 0) {
                  // Add season info to each matchup
                  for (const m of weekMatchups) {
                    m.season = year
                  }
                  allMatchups.push(...weekMatchups)
                  consecutiveFailures = 0
                } else {
                  consecutiveFailures++
                }
              } catch (weekError) {
                consecutiveFailures++
              }
              
              if (consecutiveFailures >= 3 && allMatchups.length > 0) {
                console.log(`Stopping at week ${week} for ${year}`)
                break
              }
            }
            
            console.log(`Loaded ${allMatchups.length} matchups for ${year}`)
            if (allMatchups.length > 0) {
              data[year].matchups = allMatchups
            }
          } catch (e) {
            console.log(`Could not load matchups for ${year}:`, e)
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
        } else {
          console.log(`✗ ${year} - No standings data`)
          failCount++
        }
      } catch (e: any) {
        console.log(`✗ Could not load ${year}:`, e?.message || e)
        failCount++
      }
    }
    
    console.log('=== Historical Data Load Complete ===')
    console.log(`Loaded ${successCount} seasons`)
    console.log('Seasons loaded:', Object.keys(data).sort((a, b) => parseInt(b) - parseInt(a)))
    
    historicalData.value = data
    seasonsLoaded.value = successCount
    
    // Build allTeams from teamIdMapping - all unique teams across all seasons
    // Key is team NAME (since Yahoo team_id changes between seasons)
    allTeams.value = Object.entries(teamIdMapping.value).map(([teamName, info]) => {
      const seasonsParticipated = info.team_keys.length
      return {
        team_id: teamName, // Use name as ID for consistency
        team_key: info.team_keys[0], // Most recent team_key
        name: info.name,
        logo_url: info.logo_url,
        seasons: seasonsParticipated
      }
    }).sort((a, b) => a.name.localeCompare(b.name))
    
    console.log('=== Team Mapping Debug ===')
    console.log('Total unique teams across all seasons:', allTeams.value.length)
    console.log('Current season teams:', currentSeasonTeamIds.value)
    console.log('All teams:', allTeams.value.map(t => `${t.name} (${t.seasons} seasons)`))
    
    // Log which teams are former vs current
    const formerTeams = allTeams.value.filter(t => !currentSeasonTeamIds.value.includes(t.team_id))
    const currentTeams = allTeams.value.filter(t => currentSeasonTeamIds.value.includes(t.team_id))
    console.log('Current members:', currentTeams.map(t => t.name))
    console.log('Former members:', formerTeams.map(t => t.name))
    
    // Auto-select first two current-season teams
    if (currentTeams.length >= 2) {
      team1Key.value = currentTeams[0].team_key
      team2Key.value = currentTeams[1].team_key
    } else if (allTeams.value.length >= 2) {
      team1Key.value = allTeams.value[0].team_key
      team2Key.value = allTeams.value[1].team_key
    }
    
    loadingMessage.value = 'Done!'
    
  } catch (e) {
    console.error('Error loading historical data:', e)
    loadingMessage.value = 'Error loading data'
  } finally {
    isInitialLoading.value = false
  }
}

// ESPN Historical Data Loading
async function loadEspnHistoricalData() {
  console.log('=== ESPN CATEGORY COMPARE: loadEspnHistoricalData START ===')
  isInitialLoading.value = true
  loadingMessage.value = 'Initializing ESPN data...'
  
  try {
    const leagueKey = leagueStore.activeLeagueId
    console.log('ESPN League key:', leagueKey)
    if (!leagueKey) {
      console.log('No league key, returning early')
      isInitialLoading.value = false
      return
    }
    
    const { leagueId, season: currentSeason, sport } = parseEspnLeagueKey(leagueKey)
    console.log('[ESPN Compare] Parsed league key:', { leagueId, currentSeason, sport })
    loadingMessage.value = `Loading ESPN league ${leagueId} history...`
    
    if (!leagueId) {
      console.error('[ESPN Compare] Could not parse league ID from key:', leagueKey)
      isInitialLoading.value = false
      return
    }
    
    // Load league settings to get number of categories
    try {
      const scoringSettings = await espnService.getScoringSettings(sport as any, leagueId, currentSeason)
      const scoringItems = scoringSettings?.scoringItems || []
      if (scoringItems.length > 0) {
        numCategories.value = scoringItems.length
      }
      console.log('ESPN League has', numCategories.value, 'scoring categories')
    } catch (e) {
      console.log('Could not load ESPN league settings, using default 10 categories:', e)
    }
    
    // Load historical seasons (ESPN typically goes back to ~2018 reliably)
    const data: Record<string, any> = {}
    const currentYear = new Date().getFullYear()
    const years = []
    for (let year = currentYear; year >= 2018; year--) {
      years.push(year.toString())
    }
    
    console.log('=== Starting ESPN Historical Data Load ===')
    console.log('League ID:', leagueId, 'Sport:', sport)
    let successCount = 0
    
    for (const year of years) {
      const yearSeason = parseInt(year)
      loadingMessage.value = `Loading ${year} season... (${successCount} found)`
      console.log(`[ESPN] Attempting to load ${year} season`)
      
      try {
        // Try to get teams/standings for this season
        // Try current method first, fall back to historical method
        let teams: any[] = []
        try {
          teams = await espnService.getTeams(sport as any, leagueId, yearSeason)
          console.log(`[ESPN] getTeams returned ${teams?.length || 0} teams for ${year}`)
        } catch (e) {
          console.log(`[ESPN] getTeams failed for ${year}, trying historical:`, e)
          // Try historical endpoint
          teams = await espnService.getHistoricalTeams(sport as any, leagueId, yearSeason)
          console.log(`[ESPN] getHistoricalTeams returned ${teams?.length || 0} teams for ${year}`)
        }
        
        if (teams && teams.length > 0) {
          console.log(`✓ [ESPN] Loaded ${year} season: ${teams.length} teams`)
          console.log(`[ESPN] Sample team:`, teams[0])
          successCount++
          
          // Build standings array from teams
          const standings = teams.map((team: any) => ({
            team_key: `espn_${leagueId}_${year}_${team.id}`,
            team_id: team.id.toString(),
            name: team.name,
            logo_url: team.logo || '',
            wins: team.wins || 0,
            losses: team.losses || 0,
            ties: team.ties || 0,
            rank: team.playoffSeed || team.rank || 0,
            playoff_seed: team.playoffSeed,
            is_champion: team.rank === 1 || team.playoffSeed === 1,
            made_playoffs: team.playoffSeed !== undefined && team.playoffSeed !== null && team.playoffSeed > 0
          }))
          
          data[year] = { standings, matchups: [] }
          
          // Build team mapping by team ID (ESPN team IDs are consistent within a league)
          for (const team of standings) {
            const teamId = team.team_id
            if (!teamIdMapping.value[teamId]) {
              teamIdMapping.value[teamId] = {
                name: team.name,
                logo_url: team.logo_url,
                team_keys: [],
                current_season_key: null
              }
            }
            teamIdMapping.value[teamId].team_keys.push(team.team_key)
            if (team.logo_url) teamIdMapping.value[teamId].logo_url = team.logo_url
            // Update name to most recent
            teamIdMapping.value[teamId].name = team.name
          }
          
          // Track current season teams
          if (Object.keys(data).length === 1) {
            currentSeasonTeamIds.value = standings.map((team: any) => team.team_id)
            for (const team of standings) {
              if (teamIdMapping.value[team.team_id]) {
                teamIdMapping.value[team.team_id].current_season_key = team.team_key
              }
            }
          }
          
          // Load matchups for this season
          try {
            loadingMessage.value = `Loading ${year} matchups...`
            const allMatchups: any[] = []
            const totalWeeks = 25
            let consecutiveFailures = 0
            
            for (let week = 1; week <= totalWeeks; week++) {
              try {
                // Try regular matchups first, fall back to historical
                let weekMatchups: any[] = []
                try {
                  weekMatchups = await espnService.getMatchups(sport as any, leagueId, yearSeason, week)
                } catch (e) {
                  weekMatchups = await espnService.getHistoricalMatchups(sport as any, leagueId, yearSeason, week)
                }
                
                if (weekMatchups && weekMatchups.length > 0) {
                  // Transform ESPN matchups to our format
                  for (const m of weekMatchups) {
                    allMatchups.push({
                      season: year,
                      week: m.matchupPeriodId,
                      teams: [
                        { team_key: `espn_${leagueId}_${year}_${m.homeTeamId}`, team_id: m.homeTeamId.toString() },
                        { team_key: `espn_${leagueId}_${year}_${m.awayTeamId}`, team_id: m.awayTeamId.toString() }
                      ],
                      // ESPN provides category wins directly
                      home_category_wins: m.homeCategoryWins || 0,
                      away_category_wins: m.awayCategoryWins || 0,
                      home_category_ties: m.homeCategoryTies || 0,
                      away_category_ties: m.awayCategoryTies || 0,
                      is_playoffs: m.playoffTierType !== 'NONE',
                      homeTeamId: m.homeTeamId,
                      awayTeamId: m.awayTeamId,
                      // Store per-category results if available
                      homePerCategoryResults: m.homePerCategoryResults,
                      awayPerCategoryResults: m.awayPerCategoryResults
                    })
                  }
                  consecutiveFailures = 0
                } else {
                  consecutiveFailures++
                }
              } catch (weekError) {
                consecutiveFailures++
              }
              
              if (consecutiveFailures >= 3 && allMatchups.length > 0) {
                console.log(`[ESPN] Stopping at week ${week} for ${year}`)
                break
              }
            }
            
            console.log(`[ESPN] Loaded ${allMatchups.length} matchups for ${year}`)
            if (allMatchups.length > 0) {
              data[year].matchups = allMatchups
            }
          } catch (e) {
            console.log(`[ESPN] Could not load matchups for ${year}:`, e)
          }
          
          await new Promise(resolve => setTimeout(resolve, 100))
        } else {
          console.log(`✗ [ESPN] ${year} - No standings data`)
        }
      } catch (e: any) {
        console.log(`✗ [ESPN] Could not load ${year}:`, e?.message || e)
      }
    }
    
    console.log('=== ESPN Historical Data Load Complete ===')
    console.log(`Loaded ${successCount} seasons`)
    console.log('Seasons loaded:', Object.keys(data).sort((a, b) => parseInt(b) - parseInt(a)))
    
    historicalData.value = data
    seasonsLoaded.value = successCount
    
    // Build allTeams from teamIdMapping
    console.log('[ESPN Compare] teamIdMapping entries:', Object.keys(teamIdMapping.value).length)
    console.log('[ESPN Compare] teamIdMapping:', JSON.stringify(teamIdMapping.value, null, 2))
    
    allTeams.value = Object.entries(teamIdMapping.value).map(([teamId, info]) => {
      const seasonsParticipated = info.team_keys.length
      return {
        team_id: teamId,
        team_key: info.team_keys[0],
        name: info.name,
        logo_url: info.logo_url,
        seasons: seasonsParticipated
      }
    }).sort((a, b) => a.name.localeCompare(b.name))
    
    console.log('=== ESPN Team Mapping Debug ===')
    console.log('Total unique teams across all seasons:', allTeams.value.length)
    console.log('All teams:', allTeams.value.map(t => ({ id: t.team_id, name: t.name, key: t.team_key })))
    console.log('Current season team IDs:', currentSeasonTeamIds.value)
    
    // Auto-select first two current-season teams
    const currentTeams = allTeams.value.filter(t => currentSeasonTeamIds.value.includes(t.team_id))
    console.log('[ESPN Compare] Current teams for selection:', currentTeams.length)
    
    if (currentTeams.length >= 2) {
      team1Key.value = currentTeams[0].team_key
      team2Key.value = currentTeams[1].team_key
      console.log('[ESPN Compare] Auto-selected teams:', team1Key.value, team2Key.value)
    } else if (allTeams.value.length >= 2) {
      team1Key.value = allTeams.value[0].team_key
      team2Key.value = allTeams.value[1].team_key
      console.log('[ESPN Compare] Fallback selected teams:', team1Key.value, team2Key.value)
    }
    
    loadingMessage.value = 'Done!'
    
  } catch (e) {
    console.error('Error loading ESPN historical data:', e)
    loadingMessage.value = 'Error loading data'
  } finally {
    isInitialLoading.value = false
  }
}

async function loadComparison() {
  console.log('=== loadComparison START ===')
  console.log('team1Key:', team1Key.value)
  console.log('team2Key:', team2Key.value)
  
  if (!team1Key.value || !team2Key.value) {
    console.log('Missing team selection')
    return
  }
  
  if (!allTeams.value || allTeams.value.length === 0) {
    console.log('No teams loaded yet')
    return
  }
  
  isLoading.value = true
  
  try {
    // Find team info from the selected team_keys
    const team1Info = allTeams.value.find(t => t.team_key === team1Key.value)
    const team2Info = allTeams.value.find(t => t.team_key === team2Key.value)
    
    // For ESPN, we use team_id as the key in teamIdMapping
    // For Yahoo, we use team name as the key in teamIdMapping
    const team1MappingKey = isEspn.value ? team1Info?.team_id : team1Info?.name
    const team2MappingKey = isEspn.value ? team2Info?.team_id : team2Info?.name
    
    const team1Name = team1Info?.name || ''
    const team2Name = team2Info?.name || ''
    
    console.log('Team1 Name:', team1Name, 'Team2 Name:', team2Name)
    console.log('Platform:', isEspn.value ? 'ESPN' : 'Yahoo')
    console.log('Team1 mapping key:', team1MappingKey, 'Team2 mapping key:', team2MappingKey)
    
    // Get all team_keys for each team across seasons
    const team1Keys = teamIdMapping.value[team1MappingKey]?.team_keys || [team1Key.value]
    const team2Keys = teamIdMapping.value[team2MappingKey]?.team_keys || [team2Key.value]
    
    console.log('Team1 keys across seasons:', team1Keys)
    console.log('Team2 keys across seasons:', team2Keys)
    
    // Find current season team data for display
    const t1Current = allTeams.value.find(t => t.team_key === team1Key.value)
    const t2Current = allTeams.value.find(t => t.team_key === team2Key.value)
    
    team1Data.value = {
      name: team1Name || t1Current?.name || 'Team 1',
      logo_url: teamIdMapping.value[team1MappingKey]?.logo_url || t1Current?.logo_url || defaultAvatar
    }
    team2Data.value = {
      name: team2Name || t2Current?.name || 'Team 2',
      logo_url: teamIdMapping.value[team2MappingKey]?.logo_url || t2Current?.logo_url || defaultAvatar
    }
    
    // Aggregate stats across all seasons
    let team1Stats = {
      wins: 0,
      losses: 0,
      ties: 0,
      totalCatWins: 0,
      totalWeeks: 0,
      championships: 0,
      playoffAppearances: 0,
      winPct: 0,
      avgCatPerWeek: 0
    }
    
    let team2Stats = {
      wins: 0,
      losses: 0,
      ties: 0,
      totalCatWins: 0,
      totalWeeks: 0,
      championships: 0,
      playoffAppearances: 0,
      winPct: 0,
      avgCatPerWeek: 0
    }
    
    // Process each season
    for (const [season, seasonData] of Object.entries(historicalData.value)) {
      const standings = seasonData.standings || []
      
      // Find team 1 in this season
      const t1 = standings.find((t: any) => team1Keys.includes(t.team_key))
      if (t1) {
        team1Stats.wins += t1.wins || 0
        team1Stats.losses += t1.losses || 0
        team1Stats.ties += t1.ties || 0
        if (t1.is_champion) team1Stats.championships++
        if (t1.made_playoffs) team1Stats.playoffAppearances++
      }
      
      // Find team 2 in this season
      const t2 = standings.find((t: any) => team2Keys.includes(t.team_key))
      if (t2) {
        team2Stats.wins += t2.wins || 0
        team2Stats.losses += t2.losses || 0
        team2Stats.ties += t2.ties || 0
        if (t2.is_champion) team2Stats.championships++
        if (t2.made_playoffs) team2Stats.playoffAppearances++
      }
    }
    
    // Calculate win percentages and averages
    const team1TotalGames = team1Stats.wins + team1Stats.losses + team1Stats.ties
    const team2TotalGames = team2Stats.wins + team2Stats.losses + team2Stats.ties
    
    team1Stats.winPct = team1TotalGames > 0 ? (team1Stats.wins / team1TotalGames) * 100 : 0
    team2Stats.winPct = team2TotalGames > 0 ? (team2Stats.wins / team2TotalGames) * 100 : 0
    
    // Calculate average categories per week from matchup data
    let team1WeeksPlayed = 0
    let team2WeeksPlayed = 0
    let team1TotalCats = 0
    let team2TotalCats = 0
    
    for (const [season, seasonData] of Object.entries(historicalData.value)) {
      const matchups = seasonData.matchups || []
      
      for (const matchup of matchups) {
        const teams = matchup.teams || []
        
        // Check if team1 was in this matchup
        const t1Match = teams.find((t: any) => team1Keys.includes(t.team_key))
        if (t1Match) {
          team1WeeksPlayed++
          
          if (isEspn.value) {
            // ESPN format - check if team1 is home or away
            const isHome = matchup.homeTeamId?.toString() === getTeamId(t1Match.team_key)
            const catsWon = isHome ? (matchup.home_category_wins || 0) : (matchup.away_category_wins || 0)
            team1TotalCats += catsWon
          } else {
            // Yahoo format
            const statWinners = matchup.stat_winners || []
            const catsWon = statWinners.filter((w: any) => !w.is_tied && team1Keys.includes(w.winner_team_key)).length
            team1TotalCats += catsWon
          }
        }
        
        // Check if team2 was in this matchup
        const t2Match = teams.find((t: any) => team2Keys.includes(t.team_key))
        if (t2Match) {
          team2WeeksPlayed++
          
          if (isEspn.value) {
            // ESPN format
            const isHome = matchup.homeTeamId?.toString() === getTeamId(t2Match.team_key)
            const catsWon = isHome ? (matchup.home_category_wins || 0) : (matchup.away_category_wins || 0)
            team2TotalCats += catsWon
          } else {
            // Yahoo format
            const statWinners = matchup.stat_winners || []
            const catsWon = statWinners.filter((w: any) => !w.is_tied && team2Keys.includes(w.winner_team_key)).length
            team2TotalCats += catsWon
          }
        }
      }
    }
    
    team1Stats.avgCatPerWeek = team1WeeksPlayed > 0 ? team1TotalCats / team1WeeksPlayed : 0
    team2Stats.avgCatPerWeek = team2WeeksPlayed > 0 ? team2TotalCats / team2WeeksPlayed : 0
    
    // Find all head-to-head matchups across all seasons
    const h2hMatchups: any[] = []
    
    for (const [season, seasonData] of Object.entries(historicalData.value)) {
      const matchups = seasonData.matchups || []
      
      for (const matchup of matchups) {
        const teams = matchup.teams || []
        const t1Match = teams.find((t: any) => team1Keys.includes(t.team_key))
        const t2Match = teams.find((t: any) => team2Keys.includes(t.team_key))
        
        if (t1Match && t2Match) {
          // This is a head-to-head matchup!
          let team1CatsWon = 0
          let team2CatsWon = 0
          let tiedCats = 0
          
          if (isEspn.value) {
            // ESPN format - determine who is home/away
            const team1IsHome = matchup.homeTeamId?.toString() === getTeamId(t1Match.team_key)
            
            if (team1IsHome) {
              team1CatsWon = matchup.home_category_wins || 0
              team2CatsWon = matchup.away_category_wins || 0
              tiedCats = matchup.home_category_ties || 0
            } else {
              team1CatsWon = matchup.away_category_wins || 0
              team2CatsWon = matchup.home_category_wins || 0
              tiedCats = matchup.away_category_ties || 0
            }
          } else {
            // Yahoo format
            const statWinners = matchup.stat_winners || []
            
            for (const sw of statWinners) {
              if (sw.is_tied) {
                tiedCats++
              } else if (team1Keys.includes(sw.winner_team_key)) {
                team1CatsWon++
              } else if (team2Keys.includes(sw.winner_team_key)) {
                team2CatsWon++
              }
            }
          }
          
          h2hMatchups.push({
            season: season,
            week: matchup.week,
            team1Cats: team1CatsWon,
            team2Cats: team2CatsWon,
            tiedCats: tiedCats,
            margin: Math.abs(team1CatsWon - team2CatsWon),
            isPlayoff: matchup.is_playoffs
          })
        }
      }
    }
    
    console.log('Found', h2hMatchups.length, 'H2H matchups across all seasons')
    
    // Detect category count from matchup data (fallback/verification)
    if (h2hMatchups.length > 0) {
      const detectedCategories = h2hMatchups[0].team1Cats + h2hMatchups[0].team2Cats + h2hMatchups[0].tiedCats
      console.log('Detected categories from matchup data:', detectedCategories)
      if (detectedCategories > 0 && detectedCategories !== numCategories.value) {
        console.log(`Updating numCategories from ${numCategories.value} to ${detectedCategories}`)
        numCategories.value = detectedCategories
      }
    }
    
    // Calculate H2H stats
    let team1MatchupWins = 0
    let team2MatchupWins = 0
    let ties = 0
    let totalMargin = 0
    
    for (const m of h2hMatchups) {
      if (m.team1Cats > m.team2Cats) team1MatchupWins++
      else if (m.team2Cats > m.team1Cats) team2MatchupWins++
      else ties++
      
      totalMargin += m.margin
    }
    
    const h2hStats = {
      team1Wins: team1MatchupWins,
      team2Wins: team2MatchupWins,
      ties,
      totalGames: h2hMatchups.length,
      avgMargin: h2hMatchups.length > 0 ? totalMargin / h2hMatchups.length : 0
    }
    
    console.log('h2hStats:', h2hStats)
    
    // Set comparison data
    comparisonData.value = {
      team1: team1Stats,
      team2: team2Stats,
      h2h: h2hStats
    }
    
    // Store rivalry history (sorted by season desc, then week desc)
    rivalryHistory.value = h2hMatchups.sort((a, b) => {
      if (a.season !== b.season) return parseInt(b.season) - parseInt(a.season)
      return b.week - a.week
    })
    
    // Render chart after DOM updates
    await nextTick()
    setTimeout(() => renderChart(), 100)
    
    console.log('=== loadComparison COMPLETE ===')
    
  } catch (e) {
    console.error('Error in loadComparison:', e)
  } finally {
    isLoading.value = false
  }
}

function renderChart() {
  console.log('renderChart called, container:', !!chartContainer.value, 'history:', rivalryHistory.value.length, 'numCategories:', numCategories.value)
  
  if (!chartContainer.value || rivalryHistory.value.length === 0) {
    console.log('Cannot render chart - missing container or no history')
    return
  }
  
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
  
  // Get last 5 matchups in chronological order (oldest to newest)
  const recentMatchups = [...rivalryHistory.value]
    .sort((a, b) => {
      if (a.season !== b.season) return parseInt(a.season) - parseInt(b.season)
      return a.week - b.week
    })
    .slice(-5)
  
  console.log('Chart data (last 5):', recentMatchups.map(m => ({ season: m.season, week: m.week, t1: m.team1Cats, t2: m.team2Cats })))
  
  const options = {
    chart: {
      type: 'line' as const,
      height: 350,
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: true }
    },
    stroke: {
      curve: 'smooth' as const,
      width: 3
    },
    markers: {
      size: 6,
      strokeWidth: 2,
      hover: { size: 8 }
    },
    series: [
      { 
        name: team1Data.value?.name || 'Team 1', 
        data: recentMatchups.map(m => m.team1Cats) 
      },
      { 
        name: team2Data.value?.name || 'Team 2', 
        data: recentMatchups.map(m => m.team2Cats) 
      }
    ],
    colors: ['#06b6d4', '#f97316'],
    dataLabels: {
      enabled: true,
      background: {
        enabled: true,
        borderRadius: 2,
        padding: 4
      }
    },
    xaxis: {
      categories: recentMatchups.map(m => `${m.season} W${m.week}`),
      labels: { style: { colors: '#94a3b8' } }
    },
    yaxis: { 
      min: 0,
      max: numCategories.value,
      tickAmount: numCategories.value > 10 ? 5 : numCategories.value,
      labels: { 
        style: { colors: '#94a3b8' },
        formatter: (val: number) => val.toFixed(0)
      },
      title: { text: 'Categories Won', style: { color: '#94a3b8' } }
    },
    grid: { borderColor: '#334155' },
    legend: { 
      labels: { colors: '#e2e8f0' },
      position: 'top' as const
    },
    tooltip: { 
      theme: 'dark',
      y: { formatter: (val: number) => val + ' categories' }
    }
  }
  
  chartInstance = new ApexCharts(chartContainer.value, options)
  chartInstance.render()
  console.log('Line chart rendered with Y-axis max:', numCategories.value)
}

// Get league name helper
function getLeagueName(): string {
  const activeId = leagueStore.activeLeagueId
  const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === activeId?.split('.l.')[1])
  return savedLeague?.league_name || leagueStore.yahooLeague?.name || 'Fantasy League'
}

// Download Comparison Image
async function downloadComparisonImage() {
  if (!team1Data.value || !team2Data.value || !comparisonData.value) return
  isDownloadingComparison.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    const leagueName = getLeagueName()
    
    // Load UFD logo
    const loadLogo = async (): Promise<string> => {
      try {
        const response = await fetch('/UFD_V5.png')
        if (!response.ok) return ''
        const blob = await response.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => resolve('')
          reader.readAsDataURL(blob)
        })
      } catch (e) { return '' }
    }
    
    const createPlaceholder = (name: string, color: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(32, 32, 32, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(name.charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    const logoBase64 = await loadLogo()
    
    // Load team logos
    const loadTeamLogo = async (url: string | undefined, name: string, color: string): Promise<string> => {
      if (!url) return createPlaceholder(name, color)
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        return await new Promise<string>((resolve) => {
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = 64
            canvas.height = 64
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.beginPath()
              ctx.arc(32, 32, 32, 0, Math.PI * 2)
              ctx.closePath()
              ctx.clip()
              ctx.drawImage(img, 0, 0, 64, 64)
            }
            resolve(canvas.toDataURL('image/png'))
          }
          img.onerror = () => resolve(createPlaceholder(name, color))
          setTimeout(() => resolve(createPlaceholder(name, color)), 3000)
          img.src = url
        })
      } catch { return createPlaceholder(name, color) }
    }
    
    const team1Logo = await loadTeamLogo(team1Data.value.logo_url, team1Data.value.name, '#06b6d4')
    const team2Logo = await loadTeamLogo(team2Data.value.logo_url, team2Data.value.name, '#f97316')
    
    // Get recent matchups for chart
    const recentMatchups = [...rivalryHistory.value].reverse().slice(0, 5).reverse()
    
    // Generate chart points for SVG
    const chartWidth = 420
    const chartHeight = 150
    const padding = 40
    const maxCats = numCategories.value
    
    const getX = (idx: number) => padding + (idx / (recentMatchups.length - 1 || 1)) * (chartWidth - padding * 2)
    const getY = (val: number) => chartHeight - padding - (val / maxCats) * (chartHeight - padding * 2)
    
    const team1Points = recentMatchups.map((m, i) => `${getX(i)},${getY(m.team1Cats)}`).join(' ')
    const team2Points = recentMatchups.map((m, i) => `${getX(i)},${getY(m.team2Cats)}`).join(' ')
    
    // Generate X-axis labels
    const xLabels = recentMatchups.map((m, i) => 
      `<text x="${getX(i)}" y="${chartHeight - 10}" text-anchor="middle" fill="#94a3b8" font-size="10">${m.season} W${m.week}</text>`
    ).join('')
    
    // Generate Y-axis labels
    const yLabels = [0, Math.round(maxCats/2), maxCats].map(val =>
      `<text x="${padding - 8}" y="${getY(val) + 4}" text-anchor="end" fill="#94a3b8" font-size="10">${val}</text>`
    ).join('')
    
    // Generate grid lines
    const gridLines = [0, Math.round(maxCats/2), maxCats].map(val =>
      `<line x1="${padding}" y1="${getY(val)}" x2="${chartWidth - padding}" y2="${getY(val)}" stroke="#334155" stroke-dasharray="4"/>`
    ).join('')
    
    // Generate data points
    const team1Dots = recentMatchups.map((m, i) =>
      `<circle cx="${getX(i)}" cy="${getY(m.team1Cats)}" r="5" fill="#06b6d4" stroke="#0a0c14" stroke-width="2"/>
       <text x="${getX(i)}" y="${getY(m.team1Cats) - 10}" text-anchor="middle" fill="#06b6d4" font-size="11" font-weight="bold">${m.team1Cats}</text>`
    ).join('')
    
    const team2Dots = recentMatchups.map((m, i) =>
      `<circle cx="${getX(i)}" cy="${getY(m.team2Cats)}" r="5" fill="#f97316" stroke="#0a0c14" stroke-width="2"/>
       <text x="${getX(i)}" y="${getY(m.team2Cats) + 18}" text-anchor="middle" fill="#f97316" font-size="11" font-weight="bold">${m.team2Cats}</text>`
    ).join('')
    
    const h2h = comparisonData.value.h2h
    const team1Wins = h2h.team1Wins
    const team2Wins = h2h.team2Wins
    const h2hLeader = team1Wins > team2Wins ? team1Data.value.name : team2Wins > team1Wins ? team2Data.value.name : 'Tied'
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 520px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); overflow: hidden;">
        <div style="background: #dc2626; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        <div style="display: flex; align-items: center; padding: 12px 20px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 18px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Team Comparison</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #dc2626; font-weight: 600;">${seasonsLoaded.value} Season${seasonsLoaded.value !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        
        <!-- Teams Comparison -->
        <div style="padding: 20px; display: flex; gap: 16px;">
          <!-- Team 1 -->
          <div style="flex: 1; padding: 16px; background: linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, transparent 100%); border-radius: 12px; border: 1px solid rgba(6, 182, 212, 0.3);">
            <div style="text-align: center; margin-bottom: 12px;">
              <img src="${team1Logo}" style="width: 56px; height: 56px; border-radius: 50%; border: 3px solid #06b6d4; margin: 0 auto 8px;" />
              <div style="font-size: 14px; font-weight: bold; color: #ffffff;">${team1Data.value.name}</div>
            </div>
            <div style="font-size: 11px; color: #9ca3af;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>🏆 Championships:</span>
                <span style="color: #e5e7eb; font-weight: bold;">${comparisonData.value.team1.championships}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Record:</span>
                <span style="color: #e5e7eb; font-weight: bold;">${comparisonData.value.team1.wins}-${comparisonData.value.team1.losses}-${comparisonData.value.team1.ties}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Win %:</span>
                <span style="color: #e5e7eb; font-weight: bold;">${comparisonData.value.team1.winPct.toFixed(1)}%</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Avg Cat/Week:</span>
                <span style="color: #e5e7eb; font-weight: bold;">${comparisonData.value.team1.avgCatPerWeek.toFixed(1)}</span>
              </div>
            </div>
          </div>
          
          <!-- VS Section -->
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 8px;">
            <div style="font-size: 28px; font-weight: 900; color: #4b5563; margin-bottom: 8px;">VS</div>
            <div style="text-align: center; background: rgba(58, 61, 82, 0.5); padding: 12px 16px; border-radius: 8px;">
              <div style="font-size: 10px; color: #9ca3af; margin-bottom: 4px;">Head-to-Head</div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 22px; font-weight: 900; color: ${team1Wins > team2Wins ? '#22c55e' : '#9ca3af'};">${team1Wins}</span>
                <span style="font-size: 16px; color: #6b7280;">-</span>
                <span style="font-size: 22px; font-weight: 900; color: ${team2Wins > team1Wins ? '#22c55e' : '#9ca3af'};">${team2Wins}</span>
              </div>
              ${h2h.ties > 0 ? `<div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">${h2h.ties} tie(s)</div>` : ''}
            </div>
          </div>
          
          <!-- Team 2 -->
          <div style="flex: 1; padding: 16px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, transparent 100%); border-radius: 12px; border: 1px solid rgba(249, 115, 22, 0.3);">
            <div style="text-align: center; margin-bottom: 12px;">
              <img src="${team2Logo}" style="width: 56px; height: 56px; border-radius: 50%; border: 3px solid #f97316; margin: 0 auto 8px;" />
              <div style="font-size: 14px; font-weight: bold; color: #ffffff;">${team2Data.value.name}</div>
            </div>
            <div style="font-size: 11px; color: #9ca3af;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>🏆 Championships:</span>
                <span style="color: #e5e7eb; font-weight: bold;">${comparisonData.value.team2.championships}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Record:</span>
                <span style="color: #e5e7eb; font-weight: bold;">${comparisonData.value.team2.wins}-${comparisonData.value.team2.losses}-${comparisonData.value.team2.ties}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Win %:</span>
                <span style="color: #e5e7eb; font-weight: bold;">${comparisonData.value.team2.winPct.toFixed(1)}%</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Avg Cat/Week:</span>
                <span style="color: #e5e7eb; font-weight: bold;">${comparisonData.value.team2.avgCatPerWeek.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
        
        ${recentMatchups.length > 1 ? `
        <!-- Recent Matchups Chart -->
        <div style="padding: 0 20px 16px;">
          <div style="font-size: 13px; font-weight: bold; color: #e5e7eb; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            <span>📈</span> Recent Matchups
            <span style="font-size: 11px; color: #9ca3af; font-weight: normal;">(Categories won)</span>
          </div>
          <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 8px;">
            <svg width="${chartWidth}" height="${chartHeight}" style="display: block; margin: 0 auto;">
              ${gridLines}
              ${yLabels}
              ${xLabels}
              <polyline points="${team1Points}" fill="none" stroke="#06b6d4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="${team2Points}" fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              ${team1Dots}
              ${team2Dots}
            </svg>
            <div style="display: flex; justify-content: center; gap: 20px; margin-top: 8px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 12px; height: 3px; background: #06b6d4; border-radius: 2px;"></div>
                <span style="font-size: 10px; color: #e5e7eb;">${getShortName(team1Data.value.name)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 12px; height: 3px; background: #f97316; border-radius: 2px;"></div>
                <span style="font-size: 10px; color: #e5e7eb;">${getShortName(team2Data.value.name)}</span>
              </div>
            </div>
          </div>
        </div>
        ` : ''}
        
        <div style="padding: 12px 20px; text-align: center; border-top: 1px solid rgba(220, 38, 38, 0.2);">
          <span style="font-size: 14px; font-weight: bold; color: #dc2626;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 300))
    
    const finalCanvas = await html2canvas(container, { backgroundColor: '#0a0c14', scale: 2, useCORS: true, allowTaint: true, width: 520 })
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    const safeTeam1 = team1Data.value.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase().substring(0, 15)
    const safeTeam2 = team2Data.value.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase().substring(0, 15)
    link.download = `comparison-${safeTeam1}-vs-${safeTeam2}.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } catch (e) {
    console.error('Error generating comparison image:', e)
  } finally {
    isDownloadingComparison.value = false
  }
}

// Watch for team selection changes - auto-compare when both selected
watch([team1Key, team2Key], ([t1, t2]) => {
  if (t1 && t2 && !isInitialLoading.value) {
    loadComparison()
  }
})

// Load data when league changes
watch(() => leagueStore.activeLeagueId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    console.log('League changed from', oldId, 'to', newId, 'platform:', leagueStore.activePlatform)
    // Reset everything
    team1Key.value = ''
    team2Key.value = ''
    comparisonData.value = null
    rivalryHistory.value = []
    allTeams.value = []
    currentSeasonTeamIds.value = []
    historicalData.value = {}
    teamIdMapping.value = {}
    seasonsLoaded.value = 0
    
    if (leagueStore.activePlatform === 'espn') {
      await loadEspnHistoricalData()
    } else if (leagueStore.activePlatform === 'yahoo') {
      await loadHistoricalData()
    }
  }
}, { immediate: false })

onMounted(async () => {
  console.log('Category Compare page mounted, platform:', leagueStore.activePlatform)
  if (leagueStore.activeLeagueId) {
    if (leagueStore.activePlatform === 'espn') {
      await loadEspnHistoricalData()
    } else if (leagueStore.activePlatform === 'yahoo') {
      await loadHistoricalData()
    }
  }
})
</script>
