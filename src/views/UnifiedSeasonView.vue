<template>
  <div class="space-y-6">
    <!-- League Header -->
    <div class="card overflow-hidden">
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
              <div class="text-2xl font-bold text-dark-text truncate" :title="leaderName">{{ leaderName || '-' }}</div>
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

      <!-- League Leaders Section -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🏅</span>
            <h2 class="card-title">League Leaders</h2>
          </div>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Hottest Team -->
            <div class="p-4 bg-dark-border/20 rounded-xl">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xl">🔥</span>
                <span class="text-sm font-medium text-dark-textMuted">Hottest</span>
              </div>
              <div class="text-lg font-bold text-dark-text truncate" :title="hottestTeam?.name">
                {{ hottestTeam?.name || '-' }}
              </div>
              <div class="text-xs text-green-400">
                {{ hottestTeam?.value || '-' }}
              </div>
            </div>

            <!-- Coldest Team -->
            <div class="p-4 bg-dark-border/20 rounded-xl">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xl">🥶</span>
                <span class="text-sm font-medium text-dark-textMuted">Coldest</span>
              </div>
              <div class="text-lg font-bold text-dark-text truncate" :title="coldestTeam?.name">
                {{ coldestTeam?.name || '-' }}
              </div>
              <div class="text-xs text-red-400">
                {{ coldestTeam?.value || '-' }}
              </div>
            </div>

            <!-- Most Moves -->
            <div class="p-4 bg-dark-border/20 rounded-xl">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xl">🔄</span>
                <span class="text-sm font-medium text-dark-textMuted">Most Moves</span>
              </div>
              <div class="text-lg font-bold text-dark-text truncate" :title="mostMoves?.name">
                {{ mostMoves?.name || '-' }}
              </div>
              <div class="text-xs text-blue-400">
                {{ mostMoves?.transactions !== undefined ? `${mostMoves.transactions} transactions` : '-' }}
              </div>
            </div>

            <!-- Fewest Moves -->
            <div class="p-4 bg-dark-border/20 rounded-xl">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xl">🪨</span>
                <span class="text-sm font-medium text-dark-textMuted">Fewest Moves</span>
              </div>
              <div class="text-lg font-bold text-dark-text truncate" :title="fewestMoves?.name">
                {{ fewestMoves?.name || '-' }}
              </div>
              <div class="text-xs text-purple-400">
                {{ fewestMoves?.transactions !== undefined ? `${fewestMoves.transactions} transactions` : '-' }}
              </div>
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
              <div v-if="matchups.length === 0" class="text-center py-6 text-dark-textMuted">
                No matchups available for this week
              </div>
              <template v-else-if="isPointsLeague">
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

          <!-- League Highlights -->
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
                    <div class="text-sm font-medium text-dark-text">{{ topScorer.name }} on fire this week</div>
                    <div class="text-xs text-dark-textMuted">
                      {{ isPointsLeague ? `${topScorer.points.toFixed(1)} points` : `${topScorer.categoryWins} categories won` }}
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
const teamsWithStats = ref<any[]>([])

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
  if (isPointsLeague.value) {
    return `${leader.wins}-${leader.losses}${leader.ties ? `-${leader.ties}` : ''} (${(leader.pointsFor || 0).toFixed(1)} PF)`
  }
  return `${leader.wins}-${leader.losses}${leader.ties ? `-${leader.ties}` : ''}`
})

const avgPointsFor = computed(() => {
  if (standings.value.length === 0) return 0
  const total = standings.value.reduce((sum, s) => sum + (s.pointsFor || 0), 0)
  const weeks = Math.max(1, currentWeek.value)
  return total / standings.value.length / weeks
})

const avgCategoryWins = computed(() => {
  if (standings.value.length === 0) return 0
  const total = standings.value.reduce((sum, s) => {
    if (s.categoryWins !== undefined) return sum + s.categoryWins
    return sum + (s.wins * 5)
  }, 0)
  const weeks = Math.max(1, currentWeek.value)
  return total / standings.value.length / weeks
})

// Hottest Team - based on points for points leagues, wins for category
const hottestTeam = computed(() => {
  if (teamsWithStats.value.length === 0 && standings.value.length === 0) return null
  
  const teams = teamsWithStats.value.length > 0 ? teamsWithStats.value : standings.value.map(s => ({
    name: s.team.name,
    points_for: s.pointsFor || 0,
    wins: s.wins || 0,
    streak: s.streak
  }))
  
  if (teams.length === 0) return null
  
  if (isPointsLeague.value) {
    const sorted = [...teams].sort((a, b) => (b.points_for || 0) - (a.points_for || 0))
    const top = sorted[0]
    return {
      name: top.name,
      value: `${(top.points_for || 0).toFixed(1)} total pts`
    }
  } else {
    const sorted = [...teams].sort((a, b) => (b.wins || 0) - (a.wins || 0))
    const top = sorted[0]
    return {
      name: top.name,
      value: top.streak || `${top.wins} matchup wins`
    }
  }
})

// Coldest Team
const coldestTeam = computed(() => {
  if (teamsWithStats.value.length === 0 && standings.value.length === 0) return null
  
  const teams = teamsWithStats.value.length > 0 ? teamsWithStats.value : standings.value.map(s => ({
    name: s.team.name,
    points_for: s.pointsFor || 0,
    losses: s.losses || 0,
    streak: s.streak
  }))
  
  if (teams.length === 0) return null
  
  if (isPointsLeague.value) {
    const sorted = [...teams].sort((a, b) => (a.points_for || 0) - (b.points_for || 0))
    const bottom = sorted[0]
    return {
      name: bottom.name,
      value: `${(bottom.points_for || 0).toFixed(1)} total pts`
    }
  } else {
    const sorted = [...teams].sort((a, b) => (b.losses || 0) - (a.losses || 0))
    const bottom = sorted[0]
    return {
      name: bottom.name,
      value: bottom.streak || `${bottom.losses} matchup losses`
    }
  }
})

// Most Moves
const mostMoves = computed(() => {
  if (teamsWithStats.value.length === 0) return null
  
  const teamsWithTransactions = teamsWithStats.value.filter(t => 
    (t.transactions !== undefined && t.transactions > 0) || 
    (t.transactionCounter !== undefined && t.transactionCounter > 0)
  )
  
  if (teamsWithTransactions.length === 0) return null
  
  const sorted = [...teamsWithTransactions].sort((a, b) => 
    (b.transactions || b.transactionCounter || 0) - (a.transactions || a.transactionCounter || 0)
  )
  
  const top = sorted[0]
  return {
    name: top.name,
    transactions: top.transactions || top.transactionCounter || 0
  }
})

// Fewest Moves  
const fewestMoves = computed(() => {
  if (teamsWithStats.value.length === 0) return null
  
  const teamsWithTransactions = teamsWithStats.value.filter(t => 
    t.transactions !== undefined || t.transactionCounter !== undefined
  )
  
  if (teamsWithTransactions.length === 0) return null
  
  const sorted = [...teamsWithTransactions].sort((a, b) => 
    (a.transactions || a.transactionCounter || 0) - (b.transactions || b.transactionCounter || 0)
  )
  
  const bottom = sorted[0]
  return {
    name: bottom.name,
    transactions: bottom.transactions || bottom.transactionCounter || 0
  }
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
      const t1Wins = m.team1Wins || 0
      const t2Wins = m.team2Wins || 0
      const margin = Math.abs(t1Wins - t2Wins)
      if (margin < closest.margin && (t1Wins + t2Wins) > 0) {
        closest = { 
          teams: `${m.team1.name} vs ${m.team2.name} (${t1Wins}-${t2Wins})`, 
          margin 
        }
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
      console.log('[UnifiedSeasonView] Raw data:', {
        platform: platform.value,
        leagueType: leagueType.value,
        isPointsLeague: isPointsLeague.value,
        matchupsCount: rawData.matchups?.length,
        teamsCount: rawData.teams?.length,
        preTransformed: rawData.preTransformed
      })
      
      // Store raw team data for transaction counts
      teamsWithStats.value = rawData.teams || rawData.rosters || []
      
      if (rawData.preTransformed) {
        matchups.value = convertPreTransformedMatchups(rawData.matchups, currentWeek.value, rawData.isCategoryLeague)
        standings.value = convertPreTransformedStandings(rawData.teams)
      } else {
        matchups.value = normalizeMatchups(rawData, adapterOptions.value, currentWeek.value)
        standings.value = normalizeStandings(rawData, adapterOptions.value)
      }
      
      console.log('[UnifiedSeasonView] Processed:', {
        matchups: matchups.value.length,
        standings: standings.value.length,
        sampleMatchup: matchups.value[0]
      })
    }
  } catch (e) {
    console.error('[UnifiedSeasonView] Error:', e)
  } finally {
    loading.value = false
  }
}

function convertPreTransformedMatchups(matchupsData: any[], week: number, forceCategory?: boolean): UnifiedMatchup[] {
  if (!matchupsData || matchupsData.length === 0) return []
  
  return matchupsData.map((m, idx) => {
    const team1 = m.team1 || m.teams?.[0]
    const team2 = m.team2 || m.teams?.[1]
    
    if (!team1 || !team2) return null
    
    const unified: UnifiedMatchup = {
      matchupId: String(m.matchup_id || idx),
      week,
      team1: {
        teamId: team1?.team_id?.toString() || String(idx * 2),
        name: team1?.name || `Team ${idx * 2 + 1}`,
        avatar: team1?.logo_url,
        record: {
          wins: team1?.wins || 0,
          losses: team1?.losses || 0,
          ties: team1?.ties || 0
        }
      },
      team2: {
        teamId: team2?.team_id?.toString() || String(idx * 2 + 1),
        name: team2?.name || `Team ${idx * 2 + 2}`,
        avatar: team2?.logo_url,
        record: {
          wins: team2?.wins || 0,
          losses: team2?.losses || 0,
          ties: team2?.ties || 0
        }
      },
      isCompleted: false
    }
    
    const isCat = forceCategory || !isPointsLeague.value || 
                  m.is_category_league || 
                  m.team1_wins !== undefined || 
                  m.home_category_wins !== undefined
    
    if (isCat) {
      unified.team1Wins = m.home_category_wins ?? m.team1_wins ?? team1?.category_wins ?? team1?.win_count ?? 0
      unified.team2Wins = m.away_category_wins ?? m.team2_wins ?? team2?.category_wins ?? team2?.win_count ?? 0
      unified.ties = m.ties ?? 0
    } else {
      unified.team1Score = team1?.points ?? m.team1_points ?? 0
      unified.team2Score = team2?.points ?? m.team2_points ?? 0
    }
    
    return unified
  }).filter(Boolean) as UnifiedMatchup[]
}

function convertPreTransformedStandings(teamsData: any[]): UnifiedStandingsEntry[] {
  if (!teamsData || teamsData.length === 0) return []
  
  return teamsData.map((team, idx) => {
    const wins = team.wins || 0
    const losses = team.losses || 0
    const ties = team.ties || 0
    const totalGames = wins + losses + ties
    
    return {
      team: {
        teamId: team.team_id?.toString() || String(idx),
        name: team.name || `Team ${idx + 1}`,
        avatar: team.logo_url,
        record: { wins, losses, ties }
      },
      rank: team.rank || idx + 1,
      wins,
      losses,
      ties,
      pointsFor: team.points_for || 0,
      pointsAgainst: team.points_against || 0,
      winPercentage: totalGames > 0 ? wins / totalGames : 0,
      streak: team.streak,
      categoryWins: team.category_wins,
      categoryLosses: team.category_losses
    }
  }).sort((a, b) => a.rank - b.rank)
}

async function fetchRawData(): Promise<any> {
  const isCat = !isPointsLeague.value
  
  switch (platform.value) {
    case 'sleeper':
      return {
        matchups: leagueStore.leagueMatchups || [],
        rosters: leagueStore.leagueRosters || [],
        users: leagueStore.leagueUsers || {},
        leagueUsers: leagueStore.leagueUsersArray || []
      }
    
    case 'yahoo':
      const yahooMatchups = leagueStore.yahooMatchups || []
      const yahooTeams = leagueStore.yahooStandings || leagueStore.yahooTeams || []
      
      const hasCategoryData = yahooMatchups.some(m => 
        m.is_category_league || m.team1_wins !== undefined || m.teams?.[0]?.win_count !== undefined
      )
      
      if (hasCategoryData || isCat) {
        return {
          preTransformed: true,
          isCategoryLeague: true,
          matchups: yahooMatchups,
          teams: yahooTeams
        }
      }
      
      return { matchups: yahooMatchups, teams: yahooTeams }
    
    case 'espn':
      return {
        preTransformed: true,
        isCategoryLeague: isCat,
        matchups: leagueStore.yahooMatchups || [],
        teams: leagueStore.yahooTeams || []
      }
    
    default:
      return null
  }
}

onMounted(() => loadData())
watch(leagueId, () => loadData())
watch(() => leagueStore.yahooMatchups, () => {
  if (platform.value !== 'sleeper') loadData()
}, { deep: true })
</script>
