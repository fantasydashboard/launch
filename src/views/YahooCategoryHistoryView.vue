<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-dark-text mb-2">League History</h1>
      <p class="text-base text-dark-textMuted">
        Career statistics, championship records, and category dominance
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
        <div class="text-dark-textMuted">{{ loadingMessage }}</div>
      </div>
    </div>

    <template v-else>
      <!-- Career Records (4 Cards) -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">👑</span>
            <h2 class="card-title">Career Records</h2>
          </div>
          <p class="card-subtitle mt-2">All-time league leaders</p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div v-for="record in careerRecords" :key="record.label" 
                 class="relative overflow-hidden">
              <div class="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20 hover:border-primary/40 transition-all">
                <div class="flex items-start justify-between mb-4">
                  <div class="text-4xl">{{ record.icon }}</div>
                  <div class="text-right">
                    <div class="text-4xl font-black text-primary mb-1">{{ record.value }}</div>
                  </div>
                </div>
                <div class="space-y-1">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wider font-bold">{{ record.label }}</div>
                  <div class="font-bold text-lg text-dark-text">{{ record.team }}</div>
                  <div class="text-xs text-dark-textMuted">{{ record.detail }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Career Statistics Table -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📊</span>
              <h2 class="card-title">Career Statistics</h2>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-sm text-dark-textMuted">
                All-time regular season records
              </div>
              <!-- Toggle for current members only -->
              <label class="flex items-center gap-2 cursor-pointer">
                <span class="text-sm text-dark-textMuted">Current members only</span>
                <div class="relative">
                  <input type="checkbox" v-model="showCurrentMembersOnly" class="sr-only">
                  <div :class="[
                    'w-10 h-5 rounded-full transition-colors',
                    showCurrentMembersOnly ? 'bg-primary' : 'bg-dark-border'
                  ]"></div>
                  <div :class="[
                    'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                    showCurrentMembersOnly ? 'translate-x-5' : 'translate-x-0'
                  ]"></div>
                </div>
              </label>
              <button 
                @click="downloadCareerStats"
                :disabled="isDownloading"
                class="btn-primary flex items-center gap-2 text-sm"
              >
                <svg v-if="!isDownloading" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloading ? 'Generating...' : 'Share' }}
              </button>
            </div>
          </div>
        </div>
        <div class="card-body overflow-x-auto">
          <table ref="careerTableRef" class="w-full text-sm">
            <thead>
              <tr class="border-b border-dark-border">
                <th class="text-left py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Team</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('seasons')">
                  <div class="flex items-center justify-center gap-1">
                    Seasons
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'seasons' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'seasons' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('championships')">
                  <div class="flex items-center justify-center gap-1">
                    🏆
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'championships' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'championships' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('matchup_wins')">
                  <div class="flex items-center justify-center gap-1">
                    Record
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'matchup_wins' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'matchup_wins' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('matchup_win_pct')">
                  <div class="flex items-center justify-center gap-1">
                    Win %
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'matchup_win_pct' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'matchup_win_pct' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('avg_cat_wins')">
                  <div class="flex items-center justify-center gap-1">
                    Avg Cat W/Wk
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'avg_cat_wins' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'avg_cat_wins' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('total_cat_wins')">
                  <div class="flex items-center justify-center gap-1">
                    Total Cat W
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'total_cat_wins' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'total_cat_wins' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('cat_diff')">
                  <div class="flex items-center justify-center gap-1">
                    Cat +/-
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'cat_diff' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'cat_diff' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Best Cat</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Worst Cat</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(stat, idx) in filteredCareerStats" :key="stat.team_key" 
                  class="border-b border-dark-border hover:bg-dark-border/30 transition-colors">
                <td class="py-3 px-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="stat.logo_url || defaultAvatar"
                        :alt="stat.team_name"
                        class="w-full h-full object-cover"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="font-semibold text-dark-text">{{ stat.team_name }}</div>
                  </div>
                </td>
                <td class="text-center py-3 px-4 text-dark-text">{{ stat.seasons }}</td>
                <td class="text-center py-3 px-4">
                  <span v-if="stat.championships > 0" class="text-primary font-bold">
                    🏆 {{ stat.championships }}
                  </span>
                  <span v-else class="text-dark-textMuted">—</span>
                </td>
                <td class="text-center py-3 px-4 font-semibold" :class="getRecordClass(stat, 'matchup_wins')">
                  {{ stat.matchup_wins }}-{{ stat.matchup_losses }}-{{ stat.matchup_ties }}
                </td>
                <td class="text-center py-3 px-4">
                  <span :class="getRecordClass(stat, 'matchup_win_pct')">
                    {{ (stat.matchup_win_pct * 100).toFixed(1) }}%
                  </span>
                </td>
                <td class="text-center py-3 px-4" :class="getRecordClass(stat, 'avg_cat_wins')">
                  {{ stat.avg_cat_wins.toFixed(1) }}
                </td>
                <td class="text-center py-3 px-4" :class="getRecordClass(stat, 'total_cat_wins')">
                  {{ stat.total_cat_wins }}
                </td>
                <td class="text-center py-3 px-4">
                  <span :class="stat.cat_diff >= 0 ? 'text-green-400' : 'text-red-400'" class="font-semibold">
                    {{ stat.cat_diff >= 0 ? '+' : '' }}{{ stat.cat_diff }}
                  </span>
                </td>
                <td class="text-center py-3 px-4">
                  <span class="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400">
                    {{ stat.best_category || '—' }}
                  </span>
                </td>
                <td class="text-center py-3 px-4">
                  <span class="px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400">
                    {{ stat.worst_category || '—' }}
                  </span>
                </td>
              </tr>
              <tr v-if="filteredCareerStats.length === 0">
                <td colspan="10" class="py-8 text-center text-dark-textMuted">
                  No historical data available
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Category Dominance Leaders -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🎯</span>
            <h2 class="card-title">Category Dominance</h2>
          </div>
          <p class="card-subtitle mt-2">All-time category leaders by win rate</p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div v-for="cat in categoryLeaders" :key="cat.name" class="bg-dark-border/20 rounded-xl p-4">
              <div class="text-center mb-3">
                <span class="px-3 py-1 rounded-full text-sm font-bold" :class="getCategoryColorClass(cat.name)">
                  {{ cat.name }}
                </span>
              </div>
              <div v-if="cat.leader" class="space-y-2">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                    <img :src="cat.leader.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-dark-text text-sm truncate">{{ cat.leader.team_name }}</div>
                  </div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-black text-primary">{{ (cat.leader.win_rate * 100).toFixed(0) }}%</div>
                  <div class="text-xs text-dark-textMuted">{{ cat.leader.wins }}-{{ cat.leader.losses }} in {{ cat.name }}</div>
                </div>
              </div>
              <div v-else class="text-center text-sm text-dark-textMuted italic py-4">
                No data
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
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'
import html2canvas from 'html2canvas'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

interface CareerStat {
  team_key: string
  team_name: string
  logo_url: string
  seasons: number
  championships: number
  matchup_wins: number
  matchup_losses: number
  matchup_ties: number
  matchup_win_pct: number
  total_cat_wins: number
  total_cat_losses: number
  avg_cat_wins: number
  cat_diff: number
  total_matchups: number
  best_category: string
  worst_category: string
  category_records: Record<string, { wins: number; losses: number }>
}

const isLoading = ref(true)
const loadingMessage = ref('Loading historical data...')
const isDownloading = ref(false)
const showCurrentMembersOnly = ref(false)
const sortColumn = ref('matchup_wins')
const sortDirection = ref<'asc' | 'desc'>('desc')

const careerTableRef = ref<HTMLElement | null>(null)
const historicalData = ref<Record<string, any>>({})
const currentMembers = ref<Set<string>>(new Set())
const allTeams = ref<Record<string, any>>({})
const leagueCategories = ref<string[]>([])

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_dp_2_72.png'

// Career Records - top 4 stats
const careerRecords = computed(() => {
  const stats = careerStats.value
  if (stats.length === 0) return []
  
  const mostChampionships = [...stats].sort((a, b) => b.championships - a.championships)[0]
  const bestWinPct = [...stats].filter(s => s.total_matchups >= 10).sort((a, b) => b.matchup_win_pct - a.matchup_win_pct)[0]
  const mostCatWins = [...stats].sort((a, b) => b.total_cat_wins - a.total_cat_wins)[0]
  const mostBalanced = [...stats].filter(s => s.total_matchups >= 10).sort((a, b) => {
    // Calculate variance in category win rates
    const aVariance = calculateCategoryVariance(a)
    const bVariance = calculateCategoryVariance(b)
    return aVariance - bVariance // Lower variance = more balanced
  })[0]
  
  return [
    {
      label: 'Most Championships',
      team: mostChampionships?.team_name || 'N/A',
      value: mostChampionships?.championships || 0,
      icon: '🏆',
      detail: `${mostChampionships?.seasons || 0} season(s) played`
    },
    {
      label: 'Best Category Win Rate',
      team: bestWinPct?.team_name || 'N/A',
      value: bestWinPct ? `${(bestWinPct.matchup_win_pct * 100).toFixed(0)}%` : '0%',
      icon: '📊',
      detail: `${bestWinPct?.matchup_wins || 0}-${bestWinPct?.matchup_losses || 0}-${bestWinPct?.matchup_ties || 0} record`
    },
    {
      label: 'Most Category Wins',
      team: mostCatWins?.team_name || 'N/A',
      value: mostCatWins?.total_cat_wins || 0,
      icon: '🎯',
      detail: `+${mostCatWins?.cat_diff || 0} category differential`
    },
    {
      label: 'Most Balanced',
      team: mostBalanced?.team_name || 'N/A',
      value: mostBalanced?.avg_cat_wins?.toFixed(1) || '0',
      icon: '⚖️',
      detail: `Avg cats won per matchup`
    }
  ]
})

// Calculate variance in category performance
function calculateCategoryVariance(stat: CareerStat): number {
  const records = Object.values(stat.category_records || {})
  if (records.length === 0) return Infinity
  
  const winRates = records.map(r => r.wins / (r.wins + r.losses) || 0)
  const avg = winRates.reduce((a, b) => a + b, 0) / winRates.length
  const variance = winRates.reduce((sum, rate) => sum + Math.pow(rate - avg, 2), 0) / winRates.length
  return variance
}

// Computed: Career Stats
const careerStats = computed((): CareerStat[] => {
  const statsMap: Record<string, CareerStat> = {}
  
  // Aggregate stats across all seasons
  for (const [season, seasonData] of Object.entries(historicalData.value)) {
    const standings = seasonData.standings || []
    const matchups = seasonData.matchups || []
    
    for (const team of standings) {
      const teamKey = team.team_key
      const existing = statsMap[teamKey]
      
      const teamInfo = allTeams.value[teamKey]
      const logoUrl = teamInfo?.logo_url || team.logo_url || ''
      
      // Parse wins/losses/ties from standings (H2H Categories format)
      const wins = team.wins || 0
      const losses = team.losses || 0
      const ties = team.ties || 0
      
      if (existing) {
        existing.seasons++
        existing.matchup_wins += wins
        existing.matchup_losses += losses
        existing.matchup_ties += ties
        existing.total_matchups += wins + losses + ties
        if (team.is_champion) existing.championships++
        if (logoUrl && !existing.logo_url) existing.logo_url = logoUrl
      } else {
        statsMap[teamKey] = {
          team_key: teamKey,
          team_name: team.name || 'Unknown Team',
          logo_url: logoUrl,
          seasons: 1,
          championships: team.is_champion ? 1 : 0,
          matchup_wins: wins,
          matchup_losses: losses,
          matchup_ties: ties,
          matchup_win_pct: 0,
          total_cat_wins: 0,
          total_cat_losses: 0,
          avg_cat_wins: 0,
          cat_diff: 0,
          total_matchups: wins + losses + ties,
          best_category: '',
          worst_category: '',
          category_records: {}
        }
      }
    }
    
    // Process matchups to get category-level data
    for (const matchup of matchups) {
      if (!matchup.teams || matchup.teams.length < 2) continue
      
      for (const team of matchup.teams) {
        const teamKey = team.team_key
        if (!statsMap[teamKey]) continue
        
        const stat = statsMap[teamKey]
        
        // Category wins/losses from matchup
        const catWins = team.stat_winners?.filter((w: any) => w.is_tied === '0' && w.winner_team_key === teamKey).length || 0
        const catLosses = team.stat_winners?.filter((w: any) => w.is_tied === '0' && w.winner_team_key !== teamKey).length || 0
        
        stat.total_cat_wins += catWins
        stat.total_cat_losses += catLosses
        
        // Track category-specific records
        for (const catResult of team.stat_winners || []) {
          const catName = catResult.stat_id // We'll need to map this to display name
          if (!stat.category_records[catName]) {
            stat.category_records[catName] = { wins: 0, losses: 0 }
          }
          if (catResult.is_tied === '0') {
            if (catResult.winner_team_key === teamKey) {
              stat.category_records[catName].wins++
            } else {
              stat.category_records[catName].losses++
            }
          }
        }
      }
    }
  }
  
  // Calculate derived stats and find best/worst categories
  const stats = Object.values(statsMap).map(stat => {
    const totalGames = stat.matchup_wins + stat.matchup_losses + stat.matchup_ties
    stat.matchup_win_pct = totalGames > 0 ? (stat.matchup_wins + stat.matchup_ties * 0.5) / totalGames : 0
    stat.cat_diff = stat.total_cat_wins - stat.total_cat_losses
    stat.avg_cat_wins = stat.total_matchups > 0 ? stat.total_cat_wins / stat.total_matchups : 0
    
    // Find best and worst categories
    const catRecords = Object.entries(stat.category_records)
    if (catRecords.length > 0) {
      const sorted = catRecords.sort((a, b) => {
        const aRate = a[1].wins / (a[1].wins + a[1].losses) || 0
        const bRate = b[1].wins / (b[1].wins + b[1].losses) || 0
        return bRate - aRate
      })
      stat.best_category = getCategoryDisplayName(sorted[0][0])
      stat.worst_category = getCategoryDisplayName(sorted[sorted.length - 1][0])
    }
    
    return stat
  })
  
  return sortStats(stats)
})

// Filtered career stats
const filteredCareerStats = computed(() => {
  if (!showCurrentMembersOnly.value) return careerStats.value
  return careerStats.value.filter(stat => currentMembers.value.has(stat.team_key))
})

// Category leaders
const categoryLeaders = computed(() => {
  const categories = leagueCategories.value.length > 0 ? leagueCategories.value : ['HR', 'RBI', 'R', 'SB', 'AVG', 'W', 'K', 'ERA', 'WHIP', 'SV']
  
  return categories.slice(0, 10).map(cat => {
    // Find team with best win rate in this category
    let bestTeam: any = null
    let bestRate = 0
    
    for (const stat of careerStats.value) {
      const record = stat.category_records[cat]
      if (!record || record.wins + record.losses < 5) continue
      
      const rate = record.wins / (record.wins + record.losses)
      if (rate > bestRate) {
        bestRate = rate
        bestTeam = {
          team_name: stat.team_name,
          logo_url: stat.logo_url,
          win_rate: rate,
          wins: record.wins,
          losses: record.losses
        }
      }
    }
    
    return { name: cat, leader: bestTeam }
  })
})

// Sort functions
function sortBy(column: string) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'desc'
  }
}

function sortStats(stats: CareerStat[]): CareerStat[] {
  return [...stats].sort((a, b) => {
    let aVal = (a as any)[sortColumn.value] || 0
    let bVal = (b as any)[sortColumn.value] || 0
    
    if (sortDirection.value === 'asc') {
      return aVal - bVal
    }
    return bVal - aVal
  })
}

function getRecordClass(stat: CareerStat, column: string): string {
  const stats = careerStats.value
  if (stats.length === 0) return 'text-dark-text'
  
  const values = stats.map(s => (s as any)[column] || 0)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const val = (stat as any)[column] || 0
  
  if (val === max && column !== 'matchup_losses') return 'text-green-400 font-bold'
  if (val === min && column === 'matchup_losses') return 'text-green-400 font-bold'
  if (val === min && column !== 'matchup_losses') return 'text-red-400'
  if (val === max && column === 'matchup_losses') return 'text-red-400'
  return 'text-dark-text'
}

function getCategoryDisplayName(statId: string): string {
  // Map stat IDs to display names (this would ideally come from league settings)
  const mapping: Record<string, string> = {
    '7': 'R', '12': 'HR', '13': 'RBI', '16': 'SB', '3': 'AVG',
    '28': 'W', '32': 'SV', '42': 'K', '26': 'ERA', '27': 'WHIP',
    '60': 'OPS', '8': 'H', '55': 'OBP', '56': 'SLG'
  }
  return mapping[statId] || statId
}

function getCategoryColorClass(cat: string): string {
  const hittingCats = ['HR', 'RBI', 'R', 'SB', 'AVG', 'OPS', 'OBP', 'SLG', 'H']
  if (hittingCats.includes(cat)) return 'bg-blue-500/30 text-blue-400'
  return 'bg-purple-500/30 text-purple-400'
}

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = defaultAvatar
}

async function downloadCareerStats() {
  if (!careerTableRef.value) return
  isDownloading.value = true
  try {
    const canvas = await html2canvas(careerTableRef.value, {
      backgroundColor: '#1a1d23',
      scale: 2
    })
    const link = document.createElement('a')
    link.download = 'category-league-career-stats.png'
    link.href = canvas.toDataURL()
    link.click()
  } finally {
    isDownloading.value = false
  }
}

async function loadHistoricalData() {
  isLoading.value = true
  loadingMessage.value = 'Connecting to Yahoo...'
  
  try {
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey || !authStore.user?.id) {
      isLoading.value = false
      return
    }
    
    await yahooService.initialize(authStore.user.id)
    
    const gameKey = leagueKey.split('.')[0]
    
    // Baseball game keys by year
    const gameKeys: Record<string, string> = {
      '2025': '431', '2024': '422', '2023': '412', '2022': '404',
      '2021': '398', '2020': '388', '2019': '378', '2018': '370',
      '2017': '364', '2016': '357', '2015': '346', '2014': '328'
    }
    
    // Extract league ID from current league key
    const leagueId = leagueKey.split('.l.')[1]
    loadingMessage.value = `Loading league ${leagueId} history...`
    
    // Try to load multiple seasons
    const data: Record<string, any> = {}
    const years = Object.keys(gameKeys).sort((a, b) => parseInt(b) - parseInt(a))
    
    for (const year of years.slice(0, 5)) { // Load last 5 years max
      const yearGameKey = gameKeys[year]
      const yearLeagueKey = `${yearGameKey}.l.${leagueId}`
      
      loadingMessage.value = `Loading ${year} season...`
      
      try {
        const standings = await yahooService.getStandings(yearLeagueKey)
        if (standings && standings.length > 0) {
          // Determine champion (rank 1 at end of playoffs)
          const champion = standings.find((t: any) => t.rank === 1)
          if (champion) champion.is_champion = true
          
          data[year] = { standings, matchups: [] }
          
          // Store current members from most recent season
          if (Object.keys(data).length === 1) {
            standings.forEach((t: any) => {
              currentMembers.value.add(t.team_key)
              allTeams.value[t.team_key] = t
            })
          }
          
          // Try to load matchups for category data
          try {
            const matchups = await yahooService.getMatchups(yearLeagueKey)
            if (matchups) data[year].matchups = matchups
          } catch (e) {
            console.log(`Could not load matchups for ${year}`)
          }
        }
      } catch (e) {
        console.log(`Could not load ${year} season`)
      }
    }
    
    historicalData.value = data
    loadingMessage.value = 'Done!'
    
  } catch (e) {
    console.error('Error loading history:', e)
    loadingMessage.value = 'Error loading data'
  } finally {
    isLoading.value = false
  }
}

watch(() => leagueStore.activeLeagueId, (id) => {
  if (id && leagueStore.activePlatform === 'yahoo') loadHistoricalData()
}, { immediate: true })

onMounted(() => {
  if (leagueStore.activeLeagueId && leagueStore.activePlatform === 'yahoo') {
    loadHistoricalData()
  }
})
</script>
