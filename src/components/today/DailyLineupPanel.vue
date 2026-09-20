<script setup lang="ts">
/**
 * Your lineup tonight — what you are starting, and what we would start.
 *
 * THE TOGGLE IS THE POINT. A page that only shows the optimal tells a manager what to do
 * without showing what he is doing, and the gap between the two IS the decision. Set beside
 * each other, the question answers itself: if the two lists match there is nothing to do
 * tonight, and if they do not, the difference is exactly the move.
 *
 * WHAT IS DIFFERENT FROM FOOTBALL, AND WHY IT HAS TO BE. Football ranks a roster once a week
 * and every starter has a game. Here the roster is the same and the SLATE is not, so the most
 * expensive thing on the page is a seat filled by somebody who is not playing tonight — the
 * most common way to lose a night, and something no native lineup screen mentions.
 */
import { computed, ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { teamLogoFor } from '@/players/teamLogo'
import { availability, type DailyRow } from '@/composables/useDailyLineup'

const props = defineProps<{
  current: DailyRow[]
  optimal: DailyRow[]
  bench: DailyRow[]
  /** Points leagues show points; category leagues show category value. */
  valueLabel?: string
}>()

const leagueStore = useLeagueStore()
const logo = (abbr?: string) => teamLogoFor(leagueStore.activeSport, abbr)
const one = (n: number) => n.toFixed(1)
function onLogoErr(e: Event) { (e.target as HTMLImageElement).style.display = 'none' }

const mode = ref<'current' | 'optimal'>('current')
const rows = computed(() => (mode.value === 'optimal' ? props.optimal : props.current))
const slotOf = (r: DailyRow) => (mode.value === 'optimal' ? r.slot : r.startedSlot)

const total = computed(() => rows.value.reduce((s, r) => s + r.today, 0))
const optimalTotal = computed(() => props.optimal.reduce((s, r) => s + r.today, 0))
const currentTotal = computed(() => props.current.reduce((s, r) => s + r.today, 0))

/* The number that decides whether the toggle is worth touching. Rounded to a tenth because a
   gap of 0.04 is not a reason to change a lineup and printing it as "+0.0" says nothing. */
const gain = computed(() => optimalTotal.value - currentTotal.value)

/** Seats filled by somebody with no game — points forfeited outright. */
const dead = computed(() => rows.value.filter((r) => !r.playsToday))

/*
 * Starters who CANNOT PLAY, which is not the same as starters who are carrying something.
 *
 * The first version warned on any designation, so a day-to-day outfielder who will almost
 * certainly play appeared in the same red banner as two pitchers on the fifteen-day list.
 * Treating "might be rested" and "out for a fortnight" identically is how a warning becomes
 * background noise and the real one gets skimmed past.
 *
 * Day-to-day is now a quiet amber tag on his own row and nothing more.
 */
const injuredStarters = computed(() =>
  rows.value.filter((r) => availability(r.status) === 'out'))

const tagTone = (status: string | undefined) =>
  availability(status) === 'out'
    ? 'bg-[#FF5C5C]/15 text-[#FF5C5C]'
    : 'bg-[#e69a4a]/15 text-[#e69a4a]'

/*
 * CAN WE ACTUALLY RANK THESE PLAYERS TONIGHT?
 *
 * A category league has no scoring weights, so the per-game value every row is sorted by
 * comes back zero for everybody. An "optimal" built on all-zero values is not an optimal —
 * it is the slot filler breaking ties in whatever order the roster arrived, presented as a
 * recommendation. Your own lineup is still worth showing; our version of it is not, until
 * category value is wired in.
 */
const canValue = computed(() =>
  [...props.current, ...props.optimal, ...props.bench].some((r) => r.today > 0),
)
</script>

<template>
  <section class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <div class="flex rounded-lg border border-dark-border">
        <button class="rounded-l-lg px-3 py-1 font-mono text-[11px] transition-colors"
                :class="mode === 'current' ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-text'"
                @click="mode = 'current'">your lineup</button>
        <button v-if="canValue" class="rounded-r-lg px-3 py-1 font-mono text-[11px] transition-colors"
                :class="mode === 'optimal' ? 'bg-primary/15 text-primary' : 'text-dark-textMuted hover:text-dark-text'"
                @click="mode = 'optimal'">optimal</button>
      </div>
      <span v-if="canValue" class="font-mono text-[11px] text-dark-textMuted">
        {{ one(total) }} {{ valueLabel || 'projected' }}
      </span>
      <span v-else class="font-mono text-[11px] text-dark-textMuted/70">
        we can't rank these yet &mdash; category value isn't wired in
      </span>
      <span class="flex-1"></span>
      <!-- The whole reason to look: what the optimal is worth over what is set. -->
      <span v-if="canValue && gain >= 0.1" class="font-mono text-[11px] text-primary">
        optimal is +{{ one(gain) }}
      </span>
      <span v-else-if="canValue && current.length" class="font-mono text-[11px] text-dark-textMuted">
        your lineup is optimal
      </span>
    </div>

    <!--
      Loudest thing on the page when it happens: a started player with no game tonight is
      points forfeited outright, and the native lineup screen will never tell you.
    -->
    <p v-if="dead.length"
       class="mb-3 rounded-lg border border-[#FF5C5C]/30 bg-[#FF5C5C]/5 px-3 py-2 font-mono text-[11px] text-[#FF5C5C]">
      {{ dead.length }} {{ dead.length === 1 ? 'seat has' : 'seats have' }} no game tonight
      &mdash; {{ dead.map((d) => d.name).join(', ') }}
    </p>

    <p v-if="injuredStarters.length"
       class="mb-3 rounded-lg border border-[#FF5C5C]/30 bg-[#FF5C5C]/5 px-3 py-2 font-mono text-[11px] text-[#FF5C5C]">
      {{ injuredStarters.length }} {{ injuredStarters.length === 1 ? 'player' : 'players' }}
      in your starting lineup {{ injuredStarters.length === 1 ? 'is' : 'are' }} out &mdash;
      {{ injuredStarters.map((r) => r.name).join(', ') }}
    </p>

    <p v-if="!rows.length" class="py-6 text-center font-mono text-xs text-dark-textMuted">
      <template v-if="mode === 'current'">
        We can't read your set lineup from the platform &mdash; switch to optimal for our pick.
      </template>
      <template v-else>No lineup slots to fill &mdash; the league published none.</template>
    </p>

    <div v-for="r in rows" :key="mode + r.playerKey"
         class="flex items-center gap-3 border-b border-dark-border/40 py-2 last:border-0">
      <span class="w-10 shrink-0 font-mono text-[10px] uppercase text-dark-textMuted">{{ slotOf(r) }}</span>
      <img v-if="r.headshot" :src="r.headshot" :alt="r.name" loading="lazy" @error="onLogoErr"
           class="h-8 w-8 shrink-0 rounded-full bg-dark-border object-cover" />
      <span v-else class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dark-border font-mono text-[9px] text-dark-textMuted">{{ r.position }}</span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-semibold"
              :class="r.playsToday ? 'text-dark-text' : 'text-dark-textMuted/50'">{{ r.name }}</span>
        <span class="flex items-center gap-1 text-xs text-dark-textMuted">
          {{ r.position }}
          <template v-if="r.team">
            &middot; <img :src="logo(r.team)" alt="" @error="onLogoErr" class="h-3 w-3 object-contain" />{{ r.team }}
          </template>
          <span v-if="!r.playsToday" class="text-[#FF5C5C]">&middot; no game</span>
          <span v-else-if="r.status && r.status !== 'ACTIVE'"
                class="rounded px-1 font-bold" :class="tagTone(r.status)">{{ r.status }}</span>
        </span>
      </span>
      <span v-if="canValue" class="w-16 shrink-0 text-right font-mono text-sm"
            :class="r.playsToday ? 'text-dark-text' : 'text-dark-textMuted/40'">{{ one(r.today) }}</span>
    </div>

    <!-- Bench, collapsed to one line each: it is a reference list, not a decision. -->
    <details v-if="bench.length" class="mt-3 border-t border-dark-border/50 pt-3">
      <summary class="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-dark-textMuted/70">
        bench &middot; {{ bench.filter((b) => b.playsToday).length }} of {{ bench.length }} have a game
      </summary>
      <div v-for="r in bench" :key="'bn-' + r.playerKey"
           class="mt-1.5 flex items-center gap-3 text-sm">
        <span class="min-w-0 flex-1 truncate"
              :class="r.playsToday ? 'text-dark-text' : 'text-dark-textMuted/50'">{{ r.name }}</span>
        <span class="font-mono text-[10px] text-dark-textMuted/70">{{ r.position }} &middot; {{ r.team }}</span>
        <span class="w-12 shrink-0 text-right font-mono text-xs"
              :class="r.playsToday ? 'text-dark-textMuted' : 'text-dark-textMuted/30'">{{ one(r.today) }}</span>
      </div>
    </details>
  </section>
</template>
