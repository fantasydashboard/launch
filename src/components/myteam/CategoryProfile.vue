<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  categories: { statId: string; name: string; label: string }[]
  teamCategories: { statId: string; rank: number }[]
  numTeams: number
}>()

interface CategoryRow {
  statId: string
  label: string
  rank: number
  fillPct: number
  tier: 'top' | 'mid' | 'bottom'
}

const rows = computed<CategoryRow[]>(() => {
  const result: CategoryRow[] = []

  for (const cat of props.categories) {
    const teamCat = props.teamCategories.find((tc) => tc.statId === cat.statId)
    if (!teamCat) continue

    const rank = teamCat.rank
    const n = props.numTeams

    // Fill: rank 1 = 100%, rank n = 1/n (always at least a sliver)
    const fillPct = n > 0 ? ((n - rank + 1) / n) * 100 : 0

    // Tier thresholds
    let tier: 'top' | 'mid' | 'bottom'
    if (rank <= n / 3) {
      tier = 'top'
    } else if (rank <= (n * 2) / 3) {
      tier = 'mid'
    } else {
      tier = 'bottom'
    }

    result.push({ statId: cat.statId, label: cat.label, rank, fillPct, tier })
  }

  // Worst rank first (highest rank number = worst position at top)
  result.sort((a, b) => b.rank - a.rank)

  return result
})

const fillColor: Record<'top' | 'mid' | 'bottom', string> = {
  top: 'bg-primary',
  mid: 'bg-warn',
  bottom: 'bg-alert',
}
</script>

<template>
  <div class="rounded-xl bg-dark-card border border-dark-border overflow-hidden">
    <div
      v-for="row in rows"
      :key="row.statId"
      class="flex items-center gap-3 px-4 py-2 border-b border-dark-border/40 last:border-b-0"
    >
      <!-- Category label: fixed-width mono column -->
      <span class="w-10 shrink-0 text-xs font-mono text-dark-textSecondary truncate">
        {{ row.label }}
      </span>

      <!-- Bar track -->
      <div class="flex-1 h-2 rounded-full bg-dark-border overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300"
          :class="fillColor[row.tier]"
          :style="{ width: `${row.fillPct}%` }"
        />
      </div>

      <!-- Rank: right-aligned mono tabular -->
      <span class="w-6 shrink-0 text-right text-xs font-mono tabular-nums text-dark-textMuted">
        {{ row.rank }}
      </span>
    </div>

    <p v-if="rows.length === 0" class="px-4 py-6 text-sm text-dark-textMuted">
      No category data available.
    </p>
  </div>
</template>
