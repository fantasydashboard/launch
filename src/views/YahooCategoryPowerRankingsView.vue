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
              <div class="mt-2">
                <p class="card-subtitle text-sm leading-relaxed">
                  {{ currentFormulaDisplay }}
                </p>
                <button 
                  @click="showSettings = true" 
                  class="text-primary hover:text-blue-400 text-xs font-semibold transition-colors mt-1"
                >
                  Customize Formula →
                </button>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button @click="downloadRankings" :disabled="isGeneratingDownload" class="btn-primary flex items-center gap-2">
                <svg v-if="!isGeneratingDownload" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isGeneratingDownload ? 'Generating...' : 'Share' }}
              </button>
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

      <!-- Historical Chart (Power Rankings Over Time) -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📈</span>
            <h2 class="card-title">Power Rankings Over Time</h2>
          </div>
        </div>
        <div class="card-body">
          <div v-if="chartSeries.length > 0" class="relative">
            <apexchart type="line" :height="chartHeight" :options="chartOptions" :series="chartSeries" />
            
            <!-- Team avatar overlays at end of lines -->
            <div 
              v-for="(team, idx) in powerRankings" 
              :key="'avatar-' + team.team_key"
              class="absolute pointer-events-none"
              :style="getAvatarPosition(team)"
            >
              <div class="relative">
                <img 
                  :src="team.logo_url || defaultAvatar" 
                  :alt="team.name"
                  class="w-6 h-6 rounded-full ring-2 object-cover"
                  :class="team.is_my_team ? 'ring-primary' : 'ring-cyan-500/70'"
                  @error="handleImageError"
                />
                <div v-if="team.is_my_team" class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                  <span class="text-[6px] text-gray-900 font-bold">★</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-12 text-dark-textMuted">
            Not enough data for chart
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
          <p class="card-subtitle">Total category wins across {{ totalWeeksLoaded }} weeks (click column headers to sort)</p>
        </div>
        <div class="card-body overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-dark-textMuted uppercase border-b border-dark-border">
                <th class="py-2 px-3 text-left sticky left-0 bg-dark-card z-10">Team</th>
                <th 
                  v-for="cat in displayCategories" 
                  :key="cat.stat_id"
                  class="py-2 px-2 text-center whitespace-nowrap cursor-pointer hover:text-primary transition-colors"
                  :title="'Sort by ' + cat.name"
                  @click="sortCategoryTable(cat.stat_id)"
                >
                  <div class="flex items-center justify-center gap-1">
                    {{ cat.display_name }}
                    <span v-if="categorySortColumn === cat.stat_id" class="text-primary">
                      {{ categorySortDirection === 'desc' ? '▼' : '▲' }}
                    </span>
                  </div>
                </th>
                <th 
                  class="py-2 px-2 text-center font-bold cursor-pointer hover:text-primary transition-colors"
                  @click="sortCategoryTable('total')"
                >
                  <div class="flex items-center justify-center gap-1">
                    Total
                    <span v-if="categorySortColumn === 'total'" class="text-primary">
                      {{ categorySortDirection === 'desc' ? '▼' : '▲' }}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="team in sortedCategoryTeams" 
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
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-dark-border">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-dark-border flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-dark-text">Power Rankings Settings</h3>
              <p class="text-sm text-dark-textMuted">Customize how category power rankings are calculated</p>
            </div>
            <button @click="showSettings = false" class="p-2 hover:bg-dark-border/50 rounded-lg transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Presets -->
          <div class="px-6 py-4 border-b border-dark-border">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">Quick Presets</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                v-for="preset in powerPresets"
                :key="preset.id"
                @click="applyPreset(preset)"
                class="p-3 rounded-xl border transition-colors text-left"
                :class="currentPresetId === preset.id 
                  ? 'border-primary bg-primary/10' 
                  : 'border-dark-border hover:border-dark-textMuted bg-dark-border/20'"
              >
                <div class="flex items-start gap-2">
                  <span class="text-xl flex-shrink-0">{{ preset.icon }}</span>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-semibold" :class="currentPresetId === preset.id ? 'text-primary' : 'text-dark-text'">{{ preset.name }}</div>
                    <div class="text-xs text-dark-textMuted mt-0.5 leading-tight">{{ preset.description }}</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
          
          <!-- Factors -->
          <div class="px-6 py-4 overflow-y-auto max-h-[45vh]">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider">Ranking Factors</h4>
              <span class="text-xs text-dark-textMuted">Total: {{ totalWeight }}%</span>
            </div>
            
            <div class="space-y-3">
              <div 
                v-for="factor in powerFactors" 
                :key="factor.id"
                class="bg-dark-border/20 rounded-xl p-4"
              >
                <div class="flex items-start justify-between gap-4 mb-2">
                  <div class="flex items-start gap-3 flex-1 min-w-0">
                    <span class="text-2xl flex-shrink-0 mt-0.5">{{ factor.icon }}</span>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-dark-text text-sm">{{ factor.name }}</div>
                      <p class="text-xs text-dark-textMuted mt-1 leading-relaxed">{{ factor.description }}</p>
                    </div>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                    <input 
                      type="checkbox" 
                      v-model="factor.enabled" 
                      @change="onFactorChange"
                      class="sr-only peer"
                    />
                    <div class="w-11 h-6 bg-dark-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                
                <div v-if="factor.enabled" class="flex items-center gap-4 mt-3 pt-3 border-t border-dark-border/30">
                  <input 
                    type="range" 
                    v-model.number="factor.weight" 
                    min="0" 
                    max="100" 
                    step="5"
                    @input="onFactorChange"
                    class="flex-1 h-2 bg-dark-border rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div class="w-16 flex items-center gap-1 flex-shrink-0">
                    <input 
                      type="number" 
                      v-model.number="factor.weight" 
                      min="0" 
                      max="100"
                      @input="onFactorChange"
                      class="w-12 px-2 py-1 rounded bg-dark-bg border border-dark-border text-dark-text text-sm text-center"
                    />
                    <span class="text-dark-textMuted text-sm">%</span>
                  </div>
                </div>
                
                <!-- Weight bar visualization -->
                <div v-if="factor.enabled" class="mt-2 h-1.5 bg-dark-border rounded-full overflow-hidden">
                  <div 
                    class="h-full rounded-full transition-all"
                    :style="{ width: `${factor.weight}%`, backgroundColor: factor.color }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="px-6 py-4 border-t border-dark-border flex items-center justify-between">
            <button 
              @click="resetFactors"
              class="px-4 py-2 text-sm text-dark-textMuted hover:text-dark-text transition-colors"
            >
              Reset to Default
            </button>
            <div class="flex items-center gap-3">
              <button @click="showSettings = false" class="px-4 py-2 rounded-lg bg-dark-border hover:bg-dark-border/70 text-dark-text font-medium transition-colors">
                Cancel
              </button>
              <button @click="applySettings" class="btn-primary">
                Apply & Recalculate
              </button>
            </div>
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

// Category table sorting
const categorySortColumn = ref<string>('total')
const categorySortDirection = ref<'asc' | 'desc'>('desc')

// Modals
const showSettings = ref(false)
const showTeamModal = ref(false)
const selectedTeam = ref<any>(null)

// Chart
const chartSeries = ref<any[]>([])
const chartOptions = ref<any>(null)
const historicalRanks = ref<Map<string, number[]>>(new Map())
const chartWeeks = ref<number[]>([])
const chartHeight = 400

// Team colors
const teamColors = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1', '#14B8A6', '#F43F5E']

function getTeamColor(index: number) {
  return teamColors[index % teamColors.length]
}

// Power ranking factors for H2H Categories
const powerFactors = ref([
  {
    id: 'catWinPct',
    name: 'Category Win %',
    description: 'Overall category win percentage across all matchups',
    enabled: true,
    weight: 35,
    icon: '🏆',
    color: '#22c55e'
  },
  {
    id: 'dominantCategories',
    name: 'Category Dominance',
    description: 'Number of categories where team ranks in top 2',
    enabled: true,
    weight: 25,
    icon: '💪',
    color: '#f5c451'
  },
  {
    id: 'categoryBalance',
    name: 'Category Balance',
    description: 'How evenly wins are distributed across categories',
    enabled: true,
    weight: 15,
    icon: '⚖️',
    color: '#3b82f6'
  },
  {
    id: 'weakCategories',
    name: 'Weak Category Penalty',
    description: 'Penalty for categories where team ranks in bottom 2',
    enabled: true,
    weight: 15,
    icon: '📉',
    color: '#ef4444'
  },
  {
    id: 'avgCatsPerWeek',
    name: 'Avg Cats Won/Week',
    description: 'Average number of categories won each week',
    enabled: true,
    weight: 10,
    icon: '📊',
    color: '#a855f7'
  }
])

const powerPresets = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Default balanced approach',
    icon: '⚖️',
    factors: {
      catWinPct: { enabled: true, weight: 35 },
      dominantCategories: { enabled: true, weight: 25 },
      categoryBalance: { enabled: true, weight: 15 },
      weakCategories: { enabled: true, weight: 15 },
      avgCatsPerWeek: { enabled: true, weight: 10 }
    }
  },
  {
    id: 'dominator',
    name: 'Category Dominator',
    description: 'Rewards owning specific categories',
    icon: '💪',
    factors: {
      catWinPct: { enabled: true, weight: 25 },
      dominantCategories: { enabled: true, weight: 45 },
      categoryBalance: { enabled: false, weight: 0 },
      weakCategories: { enabled: true, weight: 20 },
      avgCatsPerWeek: { enabled: true, weight: 10 }
    }
  },
  {
    id: 'wellRounded',
    name: 'Well-Rounded',
    description: 'Favors balanced production',
    icon: '🎯',
    factors: {
      catWinPct: { enabled: true, weight: 25 },
      dominantCategories: { enabled: true, weight: 15 },
      categoryBalance: { enabled: true, weight: 40 },
      weakCategories: { enabled: true, weight: 15 },
      avgCatsPerWeek: { enabled: true, weight: 5 }
    }
  },
  {
    id: 'winPctFocused',
    name: 'Win % Focused',
    description: 'Pure category win rate',
    icon: '🏆',
    factors: {
      catWinPct: { enabled: true, weight: 60 },
      dominantCategories: { enabled: true, weight: 15 },
      categoryBalance: { enabled: true, weight: 10 },
      weakCategories: { enabled: true, weight: 10 },
      avgCatsPerWeek: { enabled: true, weight: 5 }
    }
  },
  {
    id: 'noWeakness',
    name: 'No Weaknesses',
    description: 'Heavy penalty for weak categories',
    icon: '🛡️',
    factors: {
      catWinPct: { enabled: true, weight: 30 },
      dominantCategories: { enabled: true, weight: 15 },
      categoryBalance: { enabled: true, weight: 15 },
      weakCategories: { enabled: true, weight: 35 },
      avgCatsPerWeek: { enabled: true, weight: 5 }
    }
  },
  {
    id: 'simple',
    name: 'Simple',
    description: 'Just win percentage',
    icon: '📈',
    factors: {
      catWinPct: { enabled: true, weight: 100 },
      dominantCategories: { enabled: false, weight: 0 },
      categoryBalance: { enabled: false, weight: 0 },
      weakCategories: { enabled: false, weight: 0 },
      avgCatsPerWeek: { enabled: false, weight: 0 }
    }
  }
]

const currentPresetId = ref('balanced')
const isGeneratingDownload = ref(false)

const totalWeight = computed(() => {
  return powerFactors.value.filter(f => f.enabled).reduce((sum, f) => sum + f.weight, 0)
})

const currentFormulaDisplay = computed(() => {
  const enabledFactors = powerFactors.value.filter(f => f.enabled && f.weight > 0)
  if (enabledFactors.length === 0) return 'No factors enabled'
  
  const total = enabledFactors.reduce((sum, f) => sum + f.weight, 0)
  
  return 'Formula: ' + enabledFactors.map(f => {
    const pct = Math.round((f.weight / total) * 100)
    return `${f.icon} ${f.name}: ${pct}%`
  }).join(' • ')
})

function applyPreset(preset: any) {
  currentPresetId.value = preset.id
  powerFactors.value.forEach(factor => {
    const presetFactor = preset.factors[factor.id]
    if (presetFactor) {
      factor.enabled = presetFactor.enabled
      factor.weight = presetFactor.weight
    }
  })
}

function onFactorChange() {
  currentPresetId.value = ''
}

function resetFactors() {
  applyPreset(powerPresets[0])
}

function applySettings() {
  showSettings.value = false
  loadPowerRankings()
}

// Download/Share functionality
async function downloadRankings() {
  isGeneratingDownload.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    
    const leagueName = leagueInfo.value?.name || 'League'
    
    // Load baseball logo
    const loadLogo = async (): Promise<string> => {
      try {
        const response = await fetch('/logos/UFD_Baseball.png')
        if (!response.ok) return ''
        const blob = await response.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => resolve('')
          reader.readAsDataURL(blob)
        })
      } catch (e) {
        console.warn('Failed to load logo:', e)
        return ''
      }
    }
    
    // Helper to create placeholder avatar
    const createPlaceholder = (teamName: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#3a3d52'
        ctx.beginPath()
        ctx.arc(32, 32, 32, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#3B9FE8'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(teamName.charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    const logoBase64 = await loadLogo()
    
    // Pre-load all team images
    const imageMap = new Map<string, string>()
    for (const team of powerRankings.value) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const loadPromise = new Promise<string>((resolve) => {
          img.onload = () => {
            try {
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
            } catch {
              resolve(createPlaceholder(team.name))
            }
          }
          img.onerror = () => resolve(createPlaceholder(team.name))
          setTimeout(() => resolve(createPlaceholder(team.name)), 3000)
        })
        img.src = team.logo_url || ''
        imageMap.set(team.team_key, await loadPromise)
      } catch {
        imageMap.set(team.team_key, createPlaceholder(team.name))
      }
    }
    
    // Create container - narrower for mobile
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 700px; font-family: system-ui, -apple-system, sans-serif;'
    
    // Split teams for two columns
    const midpoint = Math.ceil(powerRankings.value.length / 2)
    const firstHalf = powerRankings.value.slice(0, midpoint)
    const secondHalf = powerRankings.value.slice(midpoint)
    
    // Ranking row - manual padding to align everything at same vertical center
    const generateRankingRow = (team: any, rank: number) => {
      const powerPct = Math.min(100, Math.max(0, team.powerScore)) // 0-100 scale
      // Conditional bar color: green for 70+, yellow for 40-69, red for below 40
      const barColor = team.powerScore >= 70 ? '#10b981' : (team.powerScore >= 40 ? '#f59e0b' : '#ef4444')
      return `
      <div style="display: flex; height: 80px; padding: 0 12px; background: rgba(38, 42, 58, 0.4); border-radius: 10px; margin-bottom: 6px; border: 1px solid rgba(58, 61, 82, 0.4); box-sizing: border-box;">
        <!-- Rank Number - much less padding to move it UP -->
        <div style="width: 44px; flex-shrink: 0; padding-top: 8px;">
          <span style="font-size: 36px; font-weight: 900; color: #3B9FE8; font-family: 'Impact', 'Arial Black', sans-serif; letter-spacing: -2px; line-height: 1;">${rank}</span>
          ${team.change !== 0 ? `
            <span style="font-size: 10px; font-weight: 700; color: ${team.change > 0 ? '#10b981' : '#ef4444'}; margin-left: 2px;">
              ${team.change > 0 ? '▲' : '▼'}${Math.abs(team.change)}
            </span>
          ` : ''}
        </div>
        <!-- Team Logo - 48px logo centered in 80px = 16px padding top -->
        <div style="width: 60px; flex-shrink: 0; padding-top: 16px;">
          <img src="${imageMap.get(team.team_key) || ''}" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid #3a3d52; background: #262a3a; object-fit: cover;" />
        </div>
        <!-- Team Info - move up to align with logo center -->
        <div style="flex: 1; min-width: 0; padding-top: 16px;">
          <div style="font-size: 14px; font-weight: 700; color: #f7f7ff; white-space: nowrap; overflow: visible; text-overflow: ellipsis; line-height: 1.2;">${team.name}</div>
          <div style="font-size: 11px; color: #9ca3af; line-height: 1.2; margin-top: 4px;">${team.totalCatWins}-${team.totalCatLosses} • ${(team.catWinPct * 100).toFixed(0)}%</div>
        </div>
        <!-- Power Score with conditional bar - move up -->
        <div style="width: 55px; flex-shrink: 0; text-align: center; padding-top: 14px;">
          <div style="font-size: 18px; font-weight: bold; color: #3B9FE8; line-height: 1;">${team.powerScore.toFixed(1)}</div>
          <div style="width: 100%; height: 5px; background: rgba(58, 61, 82, 0.8); border-radius: 3px; overflow: hidden; margin-top: 12px;">
            <div style="width: ${powerPct}%; height: 100%; background: ${barColor}; border-radius: 3px;"></div>
          </div>
        </div>
      </div>
    `}
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Blue Bar with site name -->
        <div style="background: #3B9FE8; padding: 10px 24px; text-align: center;">
          <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- HEADER - Logo on left with text next to it -->
        <div style="display: flex; align-items: center; padding: 12px 24px; border-bottom: 1px solid rgba(59, 159, 232, 0.2); position: relative; z-index: 10;">
          <!-- Baseball Logo -->
          ${logoBase64 ? `<img src="${logoBase64}" style="width: 105px; height: 105px; object-fit: contain; flex-shrink: 0; margin-right: 20px;" />` : ''}
          <!-- Title and League Info - Left justified, vertically centered -->
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
            <div style="font-size: 42px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 8px rgba(59, 159, 232, 0.4); line-height: 1;">Power Rankings</div>
            <div style="font-size: 20px; margin-top: 8px; font-weight: 600;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 8px;">•</span>
              <span style="color: #3B9FE8; font-weight: 700;">Week ${selectedWeek.value}</span>
            </div>
          </div>
        </div>
        
        <!-- Main content area -->
        <div style="padding: 16px 24px 12px 24px; position: relative;">
          <!-- Decorative blue glow at top -->
          <div style="position: absolute; top: -50px; left: 50%; transform: translateX(-50%); width: 400px; height: 200px; background: radial-gradient(ellipse, rgba(59, 159, 232, 0.15) 0%, transparent 70%); pointer-events: none;"></div>
          
          <!-- Ghosted baseball diamond field SVG background - bottom right -->
          <div style="position: absolute; bottom: -100px; right: -100px; width: 500px; height: 500px; opacity: 0.07; pointer-events: none;">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Outfield arc -->
              <path d="M100 20 Q20 20 20 100 Q20 140 60 170 L100 130 L140 170 Q180 140 180 100 Q180 20 100 20" stroke="#3B9FE8" stroke-width="1.5" fill="none"/>
              <!-- Infield arc -->
              <path d="M100 50 Q55 50 55 100 Q55 120 75 140 L100 115 L125 140 Q145 120 145 100 Q145 50 100 50" stroke="#3B9FE8" stroke-width="1.5" fill="none"/>
              <!-- Diamond -->
              <path d="M100 70 L130 100 L100 130 L70 100 Z" stroke="#3B9FE8" stroke-width="1.5" fill="none"/>
              <!-- Pitcher's mound -->
              <circle cx="100" cy="100" r="8" stroke="#3B9FE8" stroke-width="1.5" fill="none"/>
              <!-- Home plate area -->
              <path d="M95 130 L100 140 L105 130 L105 125 L95 125 Z" stroke="#3B9FE8" stroke-width="1.5" fill="none"/>
              <!-- Foul lines -->
              <line x1="100" y1="130" x2="40" y2="190" stroke="#3B9FE8" stroke-width="1.5"/>
              <line x1="100" y1="130" x2="160" y2="190" stroke="#3B9FE8" stroke-width="1.5"/>
            </svg>
          </div>
          
          <!-- Smaller ghosted diamond - top left -->
          <div style="position: absolute; top: -60px; left: -60px; width: 250px; height: 250px; opacity: 0.04; pointer-events: none; transform: rotate(15deg);">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Outfield arc -->
              <path d="M100 20 Q20 20 20 100 Q20 140 60 170 L100 130 L140 170 Q180 140 180 100 Q180 20 100 20" stroke="#3B9FE8" stroke-width="2" fill="none"/>
              <!-- Diamond -->
              <path d="M100 70 L130 100 L100 130 L70 100 Z" stroke="#3B9FE8" stroke-width="2" fill="none"/>
              <!-- Pitcher's mound -->
              <circle cx="100" cy="100" r="8" stroke="#3B9FE8" stroke-width="2" fill="none"/>
            </svg>
          </div>
          
          <!-- Blue diagonal lines pattern overlay -->
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.03; pointer-events: none; background: repeating-linear-gradient(45deg, transparent, transparent 20px, #3B9FE8 20px, #3B9FE8 21px);"></div>
          
          <!-- Rankings (Two Columns) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; position: relative; z-index: 1;">
            <div>${firstHalf.map((team, idx) => generateRankingRow(team, idx + 1)).join('')}</div>
            <div>${secondHalf.map((team, idx) => generateRankingRow(team, idx + midpoint + 1)).join('')}</div>
          </div>
          
          <!-- Trend Chart -->
          <div style="background: rgba(38, 42, 58, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid rgba(59, 159, 232, 0.2); position: relative; z-index: 1;">
            <h3 style="color: #3B9FE8; font-size: 18px; margin: 0 0 12px 0; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Rankings Trend</h3>
            <div id="trend-chart-container" style="height: 220px; position: relative;"></div>
          </div>
          
          <!-- Formula Display -->
          <div style="text-align: center; font-size: 9px; color: #6b7280; margin-bottom: 8px; position: relative; z-index: 1;">
            ${currentFormulaDisplay.value}
          </div>
        </div>
        
        <!-- Footer - Simple centered text -->
        <div style="border-top: 1px solid rgba(59, 159, 232, 0.2); padding: 6px 24px; text-align: center; position: relative; z-index: 1;">
          <div style="font-size: 24px; font-weight: bold; color: #3B9FE8; letter-spacing: -0.5px;">ultimatefantasydashboard.com</div>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    
    // Create trend chart with team logos at endpoints
    const trendChartContainer = container.querySelector('#trend-chart-container')
    if (trendChartContainer && chartWeeks.value.length >= 2) {
      const ApexCharts = (await import('apexcharts')).default
      
      // Get last 7 weeks of data
      const maxWeeksToShow = 7
      const startIdx = Math.max(0, chartWeeks.value.length - maxWeeksToShow)
      const weeksToShow = chartWeeks.value.slice(startIdx)
      
      // Build series with last 7 weeks
      const trendSeries = powerRankings.value.map((team, idx) => {
        const allRanks = historicalRanks.value.get(team.team_key) || []
        const ranksToShow = allRanks.slice(startIdx)
        return {
          name: team.name,
          data: ranksToShow
        }
      })
      
      const trendChart = new ApexCharts(trendChartContainer, {
        chart: {
          type: 'line',
          height: 220,
          background: 'transparent',
          toolbar: { show: false },
          animations: { enabled: false }
        },
        series: trendSeries,
        colors: powerRankings.value.map((team, idx) => 
          team.is_my_team ? '#F5C451' : getTeamColor(idx)
        ),
        stroke: {
          width: powerRankings.value.map(team => team.is_my_team ? 4 : 2),
          curve: 'smooth'
        },
        markers: {
          size: 0, // Hide default markers, we'll add logo images
          strokeWidth: 0
        },
        xaxis: {
          categories: weeksToShow.map(w => `Wk ${w}`),
          labels: {
            style: {
              colors: '#9ca3af',
              fontSize: '10px'
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
              fontSize: '10px'
            },
            formatter: (value: number) => `#${Math.round(value)}`
          }
        },
        legend: {
          show: false // Hide legend, logos will identify teams
        },
        grid: {
          borderColor: '#374151',
          strokeDashArray: 3
        },
        tooltip: { enabled: false }
      })
      
      await trendChart.render()
      
      // Wait for chart to render, then add team logos at endpoints
      await new Promise(resolve => setTimeout(resolve, 600))
      
      // Add team logos at the final data point of each line
      // Get the actual chart dimensions from ApexCharts
      const chartEl = trendChartContainer.querySelector('.apexcharts-inner') as HTMLElement
      const plotArea = trendChartContainer.querySelector('.apexcharts-plot-series') as HTMLElement
      
      if (chartEl && plotArea) {
        // Get the actual plot area bounds
        const plotRect = plotArea.getBoundingClientRect()
        const containerRect = (trendChartContainer as HTMLElement).getBoundingClientRect()
        
        // Calculate relative positions
        const plotLeft = plotRect.left - containerRect.left
        const plotTop = plotRect.top - containerRect.top
        const plotHeight = plotRect.height
        const plotWidth = plotRect.width
        
        const numTeams = powerRankings.value.length
        
        // Create a container for the logos
        const logoContainer = document.createElement('div')
        logoContainer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;'
        
        for (const team of powerRankings.value) {
          const ranks = historicalRanks.value.get(team.team_key) || []
          const ranksToShow = ranks.slice(startIdx)
          if (ranksToShow.length === 0) continue
          
          const lastRank = ranksToShow[ranksToShow.length - 1]
          
          // Calculate y position based on rank (inverted axis: rank 1 at top, rank N at bottom)
          // The y-axis goes from 1 to numTeams, reversed
          const yPercent = (lastRank - 1) / (numTeams - 1)
          const yPos = plotTop + (yPercent * plotHeight)
          
          // X position is at the right edge of the plot area
          const xPos = plotLeft + plotWidth
          
          // Logo size
          const logoSize = 20
          
          const logoDiv = document.createElement('div')
          logoDiv.style.cssText = `
            position: absolute;
            left: ${xPos - logoSize / 2 + 4}px;
            top: ${yPos - logoSize / 2}px;
            width: ${logoSize}px;
            height: ${logoSize}px;
            border-radius: 50%;
            overflow: hidden;
            border: 2px solid ${team.is_my_team ? '#F5C451' : getTeamColor(powerRankings.value.indexOf(team))};
            background: #262a3a;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          `
          logoDiv.innerHTML = `<img src="${imageMap.get(team.team_key) || ''}" style="width: 100%; height: 100%; object-fit: cover;" />`
          logoContainer.appendChild(logoDiv)
        }
        
        ;(trendChartContainer as HTMLElement).style.position = 'relative'
        trendChartContainer.appendChild(logoContainer)
      }
      
      // Wait for logos to render
      await new Promise(resolve => setTimeout(resolve, 300))
    } else {
      // No chart data - wait for images only
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Capture the image
    const canvas = await html2canvas(container, {
      backgroundColor: '#0a0c14',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true
    })
    
    document.body.removeChild(container)
    
    // Download the image
    const link = document.createElement('a')
    link.download = `category-power-rankings-week-${selectedWeek.value}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    
  } catch (e) {
    console.error('Error generating image:', e)
    alert('Failed to generate image. Please try again.')
  } finally {
    isGeneratingDownload.value = false
  }
}

// Calculate avatar position for chart overlay
function getAvatarPosition(team: any): Record<string, string> {
  const ranks = historicalRanks.value.get(team.team_key) || []
  const lastRank = ranks[ranks.length - 1]
  if (!lastRank) return { display: 'none' }
  
  const totalTeams = powerRankings.value.length
  const chartPadding = { top: 30, bottom: 80 } // ApexChart padding (bottom includes legend)
  const usableHeight = chartHeight - chartPadding.top - chartPadding.bottom
  
  // Y position: rank 1 is at top, rank N is at bottom (reversed axis)
  const yPercent = (lastRank - 1) / Math.max(1, totalTeams - 1)
  const yPos = chartPadding.top + (yPercent * usableHeight) - 12 // -12 to center the avatar
  
  return {
    right: '15px',
    top: `${yPos}px`
  }
}

// Computed
// yahooLeague is an array - index 0 contains league metadata
const leagueInfo = computed(() => {
  const league = leagueStore.yahooLeague
  if (Array.isArray(league)) {
    return league[0] || {}
  }
  return league || {}
})

const currentWeek = computed(() => {
  const week = leagueInfo.value?.current_week
  console.log('currentWeek computed:', week, 'from leagueInfo:', leagueInfo.value)
  return parseInt(week) || 1
})

const totalWeeks = computed(() => {
  const endWeek = leagueInfo.value?.end_week
  console.log('totalWeeks computed:', endWeek)
  return parseInt(endWeek) || 25
})

const isSeasonComplete = computed(() => {
  const finished = leagueInfo.value?.is_finished
  console.log('isSeasonComplete computed:', finished)
  return finished === 1 || finished === '1'
})

const numCategories = computed(() => displayCategories.value.length || 12)

const availableWeeks = computed(() => {
  const endWeek = isSeasonComplete.value ? totalWeeks.value : currentWeek.value
  console.log(`availableWeeks: isComplete=${isSeasonComplete.value}, totalWeeks=${totalWeeks.value}, currentWeek=${currentWeek.value}, endWeek=${endWeek}`)
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

// Sorted teams for Category Wins table
const sortedCategoryTeams = computed(() => {
  const teams = [...powerRankings.value]
  const col = categorySortColumn.value
  const dir = categorySortDirection.value
  
  teams.sort((a, b) => {
    let aVal: number, bVal: number
    
    if (col === 'total') {
      aVal = a.totalCatWins || 0
      bVal = b.totalCatWins || 0
    } else {
      aVal = a.categoryWins?.[col] || 0
      bVal = b.categoryWins?.[col] || 0
    }
    
    if (dir === 'desc') {
      return bVal - aVal
    } else {
      return aVal - bVal
    }
  })
  
  return teams
})

// Sort category table
function sortCategoryTable(column: string) {
  if (categorySortColumn.value === column) {
    // Toggle direction
    categorySortDirection.value = categorySortDirection.value === 'desc' ? 'asc' : 'desc'
  } else {
    // New column, default to descending
    categorySortColumn.value = column
    categorySortDirection.value = 'desc'
  }
}

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
    
    // Initialize team stats - we'll track cumulative stats as we go through each week
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
        totalCatTies: 0
      })
    }
    
    // Track historical rankings for chart
    const rankHistory = new Map<string, number[]>()
    const weeksForChart: number[] = []
    
    // Initialize rank history for each team
    for (const team of leagueStore.yahooTeams) {
      rankHistory.set(team.team_key, [])
    }
    
    console.log(`=== Loading ${throughWeek} weeks of matchup data ===`)
    
    // Load each week's matchup data and calculate running rankings
    for (let week = 1; week <= throughWeek; week++) {
      loadingMessage.value = `Loading week ${week}/${throughWeek}...`
      
      try {
        const matchups = await yahooService.getCategoryMatchups(leagueKey, week)
        
        // Process this week's matchups
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
        }
        
        // Calculate power rankings at this point in the season (every 2 weeks for chart)
        if (week >= 2 && (week % 2 === 0 || week === throughWeek)) {
          weeksForChart.push(week)
          
          // Calculate current power scores for all teams
          const weekRankings = calculatePowerScores(teamStats, week)
          
          // Store each team's rank for this week
          weekRankings.forEach((team, idx) => {
            const ranks = rankHistory.get(team.team_key) || []
            ranks.push(idx + 1)
            rankHistory.set(team.team_key, ranks)
          })
        }
        
      } catch (e) {
        console.error(`Error loading week ${week}:`, e)
      }
    }
    
    totalWeeksLoaded.value = throughWeek
    historicalRanks.value = rankHistory
    chartWeeks.value = weeksForChart
    
    // Calculate final rankings
    loadingMessage.value = 'Calculating final rankings...'
    const finalRankings = calculatePowerScores(teamStats, throughWeek)
    
    // Calculate change from previous week
    if (throughWeek > 1) {
      finalRankings.forEach((team, idx) => {
        const ranks = rankHistory.get(team.team_key) || []
        if (ranks.length >= 2) {
          const prevRank = ranks[ranks.length - 2] || idx + 1
          team.change = prevRank - (idx + 1)
          team.prevRank = prevRank
        }
      })
    }
    
    // Log results
    console.log('=== POWER RANKINGS COMPLETE ===')
    finalRankings.slice(0, 3).forEach((t, i) => {
      console.log(`#${i+1}: ${t.name} - Score: ${t.powerScore.toFixed(1)}, Cat W-L: ${t.totalCatWins}-${t.totalCatLosses}`)
    })
    
    powerRankings.value = finalRankings
    buildChart()
    
  } catch (e) {
    console.error('Error loading power rankings:', e)
  } finally {
    isLoading.value = false
  }
}

// Calculate power scores for current team stats state using customizable factors
function calculatePowerScores(teamStats: Map<string, any>, currentWeek: number): any[] {
  const rankings: any[] = []
  const numTeams = leagueStore.yahooTeams.length
  
  for (const [teamKey, stats] of teamStats) {
    const totalGames = stats.totalCatWins + stats.totalCatLosses + stats.totalCatTies
    const catWinPct = totalGames > 0 ? stats.totalCatWins / totalGames : 0
    const avgCatsWonPerWeek = currentWeek > 0 ? stats.totalCatWins / currentWeek : 0
    
    // Deep copy category data
    const categoryWins = { ...stats.categoryWins }
    const categoryLosses = { ...stats.categoryLosses }
    const categoryTies = { ...stats.categoryTies }
    
    rankings.push({
      team_key: stats.team_key,
      name: stats.name,
      logo_url: stats.logo_url,
      is_my_team: stats.is_my_team,
      categoryWins,
      categoryLosses,
      categoryTies,
      totalCatWins: stats.totalCatWins,
      totalCatLosses: stats.totalCatLosses,
      totalCatTies: stats.totalCatTies,
      catWinPct,
      avgCatsWonPerWeek,
      powerScore: 0,
      change: 0,
      prevRank: 0,
      dominantCategories: 0,
      weakCategories: 0,
      categoryRanks: {},
      categoryBalance: 0
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
  
  // Count dominant/weak categories and calculate balance
  for (const team of rankings) {
    let dominant = 0, weak = 0
    for (const cat of displayCategories.value) {
      const rank = team.categoryRanks[cat.stat_id] || numTeams
      if (rank <= 2) dominant++
      if (rank >= numTeams - 1) weak++
    }
    team.dominantCategories = dominant
    team.weakCategories = weak
    team.categoryBalance = calculateCategoryBalance(team.categoryWins)
  }
  
  // Get enabled factors and calculate normalized weights
  const enabledFactors = powerFactors.value.filter(f => f.enabled && f.weight > 0)
  const totalWeight = enabledFactors.reduce((sum, f) => sum + f.weight, 0)
  
  if (totalWeight === 0 || enabledFactors.length === 0) {
    // Fallback: just use cat win pct
    for (const team of rankings) {
      team.powerScore = team.catWinPct * 100
    }
  } else {
    // Calculate max values for normalization
    const maxCatWinPct = Math.max(...rankings.map(t => t.catWinPct), 0.01)
    const maxDominant = Math.max(...rankings.map(t => t.dominantCategories), 1)
    const maxAvgCats = Math.max(...rankings.map(t => t.avgCatsWonPerWeek), 1)
    const maxWeak = Math.max(...rankings.map(t => t.weakCategories), 1)
    
    for (const team of rankings) {
      let score = 0
      
      for (const factor of enabledFactors) {
        const normalizedWeight = factor.weight / totalWeight
        let componentScore = 0
        
        switch (factor.id) {
          case 'catWinPct':
            componentScore = (team.catWinPct / maxCatWinPct) * 100
            break
          case 'dominantCategories':
            componentScore = (team.dominantCategories / maxDominant) * 100
            break
          case 'categoryBalance':
            componentScore = team.categoryBalance
            break
          case 'weakCategories':
            // Inverse: fewer weak categories = higher score
            componentScore = ((maxWeak - team.weakCategories) / Math.max(maxWeak, 1)) * 100
            break
          case 'avgCatsPerWeek':
            componentScore = (team.avgCatsWonPerWeek / maxAvgCats) * 100
            break
        }
        
        score += componentScore * normalizedWeight
      }
      
      team.powerScore = Math.max(0, Math.min(100, score))
    }
  }
  
  // Sort by power score
  rankings.sort((a, b) => b.powerScore - a.powerScore)
  
  return rankings
}

function buildChart() {
  if (powerRankings.value.length === 0 || chartWeeks.value.length < 2) {
    chartSeries.value = []
    chartOptions.value = null
    return
  }
  
  // Build series data for each team
  const series = powerRankings.value.map((team, idx) => {
    const ranks = historicalRanks.value.get(team.team_key) || []
    return {
      name: team.name,
      data: ranks
    }
  })
  
  chartSeries.value = series
  
  chartOptions.value = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    theme: { mode: 'dark' },
    colors: powerRankings.value.map((team, idx) => 
      team.is_my_team ? '#F5C451' : getTeamColor(idx)
    ),
    stroke: {
      width: powerRankings.value.map(team => team.is_my_team ? 4 : 2),
      curve: 'smooth'
    },
    markers: {
      size: 0,
      hover: { size: 6 }
    },
    xaxis: {
      categories: chartWeeks.value.map(w => `Wk ${w}`),
      labels: {
        style: { colors: '#9ca3af' }
      },
      title: {
        text: 'Week',
        style: { color: '#9ca3af' }
      }
    },
    yaxis: {
      reversed: true,
      min: 1,
      max: powerRankings.value.length,
      labels: {
        style: { colors: '#9ca3af' },
        formatter: (value: number) => `#${Math.round(value)}`
      },
      title: {
        text: 'Power Rank',
        style: { color: '#9ca3af' }
      }
    },
    legend: {
      show: false // Hide legend since we show team avatars at end of lines
    },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      custom: function({ series, seriesIndex, dataPointIndex, w }: any) {
        // Get all teams with their ranks at this data point
        const teamsWithRanks = powerRankings.value.map((team, idx) => ({
          name: team.name,
          rank: series[idx]?.[dataPointIndex] || 0,
          color: w.globals.colors[idx],
          isMyTeam: team.is_my_team
        })).filter(t => t.rank > 0)
        
        // Sort by rank (ascending - #1 first)
        teamsWithRanks.sort((a, b) => a.rank - b.rank)
        
        const weekLabel = w.globals.categoryLabels?.[dataPointIndex] || `Week ${dataPointIndex + 1}`
        
        let html = `<div class="apexcharts-tooltip-title" style="font-weight: bold; padding: 6px 10px; background: #1f2937; border-bottom: 1px solid #374151;">${weekLabel}</div>`
        html += `<div style="padding: 6px 10px; max-height: 300px; overflow-y: auto;">`
        
        teamsWithRanks.forEach((team, idx) => {
          const highlight = team.isMyTeam ? 'font-weight: bold; color: #F5C451;' : ''
          html += `<div style="display: flex; align-items: center; gap: 8px; padding: 3px 0; ${highlight}">
            <span style="color: ${team.color}; font-size: 16px;">●</span>
            <span style="min-width: 24px; color: #9ca3af;">#${team.rank}</span>
            <span>${team.name}</span>
          </div>`
        })
        
        html += `</div>`
        return html
      }
    },
    grid: {
      borderColor: '#374151',
      strokeDashArray: 3,
      padding: {
        right: 50 // Add padding for avatars
      }
    }
  }
}

// Initialize
watch(() => leagueStore.yahooTeams, async () => {
  if (leagueStore.yahooTeams.length > 0) {
    await loadCategories()
    
    // Use the computed values which now correctly parse the array
    const endWeek = totalWeeks.value
    const currWeek = currentWeek.value
    const isFinished = isSeasonComplete.value
    const defaultWeek = isFinished ? endWeek : currWeek
    
    console.log(`Init: endWeek=${endWeek}, currWeek=${currWeek}, isFinished=${isFinished}, default=${defaultWeek}`)
    console.log('yahooLeague raw:', leagueStore.yahooLeague)
    
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
