<template>
  <div class="space-y-6">
    <!-- Header with Controls -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Power Rankings</h1>
        <p class="text-base text-dark-textMuted">
          Comprehensive team rankings based on performance metrics
        </p>
      </div>
      <div class="flex items-center gap-3">
        <select v-model="selectedSeason" @change="onSeasonChange" class="select">
          <option v-for="season in leagueStore.historicalSeasons" :key="season.season" :value="season.season">
            {{ season.season }} Season
          </option>
        </select>
        <select v-model="selectedWeek" @change="loadPowerRankings" class="select">
          <option value="">Select Week...</option>
          <option v-for="week in availableWeeks" :key="week" :value="week">
            Through Week {{ week }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
    </div>

    <template v-else-if="powerRankings.length > 0">
      <!-- Top Row: Power Rankings Table + AI Breakdown -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Power Rankings Table (2/3 width) -->
        <div class="lg:col-span-2 card">
          <div class="card-header flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-2xl">⚡</span>
                <h2 class="card-title">Power Rankings - Week {{ selectedWeek }}</h2>
              </div>
              <p class="card-subtitle mt-2">
                Formula: Record (35%) + Total Points (25%) + All-Play Record (20%) + Recent Form (15%) + Consistency (5%)
              </p>
            </div>
            <button @click="downloadRankingsImage" class="btn-primary flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Share
            </button>
          </div>
          <div class="card-body overflow-x-auto scrollbar-thin">
            <table class="table">
              <thead>
                <tr>
                  <th class="w-20">Rank</th>
                  <th class="w-24">Change</th>
                  <th>Team</th>
                  <th class="w-32">Power Score</th>
                  <th class="w-28">Record</th>
                  <th class="w-32">Total Points</th>
                  <th class="w-32">All-Play</th>
                  <th class="w-32">Recent Avg</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(team, idx) in powerRankings" :key="team.roster_id">
                  <td>
                    <div class="flex items-center justify-center">
                      <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {{ idx + 1 }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div class="flex items-center justify-center">
                      <span v-if="team.change > 0" class="text-green-400 font-semibold flex items-center gap-1">
                        ⬆ {{ team.change }}
                      </span>
                      <span v-else-if="team.change < 0" class="text-red-400 font-semibold flex items-center gap-1">
                        ⬇ {{ Math.abs(team.change) }}
                      </span>
                      <span v-else class="text-dark-textMuted">—</span>
                    </div>
                  </td>
                  <td>
                    <div class="flex items-center gap-3">
                      <div class="w-12 h-12 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                        <img
                          :src="team.avatar_url"
                          :alt="team.team_name"
                          class="w-full h-full object-cover"
                          @error="handleImageError"
                        />
                      </div>
                      <span class="font-semibold text-dark-text">
                        {{ team.team_name }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span class="text-lg font-bold text-primary">
                      {{ team.powerScore.toFixed(1) }}
                    </span>
                  </td>
                  <td>
                    <span class="text-dark-textSecondary font-medium">
                      {{ team.wins }}-{{ team.losses }}{{ team.ties > 0 ? `-${team.ties}` : '' }}
                    </span>
                  </td>
                  <td>
                    <span class="text-dark-text font-medium">
                      {{ team.totalPointsFor.toFixed(1) }}
                    </span>
                  </td>
                  <td>
                    <span class="text-dark-textSecondary">
                      {{ team.allPlayWins }}-{{ team.allPlayLosses }}
                    </span>
                  </td>
                  <td>
                    <span class="text-dark-textSecondary">
                      {{ team.recentAvg.toFixed(1) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- AI Breakdown Card (1/3 width) -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🤖</span>
              <h2 class="card-title">AI Analysis</h2>
            </div>
          </div>
          <div class="card-body">
            <div v-if="aiBreakdown" class="space-y-4">
              <div class="text-sm text-dark-text leading-relaxed whitespace-pre-wrap">
                {{ aiBreakdown }}
              </div>
              <button @click="generateAIBreakdown" class="text-primary hover:text-yellow-600 text-sm font-semibold transition-colors">
                Regenerate Analysis →
              </button>
            </div>
            <div v-else-if="isGeneratingAI" class="text-center py-12">
              <div class="animate-spin rounded-full h-12 w-12 border-b-4 border-primary mx-auto mb-4"></div>
              <p class="text-dark-textMuted text-sm">Generating AI analysis...</p>
            </div>
            <div v-else class="text-center py-12">
              <div class="text-gray-300 dark:text-gray-600 mb-4">
                <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p class="text-dark-textMuted text-sm mb-4">
                Get AI-powered insights on this week's power rankings
              </p>
              <button @click="generateAIBreakdown" class="text-primary hover:text-yellow-600 text-sm font-semibold transition-colors">
                Generate Analysis →
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Power Score Trend Chart -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">Power Score Trends</h2>
          </div>
          <p class="card-subtitle">Track how power scores have evolved throughout the season</p>
        </div>
        <div class="card-body">
          <apexchart
            v-if="chartOptions"
            type="line"
            height="450"
            :options="chartOptions"
            :series="chartSeries"
          />
        </div>
      </div>
    </template>

    <div v-else class="card">
      <div class="card-body text-center py-12">
        <p class="text-dark-textMuted">Select a season and week to view power rankings</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { sleeperService } from '@/services/sleeper'
import type { SleeperRoster, SleeperMatchup } from '@/types/sleeper'
import { calculateAllPlayRecord } from '@/utils/calculations'
import { getOptimalLineupProjection, calculateAverageProjection, getPositionProjections } from '@/utils/projections'
import html2canvas from 'html2canvas'
import ApexCharts from 'apexcharts'

const leagueStore = useLeagueStore()

// State
const selectedSeason = ref('')
const selectedWeek = ref('')
const isLoading = ref(false)
const powerRankings = ref<any[]>([])
const historicalPowerRanks = ref<Map<number, number[]>>(new Map())
const aiBreakdown = ref<string>('')
const isGeneratingAI = ref(false)

interface PowerRankingData {
  roster_id: number
  team_name: string
  avatar_url: string
  powerScore: number
  avgScore: number
  wins: number
  losses: number
  ties: number
  totalPointsFor: number
  allPlayWins: number
  allPlayLosses: number
  recentAvg: number
  stdDev: number
  weekCount: number
  change: number
  prevRank: number
}

// Computed
const availableWeeks = computed(() => {
  if (!selectedSeason.value) return []
  
  const matchups = leagueStore.historicalMatchups.get(selectedSeason.value)
  if (!matchups) return []
  
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  const playoffStart = seasonInfo?.settings?.playoff_week_start || 15
  
  return Array.from(matchups.keys())
    .filter(w => w < playoffStart && w >= 3) // Start from week 3 (need 3 weeks of data)
    .sort((a, b) => a - b)
})

// Chart configuration
const chartOptions = computed(() => {
  if (powerRankings.value.length === 0) return null

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
    colors: powerRankings.value.map((_, idx) => getTeamColor(idx)),
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
      max: powerRankings.value.length,
      labels: {
        style: {
          colors: '#9ca3af'
        },
        formatter: (value: number) => `#${Math.round(value)}`
      },
      title: {
        text: 'Power Rank',
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
      intersect: false
    },
    grid: {
      borderColor: '#374151'
    }
  }
})

const chartSeries = computed(() => {
  if (powerRankings.value.length === 0) return []

  return powerRankings.value.map(team => {
    const ranks = historicalPowerRanks.value.get(team.roster_id) || []
    return {
      name: team.team_name,
      data: ranks
    }
  })
})

// Methods
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'https://sleepercdn.com/avatars/thumbs/default'
}

function getWeekLabels(): string[] {
  const startWeek = 3
  const endWeek = parseInt(selectedWeek.value)
  const weeks = []
  for (let i = startWeek; i <= endWeek; i++) {
    weeks.push(`Week ${i}`)
  }
  return weeks
}

function getTeamColor(idx: number): string {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#f43f5e'
  ]
  return colors[idx % colors.length]
}

function calculatePowerScoreForWeek(
  rosters: SleeperRoster[],
  users: any[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  throughWeek: number,
  playoffStart: number,
  league: any
): PowerRankingData[] {
  const rankings: PowerRankingData[] = []

  rosters.forEach(roster => {
    const user = users.find(u => u.user_id === roster.owner_id)
    
    // 1. Calculate actual W-L record through this week
    let wins = 0
    let losses = 0
    let ties = 0
    
    for (let week = 1; week <= throughWeek; week++) {
      if (week >= playoffStart) continue
      const matchups = matchupsByWeek.get(week) || []
      const myMatchup = matchups.find(m => m.roster_id === roster.roster_id)
      
      if (myMatchup && myMatchup.matchup_id) {
        const opponent = matchups.find(
          m => m.matchup_id === myMatchup.matchup_id && m.roster_id !== roster.roster_id
        )
        
        if (opponent) {
          if ((myMatchup.points || 0) > (opponent.points || 0)) wins++
          else if ((myMatchup.points || 0) < (opponent.points || 0)) losses++
          else ties++
        }
      }
    }
    
    // 2. Calculate total points for (offensive power)
    let totalPointsFor = 0
    let weekCount = 0
    const weeklyScores: number[] = []
    
    for (let week = 1; week <= throughWeek; week++) {
      if (week >= playoffStart) continue
      const matchups = matchupsByWeek.get(week) || []
      const myMatchup = matchups.find(m => m.roster_id === roster.roster_id)
      if (myMatchup && myMatchup.points) {
        totalPointsFor += myMatchup.points
        weeklyScores.push(myMatchup.points)
        weekCount++
      }
    }
    
    // 3. Calculate all-play record (true strength)
    let allPlayWins = 0
    let allPlayLosses = 0
    
    for (let week = 1; week <= throughWeek; week++) {
      if (week >= playoffStart) continue
      const matchups = matchupsByWeek.get(week) || []
      const myMatchup = matchups.find(m => m.roster_id === roster.roster_id)
      
      if (myMatchup) {
        const myPoints = myMatchup.points || 0
        matchups.forEach(opponent => {
          if (opponent.roster_id !== roster.roster_id) {
            const oppPoints = opponent.points || 0
            if (myPoints > oppPoints) allPlayWins++
            else if (myPoints < oppPoints) allPlayLosses++
          }
        })
      }
    }
    
    // 4. Calculate recent form (last 3 weeks weighted)
    const recentWeeks = []
    for (let week = Math.max(1, throughWeek - 2); week <= throughWeek; week++) {
      if (week < playoffStart) recentWeeks.push(week)
    }
    
    let recentScore = 0
    let recentWeights = [3, 2, 1] // Most recent gets 3x weight
    
    recentWeeks.forEach((week, idx) => {
      const matchups = matchupsByWeek.get(week) || []
      const myMatchup = matchups.find(m => m.roster_id === roster.roster_id)
      if (myMatchup && myMatchup.points) {
        const weight = recentWeights[recentWeeks.length - 1 - idx] || 1
        recentScore += (myMatchup.points || 0) * weight
      }
    })
    
    const recentAvg = recentWeeks.length > 0 ? recentScore / recentWeeks.reduce((a, b) => a + recentWeights[recentWeeks.indexOf(b)] || 1, 0) : 0
    
    // 5. Calculate consistency (standard deviation - lower is better)
    let stdDev = 0
    if (weeklyScores.length > 1) {
      const mean = totalPointsFor / weekCount
      const squaredDiffs = weeklyScores.map(score => Math.pow(score - mean, 2))
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / weeklyScores.length
      stdDev = Math.sqrt(variance)
    }
    
    rankings.push({
      roster_id: roster.roster_id,
      team_name: sleeperService.getTeamName(roster, user),
      avatar_url: sleeperService.getAvatarUrl(roster, user, league),
      powerScore: 0,
      avgScore: weekCount > 0 ? totalPointsFor / weekCount : 0,
      wins,
      losses,
      ties,
      totalPointsFor,
      allPlayWins,
      allPlayLosses,
      recentAvg,
      stdDev,
      weekCount,
      change: 0,
      prevRank: 0
    })
  })
  
  // Calculate normalized scores for each component
  const maxWins = Math.max(...rankings.map(r => r.wins))
  const maxPointsFor = Math.max(...rankings.map(r => r.totalPointsFor))
  const maxAllPlayWins = Math.max(...rankings.map(r => r.allPlayWins))
  const maxRecentAvg = Math.max(...rankings.map(r => r.recentAvg))
  const maxStdDev = Math.max(...rankings.map(r => r.stdDev))
  
  rankings.forEach(team => {
    // Component 1: Record Score (35%)
    const totalGames = team.wins + team.losses + team.ties
    const winPct = totalGames > 0 ? (team.wins + team.ties * 0.5) / totalGames : 0
    const recordScore = winPct * 100
    
    // Component 2: Points For Score (25%)
    const pointsScore = maxPointsFor > 0 ? (team.totalPointsFor / maxPointsFor) * 100 : 0
    
    // Component 3: All-Play Record (20%)
    const allPlayTotal = team.allPlayWins + team.allPlayLosses
    const allPlayPct = allPlayTotal > 0 ? team.allPlayWins / allPlayTotal : 0
    const allPlayScore = allPlayPct * 100
    
    // Component 4: Recent Form (15%)
    const recentScore = maxRecentAvg > 0 ? (team.recentAvg / maxRecentAvg) * 100 : 0
    
    // Component 5: Consistency (5%) - inverted, lower stdDev is better
    const consistencyScore = maxStdDev > 0 ? ((maxStdDev - team.stdDev) / maxStdDev) * 100 : 50
    
    // Final Power Score
    team.powerScore = (
      recordScore * 0.35 +
      pointsScore * 0.25 +
      allPlayScore * 0.20 +
      recentScore * 0.15 +
      consistencyScore * 0.05
    )
  })
  
  // Sort by power score
  rankings.sort((a, b) => b.powerScore - a.powerScore)
  
  return rankings
}

async function loadPowerRankings() {
  if (!selectedSeason.value || !selectedWeek.value) return
  
  isLoading.value = true
  aiBreakdown.value = '' // Clear AI breakdown when changing weeks
  
  try {
    const season = selectedSeason.value
    const rosters = leagueStore.historicalRosters.get(season) || []
    const users = leagueStore.historicalUsers.get(season) || []
    const matchupsByWeek = leagueStore.historicalMatchups.get(season) || new Map()
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === season)
    
    if (!seasonInfo) return
    
    const playoffStart = seasonInfo.settings?.playoff_week_start || 15
    const throughWeek = parseInt(selectedWeek.value)
    
    // Calculate current week rankings
    const currentRankings = calculatePowerScoreForWeek(
      rosters,
      users,
      matchupsByWeek,
      throughWeek,
      playoffStart,
      seasonInfo
    )
    
    // Calculate previous week rankings for change indicator
    if (throughWeek > 3) {
      const previousRankings = calculatePowerScoreForWeek(
        rosters,
        users,
        matchupsByWeek,
        throughWeek - 1,
        playoffStart,
        seasonInfo
      )
      
      currentRankings.forEach((team, idx) => {
        const prevIdx = previousRankings.findIndex(t => t.roster_id === team.roster_id)
        team.change = prevIdx - idx
        team.prevRank = prevIdx + 1
      })
    }
    
    // Calculate historical power RANKS (not scores) for chart
    const ranksByTeam = new Map<number, number[]>()
    
    for (let week = 3; week <= throughWeek; week++) {
      const weekRankings = calculatePowerScoreForWeek(
        rosters,
        users,
        matchupsByWeek,
        week,
        playoffStart,
        seasonInfo
      )
      
      weekRankings.forEach((team, idx) => {
        if (!ranksByTeam.has(team.roster_id)) {
          ranksByTeam.set(team.roster_id, [])
        }
        ranksByTeam.get(team.roster_id)!.push(idx + 1) // Store rank (1-based), not score
      })
    }
    
    historicalPowerRanks.value = ranksByTeam
    powerRankings.value = currentRankings
  } catch (error) {
    console.error('Failed to calculate power rankings:', error)
  } finally {
    isLoading.value = false
  }
}

async function generateAIBreakdown() {
  if (!powerRankings.value.length) return
  
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    alert('OpenAI API key not configured. Add VITE_OPENAI_API_KEY to your .env file.')
    return
  }
  
  isGeneratingAI.value = true
  
  try {
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
    const leagueName = seasonInfo?.name || 'League'
    
    const prompt = `You are a witty fantasy football analyst. Write a 150-200 word analysis of these Week ${selectedWeek.value} Power Rankings for ${leagueName}:

${powerRankings.value.slice(0, 8).map((team, idx) => 
  `${idx + 1}. ${team.team_name} (${team.wins}-${team.losses}) - ${team.powerScore.toFixed(1)} pts${team.change !== 0 ? ` [${team.change > 0 ? '↑' : '↓'}${Math.abs(team.change)}]` : ''}`
).join('\n')}

Focus on:
- Who's surging/falling
- Playoff implications
- Surprising rankings
- Key matchups ahead

Keep it fun and engaging. No headers or bullet points - just conversational prose.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a witty fantasy football analyst writing engaging power rankings analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 300
      })
    })
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    aiBreakdown.value = data.choices[0]?.message?.content || 'Failed to generate analysis.'
  } catch (error) {
    console.error('Failed to generate AI breakdown:', error)
    aiBreakdown.value = 'Failed to generate AI analysis. Check console for details.'
  } finally {
    isGeneratingAI.value = false
  }
}

async function downloadRankingsImage() {
  // We'll use html2canvas to convert the rankings to an image
  const html2canvas = (await import('html2canvas')).default
  
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  const leagueName = seasonInfo?.name || 'League'
  
  // Pre-load all team images
  const imagePromises = powerRankings.value.map(team => {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve({ roster_id: team.roster_id, img })
      img.onerror = () => {
        // Use default on error
        const defaultImg = new Image()
        defaultImg.src = 'https://sleepercdn.com/avatars/thumbs/default'
        resolve({ roster_id: team.roster_id, img: defaultImg })
      }
      img.src = team.avatar_url
    })
  })
  
  const loadedImages = await Promise.all(imagePromises)
  const imageMap = new Map(loadedImages.map(item => [item.roster_id, item.img]))
  
  // Create a temporary container for the image
  const container = document.createElement('div')
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    width: 1000px;
    padding: 40px;
    background: radial-gradient(circle at top, #1c2030, #05060a 55%);
    color: #f7f7ff;
    font-family: system-ui, -apple-system, sans-serif;
  `
  
  // Split rankings into two columns (1-5 and 6-10)
  const firstHalf = powerRankings.value.slice(0, 5)
  const secondHalf = powerRankings.value.slice(5, 10)
  
  container.innerHTML = `
    <div style="background: linear-gradient(135deg, rgba(19, 22, 32, 0.98), rgba(10, 12, 20, 0.98)); border: 1px solid #2a2f42; border-radius: 16px; padding: 40px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 36px; font-weight: bold; color: #f5c451; margin: 0 0 8px 0;">${leagueName}</h1>
        <p style="font-size: 20px; color: #b0b3c2; margin: 0;">⚡ Power Rankings - Week ${selectedWeek.value}</p>
      </div>
      
      <!-- Two Column Rankings -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
        <!-- Left Column (1-5) -->
        <div>
          ${firstHalf.map((team, idx) => {
            const img = imageMap.get(team.roster_id)
            return `
              <div style="display: flex; align-items: center; padding: 16px; background: rgba(38, 42, 58, 0.5); border-radius: 12px; margin-bottom: 12px; position: relative;">
                <!-- Rank Badge -->
                <div style="width: 48px; height: 48px; background: rgba(245, 196, 81, 0.15); border: 2px solid #f5c451; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #f5c451; font-weight: bold; font-size: 22px; margin-right: 16px; flex-shrink: 0;">
                  ${idx + 1}
                </div>
                
                <!-- Team Logo -->
                <div id="logo-${team.roster_id}" style="width: 48px; height: 48px; border-radius: 50%; overflow: hidden; background: #262a3a; margin-right: 16px; flex-shrink: 0; border: 2px solid #3a3d52;"></div>
                
                <!-- Team Info -->
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 18px; font-weight: 600; color: #f7f7ff; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${team.team_name}</div>
                  <div style="font-size: 14px; color: #b0b3c2;">${team.wins}-${team.losses} • ${team.totalPointsFor.toFixed(0)} pts</div>
                </div>
                
                <!-- Power Score -->
                <div style="text-align: right; margin-left: 12px;">
                  <div style="font-size: 24px; font-weight: bold; color: #f5c451;">${team.powerScore.toFixed(1)}</div>
                  <div style="font-size: 11px; color: #7b7f92; text-transform: uppercase;">Power</div>
                </div>
                
                ${team.change !== 0 ? `
                  <div style="position: absolute; top: 8px; right: 8px; font-size: 14px; font-weight: 600; color: ${team.change > 0 ? '#10b981' : '#ef4444'}; background: ${team.change > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; padding: 4px 8px; border-radius: 6px;">
                    ${team.change > 0 ? '↑' : '↓'} ${Math.abs(team.change)}
                  </div>
                ` : ''}
              </div>
            `
          }).join('')}
        </div>
        
        <!-- Right Column (6-10) -->
        <div>
          ${secondHalf.map((team, idx) => {
            const actualRank = idx + 6
            const img = imageMap.get(team.roster_id)
            return `
              <div style="display: flex; align-items: center; padding: 16px; background: rgba(38, 42, 58, 0.5); border-radius: 12px; margin-bottom: 12px; position: relative;">
                <!-- Rank Badge -->
                <div style="width: 48px; height: 48px; background: rgba(245, 196, 81, 0.15); border: 2px solid #f5c451; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #f5c451; font-weight: bold; font-size: 22px; margin-right: 16px; flex-shrink: 0;">
                  ${actualRank}
                </div>
                
                <!-- Team Logo -->
                <div id="logo-${team.roster_id}" style="width: 48px; height: 48px; border-radius: 50%; overflow: hidden; background: #262a3a; margin-right: 16px; flex-shrink: 0; border: 2px solid #3a3d52;"></div>
                
                <!-- Team Info -->
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 18px; font-weight: 600; color: #f7f7ff; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${team.team_name}</div>
                  <div style="font-size: 14px; color: #b0b3c2;">${team.wins}-${team.losses} • ${team.totalPointsFor.toFixed(0)} pts</div>
                </div>
                
                <!-- Power Score -->
                <div style="text-align: right; margin-left: 12px;">
                  <div style="font-size: 24px; font-weight: bold; color: #f5c451;">${team.powerScore.toFixed(1)}</div>
                  <div style="font-size: 11px; color: #7b7f92; text-transform: uppercase;">Power</div>
                </div>
                
                ${team.change !== 0 ? `
                  <div style="position: absolute; top: 8px; right: 8px; font-size: 14px; font-weight: 600; color: ${team.change > 0 ? '#10b981' : '#ef4444'}; background: ${team.change > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; padding: 4px 8px; border-radius: 6px;">
                    ${team.change > 0 ? '↑' : '↓'} ${Math.abs(team.change)}
                  </div>
                ` : ''}
              </div>
            `
          }).join('')}
        </div>
      </div>
      
      <!-- Chart Container -->
      <div style="background: rgba(38, 42, 58, 0.5); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #f5c451; font-size: 18px; margin: 0 0 16px 0; text-align: center;">📈 Power Rankings Trend</h3>
        <div id="chart-container" style="height: 300px; position: relative;"></div>
      </div>
      
      <div style="margin-top: 24px; text-align: center; font-size: 12px; color: #7b7f92;">
        Generated by Fantasy Dashboard • Power Score Formula: Record (35%) + Points (25%) + All-Play (20%) + Recent (15%) + Consistency (5%)
      </div>
    </div>
  `
  
  document.body.appendChild(container)
  
  // Insert team logos as canvas elements
  powerRankings.value.forEach(team => {
    const logoDiv = container.querySelector(`#logo-${team.roster_id}`)
    if (logoDiv && imageMap.has(team.roster_id)) {
      const img = imageMap.get(team.roster_id)
      const canvas = document.createElement('canvas')
      canvas.width = 48
      canvas.height = 48
      const ctx = canvas.getContext('2d')
      
      // Draw circular clipped image
      ctx.beginPath()
      ctx.arc(24, 24, 24, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(img, 0, 0, 48, 48)
      
      logoDiv.appendChild(canvas)
    }
  })
  
  // Create chart using ApexCharts
  const chartContainer = container.querySelector('#chart-container')
  if (chartContainer && chartSeries.value.length > 0) {
    const chart = new ApexCharts(chartContainer, {
      chart: {
        type: 'line',
        height: 300,
        background: 'transparent',
        toolbar: { show: false },
        animations: { enabled: false }
      },
      series: chartSeries.value,
      colors: powerRankings.value.map((_, idx) => getTeamColor(idx)),
      stroke: {
        width: 3,
        curve: 'smooth'
      },
      xaxis: {
        categories: getWeekLabels(),
        labels: {
          style: {
            colors: '#9ca3af',
            fontSize: '11px'
          }
        }
      },
      yaxis: {
        reversed: true,
        min: 1,
        max: powerRankings.value.length,
        labels: {
          style: {
            colors: '#9ca3af',
            fontSize: '11px'
          },
          formatter: (value: number) => `#${Math.round(value)}`
        }
      },
      legend: {
        show: true,
        position: 'bottom',
        labels: {
          colors: '#9ca3af'
        },
        fontSize: '10px',
        markers: {
          width: 8,
          height: 8
        }
      },
      grid: {
        borderColor: '#374151',
        strokeDashArray: 4
      },
      tooltip: {
        enabled: false
      }
    })
    
    chart.render()
    
    // Wait for chart to render
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  try {
    const canvas = await html2canvas(container, {
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true
    })
    
    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `${leagueName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-power-rankings-week-${selectedWeek.value}.png`
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
      }
    })
  } finally {
    document.body.removeChild(container)
  }
}

function onSeasonChange() {
  selectedWeek.value = ''
  powerRankings.value = []
  
  // Auto-select most recent week
  if (availableWeeks.value.length > 0) {
    selectedWeek.value = availableWeeks.value[availableWeeks.value.length - 1].toString()
    loadPowerRankings()
  }
}

// Initialize
onMounted(() => {
  if (leagueStore.historicalSeasons.length > 0) {
    selectedSeason.value = leagueStore.historicalSeasons[0].season
    onSeasonChange()
  }
})

// Watch for league changes
watch(
  () => leagueStore.activeLeagueId,
  () => {
    if (leagueStore.historicalSeasons.length > 0) {
      selectedSeason.value = leagueStore.historicalSeasons[0].season
      onSeasonChange()
    }
  }
)
</script>
