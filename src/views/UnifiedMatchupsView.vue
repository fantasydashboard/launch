<template>
  <div class="space-y-6">
    <!-- Header with Controls -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2 flex items-center gap-3">
          <span>{{ sportConfig.emoji }}</span>
          <span>Matchups</span>
        </h1>
        <p class="text-base text-dark-textMuted">
          {{ isPointsLeague ? 'Head-to-head battles with projections and analysis' : 'Category battles - track every stat that matters' }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Refresh Button -->
        <button 
          @click="refreshData" 
          :disabled="loading"
          class="btn-secondary flex items-center gap-2"
        >
          <svg 
            class="w-4 h-4" 
            :class="{ 'animate-spin': loading }" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
        
        <!-- Season Selector -->
        <select v-model="selectedSeason" @change="onSeasonChange" class="select">
          <option v-for="s in availableSeasons" :key="s" :value="s">
            {{ s }} Season
          </option>
        </select>
        
        <!-- Week Selector -->
        <select v-model="selectedWeek" @change="loadWeekData" class="select">
          <option v-for="week in availableWeeks" :key="week" :value="week">
            Week {{ week }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <LoadingSpinner v-if="loading && matchups.length === 0" size="lg" :message="loadingMessage" />

    <!-- Error State -->
    <div v-else-if="error" class="card p-8 text-center">
      <div class="text-4xl mb-4">😕</div>
      <h3 class="text-xl font-semibold text-dark-text mb-2">Something went wrong</h3>
      <p class="text-dark-textMuted mb-4">{{ error }}</p>
      <button @click="refreshData" class="btn btn-primary">Try Again</button>
    </div>

    <!-- Main Content -->
    <template v-else-if="matchups.length > 0">
      <!-- Week Summary Stats -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">Week {{ selectedWeek }} Summary</h2>
          </div>
        </div>
        <div class="card-body">
          <!-- Points League Summary -->
          <div v-if="isPointsLeague" class="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-primary mb-2">
                {{ weekStats.highestScore.toFixed(1) }}
              </div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Highest Score</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.highestScorer }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-red-400 mb-2">
                {{ weekStats.lowestScore.toFixed(1) }}
              </div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Lowest Score</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.lowestScorer }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-green-400 mb-2">
                {{ weekStats.closestMargin.toFixed(1) }}
              </div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Closest Game</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.closestMatchup }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-cyan-400 mb-2">
                {{ weekStats.avgScore.toFixed(1) }}
              </div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">League Average</div>
              <div class="text-sm font-semibold text-dark-text">All Teams</div>
            </div>
          </div>

          <!-- Category League Summary -->
          <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-primary mb-2">
                {{ weekStats.mostCategoryWins }}
              </div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Most Cats Won</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.categoryLeader }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-green-400 mb-2">
                {{ weekStats.closestCategoryMatch }}
              </div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Closest Match</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.closestMatchup }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-yellow-400 mb-2">
                {{ weekStats.totalTies }}
              </div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Category Ties</div>
              <div class="text-sm font-semibold text-dark-text">This Week</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-cyan-400 mb-2">
                {{ categoryStats.length }}
              </div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Categories</div>
              <div class="text-sm font-semibold text-dark-text">Being Tracked</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Matchup Grid -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">⚔️</span>
            <h2 class="card-title">Week {{ selectedWeek }} Matchups</h2>
          </div>
          <p class="text-sm text-dark-textMuted mt-2">
            Click any matchup to see detailed analysis
          </p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Points League Cards -->
            <PointsMatchupCard
              v-if="isPointsLeague"
              v-for="matchup in matchups"
              :key="matchup.matchupId"
              :matchup="matchup"
              :is-selected="selectedMatchup?.matchupId === matchup.matchupId"
              :my-team-id="myTeamId"
              :header-label="`Matchup ${matchup.matchupId}`"
              @select="selectMatchup"
            />
            
            <!-- Category League Cards -->
            <CategoryMatchupCard
              v-else
              v-for="matchup in matchups"
              :key="matchup.matchupId"
              :matchup="matchup"
              :sport="sport"
              :is-selected="selectedMatchup?.matchupId === matchup.matchupId"
              :my-team-id="myTeamId"
              :header-label="`Matchup ${matchup.matchupId}`"
              :show-categories="true"
              @select="selectMatchup"
            />
          </div>
        </div>
      </div>

      <!-- Selected Matchup Analysis -->
      <div v-if="selectedMatchup" class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🔍</span>
            <h2 class="card-title">
              {{ selectedMatchup.team1.name }} vs {{ selectedMatchup.team2.name }}
            </h2>
          </div>
        </div>
        <div class="card-body space-y-6">
          <!-- Points League Analysis -->
          <template v-if="isPointsLeague">
            <!-- Score Comparison -->
            <div class="grid grid-cols-3 gap-4 p-4 bg-dark-border/20 rounded-xl">
              <div class="text-center">
                <div class="text-3xl font-bold text-primary">
                  {{ (selectedMatchup.team1Score || 0).toFixed(1) }}
                </div>
                <div class="text-sm text-dark-textMuted mt-1">{{ selectedMatchup.team1.name }}</div>
                <div v-if="selectedMatchup.team1Projected" class="text-xs text-dark-textMuted mt-1">
                  Proj: {{ selectedMatchup.team1Projected.toFixed(1) }}
                </div>
              </div>
              <div class="text-center flex flex-col items-center justify-center">
                <span class="text-lg text-dark-textMuted">vs</span>
                <div v-if="!selectedMatchup.isCompleted" class="mt-2">
                  <div class="text-xs text-dark-textMuted">Win Probability</div>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-sm font-semibold text-primary">{{ team1WinProb }}%</span>
                    <div class="w-16 h-1.5 bg-dark-border rounded-full overflow-hidden flex">
                      <div class="h-full bg-primary" :style="{ width: `${team1WinProb}%` }"></div>
                      <div class="h-full bg-blue-500" :style="{ width: `${100 - team1WinProb}%` }"></div>
                    </div>
                    <span class="text-sm font-semibold text-blue-400">{{ 100 - team1WinProb }}%</span>
                  </div>
                </div>
              </div>
              <div class="text-center">
                <div class="text-3xl font-bold text-blue-400">
                  {{ (selectedMatchup.team2Score || 0).toFixed(1) }}
                </div>
                <div class="text-sm text-dark-textMuted mt-1">{{ selectedMatchup.team2.name }}</div>
                <div v-if="selectedMatchup.team2Projected" class="text-xs text-dark-textMuted mt-1">
                  Proj: {{ selectedMatchup.team2Projected.toFixed(1) }}
                </div>
              </div>
            </div>

            <!-- Matchup Insight -->
            <div v-if="matchupInsight" class="p-4 bg-dark-border/10 border border-dark-border/30 rounded-xl">
              <div class="flex items-start gap-3">
                <span class="text-2xl">💡</span>
                <div>
                  <div class="font-semibold text-dark-text mb-1">Matchup Insight</div>
                  <p class="text-sm text-dark-textMuted">{{ matchupInsight }}</p>
                </div>
              </div>
            </div>
          </template>

          <!-- Category League Analysis -->
          <template v-else>
            <CategoryComparison 
              :matchup="selectedMatchup" 
              :sport="sport"
            />
          </template>
        </div>
      </div>

      <!-- Standings -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🏆</span>
            <h2 class="card-title">Current Standings</h2>
          </div>
        </div>
        <div class="card-body">
          <StandingsTable
            :standings="standings"
            :league-type="leagueType"
            :my-team-id="myTeamId"
            :playoff-teams="6"
            :show-streak="true"
            @select-team="onTeamSelect"
          />
        </div>
      </div>
    </template>

    <!-- No Data State -->
    <div v-else class="card p-12 text-center">
      <div class="text-6xl mb-4">{{ sportConfig.emoji }}</div>
      <h3 class="text-xl font-semibold text-dark-text mb-2">No Matchups Found</h3>
      <p class="text-dark-textMuted mb-4">
        Select a week to view matchups for your {{ sportConfig.name }} league.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { getSportConfig, getLeagueType, getCategoryStats } from '@/config/sports'
import type { UnifiedMatchup, UnifiedStandingsEntry, SportType, LeagueType, StatDefinition } from '@/config/sports'
import { normalizeMatchups, normalizeStandings, type AdapterOptions } from '@/services/adapters'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import PointsMatchupCard from '@/components/unified/PointsMatchupCard.vue'
import CategoryMatchupCard from '@/components/unified/CategoryMatchupCard.vue'
import CategoryComparison from '@/components/unified/CategoryComparison.vue'
import StandingsTable from '@/components/unified/StandingsTable.vue'

const leagueStore = useLeagueStore()

// State
const loading = ref(false)
const loadingMessage = ref('Loading matchups...')
const error = ref<string | null>(null)
const matchups = ref<UnifiedMatchup[]>([])
const standings = ref<UnifiedStandingsEntry[]>([])
const selectedMatchup = ref<UnifiedMatchup | null>(null)
const selectedSeason = ref('')
const selectedWeek = ref(1)

// Computed - League Info
const leagueId = computed(() => leagueStore.activeLeagueId)

const platform = computed((): 'sleeper' | 'yahoo' | 'espn' => {
  const id = leagueId.value || ''
  if (id.startsWith('espn_')) return 'espn'
  if (id.includes('.l.')) return 'yahoo'
  return 'sleeper'
})

const sport = computed((): SportType => {
  const league = leagueStore.savedLeagues.find(l => l.league_id === leagueId.value)
  return (league?.sport as SportType) || 'football'
})

const leagueType = computed((): LeagueType => {
  const league = leagueStore.savedLeagues.find(l => l.league_id === leagueId.value)
  return getLeagueType(league?.scoring_type)
})

const sportConfig = computed(() => getSportConfig(sport.value))
const isPointsLeague = computed(() => leagueType.value === 'points')
const isCategoryLeague = computed(() => leagueType.value === 'categories' || leagueType.value === 'roto')

const categoryStats = computed((): StatDefinition[] => {
  if (isPointsLeague.value) return []
  return getCategoryStats(sport.value)
})

const adapterOptions = computed((): AdapterOptions => ({
  sport: sport.value,
  platform: platform.value,
  leagueType: leagueType.value
}))

// My team ID (simplified - in production would come from user auth)
const myTeamId = computed((): string | undefined => {
  if (standings.value.length > 0) {
    // For demo, just return undefined - in real implementation would match to user
    return undefined
  }
  return undefined
})

// Available seasons and weeks
const availableSeasons = computed(() => {
  const seasons = leagueStore.historicalSeasons?.map(s => s.season) || []
  if (seasons.length === 0) {
    const league = leagueStore.savedLeagues.find(l => l.league_id === leagueId.value)
    if (league?.season) return [league.season]
  }
  return seasons
})

const availableWeeks = computed(() => {
  const config = sportConfig.value
  const weeks: number[] = []
  const maxWeek = config.seasonConfig.regularSeasonWeeks + config.seasonConfig.playoffWeeks
  for (let i = 1; i <= maxWeek; i++) {
    weeks.push(i)
  }
  return weeks
})

// Week stats (Points League)
const weekStats = computed(() => {
  if (isPointsLeague.value) {
    return calculatePointsWeekStats()
  } else {
    return calculateCategoryWeekStats()
  }
})

function calculatePointsWeekStats() {
  let highestScore = 0
  let highestScorer = ''
  let lowestScore = Infinity
  let lowestScorer = ''
  let closestMargin = Infinity
  let closestMatchup = ''
  let totalScore = 0
  let teamCount = 0

  for (const m of matchups.value) {
    const score1 = m.team1Score || 0
    const score2 = m.team2Score || 0
    
    if (score1 > highestScore) {
      highestScore = score1
      highestScorer = m.team1.name
    }
    if (score2 > highestScore) {
      highestScore = score2
      highestScorer = m.team2.name
    }
    
    if (score1 > 0 && score1 < lowestScore) {
      lowestScore = score1
      lowestScorer = m.team1.name
    }
    if (score2 > 0 && score2 < lowestScore) {
      lowestScore = score2
      lowestScorer = m.team2.name
    }
    
    const margin = Math.abs(score1 - score2)
    if (margin < closestMargin && (score1 > 0 || score2 > 0)) {
      closestMargin = margin
      closestMatchup = `${m.team1.name} vs ${m.team2.name}`
    }
    
    totalScore += score1 + score2
    teamCount += 2
  }

  return {
    highestScore,
    highestScorer,
    lowestScore: lowestScore === Infinity ? 0 : lowestScore,
    lowestScorer,
    closestMargin: closestMargin === Infinity ? 0 : closestMargin,
    closestMatchup,
    avgScore: teamCount > 0 ? totalScore / teamCount : 0
  }
}

function calculateCategoryWeekStats() {
  let mostCategoryWins = 0
  let categoryLeader = ''
  let closestCategoryMatch = ''
  let closestDiff = Infinity
  let totalTies = 0

  for (const m of matchups.value) {
    const t1Wins = m.team1Wins || 0
    const t2Wins = m.team2Wins || 0
    const ties = m.ties || 0
    
    if (t1Wins > mostCategoryWins) {
      mostCategoryWins = t1Wins
      categoryLeader = m.team1.name
    }
    if (t2Wins > mostCategoryWins) {
      mostCategoryWins = t2Wins
      categoryLeader = m.team2.name
    }
    
    const diff = Math.abs(t1Wins - t2Wins)
    if (diff < closestDiff) {
      closestDiff = diff
      closestCategoryMatch = `${t1Wins}-${t2Wins}${ties ? `-${ties}` : ''}`
      // closestMatchup will be set separately
    }
    
    totalTies += ties
  }

  // Find closest matchup teams
  let closestMatchup = ''
  for (const m of matchups.value) {
    const diff = Math.abs((m.team1Wins || 0) - (m.team2Wins || 0))
    if (diff === closestDiff) {
      closestMatchup = `${m.team1.name} vs ${m.team2.name}`
      break
    }
  }

  return {
    mostCategoryWins,
    categoryLeader,
    closestCategoryMatch,
    closestMatchup,
    totalTies
  }
}

// Win probability (simple calculation)
const team1WinProb = computed(() => {
  if (!selectedMatchup.value) return 50
  
  const proj1 = selectedMatchup.value.team1Projected || selectedMatchup.value.team1Score || 0
  const proj2 = selectedMatchup.value.team2Projected || selectedMatchup.value.team2Score || 0
  
  if (proj1 + proj2 === 0) return 50
  return Math.round((proj1 / (proj1 + proj2)) * 100)
})

// Matchup insight
const matchupInsight = computed(() => {
  if (!selectedMatchup.value) return ''
  
  const m = selectedMatchup.value
  const score1 = m.team1Score || 0
  const score2 = m.team2Score || 0
  const proj1 = m.team1Projected || score1
  const proj2 = m.team2Projected || score2
  
  if (m.isCompleted) {
    const winner = score1 > score2 ? m.team1.name : m.team2.name
    const margin = Math.abs(score1 - score2)
    if (margin < 5) {
      return `A nail-biter! ${winner} squeaked out a win by just ${margin.toFixed(1)} points.`
    } else if (margin > 50) {
      return `Dominant performance by ${winner}, winning by ${margin.toFixed(1)} points.`
    }
    return `${winner} secured the victory with a ${margin.toFixed(1)} point margin.`
  }
  
  if (proj1 > proj2) {
    const diff = proj1 - proj2
    if (diff > 20) {
      return `${m.team1.name} is heavily favored with a ${diff.toFixed(1)} point projected advantage.`
    }
    return `${m.team1.name} has a slight edge in projections, but anything can happen!`
  } else if (proj2 > proj1) {
    const diff = proj2 - proj1
    if (diff > 20) {
      return `${m.team2.name} is heavily favored with a ${diff.toFixed(1)} point projected advantage.`
    }
    return `${m.team2.name} has a slight edge in projections, but anything can happen!`
  }
  
  return `This matchup is projected to be extremely close - could come down to the wire!`
})

// Methods
function selectMatchup(matchup: UnifiedMatchup) {
  selectedMatchup.value = matchup
}

function onTeamSelect(entry: UnifiedStandingsEntry) {
  // Find matchup containing this team
  const matchup = matchups.value.find(m => 
    m.team1.teamId === entry.team.teamId || 
    m.team2.teamId === entry.team.teamId
  )
  if (matchup) {
    selectedMatchup.value = matchup
  }
}

async function loadWeekData() {
  if (!leagueId.value || !selectedWeek.value) return
  
  loading.value = true
  loadingMessage.value = `Loading Week ${selectedWeek.value} matchups...`
  error.value = null
  
  try {
    const rawData = await fetchRawData()
    
    if (rawData) {
      matchups.value = normalizeMatchups(rawData, adapterOptions.value, selectedWeek.value)
      standings.value = normalizeStandings(rawData, adapterOptions.value)
      
      // Auto-select first matchup
      if (matchups.value.length > 0 && !selectedMatchup.value) {
        selectedMatchup.value = matchups.value[0]
      }
    }
  } catch (e) {
    console.error('[UnifiedMatchupsView] Error:', e)
    error.value = e instanceof Error ? e.message : 'Failed to load matchups'
  } finally {
    loading.value = false
  }
}

async function fetchRawData(): Promise<any> {
  // Get data from league store based on platform
  switch (platform.value) {
    case 'sleeper':
      return {
        matchups: leagueStore.leagueMatchups || [],
        rosters: leagueStore.leagueRosters || [],
        users: leagueStore.leagueUsers || {},
        leagueUsers: leagueStore.leagueUsersArray || []
      }
    
    case 'yahoo':
      return {
        matchups: leagueStore.yahooMatchups || [],
        teams: leagueStore.yahooStandings || []
      }
    
    case 'espn':
      return {
        schedule: leagueStore.espnSchedule || [],
        teams: leagueStore.espnTeams || [],
        members: leagueStore.espnMembers || []
      }
    
    default:
      return null
  }
}

async function refreshData() {
  selectedMatchup.value = null
  await loadWeekData()
}

function onSeasonChange() {
  selectedWeek.value = 1
  loadWeekData()
}

// Initialize
onMounted(async () => {
  // Set initial season
  if (availableSeasons.value.length > 0) {
    selectedSeason.value = availableSeasons.value[0]
  }
  
  // Set initial week (current week if available)
  const currentWeek = leagueStore.currentLeague?.settings?.leg || 1
  selectedWeek.value = currentWeek
  
  await loadWeekData()
})

// Watch for league changes
watch(leagueId, () => {
  if (availableSeasons.value.length > 0) {
    selectedSeason.value = availableSeasons.value[0]
  }
  loadWeekData()
})
</script>
