<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Dynasty Values</h1>
        <p class="text-base text-dark-textMuted">
          Trade values powered by DynastyProcess.com crowdsourced rankings
        </p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Superflex Toggle -->
        <div class="flex items-center gap-2 bg-dark-card rounded-lg p-1">
          <button
            @click="isSuperFlex = false"
            :class="!isSuperFlex ? 'bg-primary text-gray-900' : 'text-dark-textMuted hover:text-dark-text'"
            class="px-4 py-2 rounded-lg font-medium transition-all text-sm"
          >
            1QB
          </button>
          <button
            @click="isSuperFlex = true"
            :class="isSuperFlex ? 'bg-primary text-gray-900' : 'text-dark-textMuted hover:text-dark-text'"
            class="px-4 py-2 rounded-lg font-medium transition-all text-sm"
          >
            SuperFlex
          </button>
        </div>
        <button 
          @click="refreshValues" 
          class="px-4 py-2 rounded-lg bg-dark-card hover:bg-dark-border/50 text-dark-textMuted transition-all flex items-center gap-2"
          :disabled="isLoading"
        >
          <span :class="{ 'animate-spin': isLoading }">🔄</span>
          Refresh
        </button>
      </div>
    </div>

    <!-- Not a Dynasty League Warning -->
    <div v-if="!isDynastyLeague" class="card bg-yellow-500/10 border border-yellow-500/30">
      <div class="card-body py-6 text-center">
        <div class="text-4xl mb-3">⚠️</div>
        <h3 class="text-xl font-bold text-yellow-400 mb-2">Not a Dynasty League</h3>
        <p class="text-dark-textMuted">
          This league appears to be a redraft league. Dynasty values are most useful for keeper and dynasty formats.
          <br>You can still view values, but they're designed for long-term player valuation.
        </p>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex gap-2">
      <button
        v-for="tab in tabOptions"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="activeTab === tab.id ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textSecondary hover:bg-dark-border/50'"
        class="px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2"
      >
        <span class="text-xl">{{ tab.icon }}</span>
        {{ tab.name }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
        <p class="text-dark-textMuted">Loading dynasty values...</p>
      </div>
    </div>

    <!-- TEAM VALUES TAB -->
    <template v-else-if="activeTab === 'teams'">
      <!-- League Summary -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="card bg-gradient-to-br from-primary/20 to-primary/5">
          <div class="card-body py-4 text-center">
            <div class="text-3xl mb-1">💰</div>
            <div class="text-2xl font-black text-primary">{{ formatValue(leagueAvgValue) }}</div>
            <div class="text-xs text-dark-textMuted">League Avg Value</div>
          </div>
        </div>
        <div class="card bg-gradient-to-br from-green-500/20 to-green-500/5">
          <div class="card-body py-4 text-center">
            <div class="text-3xl mb-1">👑</div>
            <div class="text-lg font-bold text-green-400 truncate">{{ topTeam?.team_name || 'N/A' }}</div>
            <div class="text-xs text-dark-textMuted">Highest Value Team</div>
          </div>
        </div>
        <div class="card bg-gradient-to-br from-cyan-500/20 to-cyan-500/5">
          <div class="card-body py-4 text-center">
            <div class="text-3xl mb-1">🎯</div>
            <div class="text-2xl font-black text-cyan-400">{{ contenderCount }}</div>
            <div class="text-xs text-dark-textMuted">Contenders</div>
          </div>
        </div>
        <div class="card bg-gradient-to-br from-purple-500/20 to-purple-500/5">
          <div class="card-body py-4 text-center">
            <div class="text-3xl mb-1">🔧</div>
            <div class="text-2xl font-black text-purple-400">{{ rebuilderCount }}</div>
            <div class="text-xs text-dark-textMuted">Rebuilders</div>
          </div>
        </div>
      </div>

      <!-- Team Rankings -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🏆</span>
            <h2 class="card-title">Team Dynasty Rankings</h2>
          </div>
          <span class="text-sm text-dark-textMuted">
            Values from DynastyProcess.com • {{ isSuperFlex ? 'SuperFlex' : '1QB' }} format
          </span>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-dark-border/30">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-12">#</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider">Team</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-28">Total Value</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-20">Avg Age</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-24">Status</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">QB</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">RB</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">WR</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">TE</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider">Top Assets</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <tr 
                  v-for="(team, index) in sortedTeamValues" 
                  :key="team.roster_id"
                  :class="team.roster_id === myRosterId ? 'bg-primary/10' : 'hover:bg-dark-border/20'"
                  class="transition-colors"
                >
                  <td class="px-4 py-3">
                    <span class="font-bold" :class="index < 3 ? 'text-primary' : 'text-dark-textMuted'">
                      {{ index + 1 }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border ring-2" 
                           :class="team.roster_id === myRosterId ? 'ring-primary' : 'ring-dark-border'">
                        <img :src="team.avatar" :alt="team.team_name" class="w-full h-full object-cover" @error="handleImageError" />
                      </div>
                      <div>
                        <div class="font-semibold text-dark-text">{{ team.team_name }}</div>
                        <div class="text-xs text-dark-textMuted" v-if="team.roster_id === myRosterId">Your Team</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="text-xl font-black" :class="getValueColorClass(team.total_value, leagueAvgValue)">
                      {{ formatValue(team.total_value) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span :class="team.avg_age < 25 ? 'text-green-400' : team.avg_age > 27 ? 'text-orange-400' : 'text-dark-text'">
                      {{ team.avg_age.toFixed(1) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span 
                      class="px-2 py-1 rounded-full text-xs font-bold"
                      :class="getStatusClass(team.contender_score)"
                    >
                      {{ getStatusLabel(team.contender_score) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center text-sm" :class="getPositionValueClass(team.position_values.QB, 'QB')">
                    {{ formatValue(team.position_values.QB) }}
                  </td>
                  <td class="px-4 py-3 text-center text-sm" :class="getPositionValueClass(team.position_values.RB, 'RB')">
                    {{ formatValue(team.position_values.RB) }}
                  </td>
                  <td class="px-4 py-3 text-center text-sm" :class="getPositionValueClass(team.position_values.WR, 'WR')">
                    {{ formatValue(team.position_values.WR) }}
                  </td>
                  <td class="px-4 py-3 text-center text-sm" :class="getPositionValueClass(team.position_values.TE, 'TE')">
                    {{ formatValue(team.position_values.TE) }}
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex flex-wrap gap-1">
                      <span 
                        v-for="asset in team.top_assets.slice(0, 3)" 
                        :key="asset.player_id"
                        class="px-2 py-0.5 rounded text-xs font-medium"
                        :class="getTierColorClass(isSuperFlex ? asset.tier_2qb : asset.tier_1qb)"
                      >
                        {{ asset.player_name.split(' ').pop() }}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- PLAYER VALUES TAB -->
    <template v-else-if="activeTab === 'players'">
      <!-- Filters -->
      <div class="card">
        <div class="card-body py-4">
          <div class="flex flex-wrap items-center gap-4">
            <!-- Position Filter -->
            <div class="flex items-center gap-2">
              <span class="text-dark-textMuted font-medium">Position:</span>
              <div class="flex gap-1">
                <button
                  v-for="pos in ['All', 'QB', 'RB', 'WR', 'TE']"
                  :key="pos"
                  @click="selectedPosition = pos"
                  :class="selectedPosition === pos ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'"
                  class="px-3 py-1.5 rounded-lg font-medium transition-all text-sm"
                >
                  {{ pos }}
                </button>
              </div>
            </div>
            
            <!-- Ownership Filter -->
            <div class="flex items-center gap-2">
              <span class="text-dark-textMuted font-medium">Show:</span>
              <div class="flex gap-1">
                <button
                  @click="ownershipFilter = 'all'"
                  :class="ownershipFilter === 'all' ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'"
                  class="px-3 py-1.5 rounded-lg font-medium transition-all text-sm"
                >
                  All
                </button>
                <button
                  @click="ownershipFilter = 'rostered'"
                  :class="ownershipFilter === 'rostered' ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'"
                  class="px-3 py-1.5 rounded-lg font-medium transition-all text-sm"
                >
                  Rostered
                </button>
                <button
                  @click="ownershipFilter = 'available'"
                  :class="ownershipFilter === 'available' ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'"
                  class="px-3 py-1.5 rounded-lg font-medium transition-all text-sm"
                >
                  Free Agents
                </button>
              </div>
            </div>

            <!-- Tier Filter -->
            <div class="flex items-center gap-2">
              <span class="text-dark-textMuted font-medium">Tier:</span>
              <select v-model="selectedTier" class="select text-sm">
                <option value="all">All Tiers</option>
                <option value="Elite">Elite</option>
                <option value="Starter+">Starter+</option>
                <option value="Starter">Starter</option>
                <option value="Bench">Bench</option>
                <option value="Taxi">Taxi</option>
              </select>
            </div>

            <!-- Search -->
            <div class="flex-1 min-w-[200px]">
              <input 
                v-model="searchQuery"
                type="text"
                placeholder="Search players..."
                class="w-full px-4 py-2 rounded-lg bg-dark-border/30 text-dark-text placeholder-dark-textMuted border border-dark-border/50 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Player Values Table -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">Player Dynasty Values</h2>
          </div>
          <span class="text-sm text-dark-textMuted">{{ filteredPlayers.length }} players</span>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table class="w-full">
              <thead class="bg-dark-border/30 sticky top-0 z-10">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-12">#</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider">Player</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">Pos</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-16">Age</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-24">Value</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-20">Tier</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider">Owner</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <tr 
                  v-for="(player, index) in filteredPlayers" 
                  :key="player.player_id"
                  :class="isMyPlayer(player.player_id) ? 'bg-primary/10' : 'hover:bg-dark-border/20'"
                  class="transition-colors"
                >
                  <td class="px-4 py-3 text-dark-textMuted text-sm">{{ index + 1 }}</td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                        <img :src="getPlayerImageUrl(player.player_id)" :alt="player.player_name" class="w-full h-full object-cover" @error="handleImageError" />
                      </div>
                      <div>
                        <div class="font-semibold text-dark-text">{{ player.player_name }}</div>
                        <div class="text-xs text-dark-textMuted">{{ player.team || 'FA' }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="px-2 py-1 rounded text-xs font-bold" :class="getPositionClass(player.position)">
                      {{ player.position }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span :class="player.age < 25 ? 'text-green-400' : player.age > 28 ? 'text-orange-400' : 'text-dark-text'">
                      {{ player.age > 0 ? player.age.toFixed(1) : '—' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="text-lg font-black text-dark-text">
                      {{ formatValue(isSuperFlex ? player.value_2qb : player.value_1qb) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span 
                      class="px-2 py-1 rounded text-xs font-bold"
                      :class="getTierColorClass(isSuperFlex ? player.tier_2qb : player.tier_1qb)"
                    >
                      {{ isSuperFlex ? player.tier_2qb : player.tier_1qb }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <span v-if="getPlayerOwner(player.player_id)" class="text-sm text-dark-textMuted">
                      {{ getPlayerOwner(player.player_id) }}
                    </span>
                    <span v-else class="text-sm text-green-400">Free Agent</span>
                  </td>
                </tr>
                <tr v-if="filteredPlayers.length === 0">
                  <td colspan="7" class="px-4 py-8 text-center text-dark-textMuted">
                    No players match your filters
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- DRAFT PICKS TAB -->
    <template v-else-if="activeTab === 'picks'">
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🎯</span>
            <h2 class="card-title">Draft Pick Values</h2>
          </div>
          <span class="text-sm text-dark-textMuted">{{ isSuperFlex ? 'SuperFlex' : '1QB' }} values</span>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div v-for="pick in pickValues" :key="pick.pick" class="p-4 rounded-xl bg-dark-border/20">
              <div class="flex items-center justify-between mb-2">
                <span class="font-bold text-dark-text">{{ pick.pick }}</span>
                <span class="text-lg font-black text-primary">
                  {{ formatValue(isSuperFlex ? pick.value_2qb : pick.value_1qb) }}
                </span>
              </div>
              <div class="h-2 bg-dark-border/30 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-primary rounded-full"
                  :style="{ width: getPickBarWidth(isSuperFlex ? pick.value_2qb : pick.value_1qb) }"
                ></div>
              </div>
            </div>
          </div>
          
          <div v-if="pickValues.length === 0" class="py-8 text-center text-dark-textMuted">
            <div class="text-4xl mb-3">📋</div>
            <p>Draft pick values not available</p>
          </div>
        </div>
      </div>
    </template>

    <!-- Attribution -->
    <div class="text-center text-sm text-dark-textMuted py-4">
      Dynasty values powered by <a href="https://dynastyprocess.com" target="_blank" class="text-primary hover:underline">DynastyProcess.com</a>
      • Updated weekly • <span class="text-dark-textMuted/70">Last refresh: {{ lastRefresh }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { sleeperService } from '@/services/sleeper'
import dynastyValuesService, { 
  type DynastyPlayerValue, 
  type DynastyPickValue,
  type TeamDynastyValue,
  fetchDynastyPlayerValues,
  fetchDynastyPickValues,
  calculateTeamDynastyValue,
  getTierColorClass,
  formatDynastyValue,
  clearDynastyValuesCache,
  generateFallbackDynastyValues
} from '@/services/dynastyValues'

const leagueStore = useLeagueStore()

// Tab state
const activeTab = ref<'teams' | 'players' | 'picks'>('teams')
const tabOptions = [
  { id: 'teams', name: 'Team Values', icon: '🏆' },
  { id: 'players', name: 'Player Values', icon: '📊' },
  { id: 'picks', name: 'Pick Values', icon: '🎯' }
]

// Settings
const isSuperFlex = ref(false)
const isLoading = ref(false)
const lastRefresh = ref('Never')

// Data
const playerValues = ref<Map<string, DynastyPlayerValue>>(new Map())
const pickValues = ref<DynastyPickValue[]>([])
const teamValues = ref<TeamDynastyValue[]>([])

// Filters for players tab
const selectedPosition = ref('All')
const ownershipFilter = ref<'all' | 'rostered' | 'available'>('all')
const selectedTier = ref('all')
const searchQuery = ref('')

// Check if this is a dynasty league
const isDynastyLeague = computed(() => {
  // Sleeper league types: 0 = redraft, 1 = keeper, 2 = dynasty
  const leagueType = leagueStore.currentLeague?.settings?.type
  return leagueType === 1 || leagueType === 2
})

// Get my roster ID
const myRosterId = computed(() => {
  const myRoster = leagueStore.rosters.find(r => r.owner_id === leagueStore.currentUserId)
  return myRoster?.roster_id
})

// Player to owner mapping
const playerOwnerMap = computed(() => {
  const map = new Map<string, string>()
  leagueStore.rosters.forEach(roster => {
    const user = leagueStore.users.find(u => u.user_id === roster.owner_id)
    const teamName = sleeperService.getTeamName(roster, user)
    roster.players?.forEach(playerId => {
      map.set(playerId, teamName)
    })
  })
  return map
})

// Get all rostered player IDs
const rosteredPlayerIds = computed(() => {
  const ids = new Set<string>()
  leagueStore.rosters.forEach(roster => {
    roster.players?.forEach(id => ids.add(id))
  })
  return ids
})

// Sorted team values
const sortedTeamValues = computed(() => {
  return [...teamValues.value].sort((a, b) => {
    const aVal = isSuperFlex.value ? a.total_value_2qb : a.total_value_1qb
    const bVal = isSuperFlex.value ? b.total_value_2qb : b.total_value_1qb
    return bVal - aVal
  }).map(team => ({
    ...team,
    total_value: isSuperFlex.value ? team.total_value_2qb : team.total_value_1qb
  }))
})

// League average value
const leagueAvgValue = computed(() => {
  if (sortedTeamValues.value.length === 0) return 0
  const total = sortedTeamValues.value.reduce((sum, t) => sum + t.total_value, 0)
  return Math.round(total / sortedTeamValues.value.length)
})

// Top team
const topTeam = computed(() => sortedTeamValues.value[0] || null)

// Contender/rebuilder counts
const contenderCount = computed(() => {
  return teamValues.value.filter(t => t.contender_score >= 60).length
})

const rebuilderCount = computed(() => {
  return teamValues.value.filter(t => t.contender_score < 40).length
})

// Filtered players for player tab
const filteredPlayers = computed(() => {
  let players = Array.from(playerValues.value.values())
  
  // Filter by position
  if (selectedPosition.value !== 'All') {
    players = players.filter(p => p.position === selectedPosition.value)
  }
  
  // Filter by ownership
  if (ownershipFilter.value === 'rostered') {
    players = players.filter(p => rosteredPlayerIds.value.has(p.player_id))
  } else if (ownershipFilter.value === 'available') {
    players = players.filter(p => !rosteredPlayerIds.value.has(p.player_id))
  }
  
  // Filter by tier
  if (selectedTier.value !== 'all') {
    players = players.filter(p => {
      const tier = isSuperFlex.value ? p.tier_2qb : p.tier_1qb
      return tier === selectedTier.value
    })
  }
  
  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    players = players.filter(p => 
      p.player_name.toLowerCase().includes(query) ||
      p.team?.toLowerCase().includes(query)
    )
  }
  
  // Sort by value
  players.sort((a, b) => {
    const aVal = isSuperFlex.value ? a.value_2qb : a.value_1qb
    const bVal = isSuperFlex.value ? b.value_2qb : b.value_1qb
    return bVal - aVal
  })
  
  return players.slice(0, 200) // Limit for performance
})

// Load dynasty values
async function loadValues() {
  isLoading.value = true
  
  try {
    // Try to fetch player values from DynastyProcess
    let values = await fetchDynastyPlayerValues()
    
    // If external data failed, generate fallback values from Sleeper data
    if (values.size === 0) {
      console.log('⚠️ DynastyProcess data unavailable, using fallback values...')
      
      // Get all rostered player IDs
      const rosteredIds = new Set<string>()
      leagueStore.rosters.forEach(roster => {
        roster.players?.forEach(id => rosteredIds.add(id))
      })
      
      // Generate fallback values
      values = await generateFallbackDynastyValues(leagueStore.players, rosteredIds)
    }
    
    playerValues.value = values
    
    // Fetch pick values (optional, don't fail if unavailable)
    try {
      pickValues.value = await fetchDynastyPickValues()
    } catch (e) {
      console.warn('Pick values unavailable:', e)
      pickValues.value = []
    }
    
    // Calculate team values
    calculateTeamValues()
    
    lastRefresh.value = new Date().toLocaleTimeString()
  } catch (error) {
    console.error('Failed to load dynasty values:', error)
  } finally {
    isLoading.value = false
  }
}

// Calculate team values from rosters
function calculateTeamValues() {
  teamValues.value = leagueStore.rosters.map(roster => {
    const user = leagueStore.users.find(u => u.user_id === roster.owner_id)
    const teamName = sleeperService.getTeamName(roster, user)
    const avatar = sleeperService.getAvatarUrl(roster, user, leagueStore.currentLeague)
    
    return calculateTeamDynastyValue(
      roster.roster_id,
      teamName,
      avatar,
      roster.players || [],
      playerValues.value,
      isSuperFlex.value
    )
  })
}

// Refresh values (clear cache and reload)
async function refreshValues() {
  clearDynastyValuesCache()
  await loadValues()
}

// Helper functions
function formatValue(value: number): string {
  return formatDynastyValue(value)
}

function getPlayerImageUrl(playerId: string): string {
  return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
}

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = 'https://sleepercdn.com/images/v2/icons/player_default.webp'
}

function isMyPlayer(playerId: string): boolean {
  const myRoster = leagueStore.rosters.find(r => r.owner_id === leagueStore.currentUserId)
  return myRoster?.players?.includes(playerId) || false
}

function getPlayerOwner(playerId: string): string | null {
  return playerOwnerMap.value.get(playerId) || null
}

function getPositionClass(pos: string): string {
  const classes: Record<string, string> = {
    QB: 'bg-red-500/20 text-red-400',
    RB: 'bg-green-500/20 text-green-400',
    WR: 'bg-blue-500/20 text-blue-400',
    TE: 'bg-orange-500/20 text-orange-400'
  }
  return classes[pos] || 'bg-gray-500/20 text-gray-400'
}

function getValueColorClass(value: number, avg: number): string {
  if (value >= avg * 1.2) return 'text-green-400'
  if (value >= avg) return 'text-cyan-400'
  if (value >= avg * 0.8) return 'text-yellow-400'
  return 'text-red-400'
}

function getStatusClass(score: number): string {
  if (score >= 65) return 'bg-green-500/20 text-green-400'
  if (score >= 45) return 'bg-cyan-500/20 text-cyan-400'
  if (score >= 30) return 'bg-yellow-500/20 text-yellow-400'
  return 'bg-purple-500/20 text-purple-400'
}

function getStatusLabel(score: number): string {
  if (score >= 65) return 'Contender'
  if (score >= 45) return 'Competitive'
  if (score >= 30) return 'Pretender'
  return 'Rebuilding'
}

function getPositionValueClass(value: number, position: string): string {
  // Position-specific thresholds
  const thresholds: Record<string, number[]> = {
    QB: [8000, 5000, 2000],
    RB: [15000, 8000, 4000],
    WR: [20000, 12000, 6000],
    TE: [6000, 3000, 1500]
  }
  const [high, mid, low] = thresholds[position] || [10000, 5000, 2000]
  
  if (value >= high) return 'text-green-400 font-bold'
  if (value >= mid) return 'text-cyan-400'
  if (value >= low) return 'text-dark-text'
  return 'text-dark-textMuted'
}

function getPickBarWidth(value: number): string {
  // Max pick value is around 8000-9000
  const maxValue = 9000
  const percentage = Math.min(100, (value / maxValue) * 100)
  return `${percentage}%`
}

// Watch for superflex toggle to recalculate
watch(isSuperFlex, () => {
  calculateTeamValues()
})

// Watch for league changes
watch(() => leagueStore.activeLeagueId, () => {
  if (leagueStore.activeLeagueId) {
    loadValues()
  }
})

onMounted(() => {
  // Auto-detect superflex from league settings
  const rosterPositions = leagueStore.currentLeague?.roster_positions || []
  isSuperFlex.value = rosterPositions.some(pos => 
    pos === 'SUPER_FLEX' || pos === 'SUPERFLEX' || pos === 'OP'
  )
  
  if (leagueStore.activeLeagueId) {
    loadValues()
  }
})
</script>
