<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Player Projections</h1>
        <p class="text-base text-dark-textMuted">Rest of season rankings with position-adjusted value analysis</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="loadProjections" :disabled="isLoading" class="px-4 py-2 rounded-lg bg-dark-card hover:bg-dark-border/50 text-dark-textMuted transition-all flex items-center gap-2">
          <span :class="{ 'animate-spin': isLoading }">🔄</span> Refresh
        </button>
        <button @click="showSettingsModal = true" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors" title="Settings">
          <svg class="w-6 h-6 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="flex gap-2">
      <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
        :class="activeTab === tab.id ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textSecondary hover:bg-dark-border/50'"
        class="px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2">
        <span class="text-xl">{{ tab.icon }}</span> {{ tab.name }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
        <p class="text-dark-textMuted">{{ loadingMessage }}</p>
      </div>
    </div>

    <!-- REST OF SEASON TAB -->
    <template v-else-if="activeTab === 'ros'">
      <!-- Data Source Info -->
      <div class="card bg-green-500/10 border-green-500/30">
        <div class="card-body py-3">
          <div class="flex items-center gap-3">
            <span class="text-xl">✓</span>
            <span class="font-semibold text-green-400">Live Yahoo Data</span>
            <span class="text-dark-textMuted">{{ allPlayers.length }} players • Your league scoring</span>
          </div>
        </div>
      </div>

      <!-- Ranking Customizer -->
      <div class="card bg-gradient-to-br from-dark-card to-dark-border/30 border border-primary/20">
        <div class="card-header cursor-pointer" @click="isCustomizerExpanded = !isCustomizerExpanded">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🎛️</span>
            <div>
              <h2 class="card-title text-lg">Customize Rankings</h2>
              <p class="text-sm text-dark-textMuted">{{ enabledFactorCount }} factors • {{ activePresetName }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex gap-1">
              <button v-for="preset in presets.slice(0,4)" :key="preset.id" @click.stop="applyPreset(preset)"
                :class="activePresetId === preset.id ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textMuted'"
                class="px-3 py-1.5 rounded-lg text-xs font-medium">
                {{ preset.icon }} {{ preset.name }}
              </button>
            </div>
            <svg class="w-5 h-5 text-dark-textMuted transition-transform" :class="{ 'rotate-180': isCustomizerExpanded }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <div v-if="isCustomizerExpanded" class="card-body pt-0 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div v-for="(group, gIdx) in [coreFactors, performanceFactors, contextFactors]" :key="gIdx" class="bg-dark-bg/50 rounded-xl p-4">
              <h3 class="font-semibold text-dark-text mb-3">{{ ['Core', 'Performance', 'Context'][gIdx] }}</h3>
              <div class="space-y-3">
                <div v-for="factor in group" :key="factor.id" class="space-y-1">
                  <div class="flex items-center justify-between">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" :checked="factor.enabled" @change="toggleFactor(factor.id)" class="rounded accent-primary w-4 h-4" />
                      <span class="text-sm text-dark-text">{{ factor.name }}</span>
                    </label>
                    <span v-if="factor.enabled" class="text-xs text-primary">{{ factor.weight }}%</span>
                  </div>
                  <input v-if="factor.enabled" type="range" :value="factor.weight" @input="updateWeight(factor.id, Number(($event.target as HTMLInputElement).value))" min="0" max="100" class="w-full h-1 accent-primary" />
                </div>
              </div>
            </div>
          </div>
          <div class="flex justify-between pt-2 border-t border-dark-border/30">
            <span class="text-sm text-dark-textMuted"><span class="text-primary font-semibold">{{ enabledFactorCount }}</span> factors active</span>
            <div class="flex gap-3">
              <button @click="resetFactors" class="px-4 py-2 rounded-lg bg-dark-border/50 text-dark-textMuted">Reset</button>
              <button @click="applyRankings" class="px-6 py-2 rounded-lg bg-primary text-gray-900 font-semibold">Apply</button>
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
              <button @click="selectAllPositions" :class="selectedPositions.length === positionFilters.length ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'" class="px-3 py-1.5 rounded-lg text-sm font-medium">All</button>
              <button v-for="pos in positionFilters" :key="pos.id" @click="togglePositionFilter(pos.id)"
                :class="selectedPositions.includes(pos.id) ? 'bg-primary text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'"
                class="px-3 py-1.5 rounded-lg text-sm font-medium">{{ pos.label }}</button>
            </div>
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-2 text-sm text-dark-textMuted cursor-pointer">
                <input type="checkbox" v-model="showOnlyMyPlayers" class="rounded accent-primary w-4 h-4" /> My Players
              </label>
              <label class="flex items-center gap-2 text-sm text-dark-textMuted cursor-pointer">
                <input type="checkbox" v-model="showOnlyFreeAgents" class="rounded accent-cyan-400 w-4 h-4" /> Free Agents
              </label>
              <span class="text-sm text-dark-textMuted">{{ filteredPlayers.length }} players</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Rankings Table -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">Rest of Season Rankings</h2>
          </div>
          <span v-if="lastUpdated" class="text-sm text-dark-textMuted">Updated: {{ lastUpdated }}</span>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table class="w-full">
              <thead class="bg-dark-border/30 sticky top-0 z-10">
                <tr>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase w-14">Rank</th>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase">Player</th>
                  <th class="px-3 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase w-28">Owner</th>
                  <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14">Pos</th>
                  <th class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14">Pos Rk</th>
                  <th @click="sortBy('total_points')" class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-16 cursor-pointer hover:text-dark-text">Pts</th>
                  <th @click="sortBy('ppg')" class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14 cursor-pointer hover:text-dark-text">PPG</th>
                  <th @click="sortBy('vor')" class="px-3 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase w-14 cursor-pointer hover:text-dark-text">VOR</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-dark-border/30">
                <tr v-for="(player, idx) in filteredPlayers" :key="player.player_key"
                  :class="[getRowClass(player), expandedPlayerId === player.player_key ? 'bg-dark-border/30' : '']"
                  class="hover:bg-dark-border/20 transition-colors cursor-pointer"
                  @click="togglePlayerExpanded(player.player_key)">
                  <td class="px-3 py-3"><span class="font-bold text-lg text-dark-text">{{ player.rosRank }}</span></td>
                  <td class="px-3 py-3">
                    <div class="flex items-center gap-3">
                      <div class="relative">
                        <div class="w-10 h-10 rounded-full bg-dark-border overflow-hidden ring-2" :class="getAvatarRingClass(player)">
                          <img :src="player.headshot || defaultHeadshot" :alt="player.full_name" class="w-full h-full object-cover" @error="handleImageError" />
                        </div>
                        <div v-if="isMyPlayer(player)" class="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center"><span class="text-xs text-gray-900 font-bold">★</span></div>
                        <div v-else-if="isFreeAgent(player)" class="absolute -top-1 -right-1 w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center"><span class="text-xs text-gray-900 font-bold">+</span></div>
                      </div>
                      <div>
                        <span class="font-semibold" :class="getPlayerNameClass(player)">{{ player.full_name }}</span>
                        <div class="text-xs text-dark-textMuted">{{ player.mlb_team || 'FA' }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-3 py-3">
                    <span v-if="player.fantasy_team" class="text-sm text-dark-textMuted truncate block max-w-[100px]">{{ player.fantasy_team }}</span>
                    <span v-else class="text-sm text-cyan-400">FA</span>
                  </td>
                  <td class="px-3 py-3 text-center"><span class="px-2 py-1 rounded text-xs font-bold" :class="getPositionClass(player.position)">{{ player.position?.split(',')[0] }}</span></td>
                  <td class="px-3 py-3 text-center text-dark-text font-medium">{{ player.positionRank }}</td>
                  <td class="px-3 py-3 text-center font-bold text-dark-text">{{ player.total_points?.toFixed(1) || '0' }}</td>
                  <td class="px-3 py-3 text-center font-bold text-dark-text">{{ player.ppg?.toFixed(2) || '0' }}</td>
                  <td class="px-3 py-3 text-center font-bold" :class="player.vor > 0 ? 'text-green-400' : player.vor < -3 ? 'text-red-400' : 'text-dark-textMuted'">{{ player.vor >= 0 ? '+' : '' }}{{ player.vor?.toFixed(1) || '0' }}</td>
                </tr>
                <tr v-if="filteredPlayers.length === 0"><td colspan="8" class="px-4 py-8 text-center text-dark-textMuted">No players match filters</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- TEAMS TAB -->
    <template v-else-if="activeTab === 'teams'">
      <div class="card"><div class="card-body py-8 text-center"><div class="text-4xl mb-3">🏗️</div><h3 class="text-xl font-bold text-dark-text mb-2">Teams Tab Coming Soon</h3></div></div>
    </template>

    <!-- THIS WEEK TAB -->
    <template v-else-if="activeTab === 'week'">
      <div class="card"><div class="card-body py-8 text-center"><div class="text-4xl mb-3">🏗️</div><h3 class="text-xl font-bold text-dark-text mb-2">This Week Coming Soon</h3></div></div>
    </template>

    <!-- Settings Modal -->
    <div v-if="showSettingsModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click="showSettingsModal = false">
      <div class="bg-dark-card rounded-2xl max-w-lg w-full p-6 space-y-6" @click.stop>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold text-dark-text">Settings</h2>
          <button @click="showSettingsModal = false" class="p-2 hover:bg-dark-border/50 rounded-lg">✕</button>
        </div>
        <div class="space-y-3">
          <h3 class="font-semibold text-dark-text">Upload Custom Rankings (CSV)</h3>
          <input type="file" accept=".csv" @change="handleFileUpload" class="text-sm text-dark-textMuted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-gray-900" />
        </div>
        <div class="space-y-3">
          <h3 class="font-semibold text-dark-text">VOR Baselines</h3>
          <div class="grid grid-cols-4 gap-2">
            <div v-for="pos in ['C', '1B', 'OF', 'SP']" :key="pos">
              <label class="text-xs text-dark-textMuted">{{ pos }}</label>
              <input type="number" v-model.number="vorBaselines[pos]" min="1" max="50" class="w-full px-2 py-1 rounded bg-dark-border/30 text-dark-text text-sm" />
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-4 border-t border-dark-border/30">
          <button @click="showSettingsModal = false" class="px-4 py-2 rounded-lg bg-dark-border/50 text-dark-textMuted">Close</button>
          <button @click="applySettings" class="px-4 py-2 rounded-lg bg-primary text-gray-900 font-medium">Apply</button>
        </div>
      </div>
    </div>

    <!-- Platform Badge -->
    <div class="flex justify-center mt-8">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 border border-purple-600/30">
        <span class="text-sm font-bold text-purple-400">Y!</span>
        <span class="text-sm text-purple-300">Yahoo Fantasy Baseball</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

const tabs = [
  { id: 'ros', name: 'Rest of Season', icon: '📊' },
  { id: 'teams', name: 'Teams', icon: '👥' },
  { id: 'week', name: 'This Week', icon: '📅' }
]
const activeTab = ref('ros')
const isLoading = ref(true)
const loadingMessage = ref('Loading...')
const showSettingsModal = ref(false)
const isCustomizerExpanded = ref(false)
const expandedPlayerId = ref<string | null>(null)
const lastUpdated = ref('')
const allPlayers = ref<any[]>([])
const myTeamKey = ref<string | null>(null)
const hasCustomRankings = ref(false)
const customRankingsCount = ref(0)
const sortColumn = ref('')
const sortDirection = ref<'asc' | 'desc'>('desc')
const selectedPositions = ref<string[]>(['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'])
const showOnlyMyPlayers = ref(false)
const showOnlyFreeAgents = ref(false)
const defaultHeadshot = 'https://a.espncdn.com/combiner/i?img=/i/headshots/nophoto.png&w=200&h=145'

const positionFilters = [
  { id: 'C', label: 'C' }, { id: '1B', label: '1B' }, { id: '2B', label: '2B' }, { id: '3B', label: '3B' },
  { id: 'SS', label: 'SS' }, { id: 'OF', label: 'OF' }, { id: 'SP', label: 'SP' }, { id: 'RP', label: 'RP' }
]

const vorBaselines = ref<Record<string, number>>({ C: 12, '1B': 15, '2B': 15, '3B': 15, SS: 15, OF: 40, SP: 50, RP: 25 })

interface RankingFactor { id: string; name: string; enabled: boolean; weight: number }
const rankingFactors = ref<RankingFactor[]>([
  { id: 'totalPoints', name: 'Total Points', enabled: true, weight: 40 },
  { id: 'ppg', name: 'Points/Game', enabled: true, weight: 30 },
  { id: 'consistency', name: 'Consistency', enabled: false, weight: 15 },
  { id: 'recentTrend', name: 'Recent Trend', enabled: true, weight: 15 },
  { id: 'percentOwned', name: 'Ownership %', enabled: false, weight: 10 },
  { id: 'positionScarcity', name: 'Position Scarcity', enabled: true, weight: 15 }
])

const coreFactors = computed(() => rankingFactors.value.filter(f => ['totalPoints', 'ppg'].includes(f.id)))
const performanceFactors = computed(() => rankingFactors.value.filter(f => ['consistency', 'recentTrend'].includes(f.id)))
const contextFactors = computed(() => rankingFactors.value.filter(f => ['percentOwned', 'positionScarcity'].includes(f.id)))
const enabledFactorCount = computed(() => rankingFactors.value.filter(f => f.enabled).length)

const presets = [
  { id: 'balanced', name: 'Balanced', icon: '⚖️', factors: { totalPoints: 40, ppg: 30, recentTrend: 15, positionScarcity: 15 } },
  { id: 'hot-hand', name: 'Hot Hand', icon: '🔥', factors: { totalPoints: 25, ppg: 25, recentTrend: 35, positionScarcity: 15 } },
  { id: 'volume', name: 'Volume', icon: '📈', factors: { totalPoints: 60, ppg: 20, positionScarcity: 20 } },
  { id: 'efficiency', name: 'Efficiency', icon: '🎯', factors: { totalPoints: 20, ppg: 50, consistency: 20, positionScarcity: 10 } }
]
const activePresetId = ref('balanced')
const activePresetName = computed(() => presets.find(p => p.id === activePresetId.value)?.name || 'Custom')
const positionBaselines = ref<Record<string, number>>({})

const filteredPlayers = computed(() => {
  let players = [...allPlayers.value]
  if (selectedPositions.value.length > 0 && selectedPositions.value.length < positionFilters.length) {
    players = players.filter(p => {
      const positions = p.position?.split(',').map((pos: string) => pos.trim()) || []
      return positions.some((pos: string) => selectedPositions.value.includes(pos))
    })
  }
  if (showOnlyMyPlayers.value) players = players.filter(p => isMyPlayer(p))
  if (showOnlyFreeAgents.value) players = players.filter(p => isFreeAgent(p))
  if (sortColumn.value) {
    players.sort((a, b) => {
      const aVal = a[sortColumn.value] || 0, bVal = b[sortColumn.value] || 0
      return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
    })
  }
  return players
})

function selectAllPositions() { selectedPositions.value = selectedPositions.value.length === positionFilters.length ? [] : positionFilters.map(p => p.id) }
function togglePositionFilter(pos: string) { const idx = selectedPositions.value.indexOf(pos); idx >= 0 ? selectedPositions.value.splice(idx, 1) : selectedPositions.value.push(pos) }
function sortBy(col: string) { sortColumn.value === col ? sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc' : (sortColumn.value = col, sortDirection.value = 'desc') }
function toggleFactor(id: string) { const f = rankingFactors.value.find(f => f.id === id); if (f) f.enabled = !f.enabled; activePresetId.value = '' }
function updateWeight(id: string, w: number) { const f = rankingFactors.value.find(f => f.id === id); if (f) f.weight = w; activePresetId.value = '' }
function applyPreset(preset: typeof presets[0]) {
  activePresetId.value = preset.id
  rankingFactors.value.forEach(f => { f.enabled = false; f.weight = 0 })
  for (const [id, weight] of Object.entries(preset.factors)) { const f = rankingFactors.value.find(f => f.id === id); if (f) { f.enabled = true; f.weight = weight as number } }
}
function resetFactors() { applyPreset(presets[0]) }
function applyRankings() { recalculateRankings(); isCustomizerExpanded.value = false }
function applySettings() { recalculateRankings(); showSettingsModal.value = false }
function clearCustomRankings() { hasCustomRankings.value = false; loadProjections() }
function handleFileUpload(e: Event) { const f = (e.target as HTMLInputElement).files?.[0]; if (f) { hasCustomRankings.value = true; showSettingsModal.value = false } }
function togglePlayerExpanded(key: string) { expandedPlayerId.value = expandedPlayerId.value === key ? null : key }
function isMyPlayer(p: any) { return p.fantasy_team_key === myTeamKey.value }
function isFreeAgent(p: any) { return !p.fantasy_team }
function handleImageError(e: Event) { (e.target as HTMLImageElement).src = defaultHeadshot }
function getRowClass(p: any) { return isMyPlayer(p) ? 'bg-primary/10 border-l-2 border-primary' : isFreeAgent(p) ? 'bg-cyan-500/5 border-l-2 border-cyan-400' : '' }
function getAvatarRingClass(p: any) { return isMyPlayer(p) ? 'ring-primary' : isFreeAgent(p) ? 'ring-cyan-400' : 'ring-dark-border' }
function getPlayerNameClass(p: any) { return isMyPlayer(p) ? 'text-primary' : isFreeAgent(p) ? 'text-cyan-400' : 'text-dark-text' }
function getPositionClass(pos: string) {
  const p = pos?.split(',')?.[0]?.trim() || pos
  const c: Record<string, string> = { C: 'bg-purple-500/30 text-purple-400', '1B': 'bg-red-500/30 text-red-400', '2B': 'bg-orange-500/30 text-orange-400', '3B': 'bg-yellow-500/30 text-yellow-400', SS: 'bg-green-500/30 text-green-400', OF: 'bg-blue-500/30 text-blue-400', SP: 'bg-cyan-500/30 text-cyan-400', RP: 'bg-pink-500/30 text-pink-400' }
  return c[p] || 'bg-dark-border/50 text-dark-textMuted'
}

function calculatePositionBaselines() {
  const byPos: Record<string, any[]> = {}
  for (const p of allPlayers.value) { const pos = p.position?.split(',')?.[0]?.trim(); if (pos) { if (!byPos[pos]) byPos[pos] = []; byPos[pos].push(p) } }
  for (const [pos, players] of Object.entries(byPos)) {
    players.sort((a, b) => (b.ppg || 0) - (a.ppg || 0))
    const baseRank = vorBaselines.value[pos] || 15
    positionBaselines.value[pos] = players[Math.min(baseRank - 1, players.length - 1)]?.ppg || 0
  }
}

function recalculateRankings() {
  calculatePositionBaselines()
  for (const p of allPlayers.value) { const pos = p.position?.split(',')?.[0]?.trim(); p.vor = (p.ppg || 0) - (positionBaselines.value[pos] || 0) }
  const enabled = rankingFactors.value.filter(f => f.enabled)
  const totalW = enabled.reduce((s, f) => s + f.weight, 0)
  const maxPts = Math.max(...allPlayers.value.map(p => p.total_points || 0))
  const maxPPG = Math.max(...allPlayers.value.map(p => p.ppg || 0))
  const maxVOR = Math.max(...allPlayers.value.map(p => p.vor || 0))
  const minVOR = Math.min(...allPlayers.value.map(p => p.vor || 0))
  allPlayers.value.forEach(p => {
    let score = 0
    enabled.forEach(f => {
      const nw = f.weight / (totalW || 1)
      if (f.id === 'totalPoints') score += ((p.total_points || 0) / (maxPts || 1)) * 100 * nw
      else if (f.id === 'ppg') score += ((p.ppg || 0) / (maxPPG || 1)) * 100 * nw
      else if (f.id === 'recentTrend') score += 50 * nw
      else if (f.id === 'consistency') score += 50 * nw
      else if (f.id === 'percentOwned') score += (p.percent_owned || 0) * nw
      else if (f.id === 'positionScarcity') { const vr = (maxVOR - minVOR) || 1; score += (((p.vor || 0) - minVOR) / vr) * 100 * nw }
    })
    p.compositeScore = score
  })
  allPlayers.value.sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0))
  allPlayers.value.forEach((p, i) => { p.rosRank = i + 1 })
  const posCounts: Record<string, number> = {}
  allPlayers.value.forEach(p => { const pos = p.position?.split(',')?.[0]?.trim() || 'X'; posCounts[pos] = (posCounts[pos] || 0) + 1; p.positionRank = posCounts[pos] })
  lastUpdated.value = new Date().toLocaleString()
}

async function loadProjections() {
  isLoading.value = true
  loadingMessage.value = 'Connecting to Yahoo...'
  try {
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey || !authStore.user?.id) { isLoading.value = false; return }
    await yahooService.initialize(authStore.user.id)
    loadingMessage.value = 'Finding your team...'
    const myTeam = await yahooService.getMyTeam(leagueKey)
    myTeamKey.value = myTeam?.team_key || null
    loadingMessage.value = 'Loading rostered players...'
    const rostered = await yahooService.getAllRosteredPlayers(leagueKey)
    loadingMessage.value = 'Loading free agents...'
    const fa = await yahooService.getTopFreeAgents(leagueKey, 100)
    const combined = [...rostered, ...fa]
    const weeks = 25
    combined.forEach(p => { p.ppg = p.total_points > 0 ? p.total_points / weeks : 0 })
    allPlayers.value = combined
    applyPreset(presets[0])
    recalculateRankings()
  } catch (e) { console.error('Error:', e); loadingMessage.value = 'Error loading data' }
  finally { isLoading.value = false }
}

watch(() => leagueStore.activeLeagueId, (id) => { if (id && leagueStore.activePlatform === 'yahoo') loadProjections() }, { immediate: true })
onMounted(() => { if (leagueStore.activeLeagueId && leagueStore.activePlatform === 'yahoo') loadProjections() })
</script>
