<template>
  <div class="space-y-6">
    <!-- League Header -->
    <div class="card overflow-hidden">
      <!-- Gradient Header with Sport Color -->
      <div 
        class="h-32 relative"
        :style="{ background: `linear-gradient(135deg, ${sportConfig.color}40, ${sportConfig.color}10)` }"
      >
        <div class="absolute inset-0 bg-gradient-to-r from-dark-bg/80 to-transparent"></div>
        <div class="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <span class="text-4xl">{{ sportConfig.emoji }}</span>
              <div>
                <h1 class="text-2xl font-bold text-dark-text">{{ leagueName }}</h1>
                <p class="text-dark-textMuted">
                  {{ season }} Season • {{ leagueTypeLabel }} • {{ numTeams }} Teams
                </p>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span 
              class="px-3 py-1 rounded-full text-sm font-medium"
              :class="statusClass"
            >
              {{ statusLabel }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <LoadingSpinner v-if="loading" size="lg" :message="loadingMessage" />

    <!-- Main Content -->
    <template v-else>
      <!-- Quick Stats Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <span class="text-lg">📅</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-dark-text">Week {{ currentWeek }}</div>
              <div class="text-xs text-dark-textMuted">Current Week</div>
            </div>
          </div>
        </div>

        <div class="card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <span class="text-lg">🏆</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-dark-text">{{ leaderName }}</div>
              <div class="text-xs text-dark-textMuted">League Leader</div>
            </div>
          </div>
        </div>

        <div class="card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <span class="text-lg">{{ isPointsLeague ? '📊' : '📈' }}</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-dark-text">
                {{ isPointsLeague ? avgPointsFor.toFixed(1) : avgCategoryWins.toFixed(1) }}
              </div>
              <div class="text-xs text-dark-textMuted">
                {{ isPointsLeague ? 'Avg Points/Week' : 'Avg Cat Wins/Week' }}
              </div>
            </div>
          </div>
        </div>

        <div class="card p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <span class="text-lg">⚔️</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-dark-text">{{ matchups.length }}</div>
              <div class="text-xs text-dark-textMuted">Matchups This Week</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Two Column Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column - Standings (2 cols) -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Standings -->
          <div class="card">
            <div class="card-header flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">🏆</span>
                <h2 class="card-title">Standings</h2>
              </div>
              <router-link to="/unified/matchups" class="text-sm text-primary hover:underline">
                View Matchups →
              </router-link>
            </div>
            <div class="card-body">
              <StandingsTable
                :standings="standings"
                :league-type="leagueType"
                :my-team-id="myTeamId"
                :playoff-teams="playoffTeams"
                :show-streak="true"
              />
            </div>
          </div>
        </div>

        <!-- Right Column - This Week -->
        <div class="space-y-6">
          <!-- This Week's Matchups -->
          <div class="card">
            <div class="card-header">
              <div class="flex items-center gap-2">
                <span class="text-2xl">⚔️</span>
                <h2 class="card-title">Week {{ currentWeek }} Matchups</h2>
              </div>
            </div>
            <div class="card-body space-y-3">
              <template v-if="isPointsLeague">
                <PointsMatchupCard
                  v-for="matchup in matchups.slice(0, 4)"
                  :key="matchup.matchupId"
                  :matchup="matchup"
                  :my-team-id="myTeamId"
                  @select="goToMatchup"
                />
              </template>
              <template v-else>
                <CategoryMatchupCard
                  v-for="matchup in matchups.slice(0, 4)"
                  :key="matchup.matchupId"
                  :matchup="matchup"
                  :sport="sport"
                  :my-team-id="myTeamId"
                  @select="goToMatchup"
                />
              </template>
              
              <router-link 
                v-if="matchups.length > 4"
                to="/unified/matchups" 
                class="block text-center py-3 text-sm text-primary hover:underline"
              >
                View All {{ matchups.length }} Matchups →
              </router-link>
            </div>
          </div>

          <!-- League Activity / Recent Results -->
          <div class="card">
            <div class="card-header">
              <div class="flex items-center gap-2">
                <span class="text-2xl">📰</span>
                <h2 class="card-title">League Highlights</h2>
              </div>
            </div>
            <div class="card-body">
              <div class="space-y-3">
                <div v-if="leaderName" class="flex items-start gap-3 p-3 bg-dark-border/20 rounded-lg">
                  <span class="text-lg">👑</span>
                  <div>
                    <div class="text-sm font-medium text-dark-text">{{ leaderName }} leads the league</div>
                    <div class="text-xs text-dark-textMuted">{{ leaderRecord }}</div>
                  </div>
                </div>
                
                <div v-if="topScorer" class="flex items-start gap-3 p-3 bg-dark-border/20 rounded-lg">
                  <span class="text-lg">🔥</span>
                  <div>
                    <div class="text-sm font-medium text-dark-text">{{ topScorer.name }} on fire</div>
                    <div class="text-xs text-dark-textMuted">
                      {{ isPointsLeague ? `${topScorer.points.toFixed(1)} points this week` : `${topScorer.categoryWins} categories won` }}
                    </div>
                  </div>
                </div>
                
                <div v-if="closestMatchup" class="flex items-start gap-3 p-3 bg-dark-border/20 rounded-lg">
                  <span class="text-lg">⚡</span>
                  <div>
                    <div class="text-sm font-medium text-dark-text">Closest matchup</div>
                    <div class="text-xs text-dark-textMuted">{{ closestMatchup }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useLeagueStore } from '@/stores/league'
import { getSportConfig, getLeagueType } from '@/config/sports'
import type { UnifiedMatchup, UnifiedStandingsEntry, SportType, LeagueType } from '@/config/sports'
import { normalizeMatchups, normalizeStandings, type AdapterOptions } from '@/services/adapters'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import StandingsTable from '@/components/unified/StandingsTable.vue'
import PointsMatchupCard from '@/components/unified/PointsMatchupCard.vue'
import CategoryMatchupCard from '@/components/unified/CategoryMatchupCard.vue'

const router = useRouter()
const leagueStore = useLeagueStore()

// State
const loading = ref(false)
const loadingMessage = ref('Loading league data...')
const matchups = ref<UnifiedMatchup[]>([])
const standings = ref<UnifiedStandingsEntry[]>([])

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

const leagueName = computed(() => {
  const league = leagueStore.savedLeagues.find(l => l.league_id === leagueId.value)
  return league?.league_name || leagueStore.currentLeague?.name || 'My League'
})

const season = computed(() => {
  const league = leagueStore.savedLeagues.find(l => l.league_id === leagueId.value)
  return league?.season || new Date().getFullYear().toString()
})

const numTeams = computed(() => {
  const league = leagueStore.savedLeagues.find(l => l.league_id === leagueId.value)
  return league?.num_teams || standings.value.length || 12
})

const leagueTypeLabel = computed(() => {
  switch (leagueType.value) {
    case 'categories': return 'H2H Categories'
    case 'roto': return 'Rotisserie'
    default: return 'H2H Points'
  }
})

const statusLabel = computed(() => {
  const league = leagueStore.currentLeague
  if (!league) return 'Active'
  if (league.status === 'complete') return 'Complete'
  return 'In Season'
})

const statusClass = computed(() => {
  switch (statusLabel.value) {
    case 'Complete': return 'bg-dark-border/50 text-dark-textMuted'
    case 'In Season': return 'bg-green-500/20 text-green-400'
    default: return 'bg-blue-500/20 text-blue-400'
  }
})

const currentWeek = computed(() => {
  return leagueStore.currentLeague?.settings?.leg || 1
})

const playoffTeams = computed(() => 6)

const myTeamId = computed((): string | undefined => undefined)

const adapterOptions = computed((): AdapterOptions => ({
  sport: sport.value,
  platform: platform.value,
  leagueType: leagueType.value
}))

// Derived stats
const leaderName = computed(() => {
  if (standings.value.length === 0) return ''
  return standings.value[0]?.team.name || ''
})

const leaderRecord = computed(() => {
  if (standings.value.length === 0) return ''
  const leader = standings.value[0]
  return `${leader.wins}-${leader.losses}${leader.ties ? `-${leader.ties}` : ''}`
})

const avgPointsFor = computed(() => {
  if (standings.value.length === 0) return 0
  const total = standings.value.reduce((sum, s) => sum + (s.pointsFor || 0), 0)
  return total / standings.value.length / Math.max(1, currentWeek.value)
})

const avgCategoryWins = computed(() => {
  if (standings.value.length === 0) return 0
  const total = standings.value.reduce((sum, s) => sum + (s.categoryWins || 0), 0)
  return total / standings.value.length / Math.max(1, currentWeek.value)
})

const topScorer = computed(() => {
  if (matchups.value.length === 0) return null
  
  let top = { name: '', points: 0, categoryWins: 0 }
  
  for (const m of matchups.value) {
    if (isPointsLeague.value) {
      if ((m.team1Score || 0) > top.points) {
        top = { name: m.team1.name, points: m.team1Score || 0, categoryWins: 0 }
      }
      if ((m.team2Score || 0) > top.points) {
        top = { name: m.team2.name, points: m.team2Score || 0, categoryWins: 0 }
      }
    } else {
      if ((m.team1Wins || 0) > top.categoryWins) {
        top = { name: m.team1.name, points: 0, categoryWins: m.team1Wins || 0 }
      }
      if ((m.team2Wins || 0) > top.categoryWins) {
        top = { name: m.team2.name, points: 0, categoryWins: m.team2Wins || 0 }
      }
    }
  }
  
  return top.name ? top : null
})

const closestMatchup = computed(() => {
  if (matchups.value.length === 0) return ''
  
  let closest = { teams: '', margin: Infinity }
  
  for (const m of matchups.value) {
    if (isPointsLeague.value) {
      const margin = Math.abs((m.team1Score || 0) - (m.team2Score || 0))
      if (margin < closest.margin && margin > 0) {
        closest = { teams: `${m.team1.name} vs ${m.team2.name}`, margin }
      }
    } else {
      const margin = Math.abs((m.team1Wins || 0) - (m.team2Wins || 0))
      if (margin < closest.margin) {
        closest = { teams: `${m.team1.name} vs ${m.team2.name} (${m.team1Wins}-${m.team2Wins})`, margin }
      }
    }
  }
  
  return closest.teams
})

// Methods
function goToMatchup(matchup: UnifiedMatchup) {
  router.push('/unified/matchups')
}

async function loadData() {
  if (!leagueId.value) return
  
  loading.value = true
  
  try {
    const rawData = await fetchRawData()
    
    if (rawData) {
      matchups.value = normalizeMatchups(rawData, adapterOptions.value, currentWeek.value)
      standings.value = normalizeStandings(rawData, adapterOptions.value)
    }
  } catch (e) {
    console.error('[UnifiedSeasonView] Error:', e)
  } finally {
    loading.value = false
  }
}

async function fetchRawData(): Promise<any> {
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

// Initialize
onMounted(() => {
  loadData()
})

// Watch for league changes
watch(leagueId, () => {
  loadData()
})
</script>
