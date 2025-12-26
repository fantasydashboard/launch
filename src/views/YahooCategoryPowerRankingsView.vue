<template>
  <div class="space-y-6">
    <!-- Header with Controls -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Category Power Rankings</h1>
        <p class="text-base text-dark-textMuted">
          H2H Category rankings based on category dominance and balance
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button 
          @click="showSettings = true" 
          class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors" 
          title="Customize Power Rankings"
        >
          <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
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
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
        <p class="text-dark-textMuted">{{ loadingMessage }}</p>
      </div>
    </div>

    <template v-else-if="powerRankings.length > 0">
      <!-- Power Rankings Table -->
      <div class="card">
        <div class="card-header">
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-2xl">⚡</span>
                <h2 class="card-title">Power Rankings - Week {{ selectedWeek }}</h2>
              </div>
              <p class="card-subtitle text-sm mt-1">Based on {{ totalWeeksLoaded }} weeks of category data</p>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-xs text-dark-textMuted uppercase border-b border-dark-border">
                  <th class="py-3 px-4">Rank</th>
                  <th class="py-3 px-4 w-6">+/-</th>
                  <th class="py-3 px-4">Team</th>
                  <th class="py-3 px-4 text-center">Power Score</th>
                  <th class="py-3 px-4 text-center">Cat W-L-T</th>
                  <th class="py-3 px-4 text-center">Cat Win %</th>
                  <th class="py-3 px-4 text-center hidden md:table-cell">Dominant</th>
                  <th class="py-3 px-4 text-center hidden md:table-cell">Weak</th>
                  <th class="py-3 px-4 text-center hidden lg:table-cell">Avg/Week</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(team, idx) in powerRankings" 
                  :key="team.team_key"
                  @click="openTeamModal(team)"
                  class="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors cursor-pointer"
                  :class="{ 'bg-primary/5': team.is_my_team }"
                >
                  <td class="py-3 px-4">
                    <span 
                      class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      :class="getRankClass(idx + 1)"
                    >
                      {{ idx + 1 }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <div v-if="team.change !== 0" class="flex items-center gap-1">
                      <span v-if="team.change > 0" class="text-green-400 text-sm font-bold">▲{{ team.change }}</span>
                      <span v-else class="text-red-400 text-sm font-bold">▼{{ Math.abs(team.change) }}</span>
                    </div>
                    <span v-else class="text-dark-textMuted text-sm">—</span>
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                      <img 
                        :src="team.logo_url || defaultAvatar" 
                        :alt="team.name"
                        class="w-8 h-8 rounded-full object-cover ring-2"
                        :class="team.is_my_team ? 'ring-primary' : 'ring-cyan-500/50'"
                        @error="handleImageError"
                      />
                      <span class="font-semibold text-dark-text">{{ team.name }}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <div class="w-16 h-2 bg-dark-border rounded-full overflow-hidden">
                        <div 
                          class="h-full bg-primary rounded-full"
                          :style="{ width: `${team.powerScore}%` }"
                        ></div>
                      </div>
                      <span class="font-bold text-primary">{{ team.powerScore.toFixed(1) }}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span class="font-medium text-dark-text">
                      {{ team.totalCatWins }}-{{ team.totalCatLosses }}-{{ team.totalCatTies }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span class="font-bold" :class="getCatWinPctClass(team.catWinPct)">
                      {{ (team.catWinPct * 100).toFixed(1) }}%
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center hidden md:table-cell">
                    <span class="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400">
                      {{ team.dominantCategories }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center hidden md:table-cell">
                    <span class="px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400">
                      {{ team.weakCategories }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center hidden lg:table-cell">
                    <span class="font-medium" :class="getAvgCatsClass(team.avgCatsWonPerWeek)">
                      {{ team.avgCatsWonPerWeek.toFixed(1) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Category Breakdown Grid -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">Category Wins by Team</h2>
          </div>
          <p class="card-subtitle">Total category wins across {{ totalWeeksLoaded }} weeks</p>
        </div>
        <div class="card-body overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-dark-textMuted uppercase border-b border-dark-border">
                <th class="py-2 px-3 text-left sticky left-0 bg-dark-card z-10">Team</th>
                <th 
                  v-for="cat in displayCategories" 
                  :key="cat.stat_id"
                  class="py-2 px-2 text-center whitespace-nowrap"
                  :title="cat.name"
                >
                  {{ cat.display_name }}
                </th>
                <th class="py-2 px-2 text-center font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="team in powerRankings" 
                :key="team.team_key"
                class="border-b border-dark-border/50 hover:bg-dark-border/20"
                :class="{ 'bg-primary/5': team.is_my_team }"
              >
                <td class="py-2 px-3 sticky left-0 bg-dark-card z-10">
                  <div class="flex items-center gap-2">
                    <img 
                      :src="team.logo_url || defaultAvatar" 
                      class="w-6 h-6 rounded-full object-cover"
                      @error="handleImageError"
                    />
                    <span class="font-medium text-dark-text truncate max-w-[100px]">{{ team.name }}</span>
                  </div>
                </td>
                <td 
                  v-for="cat in displayCategories" 
                  :key="cat.stat_id"
                  class="py-2 px-2 text-center"
                >
                  <span 
                    class="text-sm font-medium"
                    :class="getCategoryClass(team.categoryRanks[cat.stat_id])"
                  >
                    {{ team.categoryWins[cat.stat_id] || 0 }}
                  </span>
                </td>
                <td class="py-2 px-2 text-center font-bold text-primary">
                  {{ team.totalCatWins }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Historical Chart -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📈</span>
            <h2 class="card-title">Power Rankings Over Time</h2>
          </div>
        </div>
        <div class="card-body">
          <div v-if="chartSeries.length > 0">
            <apexchart type="line" height="400" :options="chartOptions" :series="chartSeries" />
          </div>
          <div v-else class="text-center py-12 text-dark-textMuted">
            Not enough data for chart
          </div>
        </div>
      </div>
    </template>

    <!-- Empty State -->
    <div v-else class="text-center py-20">
      <div class="text-6xl mb-4">📊</div>
      <h3 class="text-xl font-bold text-dark-text mb-2">Select a Week</h3>
      <p class="text-dark-textMuted">Choose a week to view power rankings</p>
    </div>

    <!-- Settings Modal -->
    <Teleport to="body">
      <div 
        v-if="showSettings" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showSettings = false"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <div class="px-6 py-4 border-b border-dark-border flex items-center justify-between">
            <h3 class="text-xl font-bold text-dark-text">Customize Rankings</h3>
            <button @click="showSettings = false" class="p-2 rounded-lg hover:bg-dark-border/50">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="p-6">
            <p class="text-dark-textMuted mb-4">Factor customization coming soon...</p>
            <button @click="showSettings = false" class="btn-primary">Close</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Team Detail Modal -->
    <Teleport to="body">
      <div 
        v-if="showTeamModal && selectedTeam" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showTeamModal = false"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-dark-border">
          <div class="px-6 py-4 border-b border-dark-border flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img :src="selectedTeam.logo_url || defaultAvatar" class="w-10 h-10 rounded-full" @error="handleImageError" />
              <div>
                <h3 class="text-lg font-bold text-dark-text">{{ selectedTeam.name }}</h3>
                <p class="text-sm text-dark-textMuted">Category Breakdown</p>
              </div>
            </div>
            <button @click="showTeamModal = false" class="p-2 rounded-lg hover:bg-dark-border/50">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-2 gap-4 mb-6">
              <div class="text-center p-3 bg-dark-card rounded-lg">
                <div class="text-2xl font-black text-primary">{{ selectedTeam.powerScore.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted">Power Score</div>
              </div>
              <div class="text-center p-3 bg-dark-card rounded-lg">
                <div class="text-2xl font-black text-dark-text">{{ selectedTeam.totalCatWins }}-{{ selectedTeam.totalCatLosses }}</div>
                <div class="text-xs text-dark-textMuted">Cat W-L</div>
              </div>
            </div>
            <div class="space-y-2">
              <div 
                v-for="cat in displayCategories" 
                :key="cat.stat_id"
                class="flex items-center gap-2"
              >
                <span class="w-12 text-xs text-dark-textMuted">{{ cat.display_name }}</span>
                <div class="flex-1 h-3 bg-dark-border rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-primary rounded-full"
                    :style="{ width: `${(selectedTeam.categoryWins[cat.stat_id] || 0) / maxCategoryWins * 100}%` }"
                  ></div>
                </div>
                <span class="w-8 text-sm font-bold text-right" :class="getCategoryClass(selectedTeam.categoryRanks[cat.stat_id])">
                  {{ selectedTeam.categoryWins[cat.stat_id] || 0 }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, Teleport } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'
import { calculateCategoryBalance } from '@/services/categoryPowerRankingFactors'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

// State
const isLoading = ref(false)
const loadingMessage = ref('Loading...')
const selectedWeek = ref('')
const powerRankings = ref<any[]>([])
const displayCategories = ref<any[]>([])
const totalWeeksLoaded = ref(0)
const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_2_g.png'

// Modals
const showSettings = ref(false)
const showTeamModal = ref(false)
const selectedTeam = ref<any>(null)

// Chart
const chartSeries = ref<any[]>([])
const chartOptions = ref<any>(null)

// Computed
const currentWeek = computed(() => leagueStore.yahooLeague?.current_week || 1)
const totalWeeks = computed(() => parseInt(leagueStore.yahooLeague?.end_week) || 25)
const isSeasonComplete = computed(() => leagueStore.yahooLeague?.is_finished === 1)
const numCategories = computed(() => displayCategories.value.length || 12)

const availableWeeks = computed(() => {
  const endWeek = isSeasonComplete.value ? totalWeeks.value : currentWeek.value
  return Array.from({ length: endWeek }, (_, i) => i + 1)
})

const maxCategoryWins = computed(() => {
  let max = 1
  for (const team of powerRankings.value) {
    for (const wins of Object.values(team.categoryWins || {})) {
      if ((wins as number) > max) max = wins as number
    }
  }
  return max
})

// Helpers
function handleImageError(e: Event) { (e.target as HTMLImageElement).src = defaultAvatar }
function getRankClass(rank: number) {
  if (rank === 1) return 'bg-yellow-500/20 text-yellow-400'
  if (rank === 2) return 'bg-gray-400/20 text-gray-300'
  if (rank === 3) return 'bg-orange-600/20 text-orange-400'
  return 'bg-dark-border text-dark-textMuted'
}
function getCatWinPctClass(pct: number) {
  if (pct >= 0.55) return 'text-green-400'
  if (pct <= 0.45) return 'text-red-400'
  return 'text-dark-text'
}
function getAvgCatsClass(avg: number) {
  const mid = numCategories.value / 2
  if (avg >= mid + 1) return 'text-green-400'
  if (avg <= mid - 1) return 'text-red-400'
  return 'text-dark-text'
}
function getCategoryClass(rank: number) {
  const numTeams = leagueStore.yahooTeams.length
  if (rank <= 2) return 'text-green-400 font-bold'
  if (rank >= numTeams - 1) return 'text-red-400'
  return 'text-dark-text'
}
function openTeamModal(team: any) { selectedTeam.value = team; showTeamModal.value = true }

// Load categories
async function loadCategories() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey) return
  
  try {
    const settings = await yahooService.getLeagueScoringSettings(leagueKey)
    if (settings?.stat_categories) {
      displayCategories.value = settings.stat_categories
        .map((c: any) => ({
          stat_id: String(c.stat?.stat_id || c.stat_id),
          name: c.stat?.name || c.name,
          display_name: c.stat?.display_name || c.display_name,
          is_only_display_stat: c.stat?.is_only_display_stat || c.is_only_display_stat
        }))
        .filter((c: any) => c.stat_id && c.is_only_display_stat !== '1' && c.is_only_display_stat !== 1)
      
      console.log(`Loaded ${displayCategories.value.length} categories:`, displayCategories.value.map(c => c.display_name))
    }
  } catch (e) {
    console.error('Error loading categories:', e)
  }
}

// Main function to load all matchup data and calculate rankings
async function loadPowerRankings() {
  if (!selectedWeek.value) return
  
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey) return
  
  isLoading.value = true
  const throughWeek = parseInt(selectedWeek.value)
  
  try {
    // Ensure categories are loaded
    if (displayCategories.value.length === 0) {
      loadingMessage.value = 'Loading categories...'
      await loadCategories()
    }
    
    // Initialize team stats
    const teamStats = new Map<string, any>()
    for (const team of leagueStore.yahooTeams) {
      const categoryWins: Record<string, number> = {}
      const categoryLosses: Record<string, number> = {}
      const categoryTies: Record<string, number> = {}
      
      for (const cat of displayCategories.value) {
        categoryWins[cat.stat_id] = 0
        categoryLosses[cat.stat_id] = 0
        categoryTies[cat.stat_id] = 0
      }
      
      teamStats.set(team.team_key, {
        team_key: team.team_key,
        name: team.name,
        logo_url: team.logo_url,
        is_my_team: team.is_my_team,
        categoryWins,
        categoryLosses,
        categoryTies,
        totalCatWins: 0,
        totalCatLosses: 0,
        totalCatTies: 0,
        matchupWins: 0,
        matchupLosses: 0,
        matchupTies: 0
      })
    }
    
    // Load each week's matchup data
    console.log(`=== Loading ${throughWeek} weeks of matchup data ===`)
    
    for (let week = 1; week <= throughWeek; week++) {
      loadingMessage.value = `Loading week ${week}/${throughWeek}...`
      
      try {
        // Try the category matchups method
        const matchups = await yahooService.getCategoryMatchups(leagueKey, week)
        
        for (const matchup of matchups) {
          if (!matchup.teams || matchup.teams.length < 2) continue
          
          const team1Key = matchup.teams[0]?.team_key
          const team2Key = matchup.teams[1]?.team_key
          
          if (!team1Key || !team2Key) continue
          
          const team1Stats = teamStats.get(team1Key)
          const team2Stats = teamStats.get(team2Key)
          
          if (!team1Stats || !team2Stats) continue
          
          // Process stat winners if available
          if (matchup.stat_winners && matchup.stat_winners.length > 0) {
            for (const sw of matchup.stat_winners) {
              const statId = String(sw.stat_id)
              
              if (sw.is_tied) {
                team1Stats.categoryTies[statId] = (team1Stats.categoryTies[statId] || 0) + 1
                team2Stats.categoryTies[statId] = (team2Stats.categoryTies[statId] || 0) + 1
                team1Stats.totalCatTies++
                team2Stats.totalCatTies++
              } else if (sw.winner_team_key === team1Key) {
                team1Stats.categoryWins[statId] = (team1Stats.categoryWins[statId] || 0) + 1
                team2Stats.categoryLosses[statId] = (team2Stats.categoryLosses[statId] || 0) + 1
                team1Stats.totalCatWins++
                team2Stats.totalCatLosses++
              } else if (sw.winner_team_key === team2Key) {
                team2Stats.categoryWins[statId] = (team2Stats.categoryWins[statId] || 0) + 1
                team1Stats.categoryLosses[statId] = (team1Stats.categoryLosses[statId] || 0) + 1
                team2Stats.totalCatWins++
                team1Stats.totalCatLosses++
              }
            }
          }
          
          // Track matchup W-L
          if (matchup.winner_team_key === team1Key) {
            team1Stats.matchupWins++
            team2Stats.matchupLosses++
          } else if (matchup.winner_team_key === team2Key) {
            team2Stats.matchupWins++
            team1Stats.matchupLosses++
          } else if (matchup.is_tied) {
            team1Stats.matchupTies++
            team2Stats.matchupTies++
          }
        }
      } catch (e) {
        console.error(`Error loading week ${week}:`, e)
      }
    }
    
    totalWeeksLoaded.value = throughWeek
    
    // Calculate derived stats and power scores
    loadingMessage.value = 'Calculating power scores...'
    
    const rankings: any[] = []
    const numTeams = leagueStore.yahooTeams.length
    
    for (const [teamKey, stats] of teamStats) {
      const totalGames = stats.totalCatWins + stats.totalCatLosses + stats.totalCatTies
      const catWinPct = totalGames > 0 ? stats.totalCatWins / totalGames : 0
      const avgCatsWonPerWeek = throughWeek > 0 ? stats.totalCatWins / throughWeek : 0
      
      // Category balance
      stats.categoryBalance = calculateCategoryBalance(stats.categoryWins)
      
      rankings.push({
        ...stats,
        catWinPct,
        avgCatsWonPerWeek,
        powerScore: 0,
        change: 0,
        prevRank: 0,
        dominantCategories: 0,
        weakCategories: 0,
        categoryRanks: {}
      })
    }
    
    // Calculate category ranks for each category
    for (const cat of displayCategories.value) {
      const sorted = [...rankings].sort((a, b) => 
        (b.categoryWins[cat.stat_id] || 0) - (a.categoryWins[cat.stat_id] || 0)
      )
      sorted.forEach((team, idx) => {
        team.categoryRanks[cat.stat_id] = idx + 1
      })
    }
    
    // Count dominant/weak categories
    for (const team of rankings) {
      let dominant = 0, weak = 0
      for (const cat of displayCategories.value) {
        const rank = team.categoryRanks[cat.stat_id] || numTeams
        if (rank <= 2) dominant++
        if (rank >= numTeams - 1) weak++
      }
      team.dominantCategories = dominant
      team.weakCategories = weak
    }
    
    // Calculate power scores
    const maxCatWinPct = Math.max(...rankings.map(t => t.catWinPct), 0.01)
    const maxDominant = Math.max(...rankings.map(t => t.dominantCategories), 1)
    
    for (const team of rankings) {
      const catWinScore = (team.catWinPct / maxCatWinPct) * 40
      const dominantScore = (team.dominantCategories / maxDominant) * 25
      const balanceScore = team.categoryBalance * 0.2
      const weakPenalty = team.weakCategories * 3
      
      team.powerScore = Math.max(0, Math.min(100, catWinScore + dominantScore + balanceScore - weakPenalty))
    }
    
    // Sort by power score
    rankings.sort((a, b) => b.powerScore - a.powerScore)
    
    // Log results
    console.log('=== POWER RANKINGS COMPLETE ===')
    rankings.slice(0, 3).forEach((t, i) => {
      console.log(`#${i+1}: ${t.name} - Score: ${t.powerScore.toFixed(1)}, Cat W-L: ${t.totalCatWins}-${t.totalCatLosses}`)
    })
    
    powerRankings.value = rankings
    buildChart()
    
  } catch (e) {
    console.error('Error loading power rankings:', e)
  } finally {
    isLoading.value = false
  }
}

function buildChart() {
  if (powerRankings.value.length === 0) return
  
  const teamColors = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316']
  
  // For now, just show current standings as a bar chart
  const series = [{
    name: 'Power Score',
    data: powerRankings.value.map(t => ({ x: t.name, y: t.powerScore, fillColor: teamColors[powerRankings.value.indexOf(t) % teamColors.length] }))
  }]
  
  chartSeries.value = series
  chartOptions.value = {
    chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true } },
    dataLabels: { enabled: true, formatter: (v: number) => v.toFixed(1), style: { colors: ['#fff'] } },
    xaxis: { labels: { style: { colors: '#9CA3AF' } } },
    yaxis: { labels: { style: { colors: '#9CA3AF' } } },
    grid: { borderColor: '#374151' },
    legend: { show: false },
    tooltip: { theme: 'dark' }
  }
}

// Initialize
watch(() => leagueStore.yahooTeams, async () => {
  if (leagueStore.yahooTeams.length > 0) {
    await loadCategories()
    
    const endWeek = parseInt(leagueStore.yahooLeague?.end_week) || 25
    const currWeek = leagueStore.yahooLeague?.current_week || 1
    const isFinished = leagueStore.yahooLeague?.is_finished === 1
    const defaultWeek = isFinished ? endWeek : currWeek
    
    console.log(`Init: endWeek=${endWeek}, currWeek=${currWeek}, isFinished=${isFinished}, default=${defaultWeek}`)
    
    if (defaultWeek >= 1) {
      selectedWeek.value = defaultWeek.toString()
      loadPowerRankings()
    }
  }
}, { immediate: true })

onMounted(async () => {
  if (authStore.user?.id) {
    await yahooService.initialize(authStore.user.id)
  }
})
</script>
