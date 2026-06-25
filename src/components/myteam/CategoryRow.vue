<script setup lang="ts">
import { computed } from 'vue'
import { rankLabel } from '@/recommendations/ordinal'

interface CatAdd { name: string; label: string }
interface Row {
  statId: string
  label: string
  rank: number
  numTeams: number
  volume: boolean
  fillPct: number
  add: CatAdd | null
}
const props = defineProps<{ row: Row; draggers?: string[] }>()

const strengthOf = (rank: number, n: number): 'strong' | 'weak' | 'mid' => {
  if (rank <= Math.ceil(n / 3)) return 'strong'
  if (rank > (n * 2) / 3) return 'weak'
  return 'mid'
}
// Bar colour scales INTENSITY with rank (1st brighter than 4th) so the list isn't a flat wall
// of identical green. Volume cats stay neutral (won by playing time, not a real edge).
const barStyle = computed(() => {
  const { rank, numTeams: n, volume } = props.row
  if (volume) return { backgroundColor: 'rgba(148,163,184,0.28)' }
  const frac = n > 1 ? (n - rank) / (n - 1) : 1 // 1 = best
  const s = strengthOf(rank, n)
  if (s === 'strong') return { backgroundColor: `rgba(163,230,53,${(0.5 + frac * 0.5).toFixed(3)})` }
  if (s === 'weak') return { backgroundColor: `rgba(242,109,109,${(0.45 + (1 - frac) * 0.5).toFixed(3)})` }
  return { backgroundColor: 'rgba(148,163,184,0.45)' }
})
const rankTextClass = computed(() => {
  const { rank, numTeams, volume } = props.row
  if (volume) return 'text-dark-textMuted'
  const s = strengthOf(rank, numTeams)
  return s === 'strong' ? 'text-primary' : s === 'weak' ? 'text-[#f26d6d]' : 'text-dark-text'
})
const showDraggers = computed(
  () => !props.row.volume && strengthOf(props.row.rank, props.row.numTeams) !== 'strong' && (props.draggers?.length ?? 0) > 0,
)
</script>

<template>
  <div class="px-4 py-1.5" :class="row.volume ? 'opacity-55' : ''">
    <div class="flex items-center gap-3">
      <span class="w-10 shrink-0 truncate font-mono text-xs text-dark-textSecondary">{{ row.label }}</span>
      <!-- Standing bar: longer + brighter = better -->
      <div class="relative h-2 flex-1 overflow-hidden rounded-full bg-dark-border/50">
        <div class="absolute inset-y-0 left-0 rounded-full" :style="[barStyle, { width: `${row.fillPct}%` }]" />
      </div>
      <span class="w-16 shrink-0 text-right font-mono tabular-nums">
        <span class="text-[13px] font-bold" :class="rankTextClass">{{ rankLabel(row.rank) }}</span>
        <span class="text-[9px] text-dark-textMuted"> / {{ row.numTeams }}</span>
      </span>
    </div>

    <!-- Top available add (the "do this next" chip) -->
    <p v-if="row.add" class="mt-1 pl-[3.25rem]">
      <span class="inline-flex items-center gap-1 rounded bg-dark-border/60 px-1.5 py-0.5 font-mono text-[10px] text-dark-textMuted">
        <span class="text-dark-textMuted/70">add</span>
        <span class="text-dark-text">{{ row.add.name }}</span>
        <span class="text-primary">· {{ row.add.label }}</span>
      </span>
    </p>
    <p v-if="showDraggers" class="mt-0.5 pl-[3.25rem] font-mono text-[10px] text-dark-textMuted/80">
      dragged by {{ draggers!.join(' · ') }}
    </p>
  </div>
</template>
