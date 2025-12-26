<template>
  <div class="space-y-6">
    <!-- Header with Controls -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Category Matchups</h1>
        <p class="text-base text-dark-textMuted">
          H2H category battles with win probability analysis
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button 
          @click="refreshData" 
          :disabled="isRefreshing"
          class="btn-secondary flex items-center gap-2"
        >
          <svg 
            class="w-4 h-4" 
            :class="{ 'animate-spin': isRefreshing }" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
        </button>
        <select v-model="selectedWeek" @change="loadMatchups" class="select">
          <option value="">Select Week...</option>
          <option v-for="week in availableWeeks" :key="week" :value="week">
            Week {{ week }}
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

    <template v-else-if="matchups.length > 0">
      <!-- Week Summary -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">Week {{ selectedWeek }} Summary</h2>
          </div>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="text-center">
              <div class="text-3xl font-bold text-primary mb-2">{{ weekStats.totalCategories }}</div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide">Categories</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-green-400 mb-2">{{ weekStats.mostDominant.wins }}-{{ weekStats.mostDominant.losses }}</div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Most Dominant</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.mostDominant.team }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-yellow-400 mb-2">{{ weekStats.closestMatchup.margin }}</div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide mb-1">Closest Matchup</div>
              <div class="text-sm font-semibold text-dark-text">{{ weekStats.closestMatchup.teams }}</div>
            </div>
            <div class="text-center">
              <div class="text-3xl font-bold text-cyan-400 mb-2">{{ matchups.length }}</div>
              <div class="text-sm text-dark-textMuted uppercase tracking-wide">Matchups</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Matchup Selector Cards -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">⚔️</span>
            <h2 class="card-title">Select Matchup</h2>
          </div>
          <p class="text-sm text-dark-textMuted mt-2">
            💡 Click any matchup to see category-by-category breakdown and win probability
          </p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              v-for="matchup in matchups"
              :key="matchup.matchup_id"
              @click="selectMatchup(matchup)"
              :class="[
                'p-4 rounded-xl border-2 transition-all text-left',
                selectedMatchup?.matchup_id === matchup.matchup_id
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                  : 'border-dark-border bg-dark-card hover:border-primary/50'
              ]"
            >
              <!-- Win Probability Bar at Top -->
              <div class="mb-3">
                <div class="flex justify-between text-xs mb-1">
                  <span class="font-bold" :style="{ color: getWinProbColor(matchup.team1WinProb) }">
                    {{ matchup.team1WinProb.toFixed(0) }}%
                  </span>
                  <span class="text-dark-textMuted">Win Probability</span>
                  <span class="font-bold" :style="{ color: getWinProbColor(matchup.team2WinProb) }">
                    {{ matchup.team2WinProb.toFixed(0) }}%
                  </span>
                </div>
                <div class="h-2 bg-dark-border rounded-full overflow-hidden flex">
                  <div 
                    class="h-full transition-all"
                    :style="{ 
                      width: `${matchup.team1WinProb}%`,
                      background: `linear-gradient(90deg, #10b981 0%, #3b82f6 100%)`
                    }"
                  ></div>
                  <div 
                    class="h-full transition-all"
                    :style="{ 
                      width: `${matchup.team2WinProb}%`,
                      background: `linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)`
                    }"
                  ></div>
                </div>
              </div>

              <!-- Team 1 -->
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <div class="relative">
                    <img 
                      :src="matchup.team1.logo_url || defaultAvatar" 
                      class="w-9 h-9 rounded-full ring-2"
                      :class="matchup.team1Leading ? 'ring-green-500' : 'ring-dark-border'"
                      @error="handleImageError"
                    />
                    <div v-if="matchup.team1.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <span class="text-[10px]">★</span>
                    </div>
                  </div>
                  <span class="font-semibold text-dark-text truncate">{{ matchup.team1.name }}</span>
                </div>
                <div class="text-right flex-shrink-0">
                  <span class="text-xl font-bold" :class="matchup.team1Leading ? 'text-green-400' : 'text-dark-text'">
                    {{ matchup.team1CatWins }}
                  </span>
                </div>
              </div>

              <!-- VS -->
              <div class="flex items-center gap-2 my-1">
                <div class="flex-1 h-px bg-dark-border"></div>
                <span class="text-xs text-dark-textMuted px-2">{{ matchup.team1CatWins }}-{{ matchup.team2CatWins }}-{{ matchup.ties }}</span>
                <div class="flex-1 h-px bg-dark-border"></div>
              </div>

              <!-- Team 2 -->
              <div class="flex items-center justify-between mt-2">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <div class="relative">
                    <img 
                      :src="matchup.team2.logo_url || defaultAvatar" 
                      class="w-9 h-9 rounded-full ring-2"
                      :class="matchup.team2Leading ? 'ring-green-500' : 'ring-dark-border'"
                      @error="handleImageError"
                    />
                    <div v-if="matchup.team2.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <span class="text-[10px]">★</span>
                    </div>
                  </div>
                  <span class="font-semibold text-dark-text truncate">{{ matchup.team2.name }}</span>
                </div>
                <div class="text-right flex-shrink-0">
                  <span class="text-xl font-bold" :class="matchup.team2Leading ? 'text-green-400' : 'text-dark-text'">
                    {{ matchup.team2CatWins }}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Selected Matchup Analysis -->
      <template v-if="selectedMatchup">
        <!-- Big Win Probability Display -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🎲</span>
              <h2 class="card-title">Win Probability</h2>
            </div>
            <p class="card-subtitle mt-1">Projected category outcome: {{ selectedMatchup.team1CatWins }}-{{ selectedMatchup.team2CatWins }}-{{ selectedMatchup.ties }}</p>
          </div>
          <div class="card-body">
            <!-- Team Headers with Probabilities -->
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <img :src="selectedMatchup.team1.logo_url || defaultAvatar" class="w-12 h-12 rounded-full ring-2 ring-cyan-500" @error="handleImageError" />
                <div>
                  <div class="font-bold text-dark-text">{{ selectedMatchup.team1.name }}</div>
                  <div class="text-3xl font-black" :style="{ color: getWinProbColor(selectedMatchup.team1WinProb) }">
                    {{ selectedMatchup.team1WinProb.toFixed(0) }}%
                  </div>
                </div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-dark-textMuted">VS</div>
              </div>
              <div class="flex items-center gap-3">
                <div class="text-right">
                  <div class="font-bold text-dark-text">{{ selectedMatchup.team2.name }}</div>
                  <div class="text-3xl font-black" :style="{ color: getWinProbColor(selectedMatchup.team2WinProb) }">
                    {{ selectedMatchup.team2WinProb.toFixed(0) }}%
                  </div>
                </div>
                <img :src="selectedMatchup.team2.logo_url || defaultAvatar" class="w-12 h-12 rounded-full ring-2 ring-orange-500" @error="handleImageError" />
              </div>
            </div>

            <!-- Win Probability Bar -->
            <div class="h-8 rounded-full overflow-hidden flex mb-6" style="background: #1f2937;">
              <div 
                class="h-full flex items-center justify-end pr-3 transition-all duration-500"
                :style="{ 
                  width: `${selectedMatchup.team1WinProb}%`,
                  background: 'linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%)'
                }"
              >
                <span v-if="selectedMatchup.team1WinProb > 15" class="text-sm font-bold text-white">{{ selectedMatchup.team1WinProb.toFixed(0) }}%</span>
              </div>
              <div 
                class="h-full flex items-center justify-start pl-3 transition-all duration-500"
                :style="{ 
                  width: `${selectedMatchup.team2WinProb}%`,
                  background: 'linear-gradient(90deg, #f97316 0%, #f59e0b 50%, #fbbf24 100%)'
                }"
              >
                <span v-if="selectedMatchup.team2WinProb > 15" class="text-sm font-bold text-white">{{ selectedMatchup.team2WinProb.toFixed(0) }}%</span>
              </div>
            </div>

            <!-- Win Probability Over Time Chart -->
            <div class="bg-dark-border/30 rounded-xl p-4">
              <h4 class="text-sm font-semibold text-dark-textMuted mb-3">Win Probability Trend</h4>
              <div ref="winProbChartEl" class="h-48"></div>
            </div>
          </div>
        </div>

        <!-- Category-by-Category Breakdown -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📊</span>
              <h2 class="card-title">Category Breakdown</h2>
            </div>
            <p class="card-subtitle">Win probability for each statistical category</p>
          </div>
          <div class="card-body">
            <!-- Batting Categories -->
            <div class="mb-6">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>🏏</span> Batting Categories
                <span class="text-xs font-normal ml-auto">
                  {{ getBattingScore(selectedMatchup).team1 }}-{{ getBattingScore(selectedMatchup).team2 }}-{{ getBattingScore(selectedMatchup).ties }}
                </span>
              </h4>
              <div class="space-y-2">
                <div 
                  v-for="cat in battingCategories" 
                  :key="cat.stat_id"
                  class="bg-dark-border/20 rounded-lg p-3"
                >
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2 w-1/3">
                      <span class="text-lg font-bold" :class="getCategoryLeaderClass(selectedMatchup, cat.stat_id, 1)">
                        {{ formatStat(getCategoryStat(selectedMatchup, cat.stat_id, 1), cat.stat_id) }}
                      </span>
                    </div>
                    <div class="text-center flex-1">
                      <div class="text-xs text-dark-textMuted uppercase tracking-wide">{{ cat.display_name }}</div>
                      <div class="text-xs mt-0.5">
                        <span :class="getCategoryWinProbClass(getCategoryWinProb(selectedMatchup, cat.stat_id, 1))">
                          {{ getCategoryWinProb(selectedMatchup, cat.stat_id, 1).toFixed(0) }}%
                        </span>
                        <span class="text-dark-textMuted mx-1">|</span>
                        <span :class="getCategoryWinProbClass(getCategoryWinProb(selectedMatchup, cat.stat_id, 2))">
                          {{ getCategoryWinProb(selectedMatchup, cat.stat_id, 2).toFixed(0) }}%
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 w-1/3 justify-end">
                      <span class="text-lg font-bold" :class="getCategoryLeaderClass(selectedMatchup, cat.stat_id, 2)">
                        {{ formatStat(getCategoryStat(selectedMatchup, cat.stat_id, 2), cat.stat_id) }}
                      </span>
                    </div>
                  </div>
                  <!-- Category Win Prob Bar -->
                  <div class="h-1.5 bg-dark-border rounded-full overflow-hidden flex">
                    <div 
                      class="h-full bg-gradient-to-r from-green-600 to-green-400"
                      :style="{ width: `${getCategoryWinProb(selectedMatchup, cat.stat_id, 1)}%` }"
                    ></div>
                    <div 
                      class="h-full bg-gradient-to-r from-orange-400 to-orange-600"
                      :style="{ width: `${getCategoryWinProb(selectedMatchup, cat.stat_id, 2)}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pitching Categories -->
            <div>
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>⚾</span> Pitching Categories
                <span class="text-xs font-normal ml-auto">
                  {{ getPitchingScore(selectedMatchup).team1 }}-{{ getPitchingScore(selectedMatchup).team2 }}-{{ getPitchingScore(selectedMatchup).ties }}
                </span>
              </h4>
              <div class="space-y-2">
                <div 
                  v-for="cat in pitchingCategories" 
                  :key="cat.stat_id"
                  class="bg-dark-border/20 rounded-lg p-3"
                >
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2 w-1/3">
                      <span class="text-lg font-bold" :class="getCategoryLeaderClass(selectedMatchup, cat.stat_id, 1)">
                        {{ formatStat(getCategoryStat(selectedMatchup, cat.stat_id, 1), cat.stat_id) }}
                      </span>
                    </div>
                    <div class="text-center flex-1">
                      <div class="text-xs text-dark-textMuted uppercase tracking-wide">{{ cat.display_name }}</div>
                      <div class="text-xs mt-0.5">
                        <span :class="getCategoryWinProbClass(getCategoryWinProb(selectedMatchup, cat.stat_id, 1))">
                          {{ getCategoryWinProb(selectedMatchup, cat.stat_id, 1).toFixed(0) }}%
                        </span>
                        <span class="text-dark-textMuted mx-1">|</span>
                        <span :class="getCategoryWinProbClass(getCategoryWinProb(selectedMatchup, cat.stat_id, 2))">
                          {{ getCategoryWinProb(selectedMatchup, cat.stat_id, 2).toFixed(0) }}%
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 w-1/3 justify-end">
                      <span class="text-lg font-bold" :class="getCategoryLeaderClass(selectedMatchup, cat.stat_id, 2)">
                        {{ formatStat(getCategoryStat(selectedMatchup, cat.stat_id, 2), cat.stat_id) }}
                      </span>
                    </div>
                  </div>
                  <!-- Category Win Prob Bar -->
                  <div class="h-1.5 bg-dark-border rounded-full overflow-hidden flex">
                    <div 
                      class="h-full bg-gradient-to-r from-green-600 to-green-400"
                      :style="{ width: `${getCategoryWinProb(selectedMatchup, cat.stat_id, 1)}%` }"
                    ></div>
                    <div 
                      class="h-full bg-gradient-to-r from-orange-400 to-orange-600"
                      :style="{ width: `${getCategoryWinProb(selectedMatchup, cat.stat_id, 2)}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Category Summary Table -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📋</span>
              <h2 class="card-title">Full Category Comparison</h2>
            </div>
          </div>
          <div class="card-body overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-xs text-dark-textMuted uppercase border-b border-dark-border">
                  <th class="py-2 px-3 text-left">Category</th>
                  <th class="py-2 px-3 text-center">{{ selectedMatchup.team1.name }}</th>
                  <th class="py-2 px-3 text-center">{{ selectedMatchup.team2.name }}</th>
                  <th class="py-2 px-3 text-center">Diff</th>
                  <th class="py-2 px-3 text-center">Win Prob</th>
                  <th class="py-2 px-3 text-center">Leader</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="cat in allCategories" 
                  :key="cat.stat_id"
                  class="border-b border-dark-border/50"
                >
                  <td class="py-2 px-3 font-medium text-dark-text">{{ cat.display_name }}</td>
                  <td class="py-2 px-3 text-center" :class="getCategoryLeaderClass(selectedMatchup, cat.stat_id, 1)">
                    {{ formatStat(getCategoryStat(selectedMatchup, cat.stat_id, 1), cat.stat_id) }}
                  </td>
                  <td class="py-2 px-3 text-center" :class="getCategoryLeaderClass(selectedMatchup, cat.stat_id, 2)">
                    {{ formatStat(getCategoryStat(selectedMatchup, cat.stat_id, 2), cat.stat_id) }}
                  </td>
                  <td class="py-2 px-3 text-center">
                    <span :class="getDiffClass(selectedMatchup, cat.stat_id)">
                      {{ formatDiff(selectedMatchup, cat.stat_id) }}
                    </span>
                  </td>
                  <td class="py-2 px-3 text-center">
                    <div class="flex items-center justify-center gap-1">
                      <span class="text-xs" :class="getCategoryWinProbClass(getCategoryWinProb(selectedMatchup, cat.stat_id, 1))">
                        {{ getCategoryWinProb(selectedMatchup, cat.stat_id, 1).toFixed(0) }}%
                      </span>
                      <span class="text-dark-textMuted">-</span>
                      <span class="text-xs" :class="getCategoryWinProbClass(getCategoryWinProb(selectedMatchup, cat.stat_id, 2))">
                        {{ getCategoryWinProb(selectedMatchup, cat.stat_id, 2).toFixed(0) }}%
                      </span>
                    </div>
                  </td>
                  <td class="py-2 px-3 text-center">
                    <span v-if="getCategoryLeader(selectedMatchup, cat.stat_id) === 1" class="text-green-400">✓</span>
                    <span v-else-if="getCategoryLeader(selectedMatchup, cat.stat_id) === 2" class="text-orange-400">✓</span>
                    <span v-else class="text-dark-textMuted">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </template>

    <!-- Empty State -->
    <div v-else class="text-center py-20">
      <div class="text-6xl mb-4">⚔️</div>
      <h3 class="text-xl font-bold text-dark-text mb-2">Select a Week</h3>
      <p class="text-dark-textMuted">Choose a week to view category matchups</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'
import ApexCharts from 'apexcharts'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

// State
const isLoading = ref(false)
const isRefreshing = ref(false)
const loadingMessage = ref('Loading matchups...')
const selectedWeek = ref('')
const matchups = ref<any[]>([])
const selectedMatchup = ref<any>(null)
const categories = ref<any[]>([])
const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_2_g.png'

// Chart
const winProbChartEl = ref<HTMLElement | null>(null)
let winProbChart: ApexCharts | null = null

// Batting stat IDs (common Yahoo baseball)
const BATTING_STAT_IDS = ['60', '7', '12', '16', '3', '55', '56'] // R, HR, RBI, SB, AVG, OBP, SLG
const PITCHING_STAT_IDS = ['28', '32', '42', '26', '27', '48'] // W, SV, K, ERA, WHIP, HLD

// Inverse stats (lower is better)
const INVERSE_STATS = ['26', '27'] // ERA, WHIP

// Computed
const leagueInfo = computed(() => {
  const league = leagueStore.yahooLeague
  if (Array.isArray(league)) return league[0] || {}
  return league || {}
})

const currentWeek = computed(() => parseInt(leagueInfo.value?.current_week) || 1)
const totalWeeks = computed(() => parseInt(leagueInfo.value?.end_week) || 25)
const isSeasonComplete = computed(() => leagueInfo.value?.is_finished === 1 || leagueInfo.value?.is_finished === '1')

const availableWeeks = computed(() => {
  const endWeek = isSeasonComplete.value ? totalWeeks.value : currentWeek.value
  return Array.from({ length: endWeek }, (_, i) => i + 1)
})

const battingCategories = computed(() => {
  return categories.value.filter(c => BATTING_STAT_IDS.includes(c.stat_id))
})

const pitchingCategories = computed(() => {
  return categories.value.filter(c => PITCHING_STAT_IDS.includes(c.stat_id))
})

const allCategories = computed(() => {
  return [...battingCategories.value, ...pitchingCategories.value]
})

const weekStats = computed(() => {
  if (matchups.value.length === 0) {
    return {
      totalCategories: 0,
      mostDominant: { team: '-', wins: 0, losses: 0 },
      closestMatchup: { teams: '-', margin: 0 },
    }
  }

  let mostDominant = { team: '-', wins: 0, losses: 0, diff: 0 }
  let closestMatchup = { teams: '-', margin: 999 }

  for (const m of matchups.value) {
    const diff1 = m.team1CatWins - m.team2CatWins
    const diff2 = m.team2CatWins - m.team1CatWins

    if (diff1 > mostDominant.diff) {
      mostDominant = { team: m.team1.name, wins: m.team1CatWins, losses: m.team2CatWins, diff: diff1 }
    }
    if (diff2 > mostDominant.diff) {
      mostDominant = { team: m.team2.name, wins: m.team2CatWins, losses: m.team1CatWins, diff: diff2 }
    }

    const margin = Math.abs(m.team1CatWins - m.team2CatWins)
    if (margin < closestMatchup.margin) {
      closestMatchup = { teams: `${m.team1.name.split(' ')[0]} vs ${m.team2.name.split(' ')[0]}`, margin }
    }
  }

  return {
    totalCategories: categories.value.length,
    mostDominant,
    closestMatchup
  }
})

// Helpers
function handleImageError(e: Event) { (e.target as HTMLImageElement).src = defaultAvatar }

function getWinProbColor(prob: number): string {
  if (prob >= 70) return '#10b981'
  if (prob >= 55) return '#3b82f6'
  if (prob >= 45) return '#9ca3af'
  if (prob >= 30) return '#f59e0b'
  return '#ef4444'
}

function getCategoryWinProbClass(prob: number): string {
  if (prob >= 65) return 'text-green-400 font-bold'
  if (prob >= 55) return 'text-green-400'
  if (prob >= 45) return 'text-dark-textMuted'
  if (prob >= 35) return 'text-orange-400'
  return 'text-red-400 font-bold'
}

function getCategoryStat(matchup: any, statId: string, team: 1 | 2): number {
  const stats = team === 1 ? matchup.team1Stats : matchup.team2Stats
  return parseFloat(stats?.[statId] || 0)
}

function getCategoryLeader(matchup: any, statId: string): 0 | 1 | 2 {
  const val1 = getCategoryStat(matchup, statId, 1)
  const val2 = getCategoryStat(matchup, statId, 2)
  const isInverse = INVERSE_STATS.includes(statId)
  
  if (val1 === val2) return 0
  if (isInverse) {
    return val1 < val2 ? 1 : 2
  }
  return val1 > val2 ? 1 : 2
}

function getCategoryLeaderClass(matchup: any, statId: string, team: 1 | 2): string {
  const leader = getCategoryLeader(matchup, statId)
  if (leader === team) return 'text-green-400'
  if (leader === 0) return 'text-dark-textMuted'
  return 'text-dark-text'
}

function getCategoryWinProb(matchup: any, statId: string, team: 1 | 2): number {
  const probs = matchup.categoryWinProbs?.[statId]
  if (!probs) return 50
  return team === 1 ? probs.team1 : probs.team2
}

function formatStat(value: number, statId: string): string {
  // Rate stats (AVG, OBP, SLG, ERA, WHIP)
  if (['3', '55', '56'].includes(statId)) {
    return value.toFixed(3).replace(/^0/, '')
  }
  if (['26', '27'].includes(statId)) {
    return value.toFixed(2)
  }
  return Math.round(value).toString()
}

function formatDiff(matchup: any, statId: string): string {
  const val1 = getCategoryStat(matchup, statId, 1)
  const val2 = getCategoryStat(matchup, statId, 2)
  const diff = val1 - val2
  const isInverse = INVERSE_STATS.includes(statId)
  
  let formatted: string
  if (['3', '55', '56'].includes(statId)) {
    formatted = Math.abs(diff).toFixed(3)
  } else if (['26', '27'].includes(statId)) {
    formatted = Math.abs(diff).toFixed(2)
  } else {
    formatted = Math.abs(Math.round(diff)).toString()
  }
  
  if (diff === 0) return '—'
  
  // For inverse stats, negative diff is good for team 1
  if (isInverse) {
    return diff < 0 ? `+${formatted}` : `-${formatted}`
  }
  return diff > 0 ? `+${formatted}` : `-${formatted}`
}

function getDiffClass(matchup: any, statId: string): string {
  const leader = getCategoryLeader(matchup, statId)
  if (leader === 1) return 'text-green-400'
  if (leader === 2) return 'text-orange-400'
  return 'text-dark-textMuted'
}

function getBattingScore(matchup: any) {
  let team1 = 0, team2 = 0, ties = 0
  for (const cat of battingCategories.value) {
    const leader = getCategoryLeader(matchup, cat.stat_id)
    if (leader === 1) team1++
    else if (leader === 2) team2++
    else ties++
  }
  return { team1, team2, ties }
}

function getPitchingScore(matchup: any) {
  let team1 = 0, team2 = 0, ties = 0
  for (const cat of pitchingCategories.value) {
    const leader = getCategoryLeader(matchup, cat.stat_id)
    if (leader === 1) team1++
    else if (leader === 2) team2++
    else ties++
  }
  return { team1, team2, ties }
}

// Calculate win probability for a category based on current values and volatility
function calculateCategoryWinProb(val1: number, val2: number, statId: string, daysRemaining: number): { team1: number, team2: number } {
  const isInverse = INVERSE_STATS.includes(statId)
  
  // Volatility factors (how much the stat can change)
  const volatility: Record<string, number> = {
    '60': 8,   // R - moderate
    '7': 3,    // HR - lower
    '12': 8,   // RBI - moderate
    '16': 2,   // SB - lower
    '3': 0.02, // AVG - very stable
    '55': 0.02, // OBP
    '56': 0.03, // SLG
    '28': 0.5, // W - low
    '32': 0.5, // SV - low
    '42': 15,  // K - high
    '26': 0.5, // ERA - moderate
    '27': 0.15, // WHIP - moderate
    '48': 0.5  // HLD
  }
  
  const stdDev = (volatility[statId] || 5) * Math.sqrt(daysRemaining)
  
  let diff = val1 - val2
  if (isInverse) diff = -diff // Flip for inverse stats
  
  if (stdDev === 0) {
    if (diff > 0) return { team1: 100, team2: 0 }
    if (diff < 0) return { team1: 0, team2: 100 }
    return { team1: 50, team2: 50 }
  }
  
  // Normal distribution CDF approximation
  const zScore = diff / (stdDev * Math.sqrt(2))
  let team1Prob = 0.5 * (1 + Math.tanh(zScore * 0.8))
  
  // Clamp
  team1Prob = Math.min(0.99, Math.max(0.01, team1Prob))
  
  return {
    team1: team1Prob * 100,
    team2: (1 - team1Prob) * 100
  }
}

// Calculate overall matchup win probability using category probabilities
function calculateOverallWinProb(categoryProbs: Record<string, { team1: number, team2: number }>, numCategories: number): { team1: number, team2: number } {
  // Simple approach: count expected category wins
  let expectedTeam1Wins = 0
  let expectedTeam2Wins = 0
  
  for (const probs of Object.values(categoryProbs)) {
    expectedTeam1Wins += probs.team1 / 100
    expectedTeam2Wins += probs.team2 / 100
  }
  
  // Win if you get more than half the categories
  const halfCats = numCategories / 2
  
  // Use the ratio of expected wins to estimate probability
  const total = expectedTeam1Wins + expectedTeam2Wins
  if (total === 0) return { team1: 50, team2: 50 }
  
  let team1Prob = (expectedTeam1Wins / total) * 100
  
  // Adjust based on how close it is
  const margin = Math.abs(expectedTeam1Wins - expectedTeam2Wins)
  if (margin < 1) {
    // Very close - regress toward 50%
    team1Prob = team1Prob * 0.7 + 50 * 0.3
  }
  
  return {
    team1: Math.min(95, Math.max(5, team1Prob)),
    team2: Math.min(95, Math.max(5, 100 - team1Prob))
  }
}

// Load categories
async function loadCategories() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey) return
  
  try {
    const settings = await yahooService.getLeagueScoringSettings(leagueKey)
    if (settings?.stat_categories) {
      categories.value = settings.stat_categories
        .map((c: any) => ({
          stat_id: String(c.stat?.stat_id || c.stat_id),
          name: c.stat?.name || c.name,
          display_name: c.stat?.display_name || c.display_name,
          is_only_display_stat: c.stat?.is_only_display_stat || c.is_only_display_stat
        }))
        .filter((c: any) => c.stat_id && c.is_only_display_stat !== '1' && c.is_only_display_stat !== 1)
    }
  } catch (e) {
    console.error('Error loading categories:', e)
  }
}

// Load matchups for selected week
async function loadMatchups() {
  if (!selectedWeek.value) return
  
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey) return
  
  isLoading.value = true
  loadingMessage.value = 'Loading matchups...'
  
  try {
    if (categories.value.length === 0) {
      await loadCategories()
    }
    
    const week = parseInt(selectedWeek.value)
    const rawMatchups = await yahooService.getCategoryMatchups(leagueKey, week)
    
    // Calculate days remaining (simplified)
    const isCurrentWeek = week === currentWeek.value && !isSeasonComplete.value
    const daysRemaining = isCurrentWeek ? 3 : 0 // Assume mid-week or completed
    
    // Process matchups
    const processed: any[] = []
    
    for (const matchup of rawMatchups) {
      if (!matchup.teams || matchup.teams.length < 2) continue
      
      const team1 = matchup.teams[0]
      const team2 = matchup.teams[1]
      
      // Count category wins
      let team1CatWins = 0
      let team2CatWins = 0
      let ties = 0
      
      const categoryWinProbs: Record<string, { team1: number, team2: number }> = {}
      
      for (const sw of (matchup.stat_winners || [])) {
        const statId = String(sw.stat_id)
        
        if (sw.is_tied) {
          ties++
          categoryWinProbs[statId] = { team1: 50, team2: 50 }
        } else if (sw.winner_team_key === team1.team_key) {
          team1CatWins++
        } else {
          team2CatWins++
        }
        
        // Calculate win prob for this category
        const val1 = parseFloat(team1.stats?.[statId] || 0)
        const val2 = parseFloat(team2.stats?.[statId] || 0)
        categoryWinProbs[statId] = calculateCategoryWinProb(val1, val2, statId, daysRemaining)
      }
      
      // Calculate overall win probability
      const overallProb = calculateOverallWinProb(categoryWinProbs, categories.value.length)
      
      processed.push({
        matchup_id: processed.length + 1,
        team1: {
          team_key: team1.team_key,
          name: team1.name,
          logo_url: team1.logo_url,
          is_my_team: leagueStore.yahooTeams.find(t => t.team_key === team1.team_key)?.is_my_team || false
        },
        team2: {
          team_key: team2.team_key,
          name: team2.name,
          logo_url: team2.logo_url,
          is_my_team: leagueStore.yahooTeams.find(t => t.team_key === team2.team_key)?.is_my_team || false
        },
        team1Stats: team1.stats,
        team2Stats: team2.stats,
        team1CatWins,
        team2CatWins,
        ties,
        team1Leading: team1CatWins > team2CatWins,
        team2Leading: team2CatWins > team1CatWins,
        team1WinProb: overallProb.team1,
        team2WinProb: overallProb.team2,
        categoryWinProbs,
        stat_winners: matchup.stat_winners
      })
    }
    
    matchups.value = processed
    
    // Auto-select my matchup or first one
    const myMatchup = processed.find(m => m.team1.is_my_team || m.team2.is_my_team)
    if (myMatchup) {
      selectMatchup(myMatchup)
    } else if (processed.length > 0) {
      selectMatchup(processed[0])
    }
    
  } catch (e) {
    console.error('Error loading matchups:', e)
  } finally {
    isLoading.value = false
  }
}

function selectMatchup(matchup: any) {
  selectedMatchup.value = matchup
  nextTick(() => buildWinProbChart())
}

function buildWinProbChart() {
  if (!winProbChartEl.value || !selectedMatchup.value) return
  
  // Destroy existing chart
  if (winProbChart) {
    winProbChart.destroy()
    winProbChart = null
  }
  
  // Generate mock progression data (in real app, would track actual daily changes)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const team1Probs = [50, 48, 52, 55, 58, 60, selectedMatchup.value.team1WinProb]
  const team2Probs = team1Probs.map(p => 100 - p)
  
  winProbChart = new ApexCharts(winProbChartEl.value, {
    chart: {
      type: 'area',
      height: 192,
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    series: [
      { name: selectedMatchup.value.team1.name, data: team1Probs },
      { name: selectedMatchup.value.team2.name, data: team2Probs }
    ],
    colors: ['#10b981', '#f59e0b'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 100]
      }
    },
    stroke: { width: 2, curve: 'smooth' },
    xaxis: {
      categories: days,
      labels: { style: { colors: '#9ca3af', fontSize: '10px' } }
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: {
        style: { colors: '#9ca3af', fontSize: '10px' },
        formatter: (v: number) => `${v}%`
      }
    },
    legend: {
      show: true,
      position: 'top',
      labels: { colors: '#9ca3af' },
      fontSize: '11px'
    },
    grid: { borderColor: '#374151', strokeDashArray: 3 },
    tooltip: {
      theme: 'dark',
      y: { formatter: (v: number) => `${v.toFixed(0)}%` }
    }
  })
  
  winProbChart.render()
}

async function refreshData() {
  isRefreshing.value = true
  await loadMatchups()
  isRefreshing.value = false
}

// Initialize
watch(() => leagueStore.yahooTeams, async () => {
  if (leagueStore.yahooTeams.length > 0) {
    await loadCategories()
    
    const defaultWeek = isSeasonComplete.value ? totalWeeks.value : currentWeek.value
    if (defaultWeek >= 1) {
      selectedWeek.value = defaultWeek.toString()
      loadMatchups()
    }
  }
}, { immediate: true })

onMounted(async () => {
  if (authStore.user?.id) {
    await yahooService.initialize(authStore.user.id)
  }
})
</script>
