<script setup lang="ts">
/**
 * The page for the part of the year the daily board cannot describe.
 *
 * WHAT WENT WRONG WITHOUT IT. Today answers one question — who do I start tonight — and every
 * block on it is conditional on tonight having games. Before opening night none of them
 * render, so three real hockey leagues showed a header, one grey line, and a screen of empty
 * space. The line said "no games today — the board lights up when games resume", which is
 * true in February and false in September: nothing is resuming, the season has not started.
 * A blank page carrying a sentence that does not fit reads as a broken product, and that is
 * the reading a manager actually reported.
 *
 * WHAT IT SAYS INSTEAD. When the season starts, how far away that is, and the decisions that
 * ARE live today. Pre-season is not a dead period for a fantasy manager — it is the drafting
 * and roster-shaping period, which is the most consequential week of their year. The page
 * should point at that rather than apologise for a slate that does not exist yet.
 */
import { computed } from 'vue'

const props = defineProps<{
  /** 'today' | 'tomorrow' | 'in N days' — already phrased, so the reader does no arithmetic. */
  startsWhen: string
  /** Long date of the first regular-season game. */
  startDateLabel: string
  /** Games on opening night. A number beats "soon". */
  openingGames: number
  /** Only linked when the league actually has the tab — see showsHockeyBoardTab. */
  hasDraftBoard?: boolean
}>()

const headline = computed(() =>
  props.startsWhen === 'today' ? 'The season starts today.'
    : props.startsWhen ? `The season starts ${props.startsWhen}.`
    : 'The season has not started yet.')

/* Only what is genuinely actionable before a puck is dropped. The daily board, the matchup
   and the wire's streaming edge are all downstream of games being played, so linking them
   here would send someone to another empty page. */
const actions = computed(() => [
  ...(props.hasDraftBoard
    ? [{ to: '/hockey/draft', label: 'Draft Board', note: 'Price the pool before you pick' }]
    : []),
  { to: '/rankings', label: 'Rankings', note: 'Our board for the season ahead' },
  { to: '/league', label: 'League', note: 'Who you are up against' },
])
</script>

<template>
  <section class="mb-5 rounded-xl border border-dark-border bg-dark-card px-4 py-5">
    <p class="text-center font-display text-lg font-bold text-dark-text">{{ headline }}</p>
    <p v-if="startDateLabel" class="mt-1 text-center font-mono text-[11px] text-dark-textMuted">
      {{ startDateLabel }}<template v-if="openingGames"> &middot; {{ openingGames }} games on opening night</template>
    </p>

    <div class="mt-4 border-t border-dark-border/50 pt-4">
      <p class="mb-3 text-center font-mono text-[9px] uppercase tracking-widest text-dark-textMuted/70">
        what is live right now
      </p>
      <div class="flex flex-wrap justify-center gap-2">
        <RouterLink v-for="a in actions" :key="a.to" :to="a.to"
          class="min-w-[160px] flex-1 rounded-lg border border-dark-border bg-dark-bg/40 px-3 py-2.5 text-center transition-colors hover:border-primary/40">
          <span class="block text-sm font-semibold text-dark-text">{{ a.label }}</span>
          <span class="mt-0.5 block font-mono text-[10px] leading-snug text-dark-textMuted">{{ a.note }}</span>
        </RouterLink>
      </div>
    </div>
  </section>
</template>
