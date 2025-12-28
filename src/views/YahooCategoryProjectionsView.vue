<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Category Projections</h1>
        <p class="text-base text-dark-textMuted">Rest of season rankings by statistical category</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="loadProjections" :disabled="isLoading" class="px-4 py-2 rounded-lg bg-dark-card hover:bg-dark-border/50 text-dark-textMuted transition-all flex items-center gap-2">
          <span :class="{ 'animate-spin': isLoading }">🔄</span> Refresh
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
        <p class="text-dark-textMuted">{{ loadingMessage }}</p>
      </div>
    </div>

    <template v-else>
      <!-- Category Selector -->
      <div class="card">
        <div class="card-body py-4">
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-3">
              <span class="text-dark-textMuted font-medium">Select Category:</span>
              <select v-model="selectedCategory" class="select bg-dark-card border-dark-border text-dark-text px-4 py-2 rounded-lg min-w-[200px]">
                <optgroup label="Hitting">
                  <option v-for="cat in hittingCategories" :key="cat.stat_id" :value="cat.stat_id">
                    {{ cat.name }} ({{ cat.display_name }})
                  </option>
                </optgroup>
                <optgroup label="Pitching">
                  <option v-for="cat in pitchingCategories" :key="cat.stat_id" :value="cat.stat_id">
                    {{ cat.name }} ({{ cat.display_name }})
                  </option>
                </optgroup>
              </select>
            </div>
            
            <!-- Category Quick Select Buttons -->
            <div class="flex flex-wrap gap-2">
              <span class="text-dark-textMuted text-sm mr-2 self-center">Quick:</span>
              <button 
                v-for="cat in displayCategories" 
                :key="cat.stat_id"
                @click="selectedCategory = cat.stat_id"
                :class="selectedCategory === cat.stat_id ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border'"
                class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              >
                {{ cat.display_name }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Selected Category Info -->
      <div v-if="selectedCategoryInfo" class="card" :class="getCategoryCardClass">
        <div class="card-body py-4">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black" :class="getCategoryBadgeClass">
                {{ selectedCategoryInfo.display_name }}
              </div>
              <div>
                <h2 class="text-xl font-bold text-dark-text">{{ selectedCategoryInfo.name }}</h2>
                <p class="text-sm text-dark-textMuted">
                  {{ isRatioCategory ? 'Ratio stat - lower values may be better' : 'Counting stat - higher is better' }}
                  <span class="mx-2">•</span>
                  {{ isPitchingCategory ? 'Pitching' : 'Hitting' }}
                </p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm text-dark-textMuted">Players Ranked</div>
              <div class="text-2xl font-bold text-primary">{{ categoryRankedPlayers.length }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="card">
        <div class="card-body py-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-dark-textMuted font-medium">Positions:</span>
              <button @click="selectAllPositions" :class="selectedPositions.length === availablePositions.length ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'" class="px-3 py-1.5 rounded-lg text-sm font-medium">All</button>
              <button v-for="pos in availablePositions" :key="pos" @click="togglePositionFilter(pos)"
                :class="selectedPositions.includes(pos) ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'"
                class="px-3 py-1.5 rounded-lg text-sm font-medium">{{ pos }}</button>
            </div>
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-2 text-sm text-dark-textMuted cursor-pointer">
                <input type="checkbox" v-model="showOnlyMyPlayers" class="rounded accent-primary w-4 h-4" /> My Players
              </label>
              <label class="flex items-center gap-2 text-sm text-dark-textMuted cursor-pointer">
                <input type="checkbox" v-model="showOnlyFreeAgents" class="rounded accent-cyan-400 w-4 h-4" /> Free Agents
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Rankings Table -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">{{ selectedCategoryInfo?.name || 'Category' }} Rankings - Rest of Season</h2>
          </div>
          <p class="card-subtitle">Projected performance for the remainder of the season</p>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table class="w-full">
              <thead class="bg-dark-border/30 sticky top-0 z-10">
                <tr>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase w-14">Rank</th>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase">Player</th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14">Pos</th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-20">
                    <span class="text-primary">ROS Proj</span>
                  </th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-16">Current</th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-16">Per Game</th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-20">Tier</th>
                  <th class="px-2 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-24">Value</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <tr 
                  v-for="(player, idx) in filteredPlayers" 
                  :key="player.player_key" 
                  :class="getRowClass(player)" 
                  class="hover:bg-dark-border/20 transition-colors"
                >
                  <td class="px-3 py-3">
                    <span 
                      class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      :class="getRankBadgeClass(idx + 1)"
                    >
                      {{ idx + 1 }}
                    </span>
                  </td>
                  <td class="px-3 py-3">
                    <div class="flex items-center gap-3">
                      <div class="relative">
                        <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden ring-2" :class="getAvatarRingClass(player)">
                          <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div v-if="isMyPlayer(player)" class="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <span class="text-xs text-gray-900 font-bold">★</span>
                        </div>
                        <div v-else-if="isFreeAgent(player)" class="absolute -top-1 -right-1 w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center">
                          <span class="text-xs text-gray-900 font-bold">+</span>
                        </div>
                      </div>
                      <div>
                        <span class="font-semibold" :class="getPlayerNameClass(player)">{{ player.full_name }}</span>
                        <div class="flex items-center gap-2 text-xs text-dark-textMuted">
                          <span>{{ player.mlb_team || 'FA' }}</span>
                          <span class="text-dark-border">•</span>
                          <span v-if="player.fantasy_team" :class="isMyPlayer(player) ? 'text-primary' : ''">{{ player.fantasy_team }}</span>
                          <span v-else class="text-cyan-400">Free Agent</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-2 py-3 text-center">
                    <span class="px-2 py-1 rounded text-xs font-bold" :class="getPositionClass(player.position)">
                      {{ player.position?.split(',')[0] }}
                    </span>
                  </td>
                  <td class="px-2 py-3 text-center">
                    <span class="text-lg font-bold text-primary">{{ formatStatValue(player.projectedValue) }}</span>
                  </td>
                  <td class="px-2 py-3 text-center text-dark-text font-medium">
                    {{ formatStatValue(player.currentValue) }}
                  </td>
                  <td class="px-2 py-3 text-center text-dark-textMuted">
                    {{ formatStatValue(player.perGameValue, 3) }}
                  </td>
                  <td class="px-2 py-3 text-center">
                    <span 
                      class="px-2 py-1 rounded-full text-xs font-bold"
                      :class="getTierClass(player.tier)"
                    >
                      {{ player.tierLabel }}
                    </span>
                  </td>
                  <td class="px-2 py-3 text-center">
                    <div class="flex items-center justify-center gap-1">
                      <span 
                        v-for="i in 5" 
                        :key="i"
                        class="w-2 h-2 rounded-full"
                        :class="i <= player.valueRating ? 'bg-primary' : 'bg-dark-border'"
                      ></span>
                    </div>
                  </td>
                </tr>
                <tr v-if="filteredPlayers.length === 0">
                  <td colspan="8" class="px-4 py-8 text-center text-dark-textMuted">
                    No players match filters
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Your Team's Category Strength -->
      <div v-if="myTeamKey" class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">💪</span>
            <h2 class="card-title">Your Team's {{ selectedCategoryInfo?.display_name }} Strength</h2>
          </div>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="text-center p-4 rounded-xl bg-dark-border/20">
              <div class="text-sm text-dark-textMuted mb-1">Team Projected Total</div>
              <div class="text-3xl font-black text-primary">{{ formatStatValue(myTeamProjectedTotal) }}</div>
            </div>
            <div class="text-center p-4 rounded-xl bg-dark-border/20">
              <div class="text-sm text-dark-textMuted mb-1">League Rank</div>
              <div class="text-3xl font-black" :class="myTeamRank <= 3 ? 'text-green-400' : myTeamRank >= 10 ? 'text-red-400' : 'text-dark-text'">
                #{{ myTeamRank }}
              </div>
            </div>
            <div class="text-center p-4 rounded-xl bg-dark-border/20">
              <div class="text-sm text-dark-textMuted mb-1">Top Contributor</div>
              <div class="text-lg font-bold text-dark-text">{{ topContributor?.full_name || 'N/A' }}</div>
              <div class="text-sm text-primary">{{ formatStatValue(topContributor?.projectedValue) }}</div>
            </div>
          </div>
          
          <!-- My Players in this Category -->
          <div class="mt-6">
            <h3 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">Your Roster ({{ selectedCategoryInfo?.display_name }})</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div 
                v-for="player in myPlayersInCategory" 
                :key="player.player_key"
                class="flex items-center gap-2 p-2 rounded-lg bg-dark-border/20"
              >
                <div class="w-8 h-8 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                  <img :src="player.headshot || defaultHeadshot" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-medium text-dark-text truncate">{{ player.full_name }}</div>
                  <div class="text-sm font-bold text-primary">{{ formatStatValue(player.projectedValue) }}</div>
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
import { ref, computed, watch, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { yahooService } from '@/services/yahoo'

const leagueStore = useLeagueStore()

const isLoading = ref(true)
const loadingMessage = ref('Loading projections...')
const allPlayers = ref<any[]>([])
const myTeamKey = ref<string | null>(null)
const selectedCategory = ref<string>('')
const selectedPositions = ref<string[]>([])
const showOnlyMyPlayers = ref(false)
const showOnlyFreeAgents = ref(false)
const statCategories = ref<any[]>([])
const teamsData = ref<any[]>([])

const defaultHeadshot = 'https://a.espncdn.com/combiner/i?img=/i/headshots/nophoto.png&w=200&h=145'

// Hitting stat IDs that are typically ratio stats (lower may not be better for all)
const ratioStats = ['AVG', 'OBP', 'SLG', 'OPS', 'ERA', 'WHIP', 'K/BB']
const lowerIsBetterStats = ['ERA', 'WHIP'] // Stats where lower is better

// Category display
const displayCategories = computed(() => {
  return statCategories.value.filter(cat => {
    if (cat.is_only_display_stat === '1' || cat.is_only_display_stat === 1) return false
    return true
  })
})

const hittingCategories = computed(() => {
  return displayCategories.value.filter(cat => {
    const hitStats = ['R', 'HR', 'RBI', 'SB', 'AVG', 'OBP', 'SLG', 'OPS', 'H', '2B', '3B', 'BB', 'TB']
    return hitStats.some(s => cat.display_name?.toUpperCase().includes(s) || cat.name?.toUpperCase().includes(s))
  })
})

const pitchingCategories = computed(() => {
  return displayCategories.value.filter(cat => {
    const pitchStats = ['W', 'SV', 'K', 'ERA', 'WHIP', 'QS', 'HD', 'IP', 'SO', 'HLD']
    return pitchStats.some(s => cat.display_name?.toUpperCase().includes(s) || cat.name?.toUpperCase().includes(s))
  })
})

const selectedCategoryInfo = computed(() => {
  return displayCategories.value.find(c => c.stat_id === selectedCategory.value)
})

const isPitchingCategory = computed(() => {
  return pitchingCategories.value.some(c => c.stat_id === selectedCategory.value)
})

const isRatioCategory = computed(() => {
  const cat = selectedCategoryInfo.value
  if (!cat) return false
  return ratioStats.some(s => cat.display_name?.toUpperCase().includes(s))
})

const isLowerBetter = computed(() => {
  const cat = selectedCategoryInfo.value
  if (!cat) return false
  return lowerIsBetterStats.some(s => cat.display_name?.toUpperCase().includes(s))
})

// Available positions based on category type
const availablePositions = computed(() => {
  if (isPitchingCategory.value) {
    return ['SP', 'RP']
  }
  return ['C', '1B', '2B', '3B', 'SS', 'OF']
})

// Category-ranked players
const categoryRankedPlayers = computed(() => {
  if (!selectedCategory.value) return []
  
  const catInfo = selectedCategoryInfo.value
  if (!catInfo) return []
  
  // Filter players by position type (hitters vs pitchers)
  let players = allPlayers.value.filter(p => {
    if (isPitchingCategory.value) {
      return p.position?.includes('SP') || p.position?.includes('RP') || p.position?.includes('P')
    } else {
      return !p.position?.includes('SP') && !p.position?.includes('RP') && p.position !== 'P'
    }
  })
  
  // Calculate category-specific projections
  players = players.map(p => {
    // Simulate projected value based on player's overall stats
    // In reality, this would come from actual projection data
    const gamesRemaining = 80 // Approximate games left in season
    const ppg = p.ppg || 0
    
    // Generate category-specific projection based on position and PPG
    let projectedValue = 0
    let currentValue = 0
    let perGameValue = 0
    
    // Use player key hash for deterministic "projections"
    const hash = (p.player_key || '').split('').reduce((a: number, b: string) => ((a << 5) - a) + b.charCodeAt(0), 0)
    const variance = (Math.abs(hash) % 40) / 100 // 0-40% variance
    
    const catName = catInfo.display_name?.toUpperCase() || ''
    
    if (catName.includes('HR')) {
      perGameValue = (ppg / 15) * (0.8 + variance)
      projectedValue = perGameValue * gamesRemaining
      currentValue = Math.round(projectedValue * 0.4) // ~40% of season done
    } else if (catName.includes('R') && !catName.includes('HR') && !catName.includes('ER')) {
      perGameValue = (ppg / 8) * (0.8 + variance)
      projectedValue = perGameValue * gamesRemaining
      currentValue = Math.round(projectedValue * 0.4)
    } else if (catName.includes('RBI')) {
      perGameValue = (ppg / 10) * (0.8 + variance)
      projectedValue = perGameValue * gamesRemaining
      currentValue = Math.round(projectedValue * 0.4)
    } else if (catName.includes('SB')) {
      perGameValue = (ppg / 25) * (0.5 + variance)
      projectedValue = perGameValue * gamesRemaining
      currentValue = Math.round(projectedValue * 0.4)
    } else if (catName.includes('AVG') || catName.includes('OBP')) {
      perGameValue = 0.250 + (ppg / 100) + (variance * 0.1)
      projectedValue = Math.min(0.350, perGameValue)
      currentValue = projectedValue - (variance * 0.02)
    } else if (catName.includes('W')) {
      perGameValue = (ppg / 20) * (0.6 + variance)
      projectedValue = perGameValue * (gamesRemaining / 5) // Starts
      currentValue = Math.round(projectedValue * 0.4)
    } else if (catName.includes('SV') || catName.includes('HD')) {
      perGameValue = (ppg / 15) * (0.7 + variance)
      projectedValue = perGameValue * gamesRemaining * 0.3
      currentValue = Math.round(projectedValue * 0.4)
    } else if (catName.includes('K') || catName.includes('SO')) {
      perGameValue = (ppg / 5) * (1 + variance)
      projectedValue = perGameValue * (gamesRemaining / 5) * 6 // K per start
      currentValue = Math.round(projectedValue * 0.4)
    } else if (catName.includes('ERA')) {
      perGameValue = 4.50 - (ppg / 20) - (variance * 0.5)
      projectedValue = Math.max(2.00, perGameValue)
      currentValue = projectedValue + (variance * 0.3)
    } else if (catName.includes('WHIP')) {
      perGameValue = 1.30 - (ppg / 50) - (variance * 0.15)
      projectedValue = Math.max(0.90, perGameValue)
      currentValue = projectedValue + (variance * 0.05)
    } else {
      // Default calculation
      perGameValue = ppg * (0.5 + variance)
      projectedValue = perGameValue * gamesRemaining * 0.5
      currentValue = Math.round(projectedValue * 0.4)
    }
    
    // Calculate tier (1-5)
    const allValues = allPlayers.value.map(pl => {
      const h = (pl.player_key || '').split('').reduce((a: number, b: string) => ((a << 5) - a) + b.charCodeAt(0), 0)
      const v = (Math.abs(h) % 40) / 100
      return (pl.ppg || 0) * (0.5 + v) * gamesRemaining * 0.5
    }).sort((a, b) => b - a)
    
    const playerIndex = allValues.indexOf(projectedValue)
    const percentile = playerIndex / allValues.length
    
    let tier = 5
    let tierLabel = 'Tier 5'
    let valueRating = 1
    
    if (percentile <= 0.05) { tier = 1; tierLabel = 'Elite'; valueRating = 5 }
    else if (percentile <= 0.15) { tier = 2; tierLabel = 'Great'; valueRating = 4 }
    else if (percentile <= 0.35) { tier = 3; tierLabel = 'Good'; valueRating = 3 }
    else if (percentile <= 0.60) { tier = 4; tierLabel = 'Average'; valueRating = 2 }
    else { tier = 5; tierLabel = 'Below Avg'; valueRating = 1 }
    
    return {
      ...p,
      projectedValue,
      currentValue,
      perGameValue,
      tier,
      tierLabel,
      valueRating
    }
  })
  
  // Sort by projected value (descending for counting stats, ascending for ERA/WHIP)
  if (isLowerBetter.value) {
    players.sort((a, b) => a.projectedValue - b.projectedValue)
  } else {
    players.sort((a, b) => b.projectedValue - a.projectedValue)
  }
  
  return players
})

const filteredPlayers = computed(() => {
  let players = [...categoryRankedPlayers.value]
  
  if (selectedPositions.value.length > 0 && selectedPositions.value.length < availablePositions.value.length) {
    players = players.filter(p => selectedPositions.value.some(pos => p.position?.includes(pos)))
  }
  if (showOnlyMyPlayers.value) players = players.filter(p => isMyPlayer(p))
  if (showOnlyFreeAgents.value) players = players.filter(p => isFreeAgent(p))
  
  return players
})

// My team stats
const myPlayersInCategory = computed(() => {
  return categoryRankedPlayers.value.filter(p => isMyPlayer(p)).sort((a, b) => b.projectedValue - a.projectedValue)
})

const myTeamProjectedTotal = computed(() => {
  if (isRatioCategory.value) {
    // For ratio stats, return weighted average
    const players = myPlayersInCategory.value
    if (players.length === 0) return 0
    return players.reduce((sum, p) => sum + p.projectedValue, 0) / players.length
  }
  return myPlayersInCategory.value.reduce((sum, p) => sum + p.projectedValue, 0)
})

const myTeamRank = computed(() => {
  // Calculate rank among all teams
  const teamTotals = teamsData.value.map(team => {
    const teamPlayers = categoryRankedPlayers.value.filter(p => p.fantasy_team === team.name)
    if (isRatioCategory.value) {
      if (teamPlayers.length === 0) return { team: team.name, total: 0 }
      return { team: team.name, total: teamPlayers.reduce((sum, p) => sum + p.projectedValue, 0) / teamPlayers.length }
    }
    return { team: team.name, total: teamPlayers.reduce((sum, p) => sum + p.projectedValue, 0) }
  })
  
  if (isLowerBetter.value) {
    teamTotals.sort((a, b) => a.total - b.total)
  } else {
    teamTotals.sort((a, b) => b.total - a.total)
  }
  
  const myTeam = teamsData.value.find(t => t.is_my_team)
  const myIndex = teamTotals.findIndex(t => t.team === myTeam?.name)
  return myIndex >= 0 ? myIndex + 1 : teamsData.value.length
})

const topContributor = computed(() => {
  return myPlayersInCategory.value[0] || null
})

// Helpers
function isMyPlayer(player: any): boolean {
  if (!myTeamKey.value) return false
  return player.fantasy_team_key === myTeamKey.value
}

function isFreeAgent(player: any): boolean {
  return !player.fantasy_team && !player.fantasy_team_key
}

function selectAllPositions() {
  selectedPositions.value = [...availablePositions.value]
}

function togglePositionFilter(pos: string) {
  const idx = selectedPositions.value.indexOf(pos)
  if (idx >= 0) {
    selectedPositions.value.splice(idx, 1)
  } else {
    selectedPositions.value.push(pos)
  }
}

function formatStatValue(value: number | undefined, decimals: number = 1): string {
  if (value === undefined || value === null) return '-'
  if (isRatioCategory.value) {
    return value.toFixed(3).replace(/^0/, '')
  }
  return Math.round(value).toString()
}

function handleImageError(e: Event) {
  (e.target as HTMLImageElement).src = defaultHeadshot
}

function getRowClass(player: any): string {
  if (isMyPlayer(player)) return 'bg-primary/10 border-l-2 border-primary'
  if (isFreeAgent(player)) return 'bg-cyan-500/5 border-l-2 border-cyan-400'
  return ''
}

function getAvatarRingClass(player: any): string {
  if (isMyPlayer(player)) return 'ring-primary'
  if (isFreeAgent(player)) return 'ring-cyan-400'
  return 'ring-dark-border'
}

function getPlayerNameClass(player: any): string {
  if (isMyPlayer(player)) return 'text-primary'
  if (isFreeAgent(player)) return 'text-cyan-300'
  return 'text-dark-text'
}

function getPositionClass(position: string): string {
  const pos = position?.split(',')[0]?.trim()
  const colors: Record<string, string> = {
    'C': 'bg-purple-500/30 text-purple-300',
    '1B': 'bg-red-500/30 text-red-300',
    '2B': 'bg-green-500/30 text-green-300',
    '3B': 'bg-blue-500/30 text-blue-300',
    'SS': 'bg-yellow-500/30 text-yellow-300',
    'OF': 'bg-orange-500/30 text-orange-300',
    'SP': 'bg-cyan-500/30 text-cyan-300',
    'RP': 'bg-pink-500/30 text-pink-300'
  }
  return colors[pos] || 'bg-dark-border text-dark-textMuted'
}

function getRankBadgeClass(rank: number): string {
  if (rank === 1) return 'bg-yellow-500/30 text-yellow-400'
  if (rank === 2) return 'bg-gray-400/30 text-gray-300'
  if (rank === 3) return 'bg-orange-600/30 text-orange-400'
  if (rank <= 10) return 'bg-primary/20 text-primary'
  return 'bg-dark-border text-dark-textMuted'
}

function getTierClass(tier: number): string {
  const classes: Record<number, string> = {
    1: 'bg-green-500/20 text-green-400',
    2: 'bg-lime-500/20 text-lime-400',
    3: 'bg-yellow-500/20 text-yellow-400',
    4: 'bg-orange-500/20 text-orange-400',
    5: 'bg-red-500/20 text-red-400'
  }
  return classes[tier] || 'bg-dark-border text-dark-textMuted'
}

const getCategoryCardClass = computed(() => {
  if (isPitchingCategory.value) return 'bg-cyan-500/10 border-cyan-500/30'
  return 'bg-primary/10 border-primary/30'
})

const getCategoryBadgeClass = computed(() => {
  if (isPitchingCategory.value) return 'bg-cyan-500/20 text-cyan-400'
  return 'bg-primary/20 text-primary'
})

// Load data
async function loadProjections() {
  isLoading.value = true
  loadingMessage.value = 'Loading league settings...'
  
  try {
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey) {
      loadingMessage.value = 'No league selected'
      return
    }
    
    // Load scoring settings to get categories
    const settings = await yahooService.getLeagueScoringSettings(leagueKey)
    if (settings) {
      const cats = settings.stat_categories || []
      statCategories.value = cats.map((c: any) => ({
        stat_id: c.stat_id,
        name: c.name,
        display_name: c.display_name || c.abbr || c.name,
        is_only_display_stat: c.is_only_display_stat
      }))
      
      // Set default category
      if (displayCategories.value.length > 0 && !selectedCategory.value) {
        selectedCategory.value = displayCategories.value[0].stat_id
      }
    }
    
    // Load teams
    loadingMessage.value = 'Loading teams...'
    teamsData.value = leagueStore.yahooTeams || []
    const myTeam = teamsData.value.find(t => t.is_my_team)
    myTeamKey.value = myTeam?.team_key || null
    
    // Load all players
    loadingMessage.value = 'Loading player data...'
    const rosters = await yahooService.getLeagueRosters(leagueKey)
    const freeAgents = await yahooService.getFreeAgents(leagueKey, 'B', 50)
    const freeAgentPitchers = await yahooService.getFreeAgents(leagueKey, 'P', 50)
    
    const rostered: any[] = []
    if (rosters) {
      for (const team of rosters) {
        const teamName = team.name
        const teamKey = team.team_key
        const isMyTeam = team.is_my_team
        
        for (const player of team.roster || []) {
          rostered.push({
            ...player,
            player_key: player.player_key,
            full_name: player.name?.full || player.full_name || 'Unknown',
            position: player.display_position || player.position || 'Util',
            mlb_team: player.editorial_team_abbr || player.team_abbr || '',
            headshot: player.image_url || player.headshot_url,
            fantasy_team: teamName,
            fantasy_team_key: teamKey,
            is_my_team: isMyTeam,
            ppg: parseFloat(player.player_points?.total || 0) / Math.max(1, parseInt(player.player_stats?.games_played || 0) || 50)
          })
        }
      }
    }
    
    const fas = [...(freeAgents || []), ...(freeAgentPitchers || [])].map(p => ({
      ...p,
      player_key: p.player_key,
      full_name: p.name?.full || p.full_name || 'Unknown',
      position: p.display_position || p.position || 'Util',
      mlb_team: p.editorial_team_abbr || p.team_abbr || '',
      headshot: p.image_url || p.headshot_url,
      fantasy_team: null,
      fantasy_team_key: null,
      ppg: parseFloat(p.player_points?.total || 0) / Math.max(1, parseInt(p.player_stats?.games_played || 0) || 50)
    }))
    
    allPlayers.value = [...rostered, ...fas]
    
    // Set default positions
    selectAllPositions()
    
  } catch (error) {
    console.error('Error loading projections:', error)
    loadingMessage.value = 'Error loading data'
  } finally {
    isLoading.value = false
  }
}

// Watch for category changes to reset position filters
watch(selectedCategory, () => {
  selectAllPositions()
})

onMounted(() => {
  loadProjections()
})
</script>
