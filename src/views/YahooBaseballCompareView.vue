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

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
    </div>

    <template v-else>
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
              <select v-model="team1Key" @change="loadComparison" class="select w-full">
                <option value="">Select Team...</option>
                <option v-for="team in allTeams" :key="team.team_key" :value="team.team_key">
                  {{ team.name }} ({{ team.manager }})
                </option>
              </select>
            </div>

            <!-- Team 2 Selector -->
            <div>
              <label class="block text-sm font-semibold text-dark-text mb-2">Team 2</label>
              <select v-model="team2Key" @change="loadComparison" class="select w-full">
                <option value="">Select Team...</option>
                <option v-for="team in allTeams" :key="team.team_key" :value="team.team_key">
                  {{ team.name }} ({{ team.manager }})
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Comparison Results -->
      <template v-if="team1Key && team2Key && comparisonData">
        <!-- Tale of the Tape -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🥊</span>
              <h2 class="card-title">Tale of the Tape</h2>
            </div>
            <p class="card-subtitle mt-2">Career head-to-head comparison</p>
          </div>
          <div class="card-body">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Team 1 Stats -->
              <div class="text-center p-6 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 rounded-xl border-2 border-cyan-500/30">
                <img 
                  :src="team1Data?.logo_url || defaultAvatar" 
                  :alt="team1Data?.name" 
                  class="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-cyan-500" 
                  @error="handleImageError" 
                />
                <div class="font-bold text-2xl text-dark-text mb-1">{{ team1Data?.name }}</div>
                <div class="text-sm text-dark-textMuted mb-4">{{ team1Data?.manager }}</div>
                
                <div class="space-y-3 text-left">
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">Championships:</span>
                    <span class="font-bold text-xl text-primary">{{ comparisonData.team1.championships }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">Playoff Appearances:</span>
                    <span class="font-bold text-dark-text">{{ comparisonData.team1.playoffAppearances }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">All-Time Record:</span>
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
                      <div class="text-xs text-dark-textMuted">{{ team1Data?.name?.split(' ')[0] }}</div>
                    </div>
                    <div class="text-3xl text-dark-textMuted">-</div>
                    <div class="text-center">
                      <div class="text-4xl font-bold" :class="comparisonData.h2h.team2Wins > comparisonData.h2h.team1Wins ? 'text-green-400' : 'text-dark-textMuted'">
                        {{ comparisonData.h2h.team2Wins }}
                      </div>
                      <div class="text-xs text-dark-textMuted">{{ team2Data?.name?.split(' ')[0] }}</div>
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
                  <div class="flex justify-between p-2 bg-dark-border/20 rounded">
                    <span class="text-dark-textMuted">Avg Margin:</span>
                    <span class="font-semibold text-dark-text">{{ comparisonData.h2h.avgMargin.toFixed(1) }}</span>
                  </div>
                  <div class="flex justify-between p-2 bg-dark-border/20 rounded">
                    <span class="text-dark-textMuted">Playoff Meetings:</span>
                    <span class="font-semibold text-dark-text">{{ comparisonData.h2h.playoffMeetings }}</span>
                  </div>
                </div>
              </div>

              <!-- Team 2 Stats -->
              <div class="text-center p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl border-2 border-orange-500/30">
                <img 
                  :src="team2Data?.logo_url || defaultAvatar" 
                  :alt="team2Data?.name" 
                  class="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-orange-500" 
                  @error="handleImageError" 
                />
                <div class="font-bold text-2xl text-dark-text mb-1">{{ team2Data?.name }}</div>
                <div class="text-sm text-dark-textMuted mb-4">{{ team2Data?.manager }}</div>
                
                <div class="space-y-3 text-left">
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">Championships:</span>
                    <span class="font-bold text-xl text-primary">{{ comparisonData.team2.championships }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">Playoff Appearances:</span>
                    <span class="font-bold text-dark-text">{{ comparisonData.team2.playoffAppearances }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-dark-textMuted">All-Time Record:</span>
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
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Rivalry Highlights -->
        <div v-if="rivalryHighlights && rivalryHighlights.hasData" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="card">
            <div class="card-body p-4">
              <div class="text-xs text-dark-textMuted mb-2">💥 Biggest Blowout</div>
              <div class="font-bold text-dark-text mb-1">{{ rivalryHighlights.biggestBlowout.winner }}</div>
              <div class="text-lg text-primary font-bold">{{ rivalryHighlights.biggestBlowout.margin.toFixed(1) }} points</div>
              <div class="text-xs text-dark-textMuted mt-1">{{ rivalryHighlights.biggestBlowout.season }} Week {{ rivalryHighlights.biggestBlowout.week }}</div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-body p-4">
              <div class="text-xs text-dark-textMuted mb-2">🎯 Closest Game</div>
              <div class="font-bold text-dark-text mb-1">{{ rivalryHighlights.closestGame.winner }}</div>
              <div class="text-lg text-primary font-bold">{{ rivalryHighlights.closestGame.margin.toFixed(1) }} points</div>
              <div class="text-xs text-dark-textMuted mt-1">{{ rivalryHighlights.closestGame.season }} Week {{ rivalryHighlights.closestGame.week }}</div>
            </div>
          </div>
          
          <div class="card">
            <div class="card-body p-4">
              <div class="text-xs text-dark-textMuted mb-2">🔥 Highest Scoring</div>
              <div class="font-bold text-dark-text mb-1">{{ rivalryHighlights.highestScoring.totalPoints.toFixed(1) }} total</div>
              <div class="text-lg text-primary font-bold">{{ rivalryHighlights.highestScoring.score }}</div>
              <div class="text-xs text-dark-textMuted mt-1">{{ rivalryHighlights.highestScoring.season }} Week {{ rivalryHighlights.highestScoring.week }}</div>
            </div>
          </div>
        </div>

        <!-- Recent Matchups Chart -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📈</span>
              <h2 class="card-title">Recent Matchups</h2>
            </div>
            <p class="card-subtitle mt-2">Last {{ Math.min(rivalryHistory.length, 10) }} head-to-head meetings</p>
          </div>
          <div class="card-body">
            <div v-if="rivalryHistory.length > 0" ref="chartContainer" class="w-full" style="height: 350px;"></div>
            <div v-else class="text-center py-8 text-dark-textMuted">
              No head-to-head matchups found
            </div>
          </div>
        </div>

        <!-- Rivalry History -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📜</span>
              <h2 class="card-title">Rivalry History</h2>
            </div>
            <p class="card-subtitle mt-2">All head-to-head matchups</p>
          </div>
          <div class="card-body">
            <div v-if="rivalryHistory.length === 0" class="text-center py-8 text-dark-textMuted">
              No head-to-head matchups found
            </div>
            <div v-else class="space-y-3">
              <div 
                v-for="(matchup, idx) in rivalryHistory" 
                :key="idx"
                class="p-4 bg-dark-border/20 rounded-lg border border-dark-border"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="text-sm">
                      <span class="font-semibold text-dark-text">{{ matchup.season }}</span>
                      <span class="text-dark-textMuted ml-1">Week {{ matchup.week }}</span>
                      <span v-if="matchup.isPlayoff" class="ml-2 px-2 py-0.5 bg-primary/20 text-primary text-xs rounded">
                        Playoff
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-6">
                    <div class="text-right">
                      <div class="text-xs text-dark-textMuted">{{ team1Data?.name?.split(' ')[0] }}</div>
                      <div class="font-bold text-lg" :class="matchup.team1Score > matchup.team2Score ? 'text-green-400' : 'text-dark-text'">
                        {{ matchup.team1Score.toFixed(1) }}
                      </div>
                    </div>
                    <div class="text-dark-textMuted">vs</div>
                    <div class="text-left">
                      <div class="text-xs text-dark-textMuted">{{ team2Data?.name?.split(' ')[0] }}</div>
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
      </template>

      <!-- No Selection -->
      <div v-else class="card">
        <div class="card-body text-center py-12">
          <p class="text-dark-textMuted">Select two teams to compare their head-to-head history</p>
        </div>
      </div>
    </template>

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
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'
import ApexCharts from 'apexcharts'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_1_y.png'

// State
const isLoading = ref(true)
const team1Key = ref('')
const team2Key = ref('')
const allTeams = ref<any[]>([])
const allMatchupsData = ref<Map<string, Map<number, any[]>>>(new Map()) // season -> week -> matchups

const team1Data = ref<any>(null)
const team2Data = ref<any>(null)
const comparisonData = ref<any>(null)
const rivalryHistory = ref<any[]>([])
const rivalryHighlights = ref<any>(null)

const chartContainer = ref<HTMLElement | null>(null)
let chartInstance: ApexCharts | null = null

// Game keys for different seasons
const gameKeys: Record<string, string> = {
  '2025': '458', '2024': '431', '2023': '422', '2022': '412',
  '2021': '404', '2020': '398', '2019': '388'
}

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = defaultAvatar
}

async function loadTeams() {
  isLoading.value = true
  
  try {
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey || !authStore.user?.id) return
    
    await yahooService.initialize(authStore.user.id)
    
    // Get current standings which has all teams
    const standings = await yahooService.getStandings(leagueKey)
    
    allTeams.value = standings.map((team: any) => ({
      team_key: team.team_key,
      name: team.name,
      manager: team.manager_name || team.managers?.[0]?.nickname || 'Manager',
      logo_url: team.logo_url
    }))
    
    console.log('Loaded teams:', allTeams.value.length)
    
  } catch (e) {
    console.error('Error loading teams:', e)
  } finally {
    isLoading.value = false
  }
}

async function loadAllMatchups() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey) return
  
  const currentGameKey = leagueKey.split('.')[0]
  const leagueNum = leagueKey.split('.l.')[1]
  
  // Get the current season from the game key
  let currentSeason = '2024'
  for (const [year, key] of Object.entries(gameKeys)) {
    if (key === currentGameKey) {
      currentSeason = year
      break
    }
  }
  
  // Load matchups for current season (all weeks up to current)
  const seasonMatchups = new Map<number, any[]>()
  
  // Determine current week from league data
  const leagueInfo = leagueStore.yahooLeagues.find(l => l.league_key === leagueKey)
  const currentWeek = leagueInfo?.current_week || 25
  
  for (let week = 1; week <= currentWeek; week++) {
    try {
      const matchups = await yahooService.getMatchups(leagueKey, week)
      if (matchups && matchups.length > 0) {
        seasonMatchups.set(week, matchups)
      }
    } catch (e) {
      console.log(`No matchups for week ${week}`)
    }
  }
  
  allMatchupsData.value.set(currentSeason, seasonMatchups)
  console.log(`Loaded matchups for ${currentSeason}:`, seasonMatchups.size, 'weeks')
}

async function loadComparison() {
  if (!team1Key.value || !team2Key.value) {
    comparisonData.value = null
    rivalryHistory.value = []
    rivalryHighlights.value = null
    return
  }
  
  team1Data.value = allTeams.value.find(t => t.team_key === team1Key.value) || null
  team2Data.value = allTeams.value.find(t => t.team_key === team2Key.value) || null
  
  // Make sure we have matchup data
  if (allMatchupsData.value.size === 0) {
    await loadAllMatchups()
  }
  
  // Calculate comparison stats
  const team1Stats = calculateTeamStats(team1Key.value)
  const team2Stats = calculateTeamStats(team2Key.value)
  const h2hStats = calculateH2H(team1Key.value, team2Key.value)
  
  comparisonData.value = {
    team1: team1Stats,
    team2: team2Stats,
    h2h: h2hStats
  }
  
  // Build rivalry history
  buildRivalryHistory(team1Key.value, team2Key.value)
  
  // Calculate highlights
  calculateRivalryHighlights()
  
  // Render chart
  await nextTick()
  renderChart()
}

function calculateTeamStats(teamKey: string) {
  let wins = 0
  let losses = 0
  let ties = 0
  let totalPoints = 0
  let gamesPlayed = 0
  let championships = 0
  let playoffAppearances = 0
  
  for (const [season, weekMatchups] of allMatchupsData.value) {
    let madePlayoffs = false
    
    for (const [week, matchups] of weekMatchups) {
      for (const matchup of matchups) {
        const teams = matchup.teams || []
        const team = teams.find((t: any) => t.team_key === teamKey)
        const opponent = teams.find((t: any) => t.team_key !== teamKey)
        
        if (team && opponent) {
          gamesPlayed++
          totalPoints += team.points || 0
          
          if ((team.points || 0) > (opponent.points || 0)) {
            wins++
          } else if ((team.points || 0) < (opponent.points || 0)) {
            losses++
          } else {
            ties++
          }
          
          // Check if this is a playoff week (typically week 22+)
          if (week >= 22) {
            madePlayoffs = true
            // Check for championship (final week, winner)
            if (week === 25 && matchup.is_playoffs && (team.points || 0) > (opponent.points || 0)) {
              championships++
            }
          }
        }
      }
    }
    
    if (madePlayoffs) playoffAppearances++
  }
  
  const totalGames = wins + losses + ties
  const winPct = totalGames > 0 ? (wins / totalGames) * 100 : 0
  const avgPPW = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0
  
  return {
    wins,
    losses,
    ties,
    totalPoints,
    winPct,
    avgPPW,
    championships,
    playoffAppearances
  }
}

function calculateH2H(team1Key: string, team2Key: string) {
  let team1Wins = 0
  let team2Wins = 0
  let ties = 0
  let totalMargin = 0
  let playoffMeetings = 0
  
  for (const [season, weekMatchups] of allMatchupsData.value) {
    for (const [week, matchups] of weekMatchups) {
      for (const matchup of matchups) {
        const teams = matchup.teams || []
        const t1 = teams.find((t: any) => t.team_key === team1Key)
        const t2 = teams.find((t: any) => t.team_key === team2Key)
        
        if (t1 && t2) {
          const t1Score = t1.points || 0
          const t2Score = t2.points || 0
          
          if (t1Score > t2Score) {
            team1Wins++
            totalMargin += t1Score - t2Score
          } else if (t2Score > t1Score) {
            team2Wins++
            totalMargin += t2Score - t1Score
          } else {
            ties++
          }
          
          if (week >= 22) playoffMeetings++
        }
      }
    }
  }
  
  const totalGames = team1Wins + team2Wins + ties
  const avgMargin = totalGames > 0 ? totalMargin / totalGames : 0
  
  return {
    team1Wins,
    team2Wins,
    ties,
    totalGames,
    avgMargin,
    playoffMeetings
  }
}

function buildRivalryHistory(team1Key: string, team2Key: string) {
  const history: any[] = []
  
  for (const [season, weekMatchups] of allMatchupsData.value) {
    for (const [week, matchups] of weekMatchups) {
      for (const matchup of matchups) {
        const teams = matchup.teams || []
        const t1 = teams.find((t: any) => t.team_key === team1Key)
        const t2 = teams.find((t: any) => t.team_key === team2Key)
        
        if (t1 && t2) {
          const t1Score = t1.points || 0
          const t2Score = t2.points || 0
          
          history.push({
            season,
            week,
            team1Score: t1Score,
            team2Score: t2Score,
            margin: Math.abs(t1Score - t2Score),
            isPlayoff: week >= 22 || matchup.is_playoffs
          })
        }
      }
    }
  }
  
  // Sort by most recent first
  history.sort((a, b) => {
    if (a.season !== b.season) return parseInt(b.season) - parseInt(a.season)
    return b.week - a.week
  })
  
  rivalryHistory.value = history
}

function calculateRivalryHighlights() {
  if (rivalryHistory.value.length === 0) {
    rivalryHighlights.value = null
    return
  }
  
  let biggestBlowout = rivalryHistory.value[0]
  let closestGame = rivalryHistory.value[0]
  let highestScoring = rivalryHistory.value[0]
  
  for (const game of rivalryHistory.value) {
    if (game.margin > biggestBlowout.margin) biggestBlowout = game
    if (game.margin < closestGame.margin) closestGame = game
    
    const totalPoints = game.team1Score + game.team2Score
    if (totalPoints > (highestScoring.team1Score + highestScoring.team2Score)) {
      highestScoring = game
    }
  }
  
  rivalryHighlights.value = {
    hasData: true,
    biggestBlowout: {
      winner: biggestBlowout.team1Score > biggestBlowout.team2Score 
        ? team1Data.value?.name 
        : team2Data.value?.name,
      margin: biggestBlowout.margin,
      season: biggestBlowout.season,
      week: biggestBlowout.week
    },
    closestGame: {
      winner: closestGame.team1Score > closestGame.team2Score 
        ? team1Data.value?.name 
        : team2Data.value?.name,
      margin: closestGame.margin,
      season: closestGame.season,
      week: closestGame.week
    },
    highestScoring: {
      totalPoints: highestScoring.team1Score + highestScoring.team2Score,
      score: `${highestScoring.team1Score.toFixed(0)}-${highestScoring.team2Score.toFixed(0)}`,
      season: highestScoring.season,
      week: highestScoring.week
    }
  }
}

function renderChart() {
  if (!chartContainer.value || rivalryHistory.value.length === 0) return
  
  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
  
  // Get last 10 matchups, reversed for chronological order
  const recentMatchups = rivalryHistory.value.slice(0, 10).reverse()
  
  const categories = recentMatchups.map(m => `${m.season} W${m.week}`)
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
        borderRadius: 4,
        dataLabels: { position: 'top' }
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

// Watch for league changes
watch(() => leagueStore.activeLeagueId, async (newId) => {
  if (newId && leagueStore.activePlatform === 'yahoo') {
    team1Key.value = ''
    team2Key.value = ''
    comparisonData.value = null
    rivalryHistory.value = []
    allMatchupsData.value.clear()
    await loadTeams()
  }
}, { immediate: true })

onMounted(async () => {
  if (leagueStore.activeLeagueId && leagueStore.activePlatform === 'yahoo') {
    await loadTeams()
  }
})
</script>
