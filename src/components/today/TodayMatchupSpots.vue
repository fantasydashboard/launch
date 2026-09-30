<script setup lang="ts">
/**
 * Seat by seat against the man opposite — football's best section, asked about tonight.
 *
 * WHY THE OPPONENT BELONGS ON A LINEUP PAGE AT ALL. A projection tells you what a player
 * scores; it does not tell you whether that is enough. The same twelve points is a fine night
 * against a bench body and a lost seat against a stud, and only the pairing says which. This
 * is also the section that makes the daily cadence pay: on any given night most of both
 * rosters is idle, so the handful of seats that are live is a short, genuinely decidable list.
 *
 * THEIR SET LINEUP, NOT THEIR BEST ONE. You cannot change their lineup, so comparing against
 * an idealised version of it misstates your own matchup — and once a game is final it
 * rewrites history, quietly benching a player who already played badly.
 */
import { computed } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { teamLogoFor } from '@/players/teamLogo'
import type { DailySpot } from '@/composables/useDailyMatchup'

const props = defineProps<{
  spots: DailySpot[]
  oppName: string
  myName: string
  /**
   * Whether their set lineup could be read at all.
   *
   * False is a real state, not a degraded one: ESPN and Yahoo publish the opponent's lineup
   * on a roster this page derives rather than fetches, and before that derivation existed the
   * column was empty. An empty seat scores zero, so every seat of yours read as a seat you
   * were winning. The column says "not published" now rather than "0.0".
   */
  oppLineupKnown: boolean
}>()

const leagueStore = useLeagueStore()
const logo = (abbr?: string) => teamLogoFor(leagueStore.activeSport, abbr)
const one = (n: number) => n.toFixed(1)
function onImgErr(e: Event) { (e.target as HTMLImageElement).style.display = 'none' }

/*
 * Only the seats that are live tonight.
 *
 * A row where neither side plays is not a close matchup, it is two absences — and listing it
 * beside real ones pads the section with rows nobody can act on. Both-idle seats are counted
 * in a footnote instead, so the list stays short without pretending they do not exist.
 */
const live = computed(() =>
  props.spots.filter((s) => s.mine?.playsToday || s.theirs?.playsToday))
const idle = computed(() => props.spots.length - live.value.length)
/** Live seats we could not call, because one of the two men in them has no projection. */
const uncalled = computed(() => live.value.filter((s) => !s.known).length)

const LEVEL = 0.1
const toneOf = (edge: number) =>
  edge > LEVEL ? 'text-primary' : edge < -LEVEL ? 'text-[#e69a4a]' : 'text-dark-textMuted'
</script>

<template>
  <section v-if="live.length" class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
    <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
      The matchup
      <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">
        &middot; seat by seat vs {{ oppName || 'your opponent' }} &middot; tonight only
      </span>
    </h2>
    <p v-if="!oppLineupKnown" class="mb-3 rounded-lg border border-dark-border bg-dark-bg px-3 py-2 font-mono text-[10px] text-[#e69a4a]">
      {{ oppName || 'Your opponent' }} hasn't set a lineup we can read yet, so only your side
      is scored here. Nobody is ahead until there is something to be ahead of.
    </p>
    <p class="mb-3 font-mono text-[10px] text-dark-textMuted/60">
      their lineup as they set it, not the one we'd have picked
    </p>

    <div class="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-dark-textMuted/60">
      <span class="min-w-0 flex-1 truncate">{{ myName || 'you' }}</span>
      <span class="w-14 shrink-0 text-center">slot</span>
      <span class="min-w-0 flex-1 truncate text-right">{{ oppName || 'opponent' }}</span>
    </div>

    <div v-for="(s, i) in live" :key="s.slot + i"
         class="flex items-center gap-2 border-b border-dark-border/40 py-2 last:border-0">
      <!-- Mine -->
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <img v-if="s.mine?.headshot" :src="s.mine.headshot" :alt="s.mine.name" loading="lazy"
             @error="onImgErr" class="ufd-face" />
        <span v-else class="ufd-face"></span>
        <span class="min-w-0">
          <span class="block truncate text-sm"
                :class="s.mine?.playsToday ? 'text-dark-text' : 'text-dark-textMuted/50'">
            {{ s.mine?.name || '—' }}
          </span>
          <span class="flex items-center gap-1 font-mono text-[10px] text-dark-textMuted">
            <template v-if="s.mine?.team">
              <img :src="logo(s.mine.team)" alt="" @error="onImgErr" class="h-3 w-3 object-contain" />{{ s.mine.team }}
            </template>
            <span v-if="s.mine && !s.mine.playsToday" class="text-[#FF5C5C]">no game</span>
          </span>
        </span>
      </div>
      <span class="w-10 shrink-0 text-right font-mono text-sm"
            :class="s.mine?.playsToday ? 'text-dark-text' : 'text-dark-textMuted/40'">
        <template v-if="!s.mine || s.mine.priced || !s.mine.playsToday">{{ one(s.mine?.today ?? 0) }}</template>
        <span v-else class="text-dark-textMuted/40" title="No projection for him — this seat is not scored">&mdash;</span>
      </span>

      <!-- The seat, and who is winning it -->
      <span class="w-14 shrink-0 text-center">
        <span class="block font-mono text-[10px] uppercase text-dark-textMuted/70">{{ s.slot }}</span>
        <span v-if="oppLineupKnown && s.known" class="block font-mono text-[10px] font-bold" :class="toneOf(s.edge)">
          {{ s.edge > 0 ? '+' : '' }}{{ one(s.edge) }}
        </span>
        <!-- A seat holding a man we cannot price has no verdict, and a dot says so where a
             number would have claimed one. -->
        <span v-else-if="oppLineupKnown" class="block font-mono text-[10px] text-dark-textMuted/40"
              title="One of these two has no projection, so this seat is not scored">?</span>
        <span v-else class="block font-mono text-[10px] text-dark-textMuted/30">&middot;</span>
      </span>

      <!-- Theirs -->
      <span class="w-10 shrink-0 font-mono text-sm"
            :class="s.theirs?.playsToday ? 'text-dark-text' : 'text-dark-textMuted/40'">
        <template v-if="oppLineupKnown && (!s.theirs || s.theirs.priced || !s.theirs.playsToday)">{{ one(s.theirs?.today ?? 0) }}</template>
        <span v-else-if="oppLineupKnown" class="text-dark-textMuted/40"
              title="No projection for him — this seat is not scored">&mdash;</span>
        <span v-else class="text-dark-textMuted/30">&mdash;</span>
      </span>
      <div class="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span class="min-w-0 text-right">
          <span class="block truncate text-sm"
                :class="s.theirs?.playsToday ? 'text-dark-text' : 'text-dark-textMuted/50'">
            {{ s.theirs?.name || '—' }}
          </span>
          <span class="flex items-center justify-end gap-1 font-mono text-[10px] text-dark-textMuted">
            <span v-if="s.theirs && !s.theirs.playsToday" class="text-[#7ee787]">no game</span>
          <span v-else-if="s.theirs && !s.theirs.priced" class="text-dark-textMuted/60">no projection</span>
            <template v-if="s.theirs?.team">
              <img :src="logo(s.theirs.team)" alt="" @error="onImgErr" class="h-3 w-3 object-contain" />{{ s.theirs.team }}
            </template>
          </span>
        </span>
        <img v-if="s.theirs?.headshot" :src="s.theirs.headshot" :alt="s.theirs.name" loading="lazy"
             @error="onImgErr" class="ufd-face" />
        <span v-else class="ufd-face"></span>
      </div>
    </div>

    <p v-if="idle" class="mt-2 font-mono text-[10px] text-dark-textMuted/60">
      {{ idle }} {{ idle === 1 ? 'seat is' : 'seats are' }} idle on both sides tonight
    </p>
    <!-- Said out loud rather than left as a row of dots: a seat we cannot call is missing from
         the tally above, and a reader should know the count is of fewer seats than are shown. -->
    <p v-if="oppLineupKnown && uncalled" class="mt-1 font-mono text-[10px] text-dark-textMuted/60">
      {{ uncalled }} {{ uncalled === 1 ? 'seat is' : 'seats are' }} not scored &mdash;
      {{ uncalled === 1 ? 'a player' : 'players' }} we have no projection for
    </p>
  </section>
</template>
