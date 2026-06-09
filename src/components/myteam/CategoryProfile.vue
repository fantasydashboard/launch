<script setup lang="ts">
import { computed } from 'vue'
import type { CategoryGap } from '@/myteam/types'
import { ordinal } from '@/recommendations/ordinal'

const props = defineProps<{
  gaps: CategoryGap[]
  categories: { statId: string; label: string }[]
}>()

interface ProfileRow {
  statId: string
  label: string
  rank: number
  numTeams: number
  tier: CategoryGap['tier']
  leftPct: number
  gapUp: number | null
}

// Lower tier index = higher in the list. Winnable first (actionable), then lost,
// then safe, then strong.
const TIER_ORDER: Record<CategoryGap['tier'], number> = {
  winnable: 0,
  lost: 1,
  safe: 2,
  strong: 3,
}

const MARKER_COLOR: Record<CategoryGap['tier'], string> = {
  strong: 'bg-primary',
  winnable: 'bg-[#F2B33A]',
  safe: 'bg-dark-textMuted',
  lost: 'bg-[#FF5C5C]',
}

const rows = computed<ProfileRow[]>(() => {
  const labelFor = new Map(props.categories.map((c) => [c.statId, c.label]))

  const result: ProfileRow[] = props.gaps.map((gap) => {
    // left = best (1st) at 0%, worst (Nth) at 100%.
    const leftPct =
      gap.numTeams > 1 ? ((gap.rank - 1) / (gap.numTeams - 1)) * 100 : 0
    return {
      statId: gap.statId,
      label: labelFor.get(gap.statId) || gap.statId,
      rank: gap.rank,
      numTeams: gap.numTeams,
      tier: gap.tier,
      leftPct,
      gapUp: gap.gapUp,
    }
  })

  result.sort((a, b) => {
    const t = TIER_ORDER[a.tier] - TIER_ORDER[b.tier]
    if (t !== 0) return t
    return a.rank - b.rank
  })

  return result
})

function gapNote(row: ProfileRow): string {
  if (row.tier === 'winnable' && row.gapUp != null) {
    if (row.gapUp === 0) return `tied with ${ordinal(row.rank - 1)}`
    return `${row.gapUp} from ${ordinal(row.rank - 1)}`
  }
  if (row.tier === 'lost') return 'punt?'
  return ''
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

      <!-- Position track: best (1st) left -> worst (Nth) right, marker at my rank -->
      <div class="relative flex-1 h-2 rounded-full bg-dark-border">
        <div
          class="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-dark-card"
          :class="MARKER_COLOR[row.tier]"
          :style="{ left: `${row.leftPct}%` }"
        />
      </div>

      <!-- Rank + terse gap note -->
      <span class="w-6 shrink-0 text-right text-xs font-mono tabular-nums text-dark-text">
        {{ row.rank }}
      </span>
      <span
        v-if="gapNote(row)"
        class="w-24 shrink-0 text-right text-[11px] font-mono"
        :class="row.tier === 'winnable' ? 'text-[#F2B33A]' : 'text-[#FF5C5C]/70'"
      >
        {{ gapNote(row) }}
      </span>
      <span v-else class="w-24 shrink-0" />
    </div>

    <p v-if="rows.length === 0" class="px-4 py-6 text-sm text-dark-textMuted">
      No category data available.
    </p>

    <!-- Legend -->
    <p
      v-if="rows.length > 0"
      class="px-4 py-2 text-[11px] font-mono text-dark-textMuted border-t border-dark-border/40"
    >
      <span class="text-primary">lime</span> strong ·
      <span class="text-[#F2B33A]">amber</span> winnable ·
      <span class="text-[#FF5C5C]">red</span> lost
    </p>
  </div>
</template>
