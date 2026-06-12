<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ThisWeekSnapshot } from '@/composables/useThisWeekMatchup'
const props = defineProps<{ snapshot: ThisWeekSnapshot | null }>()
// Opponent logo with monogram fallback (fantasy logos are often missing/broken).
const oppLogoFailed = ref(false)
const byStatus = (s: 'safe' | 'tossup' | 'loss') =>
  (props.snapshot?.categories ?? []).filter((c) => c.status === s)

// Coin-flips are where the matchup is won — the one line we never truncate. Show
// them all, ordered closest-to-50 first so the tightest swings read first. When the
// matchup is wide open (many tossups), dim everything past the closest few so the eye
// still lands on the genuine swing cats without hiding any.
const TOSSUP_EMPHASIS = 6
const tossupsShown = computed(() =>
  byStatus('tossup').slice().sort((a, b) => Math.abs(a.myWinPct - 50) - Math.abs(b.myWinPct - 50)),
)
</script>
<template>
  <router-link
    v-if="snapshot"
    to="/matchup"
    class="block rounded-xl bg-dark-card border border-dark-border px-4 py-3 hover:border-primary/50 transition-colors"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="flex min-w-0 items-center gap-2 text-xs font-display font-semibold uppercase tracking-wide text-dark-textMuted">
        <span class="shrink-0 normal-case">This Week · vs</span>
        <img
          v-if="snapshot.oppAvatar && !oppLogoFailed"
          :src="snapshot.oppAvatar"
          :alt="snapshot.opponentName"
          @error="oppLogoFailed = true"
          class="h-5 w-5 shrink-0 rounded bg-dark-border object-cover"
        />
        <span
          v-else
          aria-hidden="true"
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-dark-border text-[10px] font-bold text-dark-textSecondary"
          >{{ snapshot.opponentName.charAt(0) }}</span
        >
        <span class="truncate">{{ snapshot.opponentName }}</span>
      </span>
      <span class="shrink-0 font-mono text-xs text-dark-textMuted">{{ snapshot.completed ? 'Final' : snapshot.daysRemaining + 'd left' }} →</span>
    </div>
    <div class="mt-1 flex items-baseline gap-2">
      <span
        class="font-display text-3xl font-bold tabular-nums"
        :class="snapshot.winPct >= 50 ? 'text-primary' : 'text-dark-text'"
        >{{ snapshot.winPct }}%</span
      >
      <span class="font-mono text-[11px] uppercase tracking-wider text-dark-textMuted">to win</span>
    </div>
    <!-- A category matchup can win, TIE, or lose; a tie isn't a loss, so show all three. -->
    <div class="mt-0.5 font-mono text-xs text-dark-textSecondary">
      <span class="text-dark-textMuted">{{ snapshot.tiePct }}% tie</span>
      <span class="text-dark-textMuted"> · </span>
      <span class="text-[#FF5C5C]">{{ snapshot.lossPct }}% loss</span>
      <span class="text-dark-textMuted"> · projected {{ snapshot.projWins }}-{{ snapshot.projLosses }}</span>
    </div>
    <div class="mt-2 space-y-1 text-xs">
      <div v-if="tossupsShown.length" class="flex flex-wrap items-center gap-1">
        <span class="font-mono uppercase tracking-wider text-[#F2B33A]">coin-flips</span>
        <span
          v-for="(c, i) in tossupsShown"
          :key="c.statId"
          class="rounded px-1.5 py-0.5 font-mono text-[#F2B33A] bg-[#F2B33A]/10 transition-opacity"
          :class="{ 'opacity-45': i >= TOSSUP_EMPHASIS }"
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
