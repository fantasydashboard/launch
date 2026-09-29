<script setup lang="ts">
/**
 * Two ticks: how hard the rest of the season is, and how hard the next four games are.
 *
 * WHY TICKS AND NOT NUMBERS. The head-to-head row already carries a headshot, a club crest, a
 * name, a positional rank, an overall rank, a dynasty rank, an age and a value. Two more
 * figures would have made it nine things, and the row's job is to be scanned down a column
 * rather than read. Difficulty is ordinal and only ever acted on coarsely — you want to know
 * whether a man's run is kind or brutal, not that he is 14th rather than 16th — so it survives
 * being shown as colour far better than a rank does.
 *
 * The exact 1-32 ranks are on the tooltip, because "roughly" is the right resolution for the
 * glance and the wrong one for an argument about a trade.
 *
 * COLOUR IS NOT THE ONLY CHANNEL. The ticks also grow: an easy schedule is a short bar and a
 * hard one is a tall one, so the pair still reads for anyone who cannot separate the hues.
 */
import { computed } from 'vue'

const props = defineProps<{
  /** 1 = the easiest remaining run of defences in the league, 32 = the hardest. Null if unknown. */
  ros: number | null
  next4: number | null
  /** The position these ranks were computed at, for the tooltip. */
  position?: string
}>()

/* Bands rather than a gradient: five steps is all the precision the eye gets from a 4px bar,
   and it keeps "kind" and "brutal" clearly apart instead of shading smoothly between them. */
function tone(rank: number | null): string {
  if (rank == null) return 'bg-dark-border'
  if (rank <= 6) return 'bg-[#7ee787]'
  if (rank <= 13) return 'bg-[#7ee787]/55'
  if (rank <= 19) return 'bg-dark-textMuted/60'
  if (rank <= 26) return 'bg-[#e69a4a]/80'
  return 'bg-[#FF5C5C]'
}

/** Taller means harder, so the pair reads without relying on hue alone. */
function height(rank: number | null): string {
  if (rank == null) return '4px'
  return `${4 + Math.round(((rank - 1) / 31) * 7)}px`
}

const label = computed(() => {
  const at = props.position ? ` at ${props.position}` : ''
  if (props.ros == null && props.next4 == null) return 'No schedule data for this club'
  const r = props.ros == null ? '—' : `${props.ros} of 32`
  const n = props.next4 == null ? '—' : `${props.next4} of 32`
  return `Schedule${at}: rest of season ${r}, next four ${n}. 1 is the easiest run of defences in the league, 32 the hardest.`
})
</script>

<template>
  <span class="flex h-4 shrink-0 items-end gap-[2px]" :title="label" :aria-label="label">
    <span class="w-[3px] rounded-sm" :class="tone(ros)" :style="{ height: height(ros) }" />
    <span class="w-[3px] rounded-sm" :class="tone(next4)" :style="{ height: height(next4) }" />
  </span>
</template>
