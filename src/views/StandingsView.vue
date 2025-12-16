<template>
  <div class="space-y-6">
    <!-- Header with Season Selector -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Standings</h1>
        <p class="text-base text-gray-600 dark:text-dark-textMuted">
          {{ selectedSeason ? `${selectedSeason} Season` : 'Current Season' }}
        </p>
      </div>
      <select
        v-model="selectedSeason"
        @change="loadSeasonData"
        class="select"
      >
        <option v-for="season in leagueStore.historicalSeasons" :key="season.season" :value="season.season">
          {{ season.season }} Season
        </option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
    </div>

    <template v-else-if="seasonData">
      <!-- Row 1: Standings Table (left) and News/Stats (right) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- LEFT: Standings Table (2/3 width) -->
        <div class="lg:col-span-2">
          <div class="card h-full">
            <div class="card-header flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-2xl">🏆</span>
                <h2 class="card-title">League Standings</h2>
              </div>
              <div class="flex items-center gap-3">
                <button 
                  @click="downloadStandingsImage"
                  :disabled="isGeneratingImage"
                  class="px-4 py-2 bg-primary hover:bg-yellow-600 text-dark-bg font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                  {{ isGeneratingImage ? 'Generating...' : 'Share Standings' }}
                </button>
                <div v-if="hasDivisions" class="flex items-center gap-3">
                  <span class="text-sm text-gray-600 dark:text-gray-400 font-medium">Divisions</span>
                  <button
                    @click="showDivisions = !showDivisions"
                    class="relative inline-flex h-7 w-12 items-center rounded-full transition-colors shadow-inner"
                    :class="showDivisions ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'"
                  >
                    <span
                      class="inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform"
                      :class="showDivisions ? 'translate-x-6' : 'translate-x-1'"
                    />
                  </button>
                </div>
              </div>
            </div>
            <div class="card-body overflow-x-auto scrollbar-thin">
              <template v-if="showDivisions && hasDivisions">
                <div v-for="(teams, divisionName) in teamsByDivision" :key="divisionName" class="mb-10 last:mb-0">
                  <div class="flex items-center gap-3 mb-5 pb-3 border-b-2 border-primary/30">
                    <span class="text-primary text-xl">●</span>
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ divisionName }}</h3>
                  </div>
                  <StandingsTable :teams="teams" :show-highlights="true" />
                </div>
              </template>
              <template v-else>
                <StandingsTable :teams="seasonData.teams" :show-highlights="true" />
              </template>
            </div>
          </div>
        </div>

        <!-- RIGHT: League News & Quick Stats (1/3 width, same height) -->
        <div class="flex flex-col gap-6 h-full">
          <!-- League News Card (flex-1 to take up space) -->
          <div class="card flex-1">
            <div class="card-header">
              <div class="flex items-center gap-2">
                <span class="text-2xl">📰</span>
                <h2 class="card-title">League News</h2>
              </div>
            </div>
            <div class="card-body">
              <div v-if="leagueNews" class="space-y-4">
                <div v-for="(item, idx) in leagueNews" :key="idx" class="border-l-4 border-primary pl-4 py-3 bg-primary/5 rounded-r-lg">
                  <p class="text-sm text-dark-text leading-relaxed">{{ item }}</p>
                </div>
              </div>
              <div v-else class="text-center py-12">
                <div class="text-gray-300 dark:text-gray-600 mb-4">
                  <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p class="text-dark-textMuted text-sm mb-4">
                  AI-generated league insights
                </p>
                <button @click="generateLeagueNews" class="text-primary hover:text-yellow-600 text-sm font-semibold transition-colors">
                  Generate News →
                </button>
              </div>
            </div>
          </div>

          <!-- Quick Stats Card (flex-1 to take up space) -->
          <div class="card flex-1">
            <div class="card-header">
              <div class="flex items-center gap-2">
                <span class="text-2xl">📊</span>
                <h2 class="card-title">Quick Stats</h2>
              </div>
            </div>
            <div class="card-body">
              <div class="space-y-4">
              <!-- Most Points -->
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img
                    v-if="mostPointsManager"
                    :src="mostPointsManager.avatar_url"
                    :alt="mostPointsManager.team_name"
                    class="w-full h-full object-cover"
                    @error="handleImageError"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide mb-0.5">Most Points</div>
                  <div class="font-semibold text-dark-text truncate">{{ mostPointsManager?.team_name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-primary">
                  {{ mostPointsManager ? `${mostPointsManager.points_for.toFixed(1)}` : '-' }}
                </div>
              </div>

              <!-- Best All-Play -->
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img
                    v-if="bestAllPlayTeam"
                    :src="bestAllPlayTeam.avatar_url"
                    :alt="bestAllPlayTeam.team_name"
                    class="w-full h-full object-cover"
                    @error="handleImageError"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide mb-0.5">Best All-Play</div>
                  <div class="font-semibold text-dark-text truncate">{{ bestAllPlayTeam?.team_name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-green-400">
                  {{ bestAllPlayTeam ? `${bestAllPlayTeam.allPlayWins}-${bestAllPlayTeam.allPlayLosses}` : '-' }}
                </div>
              </div>

              <!-- Hottest Team -->
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img
                    v-if="hottestTeam"
                    :src="hottestTeam.avatar_url"
                    :alt="hottestTeam.team_name"
                    class="w-full h-full object-cover"
                    @error="handleImageError"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide mb-0.5">Hottest Team</div>
                  <div class="font-semibold text-dark-text truncate">{{ hottestTeam?.team_name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-orange-400">
                  {{ hottestTeam ? `${hottestTeam.last3Avg.toFixed(1)}` : '-' }}
                </div>
              </div>

              <!-- Most Active -->
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img
                    v-if="mostActiveManager"
                    :src="mostActiveManager.avatar_url"
                    :alt="mostActiveManager.team_name"
                    class="w-full h-full object-cover"
                    @error="handleImageError"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide mb-0.5">Most Transactions</div>
                  <div class="font-semibold text-dark-text truncate">{{ mostActiveManager?.team_name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-blue-400">
                  {{ mostActiveManager ? `${mostActiveManager.transactions}` : '-' }}
                </div>
              </div>

              <!-- Divider -->
              <div class="border-t border-dark-border my-3"></div>

              <!-- Least Points -->
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img
                    v-if="leastPointsManager"
                    :src="leastPointsManager.avatar_url"
                    :alt="leastPointsManager.team_name"
                    class="w-full h-full object-cover"
                    @error="handleImageError"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide mb-0.5">Least Points</div>
                  <div class="font-semibold text-dark-text truncate">{{ leastPointsManager?.team_name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-red-400">
                  {{ leastPointsManager ? `${leastPointsManager.points_for.toFixed(1)}` : '-' }}
                </div>
              </div>

              <!-- Worst All-Play -->
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img
                    v-if="worstAllPlayTeam"
                    :src="worstAllPlayTeam.avatar_url"
                    :alt="worstAllPlayTeam.team_name"
                    class="w-full h-full object-cover"
                    @error="handleImageError"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide mb-0.5">Worst All-Play</div>
                  <div class="font-semibold text-dark-text truncate">{{ worstAllPlayTeam?.team_name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-red-400">
                  {{ worstAllPlayTeam ? `${worstAllPlayTeam.allPlayWins}-${worstAllPlayTeam.allPlayLosses}` : '-' }}
                </div>
              </div>

              <!-- Coldest Team -->
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img
                    v-if="coldestTeam"
                    :src="coldestTeam.avatar_url"
                    :alt="coldestTeam.team_name"
                    class="w-full h-full object-cover"
                    @error="handleImageError"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide mb-0.5">Coldest Team</div>
                  <div class="font-semibold text-dark-text truncate">{{ coldestTeam?.team_name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-cyan-400">
                  {{ coldestTeam ? `${coldestTeam.last3Avg.toFixed(1)}` : '-' }}
                </div>
              </div>

              <!-- Least Active -->
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                  <img
                    v-if="leastActiveManager"
                    :src="leastActiveManager.avatar_url"
                    :alt="leastActiveManager.team_name"
                    class="w-full h-full object-cover"
                    @error="handleImageError"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wide mb-0.5">Least Transactions</div>
                  <div class="font-semibold text-dark-text truncate">{{ leastActiveManager?.team_name || 'N/A' }}</div>
                </div>
                <div class="text-sm font-bold text-purple-400">
                  {{ leastActiveManager ? `${leastActiveManager.transactions}` : '-' }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- End Quick Stats -->
        </div>
        <!-- End RIGHT sidebar -->
        
      </div>
      <!-- End Row 1 Grid -->

      <!-- Row 2: Standings Chart (Full Width) -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-2xl">📈</span>
            <h2 class="card-title">Standings Over Time</h2>
          </div>
          <p class="card-subtitle">Track how team rankings have changed throughout the season</p>
        </div>
        <div class="card-body">
          <!-- Split by Division -->
          <template v-if="showDivisions && hasDivisions && divisionChartData.length > 0">
            <div class="space-y-8">
              <div v-for="divData in divisionChartData" :key="divData.division" 
                   class="border border-dark-border rounded-xl p-4">
                <div class="mb-4 pb-3 border-b border-dark-border">
                  <h3 class="text-lg font-bold text-primary flex items-center gap-2">
                    <span class="text-xl">●</span>
                    {{ divData.division }}
                  </h3>
                  <p class="text-xs text-dark-textMuted mt-1">{{ divData.teams.length }} teams</p>
                </div>
                <apexchart
                  v-if="divData.options"
                  type="line"
                  height="400"
                  :options="divData.options"
                  :series="divData.series"
                />
              </div>
            </div>
          </template>
          
          <!-- All Teams Together -->
          <template v-else>
            <apexchart
              v-if="chartOptions"
              type="line"
              height="450"
              :options="chartOptions"
              :series="chartSeries"
            />
          </template>
        </div>
      </div>
      <!-- End Chart -->

      <!-- Playoff Predictor -->
      <PlayoffPredictor v-if="selectedSeason" :season="selectedSeason" />
      
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { sleeperService } from '@/services/sleeper'
import { useTeamCustomizations } from '@/composables/useTeamCustomizations'
import PlayoffPredictor from '@/components/PlayoffPredictor.vue'
import StandingsTable from '@/components/StandingsTable.vue'
import type { SleeperRoster, SleeperMatchup, SleeperTransaction } from '@/types/sleeper'
import {
  calculateAllPlayRecord,
  calculateTransactionCount,
  getStandingsOverTime,
  getBestWorstManagers
} from '@/utils/calculations'

const leagueStore = useLeagueStore()
const { applyCustomizations } = useTeamCustomizations()

// State
const selectedSeason = ref('')
const isLoading = ref(false)
const showDivisions = ref(true)
const leagueNews = ref<string[] | null>(null)
const isGeneratingImage = ref(false)

interface TeamData {
  roster_id: number
  team_name: string
  avatar_url: string
  rank: number
  wins: number
  losses: number
  ties: number
  points_for: number
  points_against: number
  all_play_wins: number
  all_play_losses: number
  division?: number
  transactions?: number
}

interface SeasonData {
  teams: TeamData[]
  matchupsByWeek: Map<number, SleeperMatchup[]>
  transactions: SleeperTransaction[]
  playoffWeekStart: number
}

const seasonData = ref<SeasonData | null>(null)

// Computed
const hasDivisions = computed(() => {
  if (!seasonData.value) return false
  return seasonData.value.teams.some(t => t.division !== undefined && t.division !== null)
})

const teamsByDivision = computed(() => {
  if (!seasonData.value || !hasDivisions.value) return {}
  
  const divisions: Record<string, TeamData[]> = {}
  
  seasonData.value.teams.forEach(team => {
    const divName = `Division ${team.division || 1}`
    if (!divisions[divName]) divisions[divName] = []
    divisions[divName].push(team)
  })
  
  // Sort teams within each division
  Object.keys(divisions).forEach(div => {
    divisions[div].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.points_for - a.points_for
    })
  })
  
  return divisions
})

const mostPointsManager = computed(() => {
  if (!seasonData.value) return null
  return [...seasonData.value.teams].sort((a, b) => b.points_for - a.points_for)[0]
})

const leastPointsManager = computed(() => {
  if (!seasonData.value) return null
  return [...seasonData.value.teams].sort((a, b) => a.points_for - b.points_for)[0]
})

const hottestTeam = computed(() => {
  if (!seasonData.value) return null
  
  // Calculate last 3 weeks average for each team
  const teamsWithAvg = seasonData.value.teams.map(team => {
    const weeks = Array.from(seasonData.value!.matchupsByWeek.keys())
      .filter(w => w < seasonData.value!.playoffWeekStart)
      .sort((a, b) => b - a)
      .slice(0, 3)
    
    let totalPoints = 0
    let weekCount = 0
    
    weeks.forEach(week => {
      const matchups = seasonData.value!.matchupsByWeek.get(week) || []
      const myMatchup = matchups.find(m => m.roster_id === team.roster_id)
      if (myMatchup) {
        totalPoints += myMatchup.points || 0
        weekCount++
      }
    })
    
    return {
      ...team,
      last3Avg: weekCount > 0 ? totalPoints / weekCount : 0
    }
  })
  
  return teamsWithAvg.sort((a, b) => b.last3Avg - a.last3Avg)[0]
})

const coldestTeam = computed(() => {
  if (!seasonData.value) return null
  
  // Calculate last 3 weeks average for each team
  const teamsWithAvg = seasonData.value.teams.map(team => {
    const weeks = Array.from(seasonData.value!.matchupsByWeek.keys())
      .filter(w => w < seasonData.value!.playoffWeekStart)
      .sort((a, b) => b - a)
      .slice(0, 3)
    
    let totalPoints = 0
    let weekCount = 0
    
    weeks.forEach(week => {
      const matchups = seasonData.value!.matchupsByWeek.get(week) || []
      const myMatchup = matchups.find(m => m.roster_id === team.roster_id)
      if (myMatchup) {
        totalPoints += myMatchup.points || 0
        weekCount++
      }
    })
    
    return {
      ...team,
      last3Avg: weekCount > 0 ? totalPoints / weekCount : 0
    }
  })
  
  return teamsWithAvg.sort((a, b) => a.last3Avg - b.last3Avg)[0]
})

const mostActiveManager = computed(() => {
  if (!seasonData.value) return null
  return [...seasonData.value.teams].sort((a, b) => (b.transactions || 0) - (a.transactions || 0))[0]
})

const leastActiveManager = computed(() => {
  if (!seasonData.value) return null
  return [...seasonData.value.teams].sort((a, b) => (a.transactions || 0) - (b.transactions || 0))[0]
})

// Calculate all-play records for each team
const allPlayRecords = computed(() => {
  const records = new Map<number, { wins: number; losses: number; winPct: number }>()
  
  if (!selectedSeason.value) return records
  
  const rosters = leagueStore.historicalRosters.get(selectedSeason.value) || []
  const matchupsMap = leagueStore.historicalMatchups.get(selectedSeason.value) || new Map()
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  const playoffStart = seasonInfo?.settings?.playoff_week_start || 15
  
  rosters.forEach(roster => {
    let wins = 0
    let losses = 0
    let totalGames = 0
    
    // Loop through regular season weeks only
    for (let week = 1; week < playoffStart; week++) {
      const weekMatchups = matchupsMap.get(week) || []
      const myMatch = weekMatchups.find(m => m.roster_id === roster.roster_id)
      if (!myMatch || !myMatch.points) continue
      
      // Compare against all other teams that week
      weekMatchups.forEach(opponent => {
        if (opponent.roster_id === roster.roster_id || !opponent.points) return
        totalGames++
        if (myMatch.points > opponent.points) {
          wins++
        } else {
          losses++
        }
      })
    }
    
    records.set(roster.roster_id, {
      wins,
      losses,
      winPct: totalGames > 0 ? wins / totalGames : 0
    })
  })
  
  return records
})

// Best all-play team
const bestAllPlayTeam = computed(() => {
  if (!seasonData.value?.teams || allPlayRecords.value.size === 0) return null
  
  let best = { team: null as any, record: { wins: 0, losses: 0, winPct: 0 } }
  
  seasonData.value.teams.forEach(team => {
    const record = allPlayRecords.value.get(team.roster_id)
    if (record && record.winPct > best.record.winPct) {
      best = { team, record }
    }
  })
  
  return best.team ? {
    ...best.team,
    allPlayWins: best.record.wins,
    allPlayLosses: best.record.losses,
    allPlayPct: best.record.winPct
  } : null
})

// Worst all-play team
const worstAllPlayTeam = computed(() => {
  if (!seasonData.value?.teams || allPlayRecords.value.size === 0) return null
  
  let worst = { team: null as any, record: { wins: 999, losses: 0, winPct: 1 } }
  
  seasonData.value.teams.forEach(team => {
    const record = allPlayRecords.value.get(team.roster_id)
    if (record && record.winPct < worst.record.winPct) {
      worst = { team, record }
    }
  })
  
  return worst.team ? {
    ...worst.team,
    allPlayWins: worst.record.wins,
    allPlayLosses: worst.record.losses,
    allPlayPct: worst.record.winPct
  } : null
})

// Chart configuration
const chartOptions = computed(() => {
  if (!seasonData.value) return null

  return {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    theme: {
      mode: 'dark'
    },
    colors: seasonData.value.teams.map(t => getTeamColor(t.roster_id)),
    stroke: {
      width: 3,
      curve: 'smooth'
    },
    xaxis: {
      categories: getWeekLabels(),
      labels: {
        style: {
          colors: '#9ca3af'
        }
      },
      title: {
        text: 'Week',
        style: {
          color: '#9ca3af'
        }
      }
    },
    yaxis: {
      reversed: true,
      min: 1,
      max: seasonData.value.teams.length,
      tickAmount: seasonData.value.teams.length - 1,
      labels: {
        style: {
          colors: '#9ca3af'
        }
      },
      title: {
        text: 'Rank',
        style: {
          color: '#9ca3af'
        }
      }
    },
    legend: {
      show: true,
      position: 'bottom',
      labels: {
        colors: '#9ca3af'
      }
    },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        // Get all teams with their rank at this week
        const teamsWithRanks = series.map((data, idx) => ({
          name: w.globals.seriesNames[idx],
          rank: data[dataPointIndex],
          color: w.globals.colors[idx]
        }))
        
        // Sort by rank (ascending)
        teamsWithRanks.sort((a, b) => a.rank - b.rank)
        
        // Build tooltip HTML
        let html = `<div class="apexcharts-tooltip-title" style="padding: 8px; border-bottom: 1px solid #374151;">
          Week ${dataPointIndex + 1}
        </div>
        <div style="padding: 8px;">`
        
        teamsWithRanks.forEach(team => {
          html += `
            <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
              <span style="width: 12px; height: 12px; background: ${team.color}; border-radius: 2px;"></span>
              <span style="color: #9ca3af;">#${team.rank}</span>
              <span style="color: #e5e7eb;">${team.name}</span>
            </div>
          `
        })
        
        html += '</div>'
        return html
      }
    },
    grid: {
      borderColor: '#374151'
    }
  }
})

const chartSeries = computed(() => {
  if (!seasonData.value) return []

  const standingsOverTime = getStandingsOverTime(
    leagueStore.rosters,
    seasonData.value.matchupsByWeek,
    seasonData.value.playoffWeekStart
  )

  return seasonData.value.teams.map(team => {
    const data = standingsOverTime.map(week => {
      const rank = week.standings.findIndex(s => s.rosterId === team.roster_id) + 1
      return rank
    })

    return {
      name: team.team_name,
      data
    }
  })
})

// Division-split chart data
const divisionChartData = computed(() => {
  if (!seasonData.value || !hasDivisions.value || !showDivisions.value) return []
  
  const standingsOverTime = getStandingsOverTime(
    leagueStore.rosters,
    seasonData.value.matchupsByWeek,
    seasonData.value.playoffWeekStart
  )
  
  const chartData: any[] = []
  
  // Create chart for each division
  Object.entries(teamsByDivision.value).forEach(([divisionName, divTeams]) => {
    const divisionTeamIds = new Set(divTeams.map((t: any) => t.roster_id))
    
    // Create series for teams in this division
    const series = divTeams.map((team: any) => {
      const data = standingsOverTime.map(week => {
        // Calculate rank within division only
        const divisionStandings = week.standings.filter(s => divisionTeamIds.has(s.rosterId))
        const rank = divisionStandings.findIndex(s => s.rosterId === team.roster_id) + 1
        return rank || divisionStandings.length
      })
      
      return {
        name: team.team_name,
        data
      }
    })
    
    // Create chart options for this division
    const options = {
      ...chartOptions.value,
      colors: divTeams.map((t: any) => getTeamColor(t.roster_id)),
      yaxis: {
        reversed: true,
        min: 1,
        max: divTeams.length,
        tickAmount: divTeams.length - 1,
        labels: {
          style: {
            colors: '#8b8ea1',
            fontSize: '12px'
          },
          formatter: (val: number) => Math.round(val).toString()
        }
      }
    }
    
    chartData.push({
      division: divisionName,
      teams: divTeams,
      series,
      options
    })
  })
  
  return chartData
})

// Methods
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'https://sleepercdn.com/avatars/thumbs/default'
}

async function downloadStandingsImage() {
  isGeneratingImage.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
    const leagueName = seasonInfo?.name || 'League'
    
    // Get teams to display
    const teamsToShow = showDivisions.value && hasDivisions.value 
      ? Object.values(teamsByDivision.value).flat()
      : seasonData.value?.teams || []
    
    // Pre-load all team images
    const imagePromises = teamsToShow.map(team => {
      return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve({ roster_id: team.roster_id, img })
        img.onerror = () => {
          const defaultImg = new Image()
          defaultImg.src = 'https://sleepercdn.com/avatars/thumbs/default'
          resolve({ roster_id: team.roster_id, img: defaultImg })
        }
        img.src = team.avatar_url
      })
    })
    
    const loadedImages = await Promise.all(imagePromises)
    const imageMap = new Map(loadedImages.map((item: any) => [item.roster_id, item.img]))
    
    // Create temporary container
    const container = document.createElement('div')
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      width: 1200px;
      padding: 40px;
      background: radial-gradient(circle at top, #1c2030, #05060a 55%);
      color: #f7f7ff;
      font-family: system-ui, -apple-system, sans-serif;
    `
    
    // Build HTML content
    container.innerHTML = `
      <div style="background: linear-gradient(135deg, rgba(19, 22, 32, 0.98), rgba(10, 12, 20, 0.98)); border: 1px solid #2a2f42; border-radius: 16px; padding: 40px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 36px; font-weight: bold; color: #f5c451; margin: 0 0 8px 0;">${leagueName}</h1>
          <p style="font-size: 20px; color: #b0b3c2; margin: 0;">🏆 Standings - ${selectedSeason.value} Season</p>
        </div>
        
        <!-- Standings Table -->
        <div style="margin-bottom: 32px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #2a2f42;">
                <th style="padding: 12px 8px; text-align: left; color: #8b8ea1; font-size: 12px; font-weight: 600; text-transform: uppercase;">Rank</th>
                <th style="padding: 12px 8px; text-align: left; color: #8b8ea1; font-size: 12px; font-weight: 600; text-transform: uppercase;">Team</th>
                <th style="padding: 12px 8px; text-align: center; color: #8b8ea1; font-size: 12px; font-weight: 600; text-transform: uppercase;">Record</th>
                <th style="padding: 12px 8px; text-align: center; color: #8b8ea1; font-size: 12px; font-weight: 600; text-transform: uppercase;">All Play</th>
                <th style="padding: 12px 8px; text-align: center; color: #8b8ea1; font-size: 12px; font-weight: 600; text-transform: uppercase;">Points For</th>
                <th style="padding: 12px 8px; text-align: center; color: #8b8ea1; font-size: 12px; font-weight: 600; text-transform: uppercase;">Points Against</th>
              </tr>
            </thead>
            <tbody id="standings-body">
            </tbody>
          </table>
        </div>
        
        <!-- Quick Stats -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px;">
          <div style="background: rgba(42, 47, 66, 0.4); padding: 16px; border-radius: 12px;">
            <div style="color: #8b8ea1; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Most Points</div>
            <div style="color: #f5c451; font-size: 18px; font-weight: bold;">${mostPointsManager.value?.team_name || 'N/A'}</div>
            <div style="color: #b0b3c2; font-size: 14px;">${mostPointsManager.value ? mostPointsManager.value.points_for.toFixed(1) : '-'}</div>
          </div>
          <div style="background: rgba(42, 47, 66, 0.4); padding: 16px; border-radius: 12px;">
            <div style="color: #8b8ea1; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Hottest Team</div>
            <div style="color: #fb923c; font-size: 18px; font-weight: bold;">${hottestTeam.value?.team_name || 'N/A'}</div>
            <div style="color: #b0b3c2; font-size: 14px;">${hottestTeam.value ? hottestTeam.value.last3Avg.toFixed(1) : '-'} PPG (L3)</div>
          </div>
          <div style="background: rgba(42, 47, 66, 0.4); padding: 16px; border-radius: 12px;">
            <div style="color: #8b8ea1; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Least Points</div>
            <div style="color: #ef4444; font-size: 18px; font-weight: bold;">${leastPointsManager.value?.team_name || 'N/A'}</div>
            <div style="color: #b0b3c2; font-size: 14px;">${leastPointsManager.value ? leastPointsManager.value.points_for.toFixed(1) : '-'}</div>
          </div>
          <div style="background: rgba(42, 47, 66, 0.4); padding: 16px; border-radius: 12px;">
            <div style="color: #8b8ea1; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Coldest Team</div>
            <div style="color: #06b6d4; font-size: 18px; font-weight: bold;">${coldestTeam.value?.team_name || 'N/A'}</div>
            <div style="color: #b0b3c2; font-size: 14px;">${coldestTeam.value ? coldestTeam.value.last3Avg.toFixed(1) : '-'} PPG (L3)</div>
          </div>
        </div>
        
        <!-- Chart Placeholder -->
        <div id="chart-container" style="background: rgba(42, 47, 66, 0.3); border-radius: 12px; padding: 20px; height: 400px;">
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    
    // Add team rows with images
    const tbody = container.querySelector('#standings-body')
    teamsToShow.forEach(team => {
      const row = document.createElement('tr')
      row.style.cssText = 'border-bottom: 1px solid rgba(42, 47, 66, 0.5);'
      
      const img = imageMap.get(team.roster_id)
      const imgCanvas = document.createElement('canvas')
      imgCanvas.width = 40
      imgCanvas.height = 40
      const ctx = imgCanvas.getContext('2d')
      if (ctx && img) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(20, 20, 20, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(img, 0, 0, 40, 40)
        ctx.restore()
      }
      const imgDataUrl = imgCanvas.toDataURL()
      
      row.innerHTML = `
        <td style="padding: 12px 8px; text-align: center;">
          <span style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: rgba(245, 196, 81, 0.1); color: #f5c451; font-weight: bold; font-size: 14px;">
            ${team.rank}
          </span>
        </td>
        <td style="padding: 12px 8px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="${imgDataUrl}" style="width: 40px; height: 40px; border-radius: 50%;" />
            <span style="font-weight: 600; color: #f7f7ff; font-size: 15px;">${team.team_name}</span>
          </div>
        </td>
        <td style="padding: 12px 8px; text-align: center; font-weight: 600; color: #e5e7eb; font-size: 14px;">
          ${team.wins}-${team.losses}${team.ties > 0 ? `-${team.ties}` : ''}
        </td>
        <td style="padding: 12px 8px; text-align: center; color: #b0b3c2; font-size: 14px;">
          ${team.all_play_wins}-${team.all_play_losses}
        </td>
        <td style="padding: 12px 8px; text-align: center; font-weight: 600; color: #e5e7eb; font-size: 14px;">
          ${team.points_for.toFixed(2)}
        </td>
        <td style="padding: 12px 8px; text-align: center; font-weight: 600; color: #e5e7eb; font-size: 14px;">
          ${team.points_against.toFixed(2)}
        </td>
      `
      tbody?.appendChild(row)
    })
    
    // Add chart
    const chartContainer = container.querySelector('#chart-container')
    if (chartContainer && chartSeries.value.length > 0) {
      // Create mini line chart using canvas
      const chartCanvas = document.createElement('canvas')
      chartCanvas.width = 1080
      chartCanvas.height = 360
      const chartCtx = chartCanvas.getContext('2d')
      
      if (chartCtx) {
        // Simple line chart rendering
        chartCtx.fillStyle = 'rgba(42, 47, 66, 0.3)'
        chartCtx.fillRect(0, 0, 1080, 360)
        
        const weeks = getWeekLabels()
        const maxRank = Math.max(...chartSeries.value.flatMap(s => s.data))
        const padding = 40
        const chartWidth = 1080 - padding * 2
        const chartHeight = 360 - padding * 2
        
        // Draw grid lines
        chartCtx.strokeStyle = 'rgba(139, 142, 161, 0.2)'
        chartCtx.lineWidth = 1
        for (let i = 0; i <= 5; i++) {
          const y = padding + (chartHeight / 5) * i
          chartCtx.beginPath()
          chartCtx.moveTo(padding, y)
          chartCtx.lineTo(1080 - padding, y)
          chartCtx.stroke()
        }
        
        // Draw lines for each team (top 5 only for clarity)
        chartSeries.value.slice(0, 5).forEach((series, idx) => {
          const colors = ['#f5c451', '#3b82f6', '#10b981', '#ef4444', '#a855f7']
          chartCtx.strokeStyle = colors[idx]
          chartCtx.lineWidth = 2.5
          chartCtx.beginPath()
          
          series.data.forEach((rank, weekIdx) => {
            const x = padding + (chartWidth / (weeks.length - 1)) * weekIdx
            const y = padding + chartHeight - ((rank / maxRank) * chartHeight)
            
            if (weekIdx === 0) {
              chartCtx.moveTo(x, y)
            } else {
              chartCtx.lineTo(x, y)
            }
          })
          chartCtx.stroke()
        })
        
        chartContainer.innerHTML = ''
        chartContainer.appendChild(chartCanvas)
      }
    }
    
    // Convert to image
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: null,
      logging: false,
      useCORS: true
    })
    
    document.body.removeChild(container)
    
    // Download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${leagueName.replace(/\s+/g, '-')}-standings-${selectedSeason.value}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    })
    
  } catch (error) {
    console.error('Failed to generate standings image:', error)
    alert('Failed to generate image. Please try again.')
  } finally {
    isGeneratingImage.value = false
  }
}

function generateLeagueNews() {
  // TODO: Wire up OpenAI API
  alert('AI news generation coming soon! Set up your OpenAI API key first.')
}

function getWeekLabels(): string[] {
  if (!seasonData.value) return []
  
  const weeks = Array.from(seasonData.value.matchupsByWeek.keys())
    .filter(w => w < seasonData.value!.playoffWeekStart)
    .sort((a, b) => a - b)
  
  return weeks.map(w => `Week ${w}`)
}

function getTeamColor(rosterId: number): string {
  // Generate consistent colors for teams
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#f43f5e'
  ]
  return colors[rosterId % colors.length]
}

async function loadSeasonData() {
  if (!selectedSeason.value) return
  
  isLoading.value = true
  
  try {
    const season = selectedSeason.value
    const rosters = leagueStore.historicalRosters.get(season) || []
    const users = leagueStore.historicalUsers.get(season) || []
    const matchupsByWeek = leagueStore.historicalMatchups.get(season) || new Map()
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === season)
    
    if (!seasonInfo) return
    
    const playoffWeekStart = seasonInfo.settings?.playoff_week_start || 15
    
    // Fetch transactions for this season
    const currentWeek = Math.max(...Array.from(matchupsByWeek.keys()))
    const transactions = await sleeperService.getAllTransactions(seasonInfo.league_id, currentWeek)
    
    // Build team data
    const teams: TeamData[] = rosters.map((roster, idx) => {
      const user = users.find(u => u.user_id === roster.owner_id)
      const allPlay = calculateAllPlayRecord(roster.roster_id, matchupsByWeek, playoffWeekStart)
      const transactionCount = calculateTransactionCount(roster.roster_id, transactions)
      
      const avatarUrl = sleeperService.getAvatarUrl(roster, user, seasonInfo)
      
      // Debug logging
      console.log(`Team ${idx + 1} Avatar Debug:`, {
        teamName: sleeperService.getTeamName(roster, user),
        metadataAvatar: roster.metadata?.avatar,
        settingsAvatar: roster.settings?.avatar,
        userAvatar: user?.avatar,
        leagueAvatar: seasonInfo.avatar,
        finalUrl: avatarUrl
      })
      
      return {
        roster_id: roster.roster_id,
        team_name: sleeperService.getTeamName(roster, user),
        avatar_url: avatarUrl,
        rank: idx + 1,
        wins: roster.settings?.wins || 0,
        losses: roster.settings?.losses || 0,
        ties: roster.settings?.ties || 0,
        points_for: roster.settings?.fpts || 0,
        points_against: roster.settings?.fpts_against || 0,
        all_play_wins: allPlay.wins,
        all_play_losses: allPlay.losses,
        division: roster.settings?.division,
        transactions: transactionCount
      }
    })
    
    // Sort by wins, then points
    teams.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.points_for - a.points_for
    })
    
    // Update ranks
    teams.forEach((team, idx) => {
      team.rank = idx + 1
    })
    
    // Apply team customizations
    const customizedTeams = teams.map(team => applyCustomizations(team))
    
    seasonData.value = {
      teams: customizedTeams,
      matchupsByWeek,
      transactions,
      playoffWeekStart
    }
  } catch (error) {
    console.error('Failed to load season data:', error)
  } finally {
    isLoading.value = false
  }
}

// Initialize
onMounted(() => {
  if (leagueStore.historicalSeasons.length > 0) {
    selectedSeason.value = leagueStore.historicalSeasons[0].season
    loadSeasonData()
  }
})

// Watch for league changes
watch(
  () => leagueStore.activeLeagueId,
  () => {
    if (leagueStore.historicalSeasons.length > 0) {
      selectedSeason.value = leagueStore.historicalSeasons[0].season
      loadSeasonData()
    }
  }
)
</script>
