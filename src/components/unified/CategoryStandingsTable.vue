<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-dark-border/50">
          <th class="text-left py-3 px-2 text-dark-textMuted font-medium sticky left-0 bg-dark-card z-10">#</th>
          <th class="text-left py-3 px-2 text-dark-textMuted font-medium sticky left-8 bg-dark-card z-10 min-w-[120px]">Team</th>
          <!-- Category columns -->
          <th 
            v-for="cat in categories" 
            :key="cat.stat_id"
            class="text-center py-3 px-2 text-dark-textMuted font-medium whitespace-nowrap"
            :title="cat.display_name || cat.name"
          >
            {{ cat.abbrev || cat.name?.substring(0, 3) || cat.stat_id }}
          </th>
          <!-- Totals -->
          <th class="text-center py-3 px-2 text-dark-textMuted font-medium border-l border-dark-border/30">Total</th>
          <th class="text-center py-3 px-2 text-dark-textMuted font-medium">Win%</th>
        </tr>
      </thead>
      <tbody>
        <tr 
          v-for="(entry, index) in sortedStandings" 
          :key="entry.team.teamId"
          class="border-b border-dark-border/20 hover:bg-dark-border/10 transition-colors"
          :class="{
            'bg-primary/5': isMyTeam(entry.team.teamId),
            'bg-green-500/5': isPlayoffTeam(index),
          }"
        >
          <!-- Rank -->
          <td class="py-3 px-2 sticky left-0 bg-dark-card">
            <div class="flex items-center gap-1">
              <span 
                class="font-semibold"
                :class="getRankClass(index)"
              >
                {{ index + 1 }}
              </span>
              <span v-if="isPlayoffTeam(index)" class="text-green-400 text-xs">●</span>
            </div>
          </td>

          <!-- Team -->
          <td class="py-3 px-2 sticky left-8 bg-dark-card">
            <div class="flex items-center gap-2">
              <div class="relative">
                <img 
                  v-if="entry.team.avatar"
                  :src="entry.team.avatar" 
                  :alt="entry.team.name"
                  class="w-6 h-6 rounded-full"
                />
                <div 
                  v-else
                  class="w-6 h-6 rounded-full bg-dark-border flex items-center justify-center text-xs font-bold text-dark-textMuted"
                >
                  {{ entry.team.name.substring(0, 2).toUpperCase() }}
                </div>
              </div>
              <div class="min-w-0">
                <div 
                  class="font-medium truncate text-sm"
                  :class="isMyTeam(entry.team.teamId) ? 'text-primary' : 'text-dark-text'"
                  :title="entry.team.name"
                >
                  {{ truncateName(entry.team.name) }}
                </div>
              </div>
            </div>
          </td>

          <!-- Per-category wins -->
          <td 
            v-for="cat in categories" 
            :key="cat.stat_id"
            class="py-3 px-2 text-center"
          >
            <span 
              class="font-medium text-sm px-2 py-0.5 rounded"
              :class="getCategoryClass(entry.perCategoryWins?.[cat.stat_id] || 0, cat.stat_id)"
            >
              {{ entry.perCategoryWins?.[cat.stat_id] || 0 }}
            </span>
          </td>

          <!-- Total W-L -->
          <td class="py-3 px-2 text-center border-l border-dark-border/30">
            <span class="font-semibold text-dark-text">
              {{ entry.categoryWins || 0 }}-{{ entry.categoryLosses || 0 }}
            </span>
          </td>

          <!-- Win % -->
          <td class="py-3 px-2 text-center">
            <span 
              class="text-xs font-medium px-2 py-1 rounded"
              :class="getWinPctClass(getCatWinPct(entry))"
            >
              {{ (getCatWinPct(entry) * 100).toFixed(0) }}%
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Legend -->
    <div class="flex items-center gap-4 mt-4 text-xs text-dark-textMuted">
      <div class="flex items-center gap-1">
        <span class="text-green-400">●</span>
        <span>Playoff Position (Top {{ playoffTeams }})</span>
      </div>
      <div class="flex items-center gap-1">
        <span class="w-3 h-3 bg-primary/30 rounded"></span>
        <span>Your Team</span>
      </div>
      <div class="text-dark-textMuted/60 ml-auto">
        * Standings calculated from season-to-date category performance
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Category {
  stat_id: string
  name: string
  abbrev?: string
  display_name?: string
}

interface StandingsEntry {
  team: {
    teamId: string
    name: string
    avatar?: string
    owner?: string
  }
  categoryWins?: number
  categoryLosses?: number
  perCategoryWins?: Record<string, number>
  perCategoryLosses?: Record<string, number>
}

const props = defineProps<{
  standings: StandingsEntry[]
  categories: Category[]
  myTeamId?: string
  playoffTeams?: number
}>()

// Computed: sort standings by total category differential
const sortedStandings = computed(() => {
  return [...props.standings].sort((a, b) => {
    const aDiff = (a.categoryWins || 0) - (a.categoryLosses || 0)
    const bDiff = (b.categoryWins || 0) - (b.categoryLosses || 0)
    return bDiff - aDiff
  })
})

// Compute max wins per category for highlighting
const maxWinsPerCategory = computed(() => {
  const maxes: Record<string, number> = {}
  for (const cat of props.categories) {
    let max = 0
    for (const entry of props.standings) {
      const wins = entry.perCategoryWins?.[cat.stat_id] || 0
      if (wins > max) max = wins
    }
    maxes[cat.stat_id] = max
  }
  return maxes
})

// Defaults
const playoffTeamCount = computed(() => props.playoffTeams || 6)

// Methods
function isMyTeam(teamId: string): boolean {
  return props.myTeamId === teamId
}

function isPlayoffTeam(index: number): boolean {
  return index < playoffTeamCount.value
}

function getRankClass(index: number): string {
  if (index === 0) return 'text-yellow-400' // Gold for 1st
  if (index === 1) return 'text-gray-300' // Silver for 2nd
  if (index === 2) return 'text-amber-600' // Bronze for 3rd
  return 'text-dark-textMuted'
}

function getCatWinPct(entry: StandingsEntry): number {
  const total = (entry.categoryWins || 0) + (entry.categoryLosses || 0)
  if (total === 0) return 0
  return (entry.categoryWins || 0) / total
}

function getWinPctClass(pct: number): string {
  if (pct >= 0.6) return 'bg-green-500/20 text-green-400'
  if (pct >= 0.5) return 'bg-blue-500/20 text-blue-400'
  if (pct >= 0.4) return 'bg-yellow-500/20 text-yellow-400'
  return 'bg-red-500/20 text-red-400'
}

function getCategoryClass(wins: number, statId: string): string {
  const max = maxWinsPerCategory.value[statId] || 0
  if (max === 0) return 'text-dark-textMuted'
  if (wins === max) return 'bg-green-500/20 text-green-400' // Leader in this category
  if (wins >= max * 0.8) return 'text-green-400/80'
  if (wins >= max * 0.5) return 'text-dark-text'
  return 'text-dark-textMuted'
}

function truncateName(name: string): string {
  if (name.length <= 15) return name
  return name.substring(0, 14) + '…'
}
</script>
