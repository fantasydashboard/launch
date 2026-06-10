<script setup lang="ts">
import { computed } from 'vue'
import type { ThisWeekSnapshot } from '@/composables/useThisWeekMatchup'
const props = defineProps<{ snapshot: ThisWeekSnapshot | null }>()
const byStatus = (s: 'safe' | 'tossup' | 'loss') =>
  (props.snapshot?.categories ?? []).filter((c) => c.status === s)

// Coin-flips are the decision content, but with many categories early in the
// week almost everything sits near 50%. Show only the genuinely-closest ones
// (nearest to a 50/50) so the band points at the few swing categories.
const MAX_TOSSUPS = 4
const tossupsSorted = computed(() =>
  byStatus('tossup').slice().sort((a, b) => Math.abs(a.myWinPct - 50) - Math.abs(b.myWinPct - 50)),
)
const tossupsShown = computed(() => tossupsSorted.value.slice(0, MAX_TOSSUPS))
const tossupsExtra = computed(() => Math.max(0, tossupsSorted.value.length - MAX_TOSSUPS))
</script>
<template>
  <router-link
    v-if="snapshot"
    to="/matchup"
    class="block rounded-xl bg-dark-card border border-dark-border px-4 py-3 hover:border-primary/50 transition-colors"
  >
    <div class="flex items-center justify-between">
      <span class="text-xs font-display font-semibold uppercase tracking-wide text-dark-textMuted">
        This Week · vs {{ snapshot.opponentName }}
      </span>
      <span class="font-mono text-xs text-dark-textMuted">{{ snapshot.completed ? 'Final' : snapshot.daysRemaining + 'd left' }} →</span>
    </div>
    <div class="mt-1 flex items-baseline gap-3">
      <span
        class="font-display text-3xl font-bold tabular-nums"
        :class="snapshot.myWinPct >= 50 ? 'text-primary' : 'text-dark-text'"
        >{{ snapshot.myWinPct }}%</span
      >
      <span class="font-mono text-sm text-dark-textSecondary">projected {{ snapshot.projWins }}-{{ snapshot.projLosses }}</span>
    </div>
    <div class="mt-2 space-y-1 text-xs">
      <div v-if="tossupsShown.length" class="flex flex-wrap items-center gap-1">
        <span class="font-mono uppercase tracking-wider text-[#F2B33A]">coin-flips</span>
        <span
          v-for="c in tossupsShown"
          :key="c.statId"
          class="rounded px-1.5 py-0.5 font-mono text-[#F2B33A] bg-[#F2B33A]/10"
          >{{ c.label }}</span
        >
        <span v-if="tossupsExtra" class="font-mono text-[#F2B33A]/70">+{{ tossupsExtra }} more</span>
      </div>
      <div v-if="byStatus('safe').length" class="flex flex-wrap items-center gap-1">
        <span class="font-mono uppercase tracking-wider text-primary">safe</span>
        <span
          v-for="c in byStatus('safe')"
          :key="c.statId"
          class="rounded px-1.5 py-0.5 font-mono text-primary bg-primary/10"
          >{{ c.label }}</span
        >
      </div>
      <div v-if="byStatus('loss').length" class="flex flex-wrap items-center gap-1">
        <span class="font-mono uppercase tracking-wider text-[#FF5C5C]">likely loss</span>
        <span
          v-for="c in byStatus('loss')"
          :key="c.statId"
          class="rounded px-1.5 py-0.5 font-mono text-[#FF5C5C] bg-[#FF5C5C]/10"
          >{{ c.label }}</span
        >
      </div>
    </div>
    <p class="mt-2 font-mono text-[10px] text-dark-textMuted">
      this week's matchup odds · season ranks below
    </p>
  </router-link>
</template>
