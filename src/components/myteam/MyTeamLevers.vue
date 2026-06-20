<script setup lang="ts">
import { computed } from 'vue'
import type { ThisWeekSnapshot } from '@/composables/useThisWeekMatchup'

// The hub triage: one card per action lever. My Team owns the season picture and
// roster; the week (lineup/streams) lives on Matchup, adds on The Wire, swaps on
// Trades. These three cards ROUTE there with a one-line teaser, instead of
// duplicating each page's content here.
const props = defineProps<{
  snapshot: ThisWeekSnapshot | null
  holeAdd: { name: string; statValue: number; label: string; isRatio: boolean } | null
  holeNote: string | null
}>()

const matchup = computed(() => {
  const s = props.snapshot
  if (!s) return null
  const verdict = s.completed
    ? 'final'
    : s.winPct >= 60
      ? 'favored'
      : s.winPct >= 45
        ? 'a tossup'
        : s.winPct >= 25
          ? 'an uphill week'
          : 'a likely loss'
  return {
    opponent: s.opponentName,
    winPct: Math.round(s.winPct),
    verdict,
    tone: s.winPct >= 50 ? 'up' : s.winPct >= 25 ? 'flat' : 'down',
    sub: s.completed ? 'final' : `${s.daysRemaining}d left`,
  }
})

const wireLine = computed(() =>
  props.holeAdd ? `Best add: ${props.holeAdd.name}` : props.holeNote || 'See available adds',
)
const toneClass = (t: string) => (t === 'up' ? 'text-primary' : t === 'down' ? 'text-[#f26d6d]' : 'text-[#F2B33A]')
</script>

<template>
  <section class="grid gap-3 sm:grid-cols-3">
    <!-- THIS WEEK → Matchup -->
    <router-link
      to="/matchup"
      class="group flex flex-col rounded-xl border border-dark-border bg-dark-card px-4 py-3 transition-colors hover:border-primary/50"
    >
      <span class="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">
        <span>This week</span><span class="opacity-0 transition-opacity group-hover:opacity-100">→</span>
      </span>
      <template v-if="matchup">
        <span class="mt-1 font-display text-2xl font-bold tabular-nums" :class="toneClass(matchup.tone)">{{ matchup.winPct }}%</span>
        <span class="font-mono text-[11px] text-dark-textSecondary">vs {{ matchup.opponent }} · {{ matchup.verdict }}</span>
        <span class="mt-auto pt-1 font-mono text-[9px] text-dark-textMuted">{{ matchup.sub }}</span>
      </template>
      <span v-else class="mt-1 font-mono text-[11px] text-dark-textMuted">See your live matchup →</span>
    </router-link>

    <!-- ADDS → The Wire -->
    <router-link
      to="/players"
      class="group flex flex-col rounded-xl border border-dark-border bg-dark-card px-4 py-3 transition-colors hover:border-primary/50"
    >
      <span class="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">
        <span>The Wire</span><span class="opacity-0 transition-opacity group-hover:opacity-100">→</span>
      </span>
      <span class="mt-1 font-display text-[15px] font-bold text-dark-text">{{ wireLine }}</span>
      <span class="mt-auto pt-1 font-mono text-[9px] text-dark-textMuted">waiver adds &amp; drops, ranked</span>
    </router-link>

    <!-- TRADES → Trades -->
    <router-link
      to="/trades"
      class="group flex flex-col rounded-xl border border-dark-border bg-dark-card px-4 py-3 transition-colors hover:border-primary/50"
    >
      <span class="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-dark-textMuted">
        <span>Trades</span><span class="opacity-0 transition-opacity group-hover:opacity-100">→</span>
      </span>
      <span class="mt-1 font-display text-[15px] font-bold text-dark-text">Shop trade ideas</span>
      <span class="mt-auto pt-1 font-mono text-[9px] text-dark-textMuted">deals that move your standings</span>
    </router-link>
  </section>
</template>
