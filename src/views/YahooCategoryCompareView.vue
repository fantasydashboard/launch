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
                {{ team.name }} ({{ team.manager }})
              </option>
            </select>
          </div>

          <!-- Team 2 Selector -->
          <div>
            <label class="block text-sm font-semibold text-dark-text mb-2">Team 2</label>
            <select v-model="team2Key" class="select w-full">
              <option value="">Select Team...</option>
              <option v-for="team in availableTeams2" :key="team.team_key" :value="team.team_key">
                {{ team.name }} ({{ team.manager }})
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
              <div class="font-bold text-2xl text-dark-text mb-1">{{ team1Data?.name }}</div>
              <div class="text-sm text-dark-textMuted mb-4">{{ team1Data?.manager }}</div>
              
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
              <div class="font-bold text-2xl text-dark-text mb-1">{{ team2Data?.name }}</div>
              <div class="text-sm text-dark-textMuted mb-4">{{ team2Data?.manager }}</div>
              
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
const allMatchups = ref<any[]>([])
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
  console.log('Loading initial data for category compare...')
  isInitialLoading.value = true
  
  try {
    const leagueKey = leagueStore.activeLeagueId
    console.log('League key:', leagueKey)
    if (!leagueKey) {
      console.log('No league key, returning early')
      isInitialLoading.value = false
      return
    }
    
    // First try to use teams from the currentLeague store (already loaded)
    console.log('Checking currentLeague for teams...', leagueStore.currentLeague)
    
    if (leagueStore.currentLeague?.teams && leagueStore.currentLeague.teams.length > 0) {
      console.log('Using teams from currentLeague store')
      allTeams.value = leagueStore.currentLeague.teams.map((team: any) => ({
        team_key: team.team_key,
        name: team.name,
        manager: team.managers?.[0]?.nickname || team.manager || 'Unknown',
        logo_url: team.logo_url,
        wins: parseInt(team.wins) || 0,
        losses: parseInt(team.losses) || 0,
        ties: parseInt(team.ties) || 0,
        rank: team.rank
      }))
      console.log('Loaded', allTeams.value.length, 'teams from store:', allTeams.value.map(t => t.name))
    } else {
      // Fall back to API call
      console.log('No teams in store, fetching from API...')
      try {
        const standings = await yahooService.getStandings(leagueKey)
        console.log('API standings response:', standings)
        
        if (standings && standings.length > 0) {
          allTeams.value = standings.map((team: any) => ({
            team_key: team.team_key,
            name: team.name,
            manager: team.managers?.[0]?.nickname || team.manager || 'Unknown',
            logo_url: team.logo_url,
            wins: parseInt(team.wins) || 0,
            losses: parseInt(team.losses) || 0,
            ties: parseInt(team.ties) || 0,
            rank: team.rank
          }))
          console.log('Loaded', allTeams.value.length, 'teams from API')
        }
      } catch (err) {
        console.error('Error fetching standings from API:', err)
      }
    }
    
    if (allTeams.value.length === 0) {
      console.error('No teams loaded from any source')
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
    
    // Load all matchups for the season
    try {
      const matchups = await yahooService.getAllMatchups(leagueKey)
      allMatchups.value = matchups || []
      console.log('Loaded', allMatchups.value.length, 'weeks of matchups')
    } catch (err) {
      console.error('Error loading matchups:', err)
      allMatchups.value = []
    }
    
  } catch (e) {
    console.error('Error loading initial data:', e)
  } finally {
    isInitialLoading.value = false
    console.log('Initial loading complete. Teams:', allTeams.value.length)
  }
}

async function loadComparison() {
  if (!team1Key.value || !team2Key.value) return
  
  console.log('=== loadComparison START ===')
  console.log('Team1:', team1Key.value)
  console.log('Team2:', team2Key.value)
  
  isLoading.value = true
  
  try {
    const t1 = allTeams.value.find(t => t.team_key === team1Key.value)
    const t2 = allTeams.value.find(t => t.team_key === team2Key.value)
    
    if (!t1 || !t2) {
      console.error('Could not find team data')
      return
    }
    
    team1Data.value = t1
    team2Data.value = t2
    
    console.log('Team1 data:', t1)
    console.log('Team2 data:', t2)
    
    // Calculate season stats for each team
    // For category leagues: wins/losses/ties are category wins
    const team1TotalGames = (t1.wins || 0) + (t1.losses || 0) + (t1.ties || 0)
    const team2TotalGames = (t2.wins || 0) + (t2.losses || 0) + (t2.ties || 0)
    
    // Count weeks played (total category decisions / categories per week)
    const team1WeeksPlayed = team1TotalGames > 0 ? Math.ceil(team1TotalGames / numCategories.value) : 1
    const team2WeeksPlayed = team2TotalGames > 0 ? Math.ceil(team2TotalGames / numCategories.value) : 1
    
    const team1Stats = {
      wins: t1.wins || 0,
      losses: t1.losses || 0,
      ties: t1.ties || 0,
      winPct: team1TotalGames > 0 ? ((t1.wins || 0) / team1TotalGames) * 100 : 0,
      avgCatPerWeek: team1WeeksPlayed > 0 ? (t1.wins || 0) / team1WeeksPlayed : 0,
      totalCategories: t1.wins || 0,
      championships: 0,
      playoffAppearances: 0
    }
    
    const team2Stats = {
      wins: t2.wins || 0,
      losses: t2.losses || 0,
      ties: t2.ties || 0,
      winPct: team2TotalGames > 0 ? ((t2.wins || 0) / team2TotalGames) * 100 : 0,
      avgCatPerWeek: team2WeeksPlayed > 0 ? (t2.wins || 0) / team2WeeksPlayed : 0,
      totalCategories: t2.wins || 0,
      championships: 0,
      playoffAppearances: 0
    }
    
    console.log('team1Stats:', team1Stats)
    console.log('team2Stats:', team2Stats)
    
    // Find head-to-head matchups
    const h2hMatchups: any[] = []
    
    for (const week of allMatchups.value) {
      if (!week.matchups) continue
      
      for (const matchup of week.matchups) {
        if (!matchup.teams || matchup.teams.length < 2) continue
        
        const t1Match = matchup.teams.find((t: any) => t.team_key === team1Key.value)
        const t2Match = matchup.teams.find((t: any) => t.team_key === team2Key.value)
        
        if (t1Match && t2Match) {
          // For category leagues, we need to look at win/loss/tie counts
          // The 'points' field might not exist, so we use win_probability or team stats
          const t1Wins = parseInt(t1Match.team_stats?.wins) || parseInt(t1Match.wins) || 0
          const t1Losses = parseInt(t1Match.team_stats?.losses) || parseInt(t1Match.losses) || 0
          const t1Ties = parseInt(t1Match.team_stats?.ties) || parseInt(t1Match.ties) || 0
          
          const t2Wins = parseInt(t2Match.team_stats?.wins) || parseInt(t2Match.wins) || 0
          const t2Losses = parseInt(t2Match.team_stats?.losses) || parseInt(t2Match.losses) || 0
          const t2Ties = parseInt(t2Match.team_stats?.ties) || parseInt(t2Match.ties) || 0
          
          // In a H2H matchup, t1's wins should equal t2's losses
          // But we may not have per-matchup category breakdowns, so we estimate
          // If we have matchup-level data, use it; otherwise estimate from overall
          let team1CatsWon = 0
          let team2CatsWon = 0
          let tiedCats = 0
          
          // Check if we have matchup-specific category data
          if (t1Match.matchup_stats || t2Match.matchup_stats) {
            // Use matchup-specific stats if available
            team1CatsWon = parseInt(t1Match.matchup_stats?.wins) || 0
            team2CatsWon = parseInt(t2Match.matchup_stats?.wins) || 0
            tiedCats = parseInt(t1Match.matchup_stats?.ties) || 0
          } else {
            // For Yahoo H2H Categories, the team with higher points usually won more cats
            // But we need the actual category breakdown - check different data sources
            const t1Points = parseFloat(t1Match.points) || 0
            const t2Points = parseFloat(t2Match.points) || 0
            
            // Yahoo sometimes stores category results differently
            // Try to find the actual category win/loss/tie for this matchup
            if (matchup.winner_team_key) {
              // We know who won the matchup
              if (matchup.winner_team_key === team1Key.value) {
                // Team 1 won more categories
                team1CatsWon = Math.ceil(numCategories.value / 2) + 1
                team2CatsWon = Math.floor(numCategories.value / 2) - 1
              } else if (matchup.winner_team_key === team2Key.value) {
                team2CatsWon = Math.ceil(numCategories.value / 2) + 1
                team1CatsWon = Math.floor(numCategories.value / 2) - 1
              }
              tiedCats = numCategories.value - team1CatsWon - team2CatsWon
            } else if (t1Points > 0 || t2Points > 0) {
              // Use points as proxy for categories won (not ideal but fallback)
              const total = t1Points + t2Points
              if (total > 0) {
                team1CatsWon = Math.round((t1Points / total) * numCategories.value)
                team2CatsWon = numCategories.value - team1CatsWon
              }
            }
          }
          
          console.log('Found H2H matchup week', week.week, ':', team1CatsWon, 'vs', team2CatsWon)
          h2hMatchups.push({
            week: week.week,
            team1Cats: team1CatsWon,
            team2Cats: team2CatsWon,
            tiedCats: tiedCats,
            margin: Math.abs(team1CatsWon - team2CatsWon),
            isPlayoff: matchup.is_playoffs || week.is_playoffs
          })
        }
      }
    }
    
    console.log('Found', h2hMatchups.length, 'H2H matchups')
    
    // Calculate H2H stats
    let team1Wins = 0
    let team2Wins = 0
    let ties = 0
    let totalMargin = 0
    let team1TotalCats = 0
    let team2TotalCats = 0
    
    for (const m of h2hMatchups) {
      if (m.team1Cats > m.team2Cats) team1Wins++
      else if (m.team2Cats > m.team1Cats) team2Wins++
      else ties++
      totalMargin += m.margin
      team1TotalCats += m.team1Cats
      team2TotalCats += m.team2Cats
    }
    
    const h2hStats = {
      team1Wins,
      team2Wins,
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
    
    console.log('comparisonData set:', comparisonData.value)
    
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
  // Only reload if league actually changed
  if (newId && newId !== oldId && leagueStore.activePlatform === 'yahoo') {
    console.log('League changed from', oldId, 'to', newId, '- loading initial data...')
    team1Key.value = ''
    team2Key.value = ''
    comparisonData.value = null
    rivalryHistory.value = []
    allTeams.value = []
    allMatchups.value = []
    await loadInitialData()
  }
}, { immediate: false }) // Don't run immediately, let onMounted handle initial load

onMounted(async () => {
  console.log('Category Compare page mounted')
  if (leagueStore.activeLeagueId && leagueStore.activePlatform === 'yahoo') {
    // Small delay to ensure store is ready
    await new Promise(resolve => setTimeout(resolve, 100))
    await loadInitialData()
  }
})
</script>
