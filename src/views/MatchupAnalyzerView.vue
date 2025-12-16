<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Matchup Analyzer</h1>
        <p class="text-base text-dark-textMuted">
          Deep dive analysis and projections for any matchup
        </p>
      </div>
      <div class="flex items-center gap-3">
        <select v-model="selectedSeason" @change="onSeasonChange" class="select">
          <option v-for="season in leagueStore.historicalSeasons" :key="season.season" :value="season.season">
            {{ season.season }} Season
          </option>
        </select>
        <select v-model="selectedWeek" @change="loadMatchups" class="select">
          <option value="">Select Week...</option>
          <option v-for="week in availableWeeks" :key="week" :value="week">
            Week {{ week }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
    </div>

    <template v-else-if="selectedSeason && selectedWeek">
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
              <select v-model="team1Id" @change="analyzeMatchup" class="select w-full">
                <option value="">Select Team...</option>
                <option v-for="team in availableTeams" :key="team.roster_id" :value="team.roster_id">
                  {{ team.name }}
                </option>
              </select>
            </div>

            <!-- Team 2 Selector -->
            <div>
              <label class="block text-sm font-semibold text-dark-text mb-2">Team 2</label>
              <select v-model="team2Id" @change="analyzeMatchup" class="select w-full">
                <option value="">Select Team...</option>
                <option v-for="team in availableTeams" :key="team.roster_id" :value="team.roster_id">
                  {{ team.name }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Analysis Results -->
      <template v-if="team1Id && team2Id && matchupAnalysis">
        <!-- Win Probability -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🎲</span>
              <h2 class="card-title">Win Probability</h2>
            </div>
            <p class="card-subtitle mt-2">Based on season performance and statistical modeling</p>
          </div>
          <div class="card-body">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <!-- Team 1 Probability -->
              <div class="text-center p-6 bg-dark-border/20 rounded-xl">
                <div class="flex items-center justify-center gap-3 mb-4">
                  <img :src="team1Data?.avatar" :alt="team1Data?.name" class="w-16 h-16 rounded-full" @error="handleImageError" />
                  <div>
                    <div class="font-bold text-xl text-dark-text">{{ team1Data?.name }}</div>
                    <div class="text-sm text-dark-textMuted">{{ team1Data?.wins }}-{{ team1Data?.losses }}</div>
                  </div>
                </div>
                <div class="text-6xl font-bold mb-2" :class="matchupAnalysis.team1WinProb > 50 ? 'text-green-400' : 'text-dark-textSecondary'">
                  {{ matchupAnalysis.team1WinProb.toFixed(1) }}%
                </div>
                <div class="text-sm text-dark-textMuted">Win Probability</div>
                <div class="mt-4 text-sm">
                  <div class="text-dark-text font-semibold mb-1">Projected Score</div>
                  <div class="text-2xl font-bold text-primary">{{ matchupAnalysis.team1ProjectedScore.toFixed(1) }}</div>
                  <div class="text-xs text-dark-textMuted mt-1">
                    Range: {{ (matchupAnalysis.team1ProjectedScore - matchupAnalysis.team1ScoreStdDev).toFixed(1) }} - 
                    {{ (matchupAnalysis.team1ProjectedScore + matchupAnalysis.team1ScoreStdDev).toFixed(1) }}
                  </div>
                </div>
              </div>

              <!-- Team 2 Probability -->
              <div class="text-center p-6 bg-dark-border/20 rounded-xl">
                <div class="flex items-center justify-center gap-3 mb-4">
                  <img :src="team2Data?.avatar" :alt="team2Data?.name" class="w-16 h-16 rounded-full" @error="handleImageError" />
                  <div>
                    <div class="font-bold text-xl text-dark-text">{{ team2Data?.name }}</div>
                    <div class="text-sm text-dark-textMuted">{{ team2Data?.wins }}-{{ team2Data?.losses }}</div>
                  </div>
                </div>
                <div class="text-6xl font-bold mb-2" :class="matchupAnalysis.team2WinProb > 50 ? 'text-green-400' : 'text-dark-textSecondary'">
                  {{ matchupAnalysis.team2WinProb.toFixed(1) }}%
                </div>
                <div class="text-sm text-dark-textMuted">Win Probability</div>
                <div class="mt-4 text-sm">
                  <div class="text-dark-text font-semibold mb-1">Projected Score</div>
                  <div class="text-2xl font-bold text-primary">{{ matchupAnalysis.team2ProjectedScore.toFixed(1) }}</div>
                  <div class="text-xs text-dark-textMuted mt-1">
                    Range: {{ (matchupAnalysis.team2ProjectedScore - matchupAnalysis.team2ScoreStdDev).toFixed(1) }} - 
                    {{ (matchupAnalysis.team2ProjectedScore + matchupAnalysis.team2ScoreStdDev).toFixed(1) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Visual Probability Bar -->
            <div class="relative h-12 bg-dark-border rounded-full overflow-hidden">
              <div 
                class="absolute inset-y-0 left-0 bg-green-500 flex items-center justify-start pl-4 transition-all"
                :style="{ width: `${matchupAnalysis.team1WinProb}%` }"
              >
                <span v-if="matchupAnalysis.team1WinProb > 15" class="font-bold text-white text-sm">
                  {{ team1Data?.name }}
                </span>
              </div>
              <div 
                class="absolute inset-y-0 right-0 bg-blue-500 flex items-center justify-end pr-4 transition-all"
                :style="{ width: `${matchupAnalysis.team2WinProb}%` }"
              >
                <span v-if="matchupAnalysis.team2WinProb > 15" class="font-bold text-white text-sm">
                  {{ team2Data?.name }}
                </span>
              </div>
            </div>

            <!-- Upset Alert -->
            <div v-if="matchupAnalysis.upsetPotential > 30" class="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div class="flex items-center gap-2 text-orange-400 font-semibold mb-1">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <span>Upset Alert!</span>
              </div>
              <div class="text-sm text-dark-text">
                This matchup is closer than the records suggest. {{ matchupAnalysis.upsetPotential.toFixed(0) }}% chance of an upset.
              </div>
            </div>
          </div>
        </div>

        <!-- Head-to-Head Comparison -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📊</span>
              <h2 class="card-title">Season Statistics Comparison</h2>
            </div>
          </div>
          <div class="card-body">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-dark-border">
                    <th class="text-left p-3 text-dark-textMuted font-semibold">Statistic</th>
                    <th class="text-center p-3 text-dark-textMuted font-semibold">{{ team1Data?.name }}</th>
                    <th class="text-center p-3 text-dark-textMuted font-semibold">Advantage</th>
                    <th class="text-center p-3 text-dark-textMuted font-semibold">{{ team2Data?.name }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="stat in comparisonStats" :key="stat.label" class="border-b border-dark-border/50">
                    <td class="p-3 text-dark-text font-medium">{{ stat.label }}</td>
                    <td class="text-center p-3">
                      <span :class="stat.team1Better ? 'text-green-400 font-bold' : 'text-dark-textSecondary'">
                        {{ stat.team1Value }}
                      </span>
                    </td>
                    <td class="text-center p-3">
                      <div v-if="stat.team1Better" class="text-green-400">
                        ← {{ team1Data?.name.split(' ')[0] }}
                      </div>
                      <div v-else-if="stat.team2Better" class="text-green-400">
                        {{ team2Data?.name.split(' ')[0] }} →
                      </div>
                      <div v-else class="text-dark-textMuted">
                        Even
                      </div>
                    </td>
                    <td class="text-center p-3">
                      <span :class="stat.team2Better ? 'text-green-400 font-bold' : 'text-dark-textSecondary'">
                        {{ stat.team2Value }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Historical Matchups -->
        <div class="card" v-if="historicalMatchups.length > 0">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📜</span>
              <h2 class="card-title">Historical Matchups</h2>
            </div>
            <p class="card-subtitle mt-2">Previous meetings this season</p>
          </div>
          <div class="card-body">
            <div class="space-y-3">
              <div v-for="(matchup, idx) in historicalMatchups" :key="idx" 
                   class="flex items-center justify-between p-4 bg-dark-border/20 rounded-lg">
                <div class="flex-1">
                  <div class="text-sm text-dark-textMuted mb-2">Week {{ matchup.week }}</div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <img :src="team1Data?.avatar" :alt="team1Data?.name" class="w-8 h-8 rounded-full" @error="handleImageError" />
                      <div>
                        <div class="font-semibold text-dark-text">{{ team1Data?.name }}</div>
                        <div class="text-2xl font-bold" :class="matchup.team1Score > matchup.team2Score ? 'text-green-400' : 'text-red-400'">
                          {{ matchup.team1Score.toFixed(1) }}
                        </div>
                      </div>
                    </div>
                    <div class="text-dark-textMuted font-bold text-xl mx-4">vs</div>
                    <div class="flex items-center gap-3">
                      <div class="text-right">
                        <div class="font-semibold text-dark-text">{{ team2Data?.name }}</div>
                        <div class="text-2xl font-bold" :class="matchup.team2Score > matchup.team1Score ? 'text-green-400' : 'text-red-400'">
                          {{ matchup.team2Score.toFixed(1) }}
                        </div>
                      </div>
                      <img :src="team2Data?.avatar" :alt="team2Data?.name" class="w-8 h-8 rounded-full" @error="handleImageError" />
                    </div>
                  </div>
                </div>
                <div class="ml-6 text-center">
                  <div class="text-xs text-dark-textMuted mb-1">Margin</div>
                  <div class="text-lg font-bold text-primary">
                    {{ Math.abs(matchup.team1Score - matchup.team2Score).toFixed(1) }}
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-4 p-4 bg-dark-bg/50 rounded-lg">
              <div class="text-sm text-dark-textMuted mb-2">Season Series</div>
              <div class="flex items-center justify-center gap-4">
                <div class="text-center">
                  <div class="text-3xl font-bold text-dark-text">{{ seriesRecord.team1Wins }}</div>
                  <div class="text-xs text-dark-textMuted">{{ team1Data?.name }}</div>
                </div>
                <div class="text-2xl text-dark-textMuted">-</div>
                <div class="text-center">
                  <div class="text-3xl font-bold text-dark-text">{{ seriesRecord.team2Wins }}</div>
                  <div class="text-xs text-dark-textMuted">{{ team2Data?.name }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Scouting Report -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Team 1 Scouting -->
          <div class="card">
            <div class="card-header">
              <div class="flex items-center gap-2">
                <img :src="team1Data?.avatar" :alt="team1Data?.name" class="w-8 h-8 rounded-full" @error="handleImageError" />
                <h2 class="card-title">{{ team1Data?.name }} Scouting</h2>
              </div>
            </div>
            <div class="card-body space-y-4">
              <!-- Strengths -->
              <div>
                <div class="text-sm font-semibold text-green-400 mb-2">💪 Strengths</div>
                <ul class="space-y-1 text-sm text-dark-text">
                  <li v-for="strength in team1Scouting.strengths" :key="strength" class="flex items-start gap-2">
                    <span class="text-green-400">✓</span>
                    <span>{{ strength }}</span>
                  </li>
                </ul>
              </div>
              <!-- Weaknesses -->
              <div>
                <div class="text-sm font-semibold text-red-400 mb-2">⚠️ Weaknesses</div>
                <ul class="space-y-1 text-sm text-dark-text">
                  <li v-for="weakness in team1Scouting.weaknesses" :key="weakness" class="flex items-start gap-2">
                    <span class="text-red-400">✗</span>
                    <span>{{ weakness }}</span>
                  </li>
                </ul>
              </div>
              <!-- Recent Trend -->
              <div>
                <div class="text-sm font-semibold text-dark-text mb-2">📈 Recent Form (Last 3 Weeks)</div>
                <div class="flex items-center gap-2">
                  <div v-for="(result, idx) in team1Scouting.recentResults" :key="idx"
                       class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                       :class="result === 'W' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'">
                    {{ result }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Team 2 Scouting -->
          <div class="card">
            <div class="card-header">
              <div class="flex items-center gap-2">
                <img :src="team2Data?.avatar" :alt="team2Data?.name" class="w-8 h-8 rounded-full" @error="handleImageError" />
                <h2 class="card-title">{{ team2Data?.name }} Scouting</h2>
              </div>
            </div>
            <div class="card-body space-y-4">
              <!-- Strengths -->
              <div>
                <div class="text-sm font-semibold text-green-400 mb-2">💪 Strengths</div>
                <ul class="space-y-1 text-sm text-dark-text">
                  <li v-for="strength in team2Scouting.strengths" :key="strength" class="flex items-start gap-2">
                    <span class="text-green-400">✓</span>
                    <span>{{ strength }}</span>
                  </li>
                </ul>
              </div>
              <!-- Weaknesses -->
              <div>
                <div class="text-sm font-semibold text-red-400 mb-2">⚠️ Weaknesses</div>
                <ul class="space-y-1 text-sm text-dark-text">
                  <li v-for="weakness in team2Scouting.weaknesses" :key="weakness" class="flex items-start gap-2">
                    <span class="text-red-400">✗</span>
                    <span>{{ weakness }}</span>
                  </li>
                </ul>
              </div>
              <!-- Recent Trend -->
              <div>
                <div class="text-sm font-semibold text-dark-text mb-2">📈 Recent Form (Last 3 Weeks)</div>
                <div class="flex items-center gap-2">
                  <div v-for="(result, idx) in team2Scouting.recentResults" :key="idx"
                       class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                       :class="result === 'W' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'">
                    {{ result }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <div v-else class="card">
      <div class="card-body text-center py-12">
        <p class="text-dark-textMuted">Select a season and week to analyze matchups</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { sleeperService } from '@/services/sleeper'
import type { SleeperRoster, SleeperMatchup } from '@/types/sleeper'

const leagueStore = useLeagueStore()

// State
const selectedSeason = ref('')
const selectedWeek = ref('')
const isLoading = ref(false)
const team1Id = ref<number | ''>('')
const team2Id = ref<number | ''>('')

interface TeamData {
  roster_id: number
  name: string
  avatar: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  avgPPG: number
  stdDev: number
  highScore: number
  lowScore: number
}

const availableTeams = ref<TeamData[]>([])
const team1Data = ref<TeamData | null>(null)
const team2Data = ref<TeamData | null>(null)

interface MatchupAnalysis {
  team1WinProb: number
  team2WinProb: number
  team1ProjectedScore: number
  team2ProjectedScore: number
  team1ScoreStdDev: number
  team2ScoreStdDev: number
  upsetPotential: number
}

const matchupAnalysis = ref<MatchupAnalysis | null>(null)

interface ComparisonStat {
  label: string
  team1Value: string
  team2Value: string
  team1Better: boolean
  team2Better: boolean
}

const comparisonStats = ref<ComparisonStat[]>([])

interface HistoricalMatchup {
  week: number
  team1Score: number
  team2Score: number
}

const historicalMatchups = ref<HistoricalMatchup[]>([])

interface SeriesRecord {
  team1Wins: number
  team2Wins: number
}

const seriesRecord = computed((): SeriesRecord => {
  let team1Wins = 0
  let team2Wins = 0
  
  historicalMatchups.value.forEach(matchup => {
    if (matchup.team1Score > matchup.team2Score) team1Wins++
    else if (matchup.team2Score > matchup.team1Score) team2Wins++
  })
  
  return { team1Wins, team2Wins }
})

interface ScoutingReport {
  strengths: string[]
  weaknesses: string[]
  recentResults: string[]
}

const team1Scouting = ref<ScoutingReport>({ strengths: [], weaknesses: [], recentResults: [] })
const team2Scouting = ref<ScoutingReport>({ strengths: [], weaknesses: [], recentResults: [] })

// Computed
const availableWeeks = computed(() => {
  if (!selectedSeason.value) return []
  
  const matchups = leagueStore.historicalMatchups.get(selectedSeason.value)
  if (!matchups) return []
  
  return Array.from(matchups.keys()).sort((a, b) => a - b)
})

// Functions
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'https://sleepercdn.com/avatars/thumbs/default'
}

function onSeasonChange() {
  selectedWeek.value = ''
  team1Id.value = ''
  team2Id.value = ''
  matchupAnalysis.value = null
}

async function loadMatchups() {
  if (!selectedSeason.value || !selectedWeek.value) return
  
  isLoading.value = true
  
  try {
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
    if (!seasonInfo) return
    
    const rosters = leagueStore.historicalRosters.get(selectedSeason.value) || []
    const users = leagueStore.historicalUsers.get(selectedSeason.value) || []
    const matchups = leagueStore.historicalMatchups.get(selectedSeason.value)
    if (!matchups) return
    
    const week = parseInt(selectedWeek.value)
    const teams: TeamData[] = []
    
    rosters.forEach(roster => {
      const user = users.find(u => u.user_id === roster.owner_id)
      let wins = 0
      let losses = 0
      let ties = 0
      let pointsFor = 0
      let pointsAgainst = 0
      const scores: number[] = []
      
      matchups.forEach((weekMatchups, w) => {
        if (w > week) return
        
        const myMatch = weekMatchups.find(m => m.roster_id === roster.roster_id)
        if (!myMatch?.matchup_id) return
        
        const opponent = weekMatchups.find(m => 
          m.matchup_id === myMatch.matchup_id && m.roster_id !== roster.roster_id
        )
        
        if (myMatch.points !== undefined) {
          scores.push(myMatch.points)
          pointsFor += myMatch.points
        }
        
        if (opponent) {
          const myPoints = myMatch.points || 0
          const oppPoints = opponent.points || 0
          
          pointsAgainst += oppPoints
          
          if (myPoints > oppPoints) wins++
          else if (myPoints < oppPoints) losses++
          else ties++
        }
      })
      
      const avgPPG = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
      const variance = scores.length > 0
        ? scores.reduce((sum, score) => sum + Math.pow(score - avgPPG, 2), 0) / scores.length
        : 0
      const stdDev = Math.sqrt(variance)
      
      teams.push({
        roster_id: roster.roster_id,
        name: sleeperService.getTeamName(roster, user),
        avatar: sleeperService.getAvatarUrl(roster, user, seasonInfo),
        wins,
        losses,
        ties,
        pointsFor,
        pointsAgainst,
        avgPPG,
        stdDev: Math.max(stdDev, 10),
        highScore: scores.length > 0 ? Math.max(...scores) : 0,
        lowScore: scores.length > 0 ? Math.min(...scores) : 0
      })
    })
    
    availableTeams.value = teams.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.pointsFor - a.pointsFor
    })
  } catch (error) {
    console.error('Failed to load matchups:', error)
  } finally {
    isLoading.value = false
  }
}

function analyzeMatchup() {
  if (!team1Id.value || !team2Id.value) {
    matchupAnalysis.value = null
    return
  }
  
  team1Data.value = availableTeams.value.find(t => t.roster_id === team1Id.value) || null
  team2Data.value = availableTeams.value.find(t => t.roster_id === team2Id.value) || null
  
  if (!team1Data.value || !team2Data.value) return
  
  // Calculate win probability using Monte Carlo simulation
  const simulations = 10000
  let team1Wins = 0
  
  for (let i = 0; i < simulations; i++) {
    const team1Score = team1Data.value.avgPPG + (Math.random() - 0.5) * 2 * team1Data.value.stdDev
    const team2Score = team2Data.value.avgPPG + (Math.random() - 0.5) * 2 * team2Data.value.stdDev
    
    if (team1Score > team2Score) team1Wins++
  }
  
  const team1WinProb = (team1Wins / simulations) * 100
  const team2WinProb = 100 - team1WinProb
  
  // Calculate upset potential
  const favoriteProb = Math.max(team1WinProb, team2WinProb)
  const upsetPotential = 100 - favoriteProb
  
  matchupAnalysis.value = {
    team1WinProb,
    team2WinProb,
    team1ProjectedScore: team1Data.value.avgPPG,
    team2ProjectedScore: team2Data.value.avgPPG,
    team1ScoreStdDev: team1Data.value.stdDev,
    team2ScoreStdDev: team2Data.value.stdDev,
    upsetPotential
  }
  
  // Build comparison stats
  comparisonStats.value = [
    {
      label: 'Record',
      team1Value: `${team1Data.value.wins}-${team1Data.value.losses}`,
      team2Value: `${team2Data.value.wins}-${team2Data.value.losses}`,
      team1Better: team1Data.value.wins > team2Data.value.wins,
      team2Better: team2Data.value.wins > team1Data.value.wins
    },
    {
      label: 'Avg PPG',
      team1Value: team1Data.value.avgPPG.toFixed(1),
      team2Value: team2Data.value.avgPPG.toFixed(1),
      team1Better: team1Data.value.avgPPG > team2Data.value.avgPPG,
      team2Better: team2Data.value.avgPPG > team1Data.value.avgPPG
    },
    {
      label: 'Total Points For',
      team1Value: team1Data.value.pointsFor.toFixed(1),
      team2Value: team2Data.value.pointsFor.toFixed(1),
      team1Better: team1Data.value.pointsFor > team2Data.value.pointsFor,
      team2Better: team2Data.value.pointsFor > team1Data.value.pointsFor
    },
    {
      label: 'High Score',
      team1Value: team1Data.value.highScore.toFixed(1),
      team2Value: team2Data.value.highScore.toFixed(1),
      team1Better: team1Data.value.highScore > team2Data.value.highScore,
      team2Better: team2Data.value.highScore > team1Data.value.highScore
    },
    {
      label: 'Low Score',
      team1Value: team1Data.value.lowScore.toFixed(1),
      team2Value: team2Data.value.lowScore.toFixed(1),
      team1Better: team1Data.value.lowScore > team2Data.value.lowScore,
      team2Better: team2Data.value.lowScore > team1Data.value.lowScore
    },
    {
      label: 'Consistency (StdDev)',
      team1Value: team1Data.value.stdDev.toFixed(1),
      team2Value: team2Data.value.stdDev.toFixed(1),
      team1Better: team1Data.value.stdDev < team2Data.value.stdDev,
      team2Better: team2Data.value.stdDev < team1Data.value.stdDev
    }
  ]
  
  // Load historical matchups
  loadHistoricalMatchups()
  
  // Generate scouting reports
  generateScoutingReports()
}

function loadHistoricalMatchups() {
  if (!selectedSeason.value || !team1Id.value || !team2Id.value) return
  
  const matchups = leagueStore.historicalMatchups.get(selectedSeason.value)
  if (!matchups) return
  
  const historical: HistoricalMatchup[] = []
  const week = parseInt(selectedWeek.value)
  
  matchups.forEach((weekMatchups, w) => {
    if (w >= week) return
    
    const team1Match = weekMatchups.find(m => m.roster_id === team1Id.value)
    const team2Match = weekMatchups.find(m => m.roster_id === team2Id.value)
    
    if (!team1Match || !team2Match) return
    if (team1Match.matchup_id !== team2Match.matchup_id) return
    
    historical.push({
      week: w,
      team1Score: team1Match.points || 0,
      team2Score: team2Match.points || 0
    })
  })
  
  historicalMatchups.value = historical.sort((a, b) => b.week - a.week)
}

function generateScoutingReports() {
  if (!team1Data.value || !team2Data.value) return
  
  // Team 1 Scouting
  const t1Strengths: string[] = []
  const t1Weaknesses: string[] = []
  
  if (team1Data.value.avgPPG > 110) t1Strengths.push('High scoring offense (>110 PPG)')
  if (team1Data.value.stdDev < 15) t1Strengths.push('Very consistent week-to-week')
  if (team1Data.value.wins > team1Data.value.losses + 2) t1Strengths.push('Strong win record')
  if (team1Data.value.highScore > 140) t1Strengths.push('Ceiling week potential (140+)')
  
  if (team1Data.value.avgPPG < 100) t1Weaknesses.push('Below average scoring (<100 PPG)')
  if (team1Data.value.stdDev > 25) t1Weaknesses.push('Inconsistent performances')
  if (team1Data.value.lowScore < 80) t1Weaknesses.push('Low floor risk (<80)')
  
  if (t1Strengths.length === 0) t1Strengths.push('Balanced team with no standout strengths')
  if (t1Weaknesses.length === 0) t1Weaknesses.push('No significant weaknesses identified')
  
  team1Scouting.value = {
    strengths: t1Strengths,
    weaknesses: t1Weaknesses,
    recentResults: getRecentResults(team1Id.value as number)
  }
  
  // Team 2 Scouting
  const t2Strengths: string[] = []
  const t2Weaknesses: string[] = []
  
  if (team2Data.value.avgPPG > 110) t2Strengths.push('High scoring offense (>110 PPG)')
  if (team2Data.value.stdDev < 15) t2Strengths.push('Very consistent week-to-week')
  if (team2Data.value.wins > team2Data.value.losses + 2) t2Strengths.push('Strong win record')
  if (team2Data.value.highScore > 140) t2Strengths.push('Ceiling week potential (140+)')
  
  if (team2Data.value.avgPPG < 100) t2Weaknesses.push('Below average scoring (<100 PPG)')
  if (team2Data.value.stdDev > 25) t2Weaknesses.push('Inconsistent performances')
  if (team2Data.value.lowScore < 80) t2Weaknesses.push('Low floor risk (<80)')
  
  if (t2Strengths.length === 0) t2Strengths.push('Balanced team with no standout strengths')
  if (t2Weaknesses.length === 0) t2Weaknesses.push('No significant weaknesses identified')
  
  team2Scouting.value = {
    strengths: t2Strengths,
    weaknesses: t2Weaknesses,
    recentResults: getRecentResults(team2Id.value as number)
  }
}

function getRecentResults(rosterId: number): string[] {
  if (!selectedSeason.value || !selectedWeek.value) return []
  
  const matchups = leagueStore.historicalMatchups.get(selectedSeason.value)
  if (!matchups) return []
  
  const week = parseInt(selectedWeek.value)
  const results: string[] = []
  
  for (let w = week - 1; w >= Math.max(1, week - 3); w--) {
    const weekMatchups = matchups.get(w)
    if (!weekMatchups) continue
    
    const myMatch = weekMatchups.find(m => m.roster_id === rosterId)
    if (!myMatch?.matchup_id) continue
    
    const opponent = weekMatchups.find(m => 
      m.matchup_id === myMatch.matchup_id && m.roster_id !== rosterId
    )
    
    if (opponent) {
      const myPoints = myMatch.points || 0
      const oppPoints = opponent.points || 0
      results.unshift(myPoints > oppPoints ? 'W' : 'L')
    }
  }
  
  return results
}

onMounted(() => {
  if (leagueStore.historicalSeasons.length > 0) {
    selectedSeason.value = leagueStore.historicalSeasons[0].season
  }
})
</script>

<style scoped>
.select {
  @apply px-4 py-2 bg-dark-border rounded-lg text-dark-text border border-dark-border/50 focus:border-primary focus:outline-none;
}
</style>
