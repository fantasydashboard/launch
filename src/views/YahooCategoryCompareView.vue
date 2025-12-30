<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Team Comparison</h1>
        <p class="text-base text-dark-textMuted">
          Compare any two teams head-to-head across the season
        </p>
      </div>
    </div>

    <!-- Team Selector -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">⚔️</span>
          <h2 class="card-title">Select Teams to Compare</h2>
        </div>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Team 1 Selector -->
          <div>
            <label class="block text-sm font-semibold text-dark-text mb-2">Team 1</label>
            <select v-model="team1Key" class="select w-full">
              <option value="">Select Team...</option>
              <option v-for="team in availableTeams1" :key="team.team_key" :value="team.team_key">
                {{ team.name }}
              </option>
            </select>
          </div>

          <!-- Team 2 Selector -->
          <div>
            <label class="block text-sm font-semibold text-dark-text mb-2">Team 2</label>
            <select v-model="team2Key" class="select w-full">
              <option value="">Select Team...</option>
              <option v-for="team in availableTeams2" :key="team.team_key" :value="team.team_key">
                {{ team.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
    </div>

    <!-- Comparison Results -->
    <template v-if="!isLoading && comparisonData">
      <!-- Tale of the Tape -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🥊</span>
            <h2 class="card-title">Tale of the Tape</h2>
          </div>
          <p class="card-subtitle mt-2">Season category comparison</p>
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
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.championships || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">🎯 Playoff Apps:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.playoffAppearances || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Record:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.wins }}-{{ comparisonData.team1.losses }}-{{ comparisonData.team1.ties || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Win %:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.winPct.toFixed(1) }}%</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Avg Cat/Week:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.avgCatPerWeek.toFixed(1) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Total Categories:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.totalCategories.toLocaleString() }}</span>
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
                <div v-if="comparisonData.h2h.totalGames > 0" class="flex justify-between p-2 bg-dark-border/20 rounded">
                  <span class="text-dark-textMuted">Total Cat Wins:</span>
                  <span class="font-semibold text-dark-text">
                    {{ comparisonData.h2h.team1TotalCats }} - {{ comparisonData.h2h.team2TotalCats }}
                  </span>
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
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.championships || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">🎯 Playoff Apps:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.playoffAppearances || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Record:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.wins }}-{{ comparisonData.team2.losses }}-{{ comparisonData.team2.ties || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Win %:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.winPct.toFixed(1) }}%</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Avg Cat/Week:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.avgCatPerWeek.toFixed(1) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Total Categories:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.totalCategories.toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Matchups Chart -->
      <div class="card" v-if="rivalryHistory.length > 0">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📈</span>
            <h2 class="card-title">Recent Matchups</h2>
          </div>
          <p class="card-subtitle mt-2">Categories won in last {{ Math.min(rivalryHistory.length, 10) }} head-to-head meetings</p>
        </div>
        <div class="card-body">
          <div ref="chartContainer" class="w-full" style="height: 350px;"></div>
        </div>
      </div>

      <!-- Rivalry History -->
      <div class="card" v-if="rivalryHistory.length > 0">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📜</span>
            <h2 class="card-title">Rivalry History</h2>
          </div>
          <p class="card-subtitle mt-2">All head-to-head matchups this season</p>
        </div>
        <div class="card-body">
          <div class="space-y-3">
            <div 
              v-for="(matchup, idx) in rivalryHistory" 
              :key="idx"
              class="p-4 bg-dark-border/20 rounded-lg border border-dark-border"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="text-sm">
                    <span class="font-semibold text-dark-text">Week {{ matchup.week }}</span>
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
          <p class="text-dark-textMuted">No head-to-head matchups found between these teams this season</p>
        </div>
      </div>
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

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_1_y.png'

// State
const isLoading = ref(false)
const isInitialLoading = ref(true)
const team1Key = ref('')
const team2Key = ref('')
const allTeams = ref<any[]>([])
const allMatchups = ref<any[]>([]) // Flat array of matchups (like points view)
const numCategories = ref(10) // Default, will be updated from league settings

const team1Data = ref<any>(null)
const team2Data = ref<any>(null)
const comparisonData = ref<any>(null)
const rivalryHistory = ref<any[]>([])

const chartContainer = ref<HTMLElement | null>(null)
let chartInstance: ApexCharts | null = null

// Computed
const availableTeams1 = computed(() => {
  return allTeams.value.filter(t => t.team_key !== team2Key.value)
})

const availableTeams2 = computed(() => {
  return allTeams.value.filter(t => t.team_key !== team1Key.value)
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

async function loadInitialData() {
  console.log('=== CATEGORY COMPARE: loadInitialData START ===')
  isInitialLoading.value = true
  
  try {
    const leagueKey = leagueStore.activeLeagueId
    console.log('League key:', leagueKey)
    if (!leagueKey) {
      console.log('No league key, returning early')
      isInitialLoading.value = false
      return
    }
    
    // Load teams from API with full data
    console.log('Fetching standings from API...')
    const standings = await yahooService.getStandings(leagueKey)
    console.log('Raw standings:', standings)
    
    if (standings && standings.length > 0) {
      allTeams.value = standings.map((team: any) => ({
        team_key: team.team_key,
        name: team.name,
        logo_url: team.logo_url,
        wins: parseInt(team.wins) || 0,
        losses: parseInt(team.losses) || 0,
        ties: parseInt(team.ties) || 0,
        rank: parseInt(team.rank) || 0,
        playoff_seed: team.playoff_seed,
        clinched_playoffs: team.clinched_playoffs
      }))
      console.log('Loaded', allTeams.value.length, 'teams:', allTeams.value.map(t => t.name))
    } else {
      console.error('No standings data from API')
      isInitialLoading.value = false
      return
    }
    
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
    
    // Get current week from league info
    const yahooLeagues = leagueStore.yahooLeagues || []
    const leagueInfo = yahooLeagues.find((l: any) => l.league_key === leagueKey)
    const currentWeek = leagueInfo?.current_week || 25
    console.log('Current week:', currentWeek)
    
    // Load all matchups week by week (like points view does)
    console.log('Loading matchups for weeks 1-' + currentWeek)
    const matchupsList: any[] = []
    
    for (let week = 1; week <= currentWeek; week++) {
      try {
        // Use getCategoryMatchups to get stat_winners data
        const weekMatchups = await yahooService.getCategoryMatchups(leagueKey, week)
        if (weekMatchups && weekMatchups.length > 0) {
          matchupsList.push(...weekMatchups)
          console.log(`Week ${week}: ${weekMatchups.length} matchups`)
        }
      } catch (e) {
        // Week may not have data
        console.log(`Week ${week}: no data`)
      }
    }
    
    allMatchups.value = matchupsList
    console.log('Total matchups loaded:', allMatchups.value.length)
    
    // Auto-select first two teams
    if (allTeams.value.length >= 2) {
      team1Key.value = allTeams.value[0].team_key
      team2Key.value = allTeams.value[1].team_key
    }
    
    console.log('=== CATEGORY COMPARE: loadInitialData COMPLETE ===')
    
  } catch (e) {
    console.error('Error loading initial data:', e)
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
    // Find team data
    const t1 = allTeams.value.find(t => t.team_key === team1Key.value)
    const t2 = allTeams.value.find(t => t.team_key === team2Key.value)
    
    if (!t1 || !t2) {
      console.error('Could not find team data')
      isLoading.value = false
      return
    }
    
    team1Data.value = t1
    team2Data.value = t2
    
    console.log('Team1:', t1.name, 'rank:', t1.rank, 'playoff_seed:', t1.playoff_seed)
    console.log('Team2:', t2.name, 'rank:', t2.rank, 'playoff_seed:', t2.playoff_seed)
    
    // Calculate season stats
    const team1TotalGames = (t1.wins || 0) + (t1.losses || 0) + (t1.ties || 0)
    const team2TotalGames = (t2.wins || 0) + (t2.losses || 0) + (t2.ties || 0)
    
    // Weeks played = total category results / categories per week
    const team1WeeksPlayed = team1TotalGames > 0 ? Math.ceil(team1TotalGames / numCategories.value) : 1
    const team2WeeksPlayed = team2TotalGames > 0 ? Math.ceil(team2TotalGames / numCategories.value) : 1
    
    // Championship = rank 1 (final standings)
    const t1Champ = t1.rank === 1 ? 1 : 0
    const t2Champ = t2.rank === 1 ? 1 : 0
    
    // Playoff appearance = has playoff_seed
    const t1MadePlayoffs = t1.playoff_seed !== null && t1.playoff_seed !== undefined && t1.playoff_seed !== ''
    const t2MadePlayoffs = t2.playoff_seed !== null && t2.playoff_seed !== undefined && t2.playoff_seed !== ''
    
    console.log('t1Champ:', t1Champ, 't1MadePlayoffs:', t1MadePlayoffs)
    console.log('t2Champ:', t2Champ, 't2MadePlayoffs:', t2MadePlayoffs)
    
    const team1Stats = {
      wins: t1.wins || 0,
      losses: t1.losses || 0,
      ties: t1.ties || 0,
      winPct: team1TotalGames > 0 ? ((t1.wins || 0) / team1TotalGames) * 100 : 0,
      avgCatPerWeek: team1WeeksPlayed > 0 ? (t1.wins || 0) / team1WeeksPlayed : 0,
      totalCategories: t1.wins || 0,
      championships: t1Champ,
      playoffAppearances: t1MadePlayoffs ? 1 : 0
    }
    
    const team2Stats = {
      wins: t2.wins || 0,
      losses: t2.losses || 0,
      ties: t2.ties || 0,
      winPct: team2TotalGames > 0 ? ((t2.wins || 0) / team2TotalGames) * 100 : 0,
      avgCatPerWeek: team2WeeksPlayed > 0 ? (t2.wins || 0) / team2WeeksPlayed : 0,
      totalCategories: t2.wins || 0,
      championships: t2Champ,
      playoffAppearances: t2MadePlayoffs ? 1 : 0
    }
    
    console.log('team1Stats:', team1Stats)
    console.log('team2Stats:', team2Stats)
    
    // Find head-to-head matchups using stat_winners
    const h2hMatchups: any[] = []
    
    console.log('Searching through', allMatchups.value.length, 'matchups for H2H')
    
    for (const matchup of allMatchups.value) {
      const teams = matchup.teams || []
      const t1Match = teams.find((t: any) => t.team_key === team1Key.value)
      const t2Match = teams.find((t: any) => t.team_key === team2Key.value)
      
      if (t1Match && t2Match) {
        // Count category wins from stat_winners
        let team1CatsWon = 0
        let team2CatsWon = 0
        let tiedCats = 0
        
        const statWinners = matchup.stat_winners || []
        console.log(`Week ${matchup.week}: Found H2H matchup with ${statWinners.length} stat winners`)
        
        for (const sw of statWinners) {
          if (sw.is_tied) {
            tiedCats++
          } else if (sw.winner_team_key === team1Key.value) {
            team1CatsWon++
          } else if (sw.winner_team_key === team2Key.value) {
            team2CatsWon++
          }
        }
        
        console.log(`Week ${matchup.week}: ${t1Match.name} ${team1CatsWon} - ${team2CatsWon} ${t2Match.name} (${tiedCats} tied)`)
        
        h2hMatchups.push({
          week: matchup.week,
          team1Cats: team1CatsWon,
          team2Cats: team2CatsWon,
          tiedCats: tiedCats,
          margin: Math.abs(team1CatsWon - team2CatsWon),
          isPlayoff: matchup.is_playoffs
        })
      }
    }
    
    console.log('Found', h2hMatchups.length, 'H2H matchups')
    
    // Calculate H2H stats
    let team1MatchupWins = 0
    let team2MatchupWins = 0
    let ties = 0
    let totalMargin = 0
    let team1TotalCats = 0
    let team2TotalCats = 0
    
    for (const m of h2hMatchups) {
      // Matchup win = won more categories
      if (m.team1Cats > m.team2Cats) team1MatchupWins++
      else if (m.team2Cats > m.team1Cats) team2MatchupWins++
      else ties++
      
      totalMargin += m.margin
      team1TotalCats += m.team1Cats
      team2TotalCats += m.team2Cats
    }
    
    const h2hStats = {
      team1Wins: team1MatchupWins,
      team2Wins: team2MatchupWins,
      ties,
      totalGames: h2hMatchups.length,
      avgMargin: h2hMatchups.length > 0 ? totalMargin / h2hMatchups.length : 0,
      team1TotalCats,
      team2TotalCats
    }
    
    console.log('h2hStats:', h2hStats)
    
    // Set comparison data
    comparisonData.value = {
      team1: team1Stats,
      team2: team2Stats,
      h2h: h2hStats
    }
    
    // Store rivalry history (sorted by week descending for display)
    rivalryHistory.value = h2hMatchups.sort((a, b) => b.week - a.week)
    
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
  
  // Sort by week ascending for chart (chronological order)
  const recentMatchups = [...rivalryHistory.value].sort((a, b) => a.week - b.week).slice(-10)
  
  console.log('Chart data:', recentMatchups.map(m => ({ week: m.week, t1: m.team1Cats, t2: m.team2Cats })))
  
  const options = {
    chart: {
      type: 'bar' as const,
      height: 350,
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: true }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 4
      }
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
      enabled: false
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: recentMatchups.map(m => `W${m.week}`),
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
    },
    fill: {
      opacity: 1
    }
  }
  
  chartInstance = new ApexCharts(chartContainer.value, options)
  chartInstance.render()
  console.log('Chart rendered')
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
    team1Key.value = ''
    team2Key.value = ''
    comparisonData.value = null
    rivalryHistory.value = []
    allTeams.value = []
    allMatchups.value = []
    await loadInitialData()
  }
}, { immediate: false })

onMounted(async () => {
  console.log('Category Compare page mounted')
  if (leagueStore.activeLeagueId && leagueStore.activePlatform === 'yahoo') {
    await loadInitialData()
  }
})
</script>
