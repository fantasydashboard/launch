<template>
  <div class="space-y-6">
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
                showCurrentMembersOnly ? 'bg-primary' : 'bg-dark-border'
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
          {{ availableTeams1.length }} teams available
          <span v-if="!showCurrentMembersOnly"> (including {{ allTeams.length - currentSeasonTeamIds.length }} former members)</span>
        </p>
      </div>
    </div>

    <!-- Initial Loading State (loading historical data) -->
    <div v-if="isInitialLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
        <div class="text-lg font-semibold text-dark-text mb-2">Loading League History</div>
        <div class="text-dark-textMuted text-sm">{{ loadingMessage }}</div>
        <div class="text-xs text-dark-textMuted/70 mt-2">This may take a minute for leagues with many seasons</div>
      </div>
    </div>

    <!-- Comparison Loading State -->
    <div v-else-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
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
              <div class="flex items-center gap-2">
                <span class="text-2xl">🥊</span>
                <h2 class="card-title">Tale of the Tape</h2>
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
                        <span v-if="matchup.isPlayoff" class="ml-2 px-2 py-0.5 bg-primary/20 text-primary text-xs rounded">
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
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 border border-purple-600/30">
        <span class="text-sm font-bold text-purple-400">Y!</span>
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
import ApexCharts from 'apexcharts'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import SimulatedDataBanner from '@/components/SimulatedDataBanner.vue'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()
const { hasLeagueAccess } = useFeatureAccess()

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
  const parts = teamKey.split('.t.')
  return parts[1] || teamKey
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
      const statCats = settings?.stat_categories || []
      const scoringCats = statCats.filter((cat: any) => cat.is_only_display_stat !== '1')
      numCategories.value = scoringCats.length || 10
      console.log('League has', numCategories.value, 'scoring categories')
    } catch (e) {
      console.log('Could not load league settings, using default 10 categories')
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
    // Find team names from the selected team_keys
    const team1Info = allTeams.value.find(t => t.team_key === team1Key.value)
    const team2Info = allTeams.value.find(t => t.team_key === team2Key.value)
    
    const team1Name = team1Info?.name || ''
    const team2Name = team2Info?.name || ''
    
    console.log('Team1 Name:', team1Name, 'Team2 Name:', team2Name)
    
    // Get all team_keys for each team across seasons (keyed by name now)
    const team1Keys = teamIdMapping.value[team1Name]?.team_keys || [team1Key.value]
    const team2Keys = teamIdMapping.value[team2Name]?.team_keys || [team2Key.value]
    
    console.log('Team1 keys across seasons:', team1Keys)
    console.log('Team2 keys across seasons:', team2Keys)
    
    // Find current season team data for display
    const t1Current = allTeams.value.find(t => t.team_key === team1Key.value)
    const t2Current = allTeams.value.find(t => t.team_key === team2Key.value)
    
    team1Data.value = {
      name: team1Name || t1Current?.name || 'Team 1',
      logo_url: teamIdMapping.value[team1Name]?.logo_url || t1Current?.logo_url || defaultAvatar
    }
    team2Data.value = {
      name: team2Name || t2Current?.name || 'Team 2',
      logo_url: teamIdMapping.value[team2Name]?.logo_url || t2Current?.logo_url || defaultAvatar
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
        const statWinners = matchup.stat_winners || []
        
        // Check if team1 was in this matchup
        const t1Match = teams.find((t: any) => team1Keys.includes(t.team_key))
        if (t1Match) {
          team1WeeksPlayed++
          const catsWon = statWinners.filter((w: any) => !w.is_tied && team1Keys.includes(w.winner_team_key)).length
          team1TotalCats += catsWon
        }
        
        // Check if team2 was in this matchup
        const t2Match = teams.find((t: any) => team2Keys.includes(t.team_key))
        if (t2Match) {
          team2WeeksPlayed++
          const catsWon = statWinners.filter((w: any) => !w.is_tied && team2Keys.includes(w.winner_team_key)).length
          team2TotalCats += catsWon
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
          const statWinners = matchup.stat_winners || []
          
          let team1CatsWon = 0
          let team2CatsWon = 0
          let tiedCats = 0
          
          for (const sw of statWinners) {
            if (sw.is_tied) {
              tiedCats++
            } else if (team1Keys.includes(sw.winner_team_key)) {
              team1CatsWon++
            } else if (team2Keys.includes(sw.winner_team_key)) {
              team2CatsWon++
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
  console.log('renderChart called, container:', !!chartContainer.value, 'history:', rivalryHistory.value.length)
  
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
  console.log('Line chart rendered')
}

// Watch for team selection changes - auto-compare when both selected
watch([team1Key, team2Key], ([t1, t2]) => {
  if (t1 && t2 && !isInitialLoading.value) {
    loadComparison()
  }
})

// Load data when league changes
watch(() => leagueStore.activeLeagueId, async (newId, oldId) => {
  if (newId && newId !== oldId && leagueStore.activePlatform === 'yahoo') {
    console.log('League changed from', oldId, 'to', newId)
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
    await loadHistoricalData()
  }
}, { immediate: false })

onMounted(async () => {
  console.log('Category Compare page mounted')
  if (leagueStore.activeLeagueId && leagueStore.activePlatform === 'yahoo') {
    await loadHistoricalData()
  }
})
</script>
