<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Team Analysis</h1>
        <p class="text-base text-dark-textMuted">Category strengths, weaknesses, and roster breakdown</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="loadTeamData" :disabled="isLoading" class="px-4 py-2 rounded-lg bg-dark-card hover:bg-dark-border/50 text-dark-textMuted transition-all flex items-center gap-2">
          <span :class="{ 'animate-spin': isLoading }">🔄</span> Refresh
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <LoadingSpinner size="xl" :message="loadingMessage" />
    </div>

    <template v-else>
      <!-- League Category Summary -->
      <div class="card bg-gradient-to-r from-green-500/10 to-purple-500/10 border-green-500/30">
        <div class="card-body py-4">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 class="text-lg font-bold text-dark-text">{{ leagueName }}</h2>
              <p class="text-sm text-dark-textMuted">{{ categories.length }} scoring categories • {{ teams.length }} teams</p>
            </div>
            <div class="flex gap-6">
              <div class="text-center">
                <div class="text-2xl font-bold text-green-400">{{ hittingCategories.length }}</div>
                <div class="text-xs text-dark-textMuted">Hitting</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-purple-400">{{ pitchingCategories.length }}</div>
                <div class="text-xs text-dark-textMuted">Pitching</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- View Toggle -->
      <div class="flex items-center gap-2">
        <button 
          @click="viewMode = 'grid'" 
          :class="viewMode === 'grid' ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border'"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        >
          <span class="mr-2">◻️</span> Grid View
        </button>
        <button 
          @click="viewMode = 'table'" 
          :class="viewMode === 'table' ? 'bg-primary text-gray-900' : 'bg-dark-card text-dark-textMuted hover:bg-dark-border'"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        >
          <span class="mr-2">📊</span> Table View
        </button>
      </div>

      <!-- Team Cards Grid View -->
      <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div 
          v-for="team in rankedTeams" 
          :key="team.team_key"
          @click="toggleTeamExpanded(team)"
          class="card hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
          :class="[
            team.is_my_team ? 'ring-2 ring-yellow-400/50 bg-yellow-500/5' : '',
            expandedTeamKey === team.team_key ? 'ring-2 ring-primary' : ''
          ]"
        >
          <div class="card-body">
            <!-- Team Header -->
            <div class="flex items-center gap-4 mb-4">
              <div class="relative">
                <div class="w-14 h-14 rounded-xl bg-dark-border overflow-hidden ring-2" :class="team.is_my_team ? 'ring-yellow-400' : 'ring-dark-border'">
                  <img :src="team.logo || defaultLogo" :alt="team.name" class="w-full h-full object-cover" @error="handleImageError" />
                </div>
                <div v-if="team.is_my_team" class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                  <span class="text-xs text-gray-900 font-bold">★</span>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-dark-text truncate">{{ team.name }}</h3>
                <p class="text-sm text-dark-textMuted">{{ team.manager_name }}</p>
              </div>
              <div class="text-right">
                <div class="text-3xl font-black" :class="getGradeColorClass(team.overallGrade)">{{ team.overallGrade }}</div>
                <div class="text-xs text-dark-textMuted">Overall</div>
              </div>
            </div>

            <!-- Strategy Tag -->
            <div class="mb-4">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" :class="getStrategyClass(team.strategy)">
                <span>{{ getStrategyIcon(team.strategy) }}</span>
                {{ team.strategy }}
              </span>
            </div>

            <!-- Category Heatmap -->
            <div class="mb-4">
              <div class="text-xs text-dark-textMuted mb-2 font-medium">Category Performance</div>
              <div class="flex flex-wrap gap-1">
                <div 
                  v-for="cat in categories" 
                  :key="cat.stat_id"
                  :title="`${cat.display_name}: Rank #${team.categoryRanks[cat.stat_id] || '-'}`"
                  class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold"
                  :class="getCategoryHeatmapClass(team.categoryRanks[cat.stat_id])"
                >
                  {{ cat.display_name?.substring(0, 2) }}
                </div>
              </div>
              <!-- Heatmap Legend -->
              <div class="flex items-center gap-2 mt-2 text-[10px] text-dark-textMuted">
                <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-500"></span> Top 3</span>
                <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-yellow-500"></span> Mid</span>
                <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-red-500"></span> Bottom 3</span>
              </div>
            </div>

            <!-- Quick Stats -->
            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="bg-dark-border/30 rounded-lg p-2">
                <div class="text-lg font-bold text-green-400">{{ team.top3Count }}</div>
                <div class="text-[10px] text-dark-textMuted">Top 3</div>
              </div>
              <div class="bg-dark-border/30 rounded-lg p-2">
                <div class="text-lg font-bold text-yellow-400">{{ team.middleCount }}</div>
                <div class="text-[10px] text-dark-textMuted">Middle</div>
              </div>
              <div class="bg-dark-border/30 rounded-lg p-2">
                <div class="text-lg font-bold text-red-400">{{ team.bottom3Count }}</div>
                <div class="text-[10px] text-dark-textMuted">Bottom 3</div>
              </div>
            </div>

            <!-- Strengths & Weaknesses -->
            <div class="mt-4 pt-4 border-t border-dark-border">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <div class="text-[10px] text-dark-textMuted uppercase tracking-wider mb-1">Strongest</div>
                  <div class="flex flex-wrap gap-1">
                    <span v-for="cat in team.strongestCategories.slice(0, 3)" :key="cat" class="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                      {{ cat }}
                    </span>
                  </div>
                </div>
                <div>
                  <div class="text-[10px] text-dark-textMuted uppercase tracking-wider mb-1">Weakest</div>
                  <div class="flex flex-wrap gap-1">
                    <span v-for="cat in team.weakestCategories.slice(0, 3)" :key="cat" class="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                      {{ cat }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Expand Indicator -->
            <div class="mt-4 text-center">
              <span class="text-xs text-dark-textMuted">{{ expandedTeamKey === team.team_key ? '▲ Click to collapse' : '▼ Click to expand' }}</span>
            </div>
          </div>

          <!-- Expanded Team Details -->
          <div v-if="expandedTeamKey === team.team_key" class="border-t border-dark-border bg-dark-card/50">
            <div class="p-6 space-y-6">
              
              <!-- Category Breakdown Table -->
              <div>
                <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
                  <span>📊</span> Category Breakdown
                </h4>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b border-dark-border">
                        <th class="text-left py-2 px-3 text-dark-textMuted font-medium">Category</th>
                        <th class="text-center py-2 px-3 text-dark-textMuted font-medium">Total</th>
                        <th class="text-center py-2 px-3 text-dark-textMuted font-medium">Rank</th>
                        <th class="text-center py-2 px-3 text-dark-textMuted font-medium">Grade</th>
                        <th class="text-left py-2 px-3 text-dark-textMuted font-medium">Top Contributor</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-dark-border/30">
                      <tr v-for="cat in categories" :key="cat.stat_id" class="hover:bg-dark-border/20">
                        <td class="py-2 px-3">
                          <span class="font-medium text-dark-text">{{ cat.display_name }}</span>
                          <span class="text-dark-textMuted ml-1">({{ cat.name }})</span>
                        </td>
                        <td class="py-2 px-3 text-center font-bold text-dark-text">
                          {{ formatStatValue(team.categoryTotals[cat.stat_id], cat) }}
                        </td>
                        <td class="py-2 px-3 text-center">
                          <span class="px-2 py-0.5 rounded text-xs font-bold" :class="getRankBadgeClass(team.categoryRanks[cat.stat_id])">
                            #{{ team.categoryRanks[cat.stat_id] }}
                          </span>
                        </td>
                        <td class="py-2 px-3 text-center">
                          <span class="font-bold" :class="getGradeColorClass(getCategoryGrade(team.categoryRanks[cat.stat_id]))">
                            {{ getCategoryGrade(team.categoryRanks[cat.stat_id]) }}
                          </span>
                        </td>
                        <td class="py-2 px-3">
                          <div v-if="team.topContributors[cat.stat_id]" class="flex items-center gap-2">
                            <img :src="team.topContributors[cat.stat_id].headshot || defaultHeadshot" class="w-6 h-6 rounded-full" @error="handleImageError" />
                            <span class="text-dark-text">{{ team.topContributors[cat.stat_id].name }}</span>
                            <span class="text-primary font-medium">({{ formatStatValue(team.topContributors[cat.stat_id].value, cat) }})</span>
                          </div>
                          <span v-else class="text-dark-textMuted">-</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Roster by Position -->
              <div>
                <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
                  <span>👥</span> Roster Analysis
                </h4>
                
                <!-- Hitting Section -->
                <div class="mb-4">
                  <h5 class="text-sm font-medium text-primary mb-2">Hitting</h5>
                  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    <div v-for="pos in ['C', '1B', '2B', '3B', 'SS', 'OF', 'Util']" :key="pos" class="bg-dark-border/30 rounded-lg p-3">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-bold text-dark-textMuted uppercase">{{ pos }}</span>
                        <span class="text-xs font-bold" :class="getPositionGradeClass(team.positionGrades?.[pos])">
                          {{ team.positionGrades?.[pos] || '-' }}
                        </span>
                      </div>
                      <div class="space-y-1">
                        <div v-for="player in getPlayersAtPosition(team, pos)" :key="player.player_key" class="flex items-center gap-2">
                          <img :src="player.headshot || defaultHeadshot" class="w-5 h-5 rounded-full" @error="handleImageError" />
                          <span class="text-xs text-dark-text truncate flex-1">{{ player.name?.split(' ').pop() }}</span>
                        </div>
                        <div v-if="getPlayersAtPosition(team, pos).length === 0" class="text-xs text-dark-textMuted italic">Empty</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Pitching Section -->
                <div>
                  <h5 class="text-sm font-medium text-purple-400 mb-2">Pitching</h5>
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <div v-for="pos in ['SP', 'RP']" :key="pos" class="bg-dark-border/30 rounded-lg p-3">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-bold text-dark-textMuted uppercase">{{ pos }}</span>
                        <span class="text-xs font-bold" :class="getPositionGradeClass(team.positionGrades?.[pos])">
                          {{ team.positionGrades?.[pos] || '-' }}
                        </span>
                      </div>
                      <div class="space-y-1 max-h-32 overflow-y-auto">
                        <div v-for="player in getPlayersAtPosition(team, pos)" :key="player.player_key" class="flex items-center gap-2">
                          <img :src="player.headshot || defaultHeadshot" class="w-5 h-5 rounded-full" @error="handleImageError" />
                          <span class="text-xs text-dark-text truncate flex-1">{{ player.name?.split(' ').pop() }}</span>
                        </div>
                        <div v-if="getPlayersAtPosition(team, pos).length === 0" class="text-xs text-dark-textMuted italic">Empty</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Trade Insights -->
              <div class="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
                <h4 class="font-semibold text-dark-text mb-3 flex items-center gap-2">
                  <span>💡</span> Trade Insights
                </h4>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <div class="text-xs text-dark-textMuted uppercase tracking-wider mb-2">Could Use</div>
                    <div class="flex flex-wrap gap-1">
                      <span v-for="cat in team.weakestCategories.slice(0, 4)" :key="cat" class="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                        {{ cat }}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div class="text-xs text-dark-textMuted uppercase tracking-wider mb-2">Has Surplus</div>
                    <div class="flex flex-wrap gap-1">
                      <span v-for="cat in team.strongestCategories.slice(0, 4)" :key="cat" class="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                        {{ cat }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- Table View -->
      <div v-if="viewMode === 'table'" class="card">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-dark-border/30">
              <tr>
                <th class="text-left py-3 px-4 text-dark-textMuted font-medium text-sm">Team</th>
                <th class="text-center py-3 px-2 text-dark-textMuted font-medium text-sm">Grade</th>
                <th class="text-center py-3 px-2 text-dark-textMuted font-medium text-sm">Strategy</th>
                <th v-for="cat in categories" :key="cat.stat_id" class="text-center py-3 px-1 text-dark-textMuted font-medium text-xs" :title="cat.name">
                  {{ cat.display_name }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dark-border/30">
              <tr 
                v-for="team in rankedTeams" 
                :key="team.team_key" 
                class="hover:bg-dark-border/20 cursor-pointer"
                :class="team.is_my_team ? 'bg-yellow-500/10' : ''"
                @click="toggleTeamExpanded(team)"
              >
                <td class="py-3 px-4">
                  <div class="flex items-center gap-3">
                    <img :src="team.logo || defaultLogo" class="w-8 h-8 rounded-lg" @error="handleImageError" />
                    <div>
                      <div class="font-medium text-dark-text flex items-center gap-2">
                        {{ team.name }}
                        <span v-if="team.is_my_team" class="text-yellow-400">★</span>
                      </div>
                      <div class="text-xs text-dark-textMuted">{{ team.manager_name }}</div>
                    </div>
                  </div>
                </td>
                <td class="py-3 px-2 text-center">
                  <span class="text-xl font-black" :class="getGradeColorClass(team.overallGrade)">{{ team.overallGrade }}</span>
                </td>
                <td class="py-3 px-2 text-center">
                  <span class="px-2 py-0.5 rounded text-xs font-medium" :class="getStrategyClass(team.strategy)">
                    {{ team.strategy }}
                  </span>
                </td>
                <td v-for="cat in categories" :key="cat.stat_id" class="py-3 px-1 text-center">
                  <span class="w-7 h-7 inline-flex items-center justify-center rounded text-xs font-bold" :class="getCategoryHeatmapClass(team.categoryRanks[cat.stat_id])">
                    {{ team.categoryRanks[cat.stat_id] }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { yahooService } from '@/services/yahoo'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const leagueStore = useLeagueStore()

// State
const isLoading = ref(true)
const loadingMessage = ref('Loading team data...')
const viewMode = ref<'grid' | 'table'>('grid')
const expandedTeamKey = ref<string | null>(null)

const leagueName = ref('')
const categories = ref<any[]>([])
const teams = ref<any[]>([])
const allPlayers = ref<any[]>([])

// Defaults
const defaultLogo = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_dp_2_72.png'
const defaultHeadshot = 'https://s.yimg.com/it/api/res/1.2/z8uNvDWUruIZByGnLKdmCQ--~A/YXBwaWQ9eW5ld3M7dz0yMDA7aD0yMDA-/https://s.yimg.com/xe/i/us/sp/v/mlb_cutout/players_l/0.png'

// Computed
const hittingCategories = computed(() => categories.value.filter(c => isHittingStat(c)))
const pitchingCategories = computed(() => categories.value.filter(c => isPitchingStat(c)))

const rankedTeams = computed(() => {
  return [...teams.value].sort((a, b) => {
    const gradeOrder = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']
    return gradeOrder.indexOf(a.overallGrade) - gradeOrder.indexOf(b.overallGrade)
  })
})

// Helper functions
function isHittingStat(cat: any): boolean {
  const hittingStats = ['R', 'HR', 'RBI', 'SB', 'AVG', 'OBP', 'SLG', 'OPS', 'H', '2B', '3B', 'BB', 'TB']
  const name = cat?.display_name || cat?.name || ''
  return hittingStats.some(s => name.toUpperCase().includes(s))
}

function isPitchingStat(cat: any): boolean {
  const pitchingStats = ['W', 'L', 'SV', 'ERA', 'WHIP', 'K', 'QS', 'HLD', 'IP', 'K/9', 'BB/9', 'SV+H', 'K/BB']
  const name = cat?.display_name || cat?.name || ''
  return pitchingStats.some(s => name.toUpperCase().includes(s)) || 
         name.toLowerCase().includes('strikeout') ||
         name.toLowerCase().includes('win') ||
         name.toLowerCase().includes('save')
}

function formatStatValue(value: any, cat: any): string {
  if (value === null || value === undefined || value === '') return '-'
  const num = parseFloat(value)
  if (isNaN(num)) return String(value)
  
  const name = cat?.display_name || cat?.name || ''
  const isRatio = ['AVG', 'OBP', 'SLG', 'OPS', 'ERA', 'WHIP', 'K/9', 'BB/9', 'K/BB'].some(s => name.toUpperCase().includes(s))
  
  if (isRatio) {
    if (num < 1 && num > 0) return num.toFixed(3).replace(/^0/, '')
    return num.toFixed(2)
  }
  return Math.round(num).toString()
}

function getGradeColorClass(grade: string): string {
  if (!grade) return 'text-dark-textMuted'
  if (grade.startsWith('A')) return 'text-green-400'
  if (grade.startsWith('B')) return 'text-lime-400'
  if (grade.startsWith('C')) return 'text-yellow-400'
  if (grade.startsWith('D')) return 'text-orange-400'
  return 'text-red-400'
}

function getPositionGradeClass(grade: string): string {
  return getGradeColorClass(grade)
}

function getCategoryGrade(rank: number): string {
  if (!rank) return '-'
  const totalTeams = teams.value.length || 8
  const pct = (totalTeams - rank + 1) / totalTeams
  
  if (pct >= 0.9) return 'A+'
  if (pct >= 0.8) return 'A'
  if (pct >= 0.7) return 'A-'
  if (pct >= 0.6) return 'B+'
  if (pct >= 0.5) return 'B'
  if (pct >= 0.4) return 'B-'
  if (pct >= 0.3) return 'C+'
  if (pct >= 0.2) return 'C'
  if (pct >= 0.1) return 'C-'
  return 'D'
}

function getCategoryHeatmapClass(rank: number): string {
  if (!rank) return 'bg-dark-border text-dark-textMuted'
  const totalTeams = teams.value.length || 8
  
  if (rank <= 3) return 'bg-green-500/80 text-white'
  if (rank <= Math.ceil(totalTeams / 2)) return 'bg-yellow-500/80 text-gray-900'
  if (rank > totalTeams - 3) return 'bg-red-500/80 text-white'
  return 'bg-orange-500/60 text-white'
}

function getRankBadgeClass(rank: number): string {
  if (!rank) return 'bg-dark-border text-dark-textMuted'
  const totalTeams = teams.value.length || 8
  
  if (rank === 1) return 'bg-yellow-400 text-gray-900'
  if (rank <= 3) return 'bg-green-500/30 text-green-400'
  if (rank > totalTeams - 3) return 'bg-red-500/30 text-red-400'
  return 'bg-dark-border text-dark-textMuted'
}

function getStrategyClass(strategy: string): string {
  if (strategy.includes('Punt')) return 'bg-purple-500/20 text-purple-400'
  if (strategy === 'Balanced') return 'bg-green-500/20 text-green-400'
  if (strategy.includes('Heavy')) return 'bg-cyan-500/20 text-cyan-400'
  return 'bg-dark-border text-dark-textMuted'
}

function getStrategyIcon(strategy: string): string {
  if (strategy.includes('Punt')) return '🎯'
  if (strategy === 'Balanced') return '⚖️'
  if (strategy.includes('Pitching')) return '⚾'
  if (strategy.includes('Hitting')) return '🏏'
  return '📊'
}

function getPlayersAtPosition(team: any, position: string): any[] {
  if (!team.roster) return []
  return team.roster.filter((p: any) => {
    const pos = p.position || ''
    if (position === 'Util') return !pos.includes('SP') && !pos.includes('RP') && !pos.includes('P')
    if (position === 'OF') return pos.includes('OF') || pos.includes('LF') || pos.includes('CF') || pos.includes('RF')
    return pos.includes(position)
  }).slice(0, position === 'OF' ? 5 : position === 'SP' ? 6 : position === 'RP' ? 4 : 2)
}

function toggleTeamExpanded(team: any) {
  if (expandedTeamKey.value === team.team_key) {
    expandedTeamKey.value = null
  } else {
    expandedTeamKey.value = team.team_key
  }
}

function handleImageError(e: Event) {
  (e.target as HTMLImageElement).src = defaultHeadshot
}

function calculateTeamGrade(team: any): string {
  const ranks = Object.values(team.categoryRanks || {}) as number[]
  if (ranks.length === 0) return 'C'
  
  const avgRank = ranks.reduce((a, b) => a + b, 0) / ranks.length
  const totalTeams = teams.value.length || 8
  const pct = (totalTeams - avgRank + 1) / totalTeams
  
  // Also factor in balance - penalize teams with very high variance
  const variance = ranks.reduce((acc, r) => acc + Math.pow(r - avgRank, 2), 0) / ranks.length
  const balanceBonus = variance < 2 ? 0.1 : variance > 4 ? -0.1 : 0
  
  const adjustedPct = Math.min(1, Math.max(0, pct + balanceBonus))
  
  if (adjustedPct >= 0.85) return 'A+'
  if (adjustedPct >= 0.75) return 'A'
  if (adjustedPct >= 0.65) return 'A-'
  if (adjustedPct >= 0.55) return 'B+'
  if (adjustedPct >= 0.45) return 'B'
  if (adjustedPct >= 0.35) return 'B-'
  if (adjustedPct >= 0.25) return 'C+'
  if (adjustedPct >= 0.15) return 'C'
  return 'C-'
}

function detectStrategy(team: any): string {
  const ranks = team.categoryRanks || {}
  const totalTeams = teams.value.length || 8
  const bottom3Threshold = totalTeams - 2
  
  // Find categories where team is bottom 3
  const puntedCats: string[] = []
  const eliteCats: string[] = []
  
  for (const cat of categories.value) {
    const rank = ranks[cat.stat_id]
    if (rank && rank >= bottom3Threshold) {
      puntedCats.push(cat.display_name)
    }
    if (rank && rank <= 2) {
      eliteCats.push(cat.display_name)
    }
  }
  
  // Check for punt strategies
  if (puntedCats.some(c => c === 'SV' || c.includes('Save'))) return 'Punt Saves'
  if (puntedCats.some(c => c === 'SB' || c.includes('Stolen'))) return 'Punt Steals'
  if (puntedCats.some(c => c === 'AVG' || c.includes('Average'))) return 'Punt AVG'
  
  // Check for heavy tilt
  const hittingRanks = hittingCategories.value.map(c => ranks[c.stat_id] || totalTeams / 2)
  const pitchingRanks = pitchingCategories.value.map(c => ranks[c.stat_id] || totalTeams / 2)
  
  const avgHitting = hittingRanks.reduce((a, b) => a + b, 0) / hittingRanks.length
  const avgPitching = pitchingRanks.reduce((a, b) => a + b, 0) / pitchingRanks.length
  
  if (avgHitting < avgPitching - 2) return 'Hitting Heavy'
  if (avgPitching < avgHitting - 2) return 'Pitching Heavy'
  
  return 'Balanced'
}

// Load data
async function loadTeamData() {
  isLoading.value = true
  loadingMessage.value = 'Loading league data...'
  
  try {
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey) {
      loadingMessage.value = 'No league selected'
      return
    }
    
    // Load league settings
    const settings = await yahooService.getLeagueSettings(leagueKey)
    if (settings) {
      leagueName.value = settings.name || 'League'
      categories.value = settings.stat_categories || []
      console.log('Loaded categories:', categories.value.length)
    }
    
    loadingMessage.value = 'Loading teams...'
    const teamsData = await yahooService.getTeams(leagueKey)
    
    loadingMessage.value = 'Loading rosters and stats...'
    const rosteredPlayers = await yahooService.getAllRosteredPlayers(leagueKey)
    allPlayers.value = rosteredPlayers || []
    
    // Process each team
    const processedTeams: any[] = []
    
    for (const team of (teamsData || [])) {
      // Get players on this team
      const teamPlayers = allPlayers.value.filter((p: any) => p.fantasy_team_key === team.team_key)
      
      // Calculate category totals and find top contributors
      const categoryTotals: Record<string, number> = {}
      const topContributors: Record<string, any> = {}
      
      for (const cat of categories.value) {
        const statId = cat.stat_id
        let total = 0
        let topPlayer: any = null
        let topValue = 0
        
        for (const player of teamPlayers) {
          const value = parseFloat(player.stats?.[statId] || 0)
          if (!isNaN(value)) {
            total += value
            if (value > topValue) {
              topValue = value
              topPlayer = { name: player.full_name, headshot: player.headshot, value }
            }
          }
        }
        
        categoryTotals[statId] = total
        if (topPlayer) {
          topContributors[statId] = topPlayer
        }
      }
      
      processedTeams.push({
        ...team,
        roster: teamPlayers,
        categoryTotals,
        topContributors,
        categoryRanks: {}, // Will be calculated after all teams processed
        overallGrade: 'C',
        strategy: 'Balanced',
        strongestCategories: [],
        weakestCategories: [],
        top3Count: 0,
        middleCount: 0,
        bottom3Count: 0,
        positionGrades: {}
      })
    }
    
    // Calculate ranks for each category
    for (const cat of categories.value) {
      const statId = cat.stat_id
      const isLowerBetter = ['ERA', 'WHIP', 'BB/9', 'L'].some(s => (cat.display_name || '').toUpperCase().includes(s))
      
      // Sort teams by this category
      const sorted = [...processedTeams].sort((a, b) => {
        const aVal = a.categoryTotals[statId] || 0
        const bVal = b.categoryTotals[statId] || 0
        return isLowerBetter ? aVal - bVal : bVal - aVal
      })
      
      // Assign ranks
      sorted.forEach((team, idx) => {
        team.categoryRanks[statId] = idx + 1
      })
    }
    
    // Calculate overall grades, strategies, and counts
    for (const team of processedTeams) {
      team.overallGrade = calculateTeamGrade(team)
      team.strategy = detectStrategy(team)
      
      // Count top/middle/bottom
      const ranks = Object.values(team.categoryRanks) as number[]
      const totalTeams = processedTeams.length
      
      team.top3Count = ranks.filter(r => r <= 3).length
      team.bottom3Count = ranks.filter(r => r > totalTeams - 3).length
      team.middleCount = ranks.length - team.top3Count - team.bottom3Count
      
      // Find strongest and weakest categories
      const catRankPairs = categories.value.map(c => ({
        name: c.display_name,
        rank: team.categoryRanks[c.stat_id] || 999
      }))
      
      team.strongestCategories = catRankPairs
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 5)
        .map(c => c.name)
      
      team.weakestCategories = catRankPairs
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 5)
        .map(c => c.name)
      
      // Calculate position grades (simplified)
      const positions = ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP']
      for (const pos of positions) {
        const posPlayers = getPlayersAtPosition(team, pos)
        if (posPlayers.length === 0) {
          team.positionGrades[pos] = 'F'
        } else {
          // Simple grade based on number of players
          const count = posPlayers.length
          const expected = pos === 'OF' ? 4 : pos === 'SP' ? 5 : pos === 'RP' ? 3 : 1
          const ratio = count / expected
          if (ratio >= 1.2) team.positionGrades[pos] = 'A'
          else if (ratio >= 1) team.positionGrades[pos] = 'B+'
          else if (ratio >= 0.8) team.positionGrades[pos] = 'B'
          else if (ratio >= 0.6) team.positionGrades[pos] = 'C'
          else team.positionGrades[pos] = 'D'
        }
      }
    }
    
    teams.value = processedTeams
    console.log('Processed teams:', teams.value.length)
    
  } catch (error) {
    console.error('Error loading team data:', error)
    loadingMessage.value = 'Error loading data'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadTeamData()
})
</script>
