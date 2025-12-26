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
              <option v-for="team in allTeams" :key="team.team_key" :value="team.team_key">
                {{ team.name }} ({{ team.manager }})
              </option>
            </select>
          </div>

          <!-- Team 2 Selector -->
          <div>
            <label class="block text-sm font-semibold text-dark-text mb-2">Team 2</label>
            <select v-model="team2Key" class="select w-full">
              <option value="">Select Team...</option>
              <option v-for="team in allTeams" :key="team.team_key" :value="team.team_key">
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
    <template v-else-if="team1Key && team2Key && comparisonData">
      <!-- Tale of the Tape -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🥊</span>
            <h2 class="card-title">Tale of the Tape</h2>
          </div>
          <p class="card-subtitle mt-2">Season comparison</p>
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
                  <span class="text-dark-textMuted">Record:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.wins }}-{{ comparisonData.team1.losses }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Win %:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.winPct.toFixed(1) }}%</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Avg PPW:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.avgPPW.toFixed(1) }}</span>
                </div>
                <div class="flex justify-between border-t border-dark-border pt-2 mt-2">
                  <span class="text-dark-textMuted">Total Points:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.totalPoints.toFixed(0) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Standing:</span>
                  <span class="font-bold text-primary">#{{ comparisonData.team1.rank }}</span>
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
                  <span class="text-dark-textMuted">Avg Margin:</span>
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
              <div class="font-bold text-2xl text-dark-text mb-1">{{ team2Data?.name }}</div>
              <div class="text-sm text-dark-textMuted mb-4">{{ team2Data?.manager }}</div>
              
              <div class="space-y-3 text-left">
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Record:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.wins }}-{{ comparisonData.team2.losses }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Win %:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.winPct.toFixed(1) }}%</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Avg PPW:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.avgPPW.toFixed(1) }}</span>
                </div>
                <div class="flex justify-between border-t border-dark-border pt-2 mt-2">
                  <span class="text-dark-textMuted">Total Points:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.totalPoints.toFixed(0) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Standing:</span>
                  <span class="font-bold text-primary">#{{ comparisonData.team2.rank }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rivalry Highlights -->
      <div v-if="rivalryHighlights" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="card">
          <div class="card-body p-4">
            <div class="text-xs text-dark-textMuted mb-2">💥 Biggest Blowout</div>
            <div class="font-bold text-dark-text mb-1">{{ rivalryHighlights.biggestBlowout.winner }}</div>
            <div class="text-lg text-primary font-bold">{{ rivalryHighlights.biggestBlowout.margin.toFixed(1) }} points</div>
            <div class="text-xs text-dark-textMuted mt-1">Week {{ rivalryHighlights.biggestBlowout.week }}</div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-body p-4">
            <div class="text-xs text-dark-textMuted mb-2">🎯 Closest Game</div>
            <div class="font-bold text-dark-text mb-1">{{ rivalryHighlights.closestGame.winner }}</div>
            <div class="text-lg text-primary font-bold">{{ rivalryHighlights.closestGame.margin.toFixed(1) }} points</div>
            <div class="text-xs text-dark-textMuted mt-1">Week {{ rivalryHighlights.closestGame.week }}</div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-body p-4">
            <div class="text-xs text-dark-textMuted mb-2">🔥 Highest Scoring</div>
            <div class="font-bold text-dark-text mb-1">{{ rivalryHighlights.highestScoring.totalPoints.toFixed(1) }} total</div>
            <div class="text-lg text-primary font-bold">{{ rivalryHighlights.highestScoring.score }}</div>
            <div class="text-xs text-dark-textMuted mt-1">Week {{ rivalryHighlights.highestScoring.week }}</div>
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
          <p class="card-subtitle mt-2">Last {{ rivalryHistory.length }} head-to-head meetings</p>
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
                    <div class="font-bold text-lg" :class="matchup.team1Score > matchup.team2Score ? 'text-green-400' : 'text-dark-text'">
                      {{ matchup.team1Score.toFixed(1) }}
                    </div>
                  </div>
                  <div class="text-dark-textMuted">vs</div>
                  <div class="text-left">
                    <div class="text-xs text-dark-textMuted">{{ getShortName(team2Data?.name) }}</div>
                    <div class="font-bold text-lg" :class="matchup.team2Score > matchup.team1Score ? 'text-green-400' : 'text-dark-text'">
                      {{ matchup.team2Score.toFixed(1) }}
                    </div>
                  </div>
                  <div class="text-sm text-dark-textMuted w-20 text-right">
                    +{{ matchup.margin.toFixed(1) }}
                  </div>
                </div>
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

    <!-- No Selection -->
    <div v-else-if="!isLoading && (!team1Key || !team2Key)" class="card">
      <div class="card-body text-center py-12">
        <p class="text-dark-textMuted">Select two teams above to compare their head-to-head history</p>
      </div>
    </div>

    <!-- Platform Badge -->
    <div class="flex justify-center mt-8">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 border border-purple-600/30">
        <span class="text-sm font-bold text-purple-400">Y!</span>
        <span class="text-sm text-purple-300">Yahoo Fantasy Baseball • Points League</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'
import ApexCharts from 'apexcharts'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_1_y.png'

// State
const isLoading = ref(false)
const team1Key = ref('')
const team2Key = ref('')
const allTeams = ref<any[]>([])
const allMatchups = ref<any[]>([]) // All matchups for the season

const team1Data = ref<any>(null)
const team2Data = ref<any>(null)
const comparisonData = ref<any>(null)
const rivalryHistory = ref<any[]>([])
const rivalryHighlights = ref<any>(null)

const chartContainer = ref<HTMLElement | null>(null)
let chartInstance: ApexCharts | null = null

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = defaultAvatar
}

function getShortName(name: string | undefined): string {
  if (!name) return ''
  return name.split(' ')[0]
}

async function loadTeamsAndMatchups() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey || !authStore.user?.id) return
  
  try {
    await yahooService.initialize(authStore.user.id)
    
    // Get standings (has all team data)
    const standings = await yahooService.getStandings(leagueKey)
    console.log('Loaded standings:', standings.length, 'teams')
    
    allTeams.value = standings.map((team: any) => ({
      team_key: team.team_key,
      name: team.name,
      manager: team.manager_name || team.managers?.[0]?.nickname || 'Manager',
      logo_url: team.logo_url,
      wins: team.wins || 0,
      losses: team.losses || 0,
      points_for: team.points_for || 0,
      rank: team.rank || 0
    }))
    
    // Get league info for current week
    const leagueInfo = leagueStore.yahooLeagues.find(l => l.league_key === leagueKey)
    const currentWeek = leagueInfo?.current_week || 25
    
    console.log('Loading all matchups through week', currentWeek)
    
    // Load all matchups for the season
    const matchupsList: any[] = []
    for (let week = 1; week <= currentWeek; week++) {
      try {
        const weekMatchups = await yahooService.getMatchups(leagueKey, week)
        if (weekMatchups && weekMatchups.length > 0) {
          matchupsList.push(...weekMatchups)
        }
      } catch (e) {
        // Week may not exist
      }
    }
    
    allMatchups.value = matchupsList
    console.log('Loaded total matchups:', matchupsList.length)
    
  } catch (e) {
    console.error('Error loading teams:', e)
  }
}

async function loadComparison() {
  if (!team1Key.value || !team2Key.value) {
    comparisonData.value = null
    rivalryHistory.value = []
    rivalryHighlights.value = null
    return
  }
  
  if (allTeams.value.length === 0) {
    console.log('Teams not loaded yet')
    return
  }
  
  isLoading.value = true
  
  try {
    // Find team data
    team1Data.value = allTeams.value.find(t => t.team_key === team1Key.value)
    team2Data.value = allTeams.value.find(t => t.team_key === team2Key.value)
    
    console.log('Comparing:', team1Data.value?.name, 'vs', team2Data.value?.name)
    
    if (!team1Data.value || !team2Data.value) {
      console.error('Could not find team data')
      isLoading.value = false
      return
    }
    
    // Calculate team stats from standings data
    const team1Stats = {
      wins: team1Data.value.wins,
      losses: team1Data.value.losses,
      winPct: (team1Data.value.wins + team1Data.value.losses) > 0 
        ? (team1Data.value.wins / (team1Data.value.wins + team1Data.value.losses)) * 100 
        : 0,
      totalPoints: team1Data.value.points_for,
      avgPPW: (team1Data.value.wins + team1Data.value.losses) > 0
        ? team1Data.value.points_for / (team1Data.value.wins + team1Data.value.losses)
        : 0,
      rank: team1Data.value.rank
    }
    
    const team2Stats = {
      wins: team2Data.value.wins,
      losses: team2Data.value.losses,
      winPct: (team2Data.value.wins + team2Data.value.losses) > 0 
        ? (team2Data.value.wins / (team2Data.value.wins + team2Data.value.losses)) * 100 
        : 0,
      totalPoints: team2Data.value.points_for,
      avgPPW: (team2Data.value.wins + team2Data.value.losses) > 0
        ? team2Data.value.points_for / (team2Data.value.wins + team2Data.value.losses)
        : 0,
      rank: team2Data.value.rank
    }
    
    // Find head-to-head matchups
    const h2hMatchups: any[] = []
    
    for (const matchup of allMatchups.value) {
      const teams = matchup.teams || []
      const t1 = teams.find((t: any) => t.team_key === team1Key.value)
      const t2 = teams.find((t: any) => t.team_key === team2Key.value)
      
      if (t1 && t2) {
        h2hMatchups.push({
          week: matchup.week,
          team1Score: t1.points || 0,
          team2Score: t2.points || 0,
          margin: Math.abs((t1.points || 0) - (t2.points || 0)),
          isPlayoff: matchup.is_playoffs
        })
      }
    }
    
    console.log('Found H2H matchups:', h2hMatchups.length)
    
    // Calculate H2H stats
    let team1Wins = 0
    let team2Wins = 0
    let ties = 0
    let totalMargin = 0
    
    for (const m of h2hMatchups) {
      if (m.team1Score > m.team2Score) team1Wins++
      else if (m.team2Score > m.team1Score) team2Wins++
      else ties++
      totalMargin += m.margin
    }
    
    const h2hStats = {
      team1Wins,
      team2Wins,
      ties,
      totalGames: h2hMatchups.length,
      avgMargin: h2hMatchups.length > 0 ? totalMargin / h2hMatchups.length : 0
    }
    
    comparisonData.value = {
      team1: team1Stats,
      team2: team2Stats,
      h2h: h2hStats
    }
    
    // Store rivalry history (sorted by week descending)
    rivalryHistory.value = h2hMatchups.sort((a, b) => b.week - a.week)
    
    // Calculate highlights
    if (h2hMatchups.length > 0) {
      let biggestBlowout = h2hMatchups[0]
      let closestGame = h2hMatchups[0]
      let highestScoring = h2hMatchups[0]
      
      for (const game of h2hMatchups) {
        if (game.margin > biggestBlowout.margin) biggestBlowout = game
        if (game.margin < closestGame.margin) closestGame = game
        
        const totalPoints = game.team1Score + game.team2Score
        if (totalPoints > (highestScoring.team1Score + highestScoring.team2Score)) {
          highestScoring = game
        }
      }
      
      rivalryHighlights.value = {
        biggestBlowout: {
          winner: biggestBlowout.team1Score > biggestBlowout.team2Score 
            ? team1Data.value?.name 
            : team2Data.value?.name,
          margin: biggestBlowout.margin,
          week: biggestBlowout.week
        },
        closestGame: {
          winner: closestGame.team1Score > closestGame.team2Score 
            ? team1Data.value?.name 
            : team2Data.value?.name,
          margin: closestGame.margin,
          week: closestGame.week
        },
        highestScoring: {
          totalPoints: highestScoring.team1Score + highestScoring.team2Score,
          score: `${highestScoring.team1Score.toFixed(0)}-${highestScoring.team2Score.toFixed(0)}`,
          week: highestScoring.week
        }
      }
    } else {
      rivalryHighlights.value = null
    }
    
    // Render chart
    await nextTick()
    renderChart()
    
  } catch (e) {
    console.error('Error loading comparison:', e)
  } finally {
    isLoading.value = false
  }
}

function renderChart() {
  if (!chartContainer.value || rivalryHistory.value.length === 0) return
  
  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
  
  // Get matchups in chronological order
  const recentMatchups = [...rivalryHistory.value].reverse().slice(-10)
  
  const categories = recentMatchups.map(m => `W${m.week}`)
  const team1Scores = recentMatchups.map(m => m.team1Score)
  const team2Scores = recentMatchups.map(m => m.team2Score)
  
  const options = {
    chart: {
      type: 'bar',
      height: 350,
      background: 'transparent',
      toolbar: { show: false },
      fontFamily: 'inherit'
    },
    series: [
      {
        name: team1Data.value?.name || 'Team 1',
        data: team1Scores
      },
      {
        name: team2Data.value?.name || 'Team 2',
        data: team2Scores
      }
    ],
    colors: ['#06b6d4', '#f97316'],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => val.toFixed(0),
      style: { colors: ['#fff'], fontSize: '10px' },
      offsetY: -20
    },
    xaxis: {
      categories,
      labels: { style: { colors: '#94a3b8', fontSize: '11px' } },
      axisBorder: { color: '#334155' },
      axisTicks: { color: '#334155' }
    },
    yaxis: {
      labels: { 
        style: { colors: '#94a3b8' },
        formatter: (val: number) => val.toFixed(0)
      }
    },
    grid: { borderColor: '#334155', strokeDashArray: 4 },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
      labels: { colors: '#e2e8f0' }
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val: number) => val.toFixed(1) + ' pts' }
    }
  }
  
  chartInstance = new ApexCharts(chartContainer.value, options)
  chartInstance.render()
}

// Watch for team selection changes
watch([team1Key, team2Key], () => {
  if (team1Key.value && team2Key.value) {
    loadComparison()
  }
})

// Watch for league changes
watch(() => leagueStore.activeLeagueId, async (newId) => {
  if (newId && leagueStore.activePlatform === 'yahoo') {
    team1Key.value = ''
    team2Key.value = ''
    comparisonData.value = null
    rivalryHistory.value = []
    allMatchups.value = []
    await loadTeamsAndMatchups()
  }
}, { immediate: true })

onMounted(async () => {
  if (leagueStore.activeLeagueId && leagueStore.activePlatform === 'yahoo') {
    await loadTeamsAndMatchups()
  }
})
</script>
