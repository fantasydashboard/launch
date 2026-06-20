<script setup lang="ts">
import { computed } from 'vue'

// The playoff race: where you sit vs the cutline, how clear / how far back, and
// how much time is left. The season-long "are you in" picture no other page owns
// (Matchup shows only a one-line stakes read for the current week).
const props = defineProps<{
  rank: number
  leagueSize: number
  playoffSpots: number
  weeksLeft: number // 0 when unknown
  marginToCut: number // + = cat-wins clear of the bubble; - = back of the cut
  estimateSpots: boolean // true when we fell back to a half-league guess
}>()

const ord = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const status = computed(() => {
  const deficit = props.rank - props.playoffSpots // >0 = outside the cut
  const w = props.weeksLeft
  if (deficit <= 0) {
    return w > 0 && -deficit >= w + 2
      ? { label: 'Locked in', tone: 'up' as const }
      : { label: 'In the field', tone: 'up' as const }
  }
  if (deficit <= 2 || (w > 0 && deficit <= w)) return { label: 'On the bubble', tone: 'flat' as const }
  return { label: 'Out of reach', tone: 'down' as const }
})

const toneText = computed(() =>
  status.value.tone === 'up' ? 'text-primary' : status.value.tone === 'down' ? 'text-[#f26d6d]' : 'text-[#F2B33A]',
)
const marginLine = computed(() => {
  const m = props.marginToCut
  if (m > 0) return `${m} cat-win${m === 1 ? '' : 's'} clear of the cut`
  if (m < 0) return `${-m} cat-win${-m === 1 ? '' : 's'} back of the cut`
  return 'level with the cutline'
})
</script>

<template>
  <section class="rounded-xl border border-dark-border bg-dark-card px-4 py-3">
    <p class="font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">Playoff race</p>
    <div class="mt-1 flex items-baseline gap-3">
      <span class="font-display text-3xl font-bold tabular-nums" :class="toneText">{{ ord(rank) }}</span>
      <span class="font-mono text-[11px] text-dark-textMuted">of {{ leagueSize }}</span>
      <span class="rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide" :class="[toneText, status.tone === 'up' ? 'bg-primary/10' : status.tone === 'down' ? 'bg-[#f26d6d]/10' : 'bg-[#F2B33A]/10']">
        {{ status.label }}
      </span>
    </div>
    <p class="mt-1 font-mono text-[11px] text-dark-textSecondary">
      {{ marginLine }}
    </p>
    <p class="mt-0.5 font-mono text-[10px] text-dark-textMuted">
      Top {{ playoffSpots }}<span v-if="estimateSpots"> (est.)</span> make the playoffs<span v-if="weeksLeft > 0"> · {{ weeksLeft }} week{{ weeksLeft === 1 ? '' : 's' }} left</span>
    </p>
  </section>
</template>
