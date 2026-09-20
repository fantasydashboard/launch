<script setup lang="ts">
/**
 * Tonight's lineup, in the shape football's weekly board already uses.
 *
 * WHAT IS DIFFERENT FROM FOOTBALL, AND WHY IT HAS TO BE. Football ranks a roster once a week
 * and every starter has a game. In a daily sport the roster is the same and the SLATE is not,
 * so the loudest thing on this page is not who is best — it is which of your seats is filled
 * by somebody who is not playing tonight. That is points forfeited outright, it is the most
 * common way to lose a night, and no native app says a word about it.
 *
 * So the order is: dead seats first, then the lineup, then the swap that fixes it, then the
 * bench. A manager who reads only the first block has still got the value.
 */
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { teamLogoFor } from '@/players/teamLogo'
import type { DailyRow } from '@/composables/useDailyLineup'

const props = defineProps<{
  lineup: DailyRow[]
  bench: DailyRow[]
  deadSeats: DailyRow[]
  upgrades: { sit: DailyRow; start: DailyRow; gain: number }[]
}>()

const leagueStore = useLeagueStore()
const logo = (abbr?: string) => teamLogoFor(leagueStore.activeSport, abbr)
const round = (n: number) => Math.round(n)
const one = (n: number) => n.toFixed(1)
function onLogoErr(e: Event) { (e.target as HTMLImageElement).style.display = 'none' }

const tonightTotal = computed(() => props.lineup.reduce((s, r) => s + r.today, 0))

/* A benched player is sat for one of three reasons and they are not equally interesting. No
   game is a fact about the schedule, injured is a fact about him, outscored is our opinion —
   and only the last is a judgement a manager might want to overrule. */
const BENCH_LABEL: Record<string, string> = {
  'no-game': 'no game', injured: 'injured', outscored: 'outscored',
}
</script>

<template>
  <!--
    DEAD SEATS FIRST. A started player with no game tonight is the single most expensive thing
    on this page and the one a native lineup screen will never tell you.
  -->
  <section v-if="deadSeats.length"
           class="mb-5 rounded-xl border border-[#FF5C5C]/40 bg-[#FF5C5C]/5 p-4">
    <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-[#FF5C5C]">
      {{ deadSeats.length }} {{ deadSeats.length === 1 ? 'seat' : 'seats' }} with no game tonight
    </h2>
    <p class="mb-3 font-mono text-[11px] text-dark-textMuted">
      these are points you forfeit outright &mdash; a body with a game scores more than a star without one
    </p>
    <div v-for="r in deadSeats" :key="'dead-' + r.playerKey"
         class="flex items-center gap-3 border-b border-dark-border/30 py-1.5 last:border-0">
      <span class="w-10 shrink-0 font-mono text-[10px] uppercase text-dark-textMuted">{{ r.slot }}</span>
      <span class="min-w-0 flex-1 truncate text-sm text-dark-text">{{ r.name }}</span>
      <span class="font-mono text-[10px] text-dark-textMuted">{{ r.position }} &middot; {{ r.team }}</span>
    </div>
  </section>

  <!-- THE SWAP THAT FIXES IT. A recommendation with the number it is worth attached. -->
  <section v-if="upgrades.length" class="mb-5 rounded-xl border border-primary/40 bg-dark-bg/40 p-4">
    <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
      Moves to make
      <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">
        &middot; a bench body who outscores a starter tonight
      </span>
    </h2>
    <div v-for="(u, i) in upgrades.slice(0, 5)" :key="'up-' + i"
         class="flex items-center gap-2 border-b border-dark-border/40 py-2 text-sm last:border-0">
      <span class="w-10 shrink-0 font-mono text-[10px] uppercase text-dark-textMuted">{{ u.sit.slot }}</span>
      <span class="min-w-0 flex-1">
        <span class="text-dark-text">start <b class="font-semibold">{{ u.start.name }}</b></span>
        <span class="text-dark-textMuted"> over {{ u.sit.name }}</span>
        <span v-if="!u.sit.playsToday" class="ml-1 font-mono text-[10px] text-[#FF5C5C]">(no game)</span>
      </span>
      <span class="shrink-0 font-mono text-sm font-semibold text-primary">+{{ one(u.gain) }}</span>
    </div>
  </section>

  <!-- TONIGHT'S LINEUP -->
  <section class="mb-5 rounded-xl border border-dark-border bg-dark-bg/40 p-4">
    <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
      Best lineup tonight
      <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">
        &middot; {{ one(tonightTotal) }} projected &middot; per-game rate on a night he plays
      </span>
    </h2>
    <p v-if="!lineup.length" class="py-4 text-center font-mono text-xs text-dark-textMuted">
      No lineup slots to fill — the league published none.
    </p>
    <div v-for="r in lineup" :key="'ln-' + r.playerKey"
         class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
      <span class="w-10 shrink-0 font-mono text-[10px] uppercase text-dark-textMuted">{{ r.slot }}</span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-semibold"
              :class="r.playsToday ? 'text-dark-text' : 'text-dark-textMuted/50'">{{ r.name }}</span>
        <span class="flex items-center gap-1 text-xs text-dark-textMuted">
          {{ r.position }}
          <template v-if="r.team">
            &middot; <img :src="logo(r.team)" alt="" @error="onLogoErr" class="h-3 w-3 object-contain" />{{ r.team }}
          </template>
          <span v-if="!r.playsToday" class="text-[#FF5C5C]">&middot; no game</span>
        </span>
      </span>
      <span class="w-16 shrink-0 text-right font-mono text-sm"
            :class="r.playsToday ? 'text-dark-text' : 'text-dark-textMuted/40'">{{ one(r.today) }}</span>
    </div>
  </section>

  <!-- BENCH, with the reason each man is on it. -->
  <section v-if="bench.length" class="rounded-xl border border-dark-border bg-dark-bg/40 p-4">
    <h2 class="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
      Bench
      <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">
        &middot; {{ bench.filter((b) => b.playsToday).length }} of {{ bench.length }} have a game
      </span>
    </h2>
    <div v-for="r in bench" :key="'bn-' + r.playerKey"
         class="flex items-center gap-3 border-b border-dark-border/30 py-1.5 text-sm last:border-0">
      <span class="min-w-0 flex-1 truncate"
            :class="r.playsToday ? 'text-dark-text' : 'text-dark-textMuted/50'">{{ r.name }}</span>
      <span class="font-mono text-[10px] text-dark-textMuted/70">{{ r.position }} &middot; {{ r.team }}</span>
      <span class="w-20 shrink-0 text-right font-mono text-[10px]"
            :class="r.benchReason === 'no-game' ? 'text-dark-textMuted/40' : 'text-dark-textMuted'">
        {{ BENCH_LABEL[r.benchReason ?? ''] ?? '' }}
      </span>
      <span class="w-12 shrink-0 text-right font-mono text-xs"
            :class="r.playsToday ? 'text-dark-textMuted' : 'text-dark-textMuted/30'">{{ one(r.today) }}</span>
    </div>
  </section>
</template>
