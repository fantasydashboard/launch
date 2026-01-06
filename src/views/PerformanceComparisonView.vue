<template>
  <div class="space-y-6">
    <!-- Header with Settings -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Performance Comparisons</h1>
        <p class="text-base text-dark-textMuted">
          Compare any two teams head-to-head across all seasons
        </p>
      </div>
      <!-- Settings Gear -->
      <button 
        @click="showSettings = !showSettings"
        class="p-2 rounded-lg bg-dark-border/30 hover:bg-dark-border/50 transition-colors"
        title="Settings"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-dark-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>

    <!-- Settings Panel -->
    <div v-if="showSettings" class="card">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl">⚙️</span>
          <h2 class="card-title">Comparison Settings</h2>
        </div>
      </div>
      <div class="card-body">
        <div class="flex items-center justify-between p-3 bg-dark-border/20 rounded-lg">
          <div>
            <div class="font-semibold text-dark-text">Include Consolation Games</div>
            <div class="text-sm text-dark-textMuted">
              Include toilet bowl, consolation bracket, and consolation playoff games
            </div>
          </div>
          <button 
            @click="includeConsolation = !includeConsolation; loadComparison()"
            :class="includeConsolation ? 'bg-primary' : 'bg-dark-border'"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          >
            <span 
              :class="includeConsolation ? 'translate-x-6' : 'translate-x-1'"
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            />
          </button>
        </div>
        <p v-if="includeConsolation" class="mt-3 text-sm text-yellow-400">
          ⚠️ Consolation games are now included in all statistics and rivalry history
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
            <select v-model="team1Id" @change="loadComparison" class="select w-full">
              <option value="">Select Team...</option>
              <option v-for="team in allTeams" :key="team.roster_id" :value="team.roster_id">
                {{ team.name }} ({{ team.owner }})
              </option>
            </select>
          </div>

          <!-- Team 2 Selector -->
          <div>
            <label class="block text-sm font-semibold text-dark-text mb-2">Team 2</label>
            <select v-model="team2Id" @change="loadComparison" class="select w-full">
              <option value="">Select Team...</option>
              <option v-for="team in allTeams" :key="team.roster_id" :value="team.roster_id">
                {{ team.name }} ({{ team.owner }})
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Comparison Results -->
    <template v-if="team1Id && team2Id && comparisonData">
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
          <p class="card-subtitle mt-2">Career head-to-head comparison</p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Team 1 Stats -->
            <div class="text-center p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl border-2 border-blue-500/30">
              <img :src="team1Data?.avatar" :alt="team1Data?.name" class="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-blue-500" @error="handleImageError" />
              <div class="font-bold text-2xl text-dark-text mb-1">{{ team1Data?.name }}</div>
              <div class="text-sm text-dark-textMuted mb-4">{{ team1Data?.owner }}</div>
              
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
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.allTimeWins }}-{{ comparisonData.team1.allTimeLosses }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Win %:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.winPercentage.toFixed(1) }}%</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Avg PPG:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.avgPPG.toFixed(1) }}</span>
                </div>
                <div class="flex justify-between border-t border-dark-border pt-2 mt-2">
                  <span class="text-dark-textMuted">Total Points:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.totalPointsFor.toFixed(0) }}</span>
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
                    <div class="text-4xl font-bold" :class="comparisonData.h2h.team1Wins > comparisonData.h2h.team2Wins ? 'text-green-400' : 'text-dark-textSecondary'">
                      {{ comparisonData.h2h.team1Wins }}
                    </div>
                    <div class="text-xs text-dark-textMuted">{{ team1Data?.name.split(' ')[0] }}</div>
                  </div>
                  <div class="text-3xl text-dark-textMuted">-</div>
                  <div class="text-center">
                    <div class="text-4xl font-bold" :class="comparisonData.h2h.team2Wins > comparisonData.h2h.team1Wins ? 'text-green-400' : 'text-dark-textSecondary'">
                      {{ comparisonData.h2h.team2Wins }}
                    </div>
                    <div class="text-xs text-dark-textMuted">{{ team2Data?.name.split(' ')[0] }}</div>
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
            <div class="text-center p-6 bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-xl border-2 border-red-500/30">
              <img :src="team2Data?.avatar" :alt="team2Data?.name" class="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-red-500" @error="handleImageError" />
              <div class="font-bold text-2xl text-dark-text mb-1">{{ team2Data?.name }}</div>
              <div class="text-sm text-dark-textMuted mb-4">{{ team2Data?.owner }}</div>
              
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
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.allTimeWins }}-{{ comparisonData.team2.allTimeLosses }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Win %:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.winPercentage.toFixed(1) }}%</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Avg PPG:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.avgPPG.toFixed(1) }}</span>
                </div>
                <div class="flex justify-between border-t border-dark-border pt-2 mt-2">
                  <span class="text-dark-textMuted">Total Points:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.totalPointsFor.toFixed(0) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rivalry Highlights (moved up) -->
      <div v-if="rivalryHighlights" class="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      <!-- Recent Matchups Chart (was Performance Timeline) -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📈</span>
            <h2 class="card-title">Recent Matchups</h2>
          </div>
          <p class="card-subtitle mt-2">Last {{ recentMatchups.length }} head-to-head meetings</p>
        </div>
        <div class="card-body">
          <div v-if="recentMatchups.length > 0" id="recent-matchups-chart" class="w-full" style="height: 350px;"></div>
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
          <p class="card-subtitle mt-2">All head-to-head matchups ({{ includeConsolation ? 'including consolation' : 'excluding consolation' }})</p>
        </div>
        <div class="card-body">
          <div v-if="rivalryHistory.length === 0" class="text-center py-8 text-dark-textMuted">
            No head-to-head matchups found
          </div>
          <div v-else class="space-y-3">
            <div v-for="matchup in rivalryHistory" :key="`${matchup.season}-${matchup.week}`"
                 class="p-4 bg-dark-border/20 rounded-lg border border-dark-border">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="text-sm">
                    <span class="font-semibold text-dark-text">{{ matchup.season }}</span>
                    <span class="text-dark-textMuted ml-1">Week {{ matchup.week }}</span>
                    <span v-if="matchup.isPlayoff" class="ml-2 px-2 py-0.5 bg-primary/20 text-primary text-xs rounded">
                      Playoff
                    </span>
                    <span v-if="matchup.isConsolation" class="ml-2 px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded">
                      Consolation
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-6">
                  <div class="text-right">
                    <div class="text-xs text-dark-textMuted">{{ team1Data?.name.split(' ')[0] }}</div>
                    <div class="font-bold text-lg" :class="matchup.team1Score > matchup.team2Score ? 'text-green-400' : 'text-dark-text'">
                      {{ matchup.team1Score.toFixed(1) }}
                    </div>
                  </div>
                  <div class="text-dark-textMuted">vs</div>
                  <div class="text-left">
                    <div class="text-xs text-dark-textMuted">{{ team2Data?.name.split(' ')[0] }}</div>
                    <div class="font-bold text-lg" :class="matchup.team2Score > matchup.team1Score ? 'text-green-400' : 'text-dark-text'">
                      {{ matchup.team2Score.toFixed(1) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
              Get access to head-to-head records, rivalry history, career statistics, and matchup charts for any two teams in your league.
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

    <div v-else class="card">
      <div class="card-body text-center py-12">
        <p class="text-dark-textMuted">Select two teams to compare their performance</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { sleeperService } from '@/services/sleeper'
import ApexCharts from 'apexcharts'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import SimulatedDataBanner from '@/components/SimulatedDataBanner.vue'

const leagueStore = useLeagueStore()
const { hasLeagueAccess } = useFeatureAccess()

// Chart instance reference
let chartInstance: ApexCharts | null = null

// State
const team1Id = ref<number | ''>('')
const team2Id = ref<number | ''>('')
const showSettings = ref(false)
const includeConsolation = ref(false)

interface TeamInfo {
  roster_id: number
  user_id: string
  name: string
  owner: string
  avatar: string
}

interface TeamCareerStats {
  championships: number
  playoffAppearances: number
  allTimeWins: number
  allTimeLosses: number
  allTimeTies: number
  winPercentage: number
  avgPPG: number
  totalPointsFor: number
  totalPointsAgainst: number
}

interface HeadToHeadStats {
  team1Wins: number
  team2Wins: number
  ties: number
  totalGames: number
  avgMargin: number
  playoffMeetings: number
}

interface ComparisonData {
  team1: TeamCareerStats
  team2: TeamCareerStats
  h2h: HeadToHeadStats
}

interface RivalryMatchup {
  season: string
  week: number
  team1Score: number
  team2Score: number
  margin: number
  isPlayoff: boolean
  isConsolation: boolean
  isComplete: boolean
}

const allTeams = ref<TeamInfo[]>([])
const team1Data = ref<TeamInfo | null>(null)
const team2Data = ref<TeamInfo | null>(null)
const comparisonData = ref<ComparisonData | null>(null)
const rivalryHistory = ref<RivalryMatchup[]>([])
const rivalryHighlights = ref<any>(null)
const recentMatchups = ref<RivalryMatchup[]>([])

// Functions
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'https://sleepercdn.com/avatars/thumbs/default'
}

function loadAllTeams() {
  const teamsMap = new Map<string, TeamInfo>()
  
  leagueStore.historicalSeasons.forEach(seasonInfo => {
    const rosters = leagueStore.historicalRosters.get(seasonInfo.season) || []
    const users = leagueStore.historicalUsers.get(seasonInfo.season) || []
    
    rosters.forEach(roster => {
      const user = users.find(u => u.user_id === roster.owner_id)
      const key = roster.owner_id
      
      if (!teamsMap.has(key)) {
        teamsMap.set(key, {
          roster_id: roster.roster_id,
          user_id: roster.owner_id,
          name: sleeperService.getTeamName(roster, user),
          owner: user?.display_name || 'Unknown',
          avatar: sleeperService.getAvatarUrl(roster, user, seasonInfo)
        })
      }
    })
  })
  
  allTeams.value = Array.from(teamsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Check if a game is complete (not in progress)
 */
function isGameComplete(matchup: any): boolean {
  // A game is complete if both teams have points > 0
  // This is a simple heuristic - games in progress may have 0 points
  return (matchup.points || 0) > 0
}

/**
 * Check if a matchup is a consolation game using bracket data
 */
function isConsolationGame(
  week: number, 
  playoffStart: number, 
  rosterId1: number, 
  rosterId2: number,
  bracketData: any[] | undefined
): boolean {
  if (week < playoffStart) return false // Regular season
  if (!bracketData || bracketData.length === 0) return true // No bracket = assume consolation
  
  const playoffWeek = week - playoffStart + 1 // 1-indexed playoff week
  
  // Find matchups in this round that don't have a placement field
  const roundMatchups = bracketData.filter(m => m.r === playoffWeek)
  
  // Check if both teams are in a main bracket (non-placement) game together
  for (const bracketMatch of roundMatchups) {
    const teamsInMatch = [bracketMatch.t1, bracketMatch.t2].filter(Boolean)
    
    if (teamsInMatch.includes(rosterId1) && teamsInMatch.includes(rosterId2)) {
      // Found the bracket matchup - check if it's a placement game
      if (bracketMatch.p !== undefined && bracketMatch.p !== null) {
        return true // Has placement field = consolation/placement game
      }
      return false // No placement field = main bracket game
    }
  }
  
  // If not found in bracket for this round, it's likely a consolation game
  return true
}

/**
 * Check if a team made the playoffs using bracket data
 */
function teamMadePlayoffs(
  rosterId: number,
  bracketData: any[] | undefined
): boolean {
  if (!bracketData || bracketData.length === 0) return false
  
  // Check if team appears in round 1 of winners bracket (no 'p' field)
  const round1Matchups = bracketData.filter(m => m.r === 1 && m.p === undefined)
  
  for (const matchup of round1Matchups) {
    if (matchup.t1 === rosterId || matchup.t2 === rosterId) {
      return true
    }
  }
  
  return false
}

async function loadComparison() {
  if (!team1Id.value || !team2Id.value) {
    comparisonData.value = null
    return
  }
  
  team1Data.value = allTeams.value.find(t => t.roster_id === team1Id.value) || null
  team2Data.value = allTeams.value.find(t => t.roster_id === team2Id.value) || null
  
  if (!team1Data.value || !team2Data.value) return
  
  // Calculate career stats for both teams
  const team1Stats = await calculateCareerStats(team1Data.value.user_id)
  const team2Stats = await calculateCareerStats(team2Data.value.user_id)
  
  // Calculate head-to-head stats
  const h2hStats = await calculateHeadToHead(team1Data.value.user_id, team2Data.value.user_id)
  
  comparisonData.value = {
    team1: team1Stats,
    team2: team2Stats,
    h2h: h2hStats
  }
  
  // Build rivalry history
  buildRivalryHistory()
  
  // Build recent matchups chart
  buildRecentMatchupsChart()
}

async function calculateCareerStats(userId: string): Promise<TeamCareerStats> {
  let championships = 0
  let playoffAppearances = 0
  let allTimeWins = 0
  let allTimeLosses = 0
  let allTimeTies = 0
  let totalPointsFor = 0
  let totalPointsAgainst = 0
  
  for (const seasonInfo of leagueStore.historicalSeasons) {
    const rosters = leagueStore.historicalRosters.get(seasonInfo.season) || []
    const matchups = leagueStore.historicalMatchups.get(seasonInfo.season)
    const bracket = leagueStore.historicalBrackets.get(seasonInfo.season)
    if (!matchups) continue
    
    const roster = rosters.find(r => r.owner_id === userId)
    if (!roster) continue
    
    let seasonWins = 0
    let seasonLosses = 0
    let seasonTies = 0
    let seasonPointsFor = 0
    let seasonPointsAgainst = 0
    
    const playoffStart = seasonInfo.settings?.playoff_week_start || 15
    
    matchups.forEach((weekMatchups, week) => {
      const myMatch = weekMatchups.find(m => m.roster_id === roster.roster_id)
      if (!myMatch?.matchup_id) return
      
      // Skip games in progress
      if (!isGameComplete(myMatch)) return
      
      const opponent = weekMatchups.find(m => 
        m.matchup_id === myMatch.matchup_id && m.roster_id !== roster.roster_id
      )
      
      if (!opponent) return
      if (!isGameComplete(opponent)) return
      
      const myPoints = myMatch.points || 0
      const oppPoints = opponent.points || 0
      
      // Only count regular season for W/L and points
      if (week < playoffStart) {
        seasonPointsFor += myPoints
        seasonPointsAgainst += oppPoints
        
        if (myPoints > oppPoints) seasonWins++
        else if (myPoints < oppPoints) seasonLosses++
        else seasonTies++
      }
    })
    
    allTimeWins += seasonWins
    allTimeLosses += seasonLosses
    allTimeTies += seasonTies
    totalPointsFor += seasonPointsFor
    totalPointsAgainst += seasonPointsAgainst
    
    // Check for championship using bracket data
    if (bracket) {
      const champRosterId = sleeperService.getChampionFromBracket(bracket)
      if (champRosterId === roster.roster_id) {
        championships++
      }
    }
    
    // Check for playoff appearance using bracket data
    if (bracket && teamMadePlayoffs(roster.roster_id, bracket)) {
      playoffAppearances++
    }
  }
  
  const totalGames = allTimeWins + allTimeLosses + allTimeTies
  const winPercentage = totalGames > 0 ? (allTimeWins / totalGames) * 100 : 0
  const avgPPG = totalGames > 0 ? totalPointsFor / totalGames : 0
  
  return {
    championships,
    playoffAppearances,
    allTimeWins,
    allTimeLosses,
    allTimeTies,
    winPercentage,
    avgPPG,
    totalPointsFor,
    totalPointsAgainst
  }
}

async function calculateHeadToHead(user1Id: string, user2Id: string): Promise<HeadToHeadStats> {
  let team1Wins = 0
  let team2Wins = 0
  let ties = 0
  let totalPoints = 0
  let gamesCount = 0
  let playoffMeetings = 0
  
  for (const seasonInfo of leagueStore.historicalSeasons) {
    const rosters = leagueStore.historicalRosters.get(seasonInfo.season) || []
    const matchups = leagueStore.historicalMatchups.get(seasonInfo.season)
    const bracket = leagueStore.historicalBrackets.get(seasonInfo.season)
    if (!matchups) continue
    
    const roster1 = rosters.find(r => r.owner_id === user1Id)
    const roster2 = rosters.find(r => r.owner_id === user2Id)
    if (!roster1 || !roster2) continue
    
    const playoffStart = seasonInfo.settings?.playoff_week_start || 15
    
    matchups.forEach((weekMatchups, week) => {
      const match1 = weekMatchups.find(m => m.roster_id === roster1.roster_id)
      const match2 = weekMatchups.find(m => m.roster_id === roster2.roster_id)
      
      if (!match1 || !match2) return
      if (match1.matchup_id !== match2.matchup_id) return
      
      // Skip games in progress
      if (!isGameComplete(match1) || !isGameComplete(match2)) return
      
      const score1 = match1.points || 0
      const score2 = match2.points || 0
      
      // Check if this is a consolation game
      const isConsolation = isConsolationGame(
        week, 
        playoffStart, 
        roster1.roster_id, 
        roster2.roster_id, 
        bracket
      )
      
      // Skip consolation games unless setting is enabled
      if (isConsolation && !includeConsolation.value) return
      
      gamesCount++
      totalPoints += Math.abs(score1 - score2)
      
      // Count playoff meetings (only real playoff games, not consolation)
      if (week >= playoffStart && !isConsolation) {
        playoffMeetings++
      }
      
      if (score1 > score2) team1Wins++
      else if (score2 > score1) team2Wins++
      else ties++
    })
  }
  
  const avgMargin = gamesCount > 0 ? totalPoints / gamesCount : 0
  
  return {
    team1Wins,
    team2Wins,
    ties,
    totalGames: gamesCount,
    avgMargin,
    playoffMeetings
  }
}

function buildRivalryHistory() {
  if (!team1Data.value || !team2Data.value) return
  
  const history: RivalryMatchup[] = []
  
  for (const seasonInfo of leagueStore.historicalSeasons) {
    const rosters = leagueStore.historicalRosters.get(seasonInfo.season) || []
    const matchups = leagueStore.historicalMatchups.get(seasonInfo.season)
    const bracket = leagueStore.historicalBrackets.get(seasonInfo.season)
    if (!matchups) continue
    
    const roster1 = rosters.find(r => r.owner_id === team1Data.value!.user_id)
    const roster2 = rosters.find(r => r.owner_id === team2Data.value!.user_id)
    if (!roster1 || !roster2) continue
    
    const playoffStart = seasonInfo.settings?.playoff_week_start || 15
    
    matchups.forEach((weekMatchups, week) => {
      const match1 = weekMatchups.find(m => m.roster_id === roster1.roster_id)
      const match2 = weekMatchups.find(m => m.roster_id === roster2.roster_id)
      
      if (!match1 || !match2) return
      if (match1.matchup_id !== match2.matchup_id) return
      
      // Skip games in progress
      if (!isGameComplete(match1) || !isGameComplete(match2)) return
      
      const score1 = match1.points || 0
      const score2 = match2.points || 0
      
      const isConsolation = isConsolationGame(
        week, 
        playoffStart, 
        roster1.roster_id, 
        roster2.roster_id, 
        bracket
      )
      
      // Skip consolation games unless setting is enabled
      if (isConsolation && !includeConsolation.value) return
      
      history.push({
        season: seasonInfo.season,
        week,
        team1Score: score1,
        team2Score: score2,
        margin: Math.abs(score1 - score2),
        isPlayoff: week >= playoffStart && !isConsolation,
        isConsolation,
        isComplete: true
      })
    })
  }
  
  rivalryHistory.value = history.sort((a, b) => {
    if (b.season !== a.season) return b.season.localeCompare(a.season)
    return b.week - a.week
  })
  
  // Calculate highlights
  if (history.length > 0) {
    const biggestBlowout = [...history].sort((a, b) => b.margin - a.margin)[0]
    const closestGame = [...history].sort((a, b) => a.margin - b.margin)[0]
    const highestScoring = [...history].sort((a, b) => 
      (b.team1Score + b.team2Score) - (a.team1Score + a.team2Score)
    )[0]
    
    rivalryHighlights.value = {
      biggestBlowout: {
        winner: biggestBlowout.team1Score > biggestBlowout.team2Score ? team1Data.value.name : team2Data.value.name,
        margin: biggestBlowout.margin,
        season: biggestBlowout.season,
        week: biggestBlowout.week
      },
      closestGame: {
        winner: closestGame.team1Score > closestGame.team2Score ? team1Data.value.name : team2Data.value.name,
        margin: closestGame.margin,
        season: closestGame.season,
        week: closestGame.week
      },
      highestScoring: {
        totalPoints: highestScoring.team1Score + highestScoring.team2Score,
        score: `${highestScoring.team1Score.toFixed(1)} - ${highestScoring.team2Score.toFixed(1)}`,
        season: highestScoring.season,
        week: highestScoring.week
      }
    }
  } else {
    rivalryHighlights.value = null
  }
  
  // Get recent matchups for chart (last 7)
  recentMatchups.value = history.slice(0, 7).reverse()
}

function buildRecentMatchupsChart() {
  if (recentMatchups.value.length === 0) return
  
  // Use nextTick to ensure DOM is ready
  nextTick(() => {
    const chartElement = document.getElementById('recent-matchups-chart')
    if (!chartElement) {
      console.log('Chart element not found')
      return
    }
    
    // Destroy existing chart if any
    if (chartInstance) {
      chartInstance.destroy()
      chartInstance = null
    }
    
    // Clear the element
    chartElement.innerHTML = ''
    
    const options = {
      chart: {
        type: 'line' as const,
        height: 350,
        background: 'transparent',
        toolbar: { show: false }
      },
      series: [
        {
          name: team1Data.value?.name || 'Team 1',
          data: recentMatchups.value.map(m => m.team1Score)
        },
        {
          name: team2Data.value?.name || 'Team 2',
          data: recentMatchups.value.map(m => m.team2Score)
        }
      ],
      colors: ['#3b82f6', '#ef4444'],
      xaxis: {
        categories: recentMatchups.value.map(m => `${m.season.slice(-2)} W${m.week}`),
        labels: { 
          style: { colors: '#9ca3af' }
        }
      },
      yaxis: {
        labels: { 
          style: { colors: '#9ca3af' },
          formatter: (val: number) => Math.round(val).toString()
        }
      },
      stroke: { width: 3, curve: 'smooth' as const },
      markers: { size: 6 },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => val.toFixed(1),
        style: {
          fontSize: '11px',
          colors: ['#ffffff']
        },
        background: {
          enabled: true,
          foreColor: '#1f2937',
          borderRadius: 3,
          padding: 4,
          opacity: 0.9
        },
        offsetY: -8
      },
      grid: { borderColor: '#374151' },
      legend: {
        position: 'top' as const,
        labels: { colors: '#d1d5db' }
      },
      theme: { mode: 'dark' as const },
      tooltip: { 
        theme: 'dark',
        y: {
          formatter: (val: number) => val.toFixed(1) + ' pts'
        }
      }
    }
    
    chartInstance = new ApexCharts(chartElement, options)
    chartInstance.render()
  })
}

onMounted(() => {
  loadAllTeams()
})
</script>

<style scoped>
.select {
  @apply px-4 py-2 bg-dark-border rounded-lg text-dark-text border border-dark-border/50 focus:border-primary focus:outline-none;
}
</style>
