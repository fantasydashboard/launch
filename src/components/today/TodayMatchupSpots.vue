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
             @error="onImgErr" class="h-7 w-7 shrink-0 rounded-full bg-dark-border object-cover" />
        <span v-else class="h-7 w-7 shrink-0 rounded-full bg-dark-border"></span>
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
        {{ one(s.mine?.today ?? 0) }}
      </span>

      <!-- The seat, and who is winning it -->
      <span class="w-14 shrink-0 text-center">
        <span class="block font-mono text-[10px] uppercase text-dark-textMuted/70">{{ s.slot }}</span>
        <span class="block font-mono text-[10px] font-bold" :class="toneOf(s.edge)">
          {{ s.edge > 0 ? '+' : '' }}{{ one(s.edge) }}
        </span>
      </span>

      <!-- Theirs -->
      <span class="w-10 shrink-0 font-mono text-sm"
            :class="s.theirs?.playsToday ? 'text-dark-text' : 'text-dark-textMuted/40'">
        {{ one(s.theirs?.today ?? 0) }}
      </span>
      <div class="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span class="min-w-0 text-right">
          <span class="block truncate text-sm"
                :class="s.theirs?.playsToday ? 'text-dark-text' : 'text-dark-textMuted/50'">
            {{ s.theirs?.name || '—' }}
          </span>
          <span class="flex items-center justify-end gap-1 font-mono text-[10px] text-dark-textMuted">
            <span v-if="s.theirs && !s.theirs.playsToday" class="text-[#7ee787]">no game</span>
            <template v-if="s.theirs?.team">
              <img :src="logo(s.theirs.team)" alt="" @error="onImgErr" class="h-3 w-3 object-contain" />{{ s.theirs.team }}
            </template>
          </span>
        </span>
        <img v-if="s.theirs?.headshot" :src="s.theirs.headshot" :alt="s.theirs.name" loading="lazy"
             @error="onImgErr" class="h-7 w-7 shrink-0 rounded-full bg-dark-border object-cover" />
        <span v-else class="h-7 w-7 shrink-0 rounded-full bg-dark-border"></span>
      </div>
    </div>

    <p v-if="idle" class="mt-2 font-mono text-[10px] text-dark-textMuted/60">
      {{ idle }} {{ idle === 1 ? 'seat is' : 'seats are' }} idle on both sides tonight
    </p>
  </section>
</template>
