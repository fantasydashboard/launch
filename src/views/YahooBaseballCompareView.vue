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
      <LoadingSpinner size="lg" />
    </div>

    <!-- Comparison Results -->
    <template v-if="!isLoading && comparisonData">
      <!-- Simulated Data Banner for free users -->
      <SimulatedDataBanner v-if="!hasLeagueAccess" class="mb-6" />
      
      <!-- Gated Results Container -->
      <div class="relative">
        <!-- Content (visible but blurred for free users) -->
        <div :class="!hasLeagueAccess ? 'blur-sm select-none pointer-events-none' : ''">
          <!-- Tale of the Tape -->
          <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🥊</span>
              <h2 class="card-title">Tale of the Tape</h2>
            </div>
            <button 
              @click="downloadComparisonImage" 
              :disabled="isDownloadingComparison"
              class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm"
              style="background: #dc2626; color: #ffffff;"
              @mouseover="$event.currentTarget.style.background = '#eab308'; $event.currentTarget.style.color = '#0a0c14'"
              @mouseout="$event.currentTarget.style.background = '#dc2626'; $event.currentTarget.style.color = '#ffffff'"
            >
              <svg v-if="!isDownloadingComparison" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isDownloadingComparison ? 'Saving...' : 'Share' }}
            </button>
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
                  <span class="text-dark-textMuted">🏆 Championships:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.championships || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">🎯 Playoff Apps:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.playoffAppearances || 0 }}</span>
                </div>
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
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Total Points:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team1.totalPoints.toLocaleString() }}</span>
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
                  <span class="text-dark-textMuted">🏆 Championships:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.championships || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">🎯 Playoff Apps:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.playoffAppearances || 0 }}</span>
                </div>
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
                <div class="flex justify-between">
                  <span class="text-dark-textMuted">Total Points:</span>
                  <span class="font-bold text-dark-text">{{ comparisonData.team2.totalPoints.toLocaleString() }}</span>
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

      <!-- Recent Matchups Chart (H2H only) -->
      <div class="card" v-if="rivalryHistory.length > 0">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🥊</span>
            <h2 class="card-title">Head-to-Head Matchups</h2>
          </div>
          <p class="card-subtitle mt-2">Last {{ rivalryHistory.length }} direct meetings</p>
        </div>
        <div class="card-body">
          <div ref="chartContainer" class="w-full" style="height: 350px;"></div>
        </div>
      </div>

      <!-- Weekly Performance Chart (regardless of opponent) -->
      <div class="card" v-if="weeklyPerformance.length > 0">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📈</span>
            <h2 class="card-title">Weekly Performance</h2>
          </div>
          <p class="card-subtitle mt-2">Season-long scoring comparison (regardless of opponent)</p>
        </div>
        <div class="card-body">
          <div ref="weeklyChartContainer" class="w-full" style="height: 350px;"></div>
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
              Get access to head-to-head records, rivalry history, and comparison charts.
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

    <!-- Platform Badge -->
    <div class="flex justify-center mt-8">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border" :class="platformBadgeClass">
        <img 
          :src="platformLogo" 
          :alt="platformName"
          class="w-5 h-5"
        />
        <span class="text-sm" :class="platformSubTextClass">{{ platformName }} Fantasy {{ sportName }} • {{ scoringTypeLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'
import ApexCharts from 'apexcharts'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import SimulatedDataBanner from '@/components/SimulatedDataBanner.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()
const { hasLeagueAccess } = useFeatureAccess()

// Effective league key - use the actually loaded league (might be previous season)
const effectiveLeagueKey = computed(() => {
  if (leagueStore.currentLeague?.league_id) return leagueStore.currentLeague.league_id
  return leagueStore.activeLeagueId
})

// Check if ESPN platform
const isEspn = computed(() => {
  if (leagueStore.activePlatform === 'espn') return true
  const leagueKey = leagueStore.currentLeague?.league_id || leagueStore.activeLeagueId
  if (leagueKey && leagueKey.startsWith('espn_')) return true
  return false
})

const isSleeper = computed(() => leagueStore.activePlatform === 'sleeper')

// Platform display helpers
const platformName = computed(() => {
  if (isEspn.value) return 'ESPN'
  if (isSleeper.value) return 'Sleeper'
  return 'Yahoo!'
})

const platformLogo = computed(() => {
  if (isEspn.value) return '/espn-logo.svg'
  if (isSleeper.value) return '/sleeper-logo.svg'
  return '/yahoo-fantasy.svg'
})

const platformBadgeClass = computed(() => {
  if (isEspn.value) return 'bg-[#5b8def]/10 border-[#5b8def]/30'
  if (isSleeper.value) return 'bg-[#01b5a5]/10 border-[#01b5a5]/30'
  return 'bg-purple-600/10 border-purple-600/30'
})

const platformTextClass = computed(() => {
  if (isEspn.value) return 'text-[#5b8def]'
  if (isSleeper.value) return 'text-[#01b5a5]'
  return 'text-purple-400'
})

const platformSubTextClass = computed(() => {
  if (isEspn.value) return 'text-[#5b8def]'
  if (isSleeper.value) return 'text-[#01b5a5]'
  return 'text-purple-300'
})

const sportName = computed(() => {
  const saved = leagueStore.savedLeagues.find(l => l.league_id === leagueStore.activeLeagueId)
  const sport = saved?.sport || 'football'
  const names: Record<string, string> = { football: 'Football', baseball: 'Baseball', basketball: 'Basketball', hockey: 'Hockey' }
  return names[sport] || 'Fantasy'
})

// Scoring type label for badge
const scoringTypeLabel = computed(() => {
  const st = (leagueStore.currentLeague?.scoring_type || leagueStore.yahooLeague?.scoring_type || '').toLowerCase()
  if (st.includes('roto')) return 'Roto'
  if (st.includes('point') || st === 'headpoint') return 'H2H Points'
  if (st.includes('head')) return 'H2H Categories'
  return 'H2H Points'
})

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_1_y.png'

// State
const isLoading = ref(false)
const isInitialLoading = ref(true)
const team1Key = ref('')
const team2Key = ref('')
const allTeams = ref<any[]>([])
const allMatchups = ref<any[]>([])

const team1Data = ref<any>(null)
const team2Data = ref<any>(null)
const comparisonData = ref<any>(null)
const rivalryHistory = ref<any[]>([])
const rivalryHighlights = ref<any>(null)
const weeklyPerformance = ref<any[]>([])

const chartContainer = ref<HTMLElement | null>(null)
const weeklyChartContainer = ref<HTMLElement | null>(null)
let chartInstance: ApexCharts | null = null
let weeklyChartInstance: ApexCharts | null = null
const isDownloadingComparison = ref(false)

// Computed: Filter dropdowns so you can't select the same team twice
const availableTeams1 = computed(() => {
  return allTeams.value.filter(t => t.team_key !== team2Key.value)
})

const availableTeams2 = computed(() => {
  return allTeams.value.filter(t => t.team_key !== team1Key.value)
})

function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = defaultAvatar
}

function getShortName(name: string | undefined): string {
  if (!name) return ''
  return name.split(' ')[0]
}

function getLeagueName(): string {
  if (isEspn.value) {
    return leagueStore.currentLeague?.name || 
           leagueStore.savedLeagues.find(l => l.league_id === effectiveLeagueKey.value)?.name || 
           'ESPN Points League'
  }
  return leagueStore.currentLeague?.name || 
         leagueStore.savedLeagues.find(l => l.yahoo_league_key === effectiveLeagueKey.value)?.name || 
         'Yahoo Points League'
}

async function downloadComparisonImage() {
  if (!team1Data.value || !team2Data.value || !comparisonData.value) return
  isDownloadingComparison.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    const leagueName = getLeagueName()
    
    // Load UFD logo
    const loadLogo = async (): Promise<string> => {
      try {
        const response = await fetch('/UFD_V5.png')
        if (!response.ok) return ''
        const blob = await response.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => resolve('')
          reader.readAsDataURL(blob)
        })
      } catch (e) { return '' }
    }
    
    const createPlaceholder = (name: string, color: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(32, 32, 32, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(name.charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    const logoBase64 = await loadLogo()
    
    // Load team logos
    const loadTeamLogo = async (url: string | undefined, name: string, color: string): Promise<string> => {
      if (!url) return createPlaceholder(name, color)
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        return await new Promise<string>((resolve) => {
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = 64
            canvas.height = 64
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.beginPath()
              ctx.arc(32, 32, 32, 0, Math.PI * 2)
              ctx.closePath()
              ctx.clip()
              ctx.drawImage(img, 0, 0, 64, 64)
            }
            resolve(canvas.toDataURL('image/png'))
          }
          img.onerror = () => resolve(createPlaceholder(name, color))
          setTimeout(() => resolve(createPlaceholder(name, color)), 3000)
          img.src = url
        })
      } catch { return createPlaceholder(name, color) }
    }
    
    const team1Logo = await loadTeamLogo(team1Data.value.logo_url, team1Data.value.name, '#06b6d4')
    const team2Logo = await loadTeamLogo(team2Data.value.logo_url, team2Data.value.name, '#f97316')
    
    // Get recent matchups for chart (ascending order for chart)
    const recentMatchups = [...rivalryHistory.value].reverse().slice(0, 5).reverse()
    
    // Generate chart points for SVG
    const chartWidth = 420
    const chartHeight = 150
    const padding = 40
    
    // Find max score for scaling
    let maxScore = 0
    for (const m of recentMatchups) {
      maxScore = Math.max(maxScore, m.team1Score, m.team2Score)
    }
    maxScore = Math.ceil(maxScore / 50) * 50 // Round up to nearest 50
    
    const getX = (idx: number) => padding + (idx / (recentMatchups.length - 1 || 1)) * (chartWidth - padding * 2)
    const getY = (val: number) => chartHeight - padding - (val / maxScore) * (chartHeight - padding * 2)
    
    const team1Points = recentMatchups.map((m, i) => `${getX(i)},${getY(m.team1Score)}`).join(' ')
    const team2Points = recentMatchups.map((m, i) => `${getX(i)},${getY(m.team2Score)}`).join(' ')
    
    // Generate X-axis labels
    const xLabels = recentMatchups.map((m, i) => 
      `<text x="${getX(i)}" y="${chartHeight - 10}" text-anchor="middle" fill="#94a3b8" font-size="10">Wk ${m.week}</text>`
    ).join('')
    
    // Generate Y-axis labels
    const yLabels = [0, Math.round(maxScore/2), maxScore].map(val =>
      `<text x="${padding - 8}" y="${getY(val) + 4}" text-anchor="end" fill="#94a3b8" font-size="10">${val}</text>`
    ).join('')
    
    // Generate grid lines
    const gridLines = [0, Math.round(maxScore/2), maxScore].map(val =>
      `<line x1="${padding}" y1="${getY(val)}" x2="${chartWidth - padding}" y2="${getY(val)}" stroke="#334155" stroke-dasharray="4"/>`
    ).join('')
    
    // Generate data points
    const team1Dots = recentMatchups.map((m, i) =>
      `<circle cx="${getX(i)}" cy="${getY(m.team1Score)}" r="5" fill="#06b6d4" stroke="#0a0c14" stroke-width="2"/>
       <text x="${getX(i)}" y="${getY(m.team1Score) - 10}" text-anchor="middle" fill="#06b6d4" font-size="10" font-weight="bold">${m.team1Score.toFixed(0)}</text>`
    ).join('')
    
    const team2Dots = recentMatchups.map((m, i) =>
      `<circle cx="${getX(i)}" cy="${getY(m.team2Score)}" r="5" fill="#f97316" stroke="#0a0c14" stroke-width="2"/>
       <text x="${getX(i)}" y="${getY(m.team2Score) + 18}" text-anchor="middle" fill="#f97316" font-size="10" font-weight="bold">${m.team2Score.toFixed(0)}</text>`
    ).join('')
    
    const h2h = comparisonData.value.h2h
    const team1Wins = h2h.team1Wins
    const team2Wins = h2h.team2Wins
    
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 520px; font-family: system-ui, -apple-system, sans-serif;'
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); overflow: hidden;">
        <div style="background: #dc2626; padding: 8px 20px; text-align: center;">
          <span style="font-size: 12px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 2px;">Ultimate Fantasy Dashboard</span>
        </div>
        <div style="display: flex; align-items: center; padding: 12px 20px; border-bottom: 1px solid rgba(220, 38, 38, 0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 40px; width: auto; flex-shrink: 0; margin-right: 12px;" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 18px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Team Comparison</div>
            <div style="font-size: 12px; margin-top: 2px;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 4px;">•</span>
              <span style="color: #dc2626; font-weight: 600;">Points League</span>
            </div>
          </div>
        </div>
        
        <!-- Teams Comparison -->
        <div style="padding: 20px; display: flex; gap: 16px;">
          <!-- Team 1 -->
          <div style="flex: 1; padding: 16px; background: linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, transparent 100%); border-radius: 12px; border: 1px solid rgba(6, 182, 212, 0.3);">
            <div style="text-align: center; margin-bottom: 12px;">
              <img src="${team1Logo}" style="width: 56px; height: 56px; border-radius: 50%; border: 3px solid #06b6d4; margin: 0 auto 8px;" />
              <div style="font-size: 14px; font-weight: bold; color: #ffffff;">${team1Data.value.name}</div>
            </div>
            <div style="font-size: 11px; color: #9ca3af;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>🏆 Championships:</span>
                <span style="color: #e5e7eb; font-weight: bold;">${comparisonData.value.team1.championships}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Record:</span>
                <span style="color: #e5e7eb; font-weight: bold;">${comparisonData.value.team1.wins}-${comparisonData.value.team1.losses}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Win %:</span>
                <span style="color: #e5e7eb; font-weight: bold;">${comparisonData.value.team1.winPct.toFixed(1)}%</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Avg PPW:</span>
                <span style="color: #e5e7eb; font-weight: bold;">${comparisonData.value.team1.avgPPW.toFixed(1)}</span>
              </div>
            </div>
          </div>
          
          <!-- VS Section -->
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 8px;">
            <div style="font-size: 28px; font-weight: 900; color: #4b5563; margin-bottom: 8px;">VS</div>
            <div style="text-align: center; background: rgba(58, 61, 82, 0.5); padding: 12px 16px; border-radius: 8px;">
              <div style="font-size: 10px; color: #9ca3af; margin-bottom: 4px;">Head-to-Head</div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 22px; font-weight: 900; color: ${team1Wins > team2Wins ? '#22c55e' : '#9ca3af'};">${team1Wins}</span>
                <span style="font-size: 16px; color: #6b7280;">-</span>
                <span style="font-size: 22px; font-weight: 900; color: ${team2Wins > team1Wins ? '#22c55e' : '#9ca3af'};">${team2Wins}</span>
              </div>
              ${h2h.ties > 0 ? `<div style="font-size: 10px; color: #9ca3af; margin-top: 2px;">${h2h.ties} tie(s)</div>` : ''}
            </div>
          </div>
          
          <!-- Team 2 -->
          <div style="flex: 1; padding: 16px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, transparent 100%); border-radius: 12px; border: 1px solid rgba(249, 115, 22, 0.3);">
            <div style="text-align: center; margin-bottom: 12px;">
              <img src="${team2Logo}" style="width: 56px; height: 56px; border-radius: 50%; border: 3px solid #f97316; margin: 0 auto 8px;" />
              <div style="font-size: 14px; font-weight: bold; color: #ffffff;">${team2Data.value.name}</div>
            </div>
            <div style="font-size: 11px; color: #9ca3af;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>🏆 Championships:</span>
                <span style="color: #e5e7eb; font-weight: bold;">${comparisonData.value.team2.championships}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Record:</span>
                <span style="color: #e5e7eb; font-weight: bold;">${comparisonData.value.team2.wins}-${comparisonData.value.team2.losses}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Win %:</span>
                <span style="color: #e5e7eb; font-weight: bold;">${comparisonData.value.team2.winPct.toFixed(1)}%</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Avg PPW:</span>
                <span style="color: #e5e7eb; font-weight: bold;">${comparisonData.value.team2.avgPPW.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
        
        ${recentMatchups.length > 1 ? `
        <!-- Recent Matchups Chart -->
        <div style="padding: 0 20px 16px;">
          <div style="font-size: 13px; font-weight: bold; color: #e5e7eb; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            <span>📈</span> Recent Matchups
            <span style="font-size: 11px; color: #9ca3af; font-weight: normal;">(Points scored)</span>
          </div>
          <div style="background: rgba(58, 61, 82, 0.3); border-radius: 8px; padding: 8px;">
            <svg width="${chartWidth}" height="${chartHeight}" style="display: block; margin: 0 auto;">
              ${gridLines}
              ${yLabels}
              ${xLabels}
              <polyline points="${team1Points}" fill="none" stroke="#06b6d4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="${team2Points}" fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              ${team1Dots}
              ${team2Dots}
            </svg>
            <div style="display: flex; justify-content: center; gap: 20px; margin-top: 8px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 12px; height: 3px; background: #06b6d4; border-radius: 2px;"></div>
                <span style="font-size: 10px; color: #e5e7eb;">${getShortName(team1Data.value.name)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 12px; height: 3px; background: #f97316; border-radius: 2px;"></div>
                <span style="font-size: 10px; color: #e5e7eb;">${getShortName(team2Data.value.name)}</span>
              </div>
            </div>
          </div>
        </div>
        ` : ''}
        
        <div style="padding: 12px 20px; text-align: center; border-top: 1px solid rgba(220, 38, 38, 0.2);">
          <span style="font-size: 14px; font-weight: bold; color: #dc2626;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 300))
    
    const finalCanvas = await html2canvas(container, { backgroundColor: '#0a0c14', scale: 2, useCORS: true, allowTaint: true, width: 520 })
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    const safeTeam1 = team1Data.value.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase().substring(0, 15)
    const safeTeam2 = team2Data.value.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase().substring(0, 15)
    link.download = `comparison-${safeTeam1}-vs-${safeTeam2}.png`
    link.href = finalCanvas.toDataURL('image/png')
    link.click()
  } catch (e) {
    console.error('Error generating comparison image:', e)
  } finally {
    isDownloadingComparison.value = false
  }
}

async function loadInitialData() {
  console.log('=== COMPARE PAGE: loadInitialData START ===')
  let leagueKey = effectiveLeagueKey.value
  console.log('League key:', leagueKey)
  console.log('User ID:', authStore.user?.id)
  console.log('Is ESPN:', isEspn.value)
  
  if (!leagueKey || !authStore.user?.id) {
    console.log('Missing league key or user ID, aborting')
    isInitialLoading.value = false
    return
  }
  
  try {
    // Handle ESPN leagues
    if (isEspn.value) {
      console.log('[ESPN COMPARE] Loading ESPN data...')
      const { espnService } = await import('@/services/espn')
      
      // Parse league key: espn_baseball_1227422768_2025
      const parts = leagueKey.split('_')
      const sport = parts[1] as 'football' | 'baseball' | 'basketball' | 'hockey'
      const espnLeagueId = parts[2]
      const season = parseInt(parts[3])
      
      console.log('[ESPN COMPARE] Parsed:', { sport, espnLeagueId, season })
      
      // Get teams
      const teams = await espnService.getTeams(sport, espnLeagueId, season)
      console.log('[ESPN COMPARE] Got', teams.length, 'teams')
      
      if (!teams || teams.length === 0) {
        console.error('[ESPN COMPARE] No teams data returned')
        isInitialLoading.value = false
        return
      }
      
      allTeams.value = teams.map((team: any) => ({
        team_key: `espn_team_${team.id}`,
        name: team.name,
        manager: team.owners?.[0]?.firstName || team.owners?.[0]?.displayName || 'Manager',
        logo_url: team.logo,
        wins: team.wins || 0,
        losses: team.losses || 0,
        ties: team.ties || 0,
        points_for: team.pointsFor || 0,
        rank: team.rank || 0,
        playoff_seed: team.playoffSeed || null,
        clinched_playoffs: team.clinched || null
      }))
      
      console.log('[ESPN COMPARE] Parsed teams:', allTeams.value.length)
      
      // Get league info for current week
      const league = await espnService.getLeague(sport, espnLeagueId, season)
      const currentWeek = league?.status?.currentMatchupPeriod || 25
      console.log('[ESPN COMPARE] Current week:', currentWeek)
      
      const matchupsList: any[] = []
      for (let week = 1; week <= currentWeek; week++) {
        try {
          const weekMatchups = await espnService.getMatchups(sport, espnLeagueId, season, week)
          if (weekMatchups && weekMatchups.length > 0) {
            // Transform ESPN matchups to match Yahoo's format
            for (const matchup of weekMatchups) {
              // ESPN parseMatchups returns homeTeamId/awayTeamId and homeScore/awayScore
              matchupsList.push({
                week,
                is_playoffs: matchup.playoffTierType === 'WINNERS_BRACKET',
                teams: [
                  {
                    team_key: `espn_team_${matchup.homeTeamId}`,
                    points: matchup.homeScore || 0
                  },
                  {
                    team_key: `espn_team_${matchup.awayTeamId}`,
                    points: matchup.awayScore || 0
                  }
                ]
              })
            }
            console.log(`[ESPN COMPARE] Week ${week}: ${weekMatchups.length} matchups`)
          }
        } catch (e) {
          // Week may not have data
          console.log(`[ESPN COMPARE] Week ${week}: no data`)
        }
      }
      
      allMatchups.value = matchupsList
      console.log('[ESPN COMPARE] Total matchups loaded:', allMatchups.value.length)
      
      // Auto-select first two teams
      if (allTeams.value.length >= 2) {
        team1Key.value = allTeams.value[0].team_key
        team2Key.value = allTeams.value[1].team_key
      }
      
      console.log('=== ESPN COMPARE: loadInitialData COMPLETE ===')
      isInitialLoading.value = false
      return
    }
    
    // Yahoo league handling
    await yahooService.initialize(authStore.user.id)
    
    // Get standings
    console.log('Fetching standings...')
    let standings = await yahooService.getStandings(leagueKey)
    console.log('Got standings:', standings?.length || 0, 'teams')
    
    if (!standings || standings.length === 0) {
      console.error('No standings data returned')
      isInitialLoading.value = false
      return
    }
    
    // Check if we have actual data (predraft leagues have 0 wins/losses/points)
    const hasData = standings.some((team: any) => 
      (parseInt(team.wins) || 0) > 0 || 
      (parseInt(team.losses) || 0) > 0 || 
      (parseFloat(team.points_for) || 0) > 0
    )
    
    if (!hasData) {
      console.log('[COMPARE] League has no data (predraft). Checking for previous season...')
      
      // Get league metadata to find previous season
      const metadata = await yahooService.getLeagueMetadata(leagueKey)
      const renewedFrom = metadata?.renew // Format: "431_136233"
      
      if (renewedFrom) {
        const [prevGameKey, prevLeagueNum] = renewedFrom.split('_')
        const prevLeagueKey = `${prevGameKey}.l.${prevLeagueNum}`
        console.log('[COMPARE] Found previous season:', prevLeagueKey, '- loading that instead')
        
        // Load previous season's standings
        standings = await yahooService.getStandings(prevLeagueKey)
        leagueKey = prevLeagueKey
        
        // Verify previous season has data
        const prevHasData = standings.some((team: any) => 
          (parseInt(team.wins) || 0) > 0 || 
          (parseInt(team.losses) || 0) > 0 || 
          (parseFloat(team.points_for) || 0) > 0
        )
        
        if (!prevHasData) {
          console.log('[COMPARE] Previous season also has no data')
          isInitialLoading.value = false
          return
        }
        
        console.log('[COMPARE] Previous season has data! Using:', prevLeagueKey)
      } else {
        console.log('[COMPARE] No previous season found')
        isInitialLoading.value = false
        return
      }
    }
    
    allTeams.value = standings.map((team: any) => ({
      team_key: team.team_key,
      name: team.name,
      manager: team.manager_name || team.managers?.[0]?.nickname || 'Manager',
      logo_url: team.logo_url,
      wins: parseInt(team.wins) || 0,
      losses: parseInt(team.losses) || 0,
      points_for: parseFloat(team.points_for) || 0,
      rank: parseInt(team.rank) || 0,
      playoff_seed: team.playoff_seed || null,
      clinched_playoffs: team.clinched_playoffs || null
    }))
    
    console.log('Parsed teams:', allTeams.value.length)
    if (allTeams.value[0]) {
      console.log('First team:', allTeams.value[0].name, 'playoff_seed:', allTeams.value[0].playoff_seed)
    }
    
    // Get league info for current week - handle if yahooLeagues not loaded yet
    const yahooLeagues = leagueStore.yahooLeagues || []
    console.log('Yahoo leagues available:', yahooLeagues.length)
    const leagueInfo = yahooLeagues.find((l: any) => l.league_key === leagueKey)
    const currentWeek = leagueInfo?.current_week || 25
    console.log('Current week:', currentWeek, 'from league info:', leagueInfo?.name)
    
    // Load all matchups using the correct league key
    console.log('Loading matchups for weeks 1-' + currentWeek, 'from', leagueKey)
    const matchupsList: any[] = []
    
    for (let week = 1; week <= currentWeek; week++) {
      try {
        const weekMatchups = await yahooService.getMatchups(leagueKey, week)
        if (weekMatchups && weekMatchups.length > 0) {
          matchupsList.push(...weekMatchups)
          console.log(`Week ${week}: ${weekMatchups.length} matchups`)
        }
      } catch (e) {
        // Week may not have data
      }
    }
    
    allMatchups.value = matchupsList
    console.log('Total matchups loaded:', allMatchups.value.length)
    
    // Auto-select first two teams for immediate comparison
    if (allTeams.value.length >= 2) {
      team1Key.value = allTeams.value[0].team_key
      team2Key.value = allTeams.value[1].team_key
    }
    
    console.log('=== COMPARE PAGE: loadInitialData COMPLETE ===')
    
  } catch (e) {
    console.error('Error in loadInitialData:', e)
  } finally {
    isInitialLoading.value = false
  }
}

async function loadComparison() {
  console.log('=== loadComparison START ===')
  console.log('team1Key:', team1Key.value)
  console.log('team2Key:', team2Key.value)
  console.log('allTeams.length:', allTeams.value?.length)
  console.log('allMatchups.length:', allMatchups.value?.length)
  
  if (!team1Key.value || !team2Key.value) {
    console.log('Missing team selection')
    return
  }
  
  if (!allTeams.value || allTeams.value.length === 0) {
    console.log('No teams loaded yet, loading now...')
    await loadInitialData()
    return // Will be called again after data loads
  }
  
  isLoading.value = true
  
  try {
    // Find team data
    team1Data.value = allTeams.value.find(t => t.team_key === team1Key.value)
    team2Data.value = allTeams.value.find(t => t.team_key === team2Key.value)
    
    console.log('team1Data:', team1Data.value?.name, 'playoff_seed:', team1Data.value?.playoff_seed)
    console.log('team2Data:', team2Data.value?.name, 'playoff_seed:', team2Data.value?.playoff_seed)
    
    if (!team1Data.value || !team2Data.value) {
      console.error('Could not find team data!')
      isLoading.value = false
      return
    }
    
    // Calculate team stats
    const t1 = team1Data.value
    const t2 = team2Data.value
    
    // Playoff appearance: if playoff_seed exists (any truthy value), they made playoffs
    // playoff_seed is a string like "1", "2", etc. for playoff teams, null/undefined for non-playoff
    const t1MadePlayoffs = t1.playoff_seed !== null && t1.playoff_seed !== undefined
    const t2MadePlayoffs = t2.playoff_seed !== null && t2.playoff_seed !== undefined
    
    // Championship = finished rank 1 (for completed season)
    // Looking at the data, rank 1 appears to be final standings rank
    const t1Champ = t1.rank === 1 ? 1 : 0
    const t2Champ = t2.rank === 1 ? 1 : 0
    
    console.log('t1MadePlayoffs:', t1MadePlayoffs, 't1Champ:', t1Champ)
    console.log('t2MadePlayoffs:', t2MadePlayoffs, 't2Champ:', t2Champ)
    
    const team1Stats = {
      championships: t1Champ,
      playoffAppearances: t1MadePlayoffs ? 1 : 0,
      wins: t1.wins,
      losses: t1.losses,
      winPct: (t1.wins + t1.losses) > 0 ? (t1.wins / (t1.wins + t1.losses)) * 100 : 0,
      totalPoints: t1.points_for,
      avgPPW: (t1.wins + t1.losses) > 0 ? t1.points_for / (t1.wins + t1.losses) : 0,
      rank: t1.rank
    }
    
    const team2Stats = {
      championships: t2Champ,
      playoffAppearances: t2MadePlayoffs ? 1 : 0,
      wins: t2.wins,
      losses: t2.losses,
      winPct: (t2.wins + t2.losses) > 0 ? (t2.wins / (t2.wins + t2.losses)) * 100 : 0,
      totalPoints: t2.points_for,
      avgPPW: (t2.wins + t2.losses) > 0 ? t2.points_for / (t2.wins + t2.losses) : 0,
      rank: t2.rank
    }
    
    console.log('team1Stats:', team1Stats)
    console.log('team2Stats:', team2Stats)
    
    // Find H2H matchups
    const h2hMatchups: any[] = []
    
    console.log('Searching through', allMatchups.value.length, 'matchups for H2H')
    console.log('Looking for team1Key:', team1Key.value, 'and team2Key:', team2Key.value)
    
    // Debug: Log first matchup structure
    if (allMatchups.value.length > 0) {
      console.log('Sample matchup structure:', JSON.stringify(allMatchups.value[0]))
    }
    
    for (const matchup of allMatchups.value) {
      const teams = matchup.teams || []
      const t1Match = teams.find((t: any) => t.team_key === team1Key.value)
      const t2Match = teams.find((t: any) => t.team_key === team2Key.value)
      
      if (t1Match && t2Match) {
        const t1Score = parseFloat(t1Match.points) || 0
        const t2Score = parseFloat(t2Match.points) || 0
        console.log('Found H2H matchup week', matchup.week, ':', t1Score, 'vs', t2Score)
        h2hMatchups.push({
          week: matchup.week,
          team1Score: t1Score,
          team2Score: t2Score,
          margin: Math.abs(t1Score - t2Score),
          isPlayoff: matchup.is_playoffs
        })
      }
    }
    
    console.log('Found', h2hMatchups.length, 'H2H matchups')
    
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
    
    // Calculate highlights
    if (h2hMatchups.length > 0) {
      let biggestBlowout = h2hMatchups[0]
      let closestGame = h2hMatchups[0]
      let highestScoring = h2hMatchups[0]
      
      for (const game of h2hMatchups) {
        if (game.margin > biggestBlowout.margin) biggestBlowout = game
        if (game.margin < closestGame.margin) closestGame = game
        if ((game.team1Score + game.team2Score) > (highestScoring.team1Score + highestScoring.team2Score)) {
          highestScoring = game
        }
      }
      
      rivalryHighlights.value = {
        biggestBlowout: {
          winner: biggestBlowout.team1Score > biggestBlowout.team2Score ? t1.name : t2.name,
          margin: biggestBlowout.margin,
          week: biggestBlowout.week
        },
        closestGame: {
          winner: closestGame.team1Score > closestGame.team2Score ? t1.name : t2.name,
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
    
    // Calculate weekly performance for both teams (regardless of opponent)
    const weeklyScores: { week: number; team1Score: number; team2Score: number }[] = []
    const weekMap = new Map<number, { team1: number | null; team2: number | null }>()
    
    for (const matchup of allMatchups.value) {
      const teams = matchup.teams || []
      const week = matchup.week
      
      if (!weekMap.has(week)) {
        weekMap.set(week, { team1: null, team2: null })
      }
      
      for (const team of teams) {
        if (team.team_key === team1Key.value) {
          weekMap.get(week)!.team1 = parseFloat(team.points) || 0
        }
        if (team.team_key === team2Key.value) {
          weekMap.get(week)!.team2 = parseFloat(team.points) || 0
        }
      }
    }
    
    // Convert to array and sort by week
    for (const [week, scores] of weekMap) {
      if (scores.team1 !== null && scores.team2 !== null) {
        weeklyScores.push({
          week,
          team1Score: scores.team1,
          team2Score: scores.team2
        })
      }
    }
    weeklyScores.sort((a, b) => a.week - b.week)
    weeklyPerformance.value = weeklyScores
    console.log('[COMPARE] Weekly performance data:', weeklyScores.length, 'weeks')
    
    // Render chart after DOM updates
    await nextTick()
    setTimeout(() => {
      renderChart()
      renderWeeklyChart()
    }, 100)
    
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
  
  console.log('Chart data:', recentMatchups.map(m => ({ week: m.week, t1: m.team1Score, t2: m.team2Score })))
  
  const options = {
    chart: {
      type: 'line' as const,
      height: 350,
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: true }
    },
    series: [
      { 
        name: team1Data.value?.name || 'Team 1', 
        data: recentMatchups.map(m => m.team1Score) 
      },
      { 
        name: team2Data.value?.name || 'Team 2', 
        data: recentMatchups.map(m => m.team2Score) 
      }
    ],
    colors: ['#06b6d4', '#f97316'],
    stroke: {
      width: 3,
      curve: 'smooth' as const
    },
    markers: {
      size: 6,
      strokeWidth: 2,
      hover: { size: 8 }
    },
    xaxis: {
      categories: recentMatchups.map(m => `W${m.week}`),
      labels: { style: { colors: '#94a3b8' } }
    },
    yaxis: { 
      labels: { 
        style: { colors: '#94a3b8' },
        formatter: (val: number) => val.toFixed(0)
      },
      title: { text: 'Points', style: { color: '#94a3b8' } }
    },
    grid: { borderColor: '#334155' },
    legend: { 
      labels: { colors: '#e2e8f0' },
      position: 'top' as const
    },
    tooltip: { 
      theme: 'dark',
      y: { formatter: (val: number) => val.toFixed(1) + ' pts' }
    }
  }
  
  chartInstance = new ApexCharts(chartContainer.value, options)
  chartInstance.render()
  console.log('Chart rendered')
}

function renderWeeklyChart() {
  console.log('renderWeeklyChart called, container:', !!weeklyChartContainer.value, 'data:', weeklyPerformance.value.length)
  
  if (!weeklyChartContainer.value || weeklyPerformance.value.length === 0) {
    console.log('Cannot render weekly chart - missing container or no data')
    return
  }
  
  if (weeklyChartInstance) {
    weeklyChartInstance.destroy()
    weeklyChartInstance = null
  }
  
  // Get last 15 weeks
  const recentWeeks = weeklyPerformance.value.slice(-15)
  
  console.log('Weekly chart data:', recentWeeks.map(m => ({ week: m.week, t1: m.team1Score, t2: m.team2Score })))
  
  const options = {
    chart: {
      type: 'line' as const,
      height: 350,
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: true }
    },
    series: [
      { 
        name: team1Data.value?.name || 'Team 1', 
        data: recentWeeks.map(m => m.team1Score) 
      },
      { 
        name: team2Data.value?.name || 'Team 2', 
        data: recentWeeks.map(m => m.team2Score) 
      }
    ],
    colors: ['#06b6d4', '#f97316'],
    stroke: {
      width: 3,
      curve: 'smooth' as const
    },
    markers: {
      size: 5,
      strokeWidth: 2,
      hover: { size: 7 }
    },
    xaxis: {
      categories: recentWeeks.map(m => `W${m.week}`),
      labels: { style: { colors: '#94a3b8' } }
    },
    yaxis: { 
      labels: { 
        style: { colors: '#94a3b8' },
        formatter: (val: number) => val.toFixed(0)
      },
      title: { text: 'Points', style: { color: '#94a3b8' } }
    },
    grid: { borderColor: '#334155' },
    legend: { 
      labels: { colors: '#e2e8f0' },
      position: 'top' as const
    },
    tooltip: { 
      theme: 'dark',
      y: { formatter: (val: number) => val.toFixed(1) + ' pts' }
    }
  }
  
  weeklyChartInstance = new ApexCharts(weeklyChartContainer.value, options)
  weeklyChartInstance.render()
  console.log('Weekly chart rendered')
}

// Watch for team selection changes - auto-compare when both selected
watch([team1Key, team2Key], ([t1, t2]) => {
  if (t1 && t2 && !isInitialLoading.value) {
    loadComparison()
  }
})

// Load data when league changes
watch(() => leagueStore.activeLeagueId, async (newId) => {
  if (newId) {
    console.log('League changed, loading initial data...')
    team1Key.value = ''
    team2Key.value = ''
    comparisonData.value = null
    rivalryHistory.value = []
    rivalryHighlights.value = null
    weeklyPerformance.value = []
    allTeams.value = []
    allMatchups.value = []
    isInitialLoading.value = true
    await loadInitialData()
  }
}, { immediate: true })

// Watch for currentLeague changes (happens when fallback to previous season occurs)
watch(() => leagueStore.currentLeague?.league_id, async (newKey, oldKey) => {
  if (newKey && newKey !== oldKey) {
    console.log(`Compare: League changed from ${oldKey} to ${newKey}, reloading...`)
    team1Key.value = ''
    team2Key.value = ''
    comparisonData.value = null
    rivalryHistory.value = []
    rivalryHighlights.value = null
    weeklyPerformance.value = []
    allTeams.value = []
    allMatchups.value = []
    isInitialLoading.value = true
    await loadInitialData()
  }
})

onMounted(async () => {
  console.log('Compare page mounted')
  if (effectiveLeagueKey.value) {
    await loadInitialData()
  }
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
  if (weeklyChartInstance) {
    weeklyChartInstance.destroy()
    weeklyChartInstance = null
  }
})
</script>
