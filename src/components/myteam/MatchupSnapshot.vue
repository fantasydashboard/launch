<script setup lang="ts">
import type { ThisWeekSnapshot } from '@/composables/useThisWeekMatchup'
const props = defineProps<{ snapshot: ThisWeekSnapshot | null }>()
const byStatus = (s: 'safe' | 'tossup' | 'loss') =>
  (props.snapshot?.categories ?? []).filter((c) => c.status === s)
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
      <div v-if="byStatus('tossup').length" class="flex flex-wrap items-center gap-1">
        <span class="font-mono uppercase tracking-wider text-[#F2B33A]">coin-flips</span>
        <span
          v-for="c in byStatus('tossup')"
          :key="c.statId"
          class="rounded px-1.5 py-0.5 font-mono text-[#F2B33A] bg-[#F2B33A]/10"
          >{{ c.label }}</span
        >
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
  </router-link>
</template>
