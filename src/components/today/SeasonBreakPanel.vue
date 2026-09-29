<script setup lang="ts">
/**
 * The page for the parts of the year the daily board cannot describe — either end of it.
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
 *
 * AND THE OTHER END, which is the same bug with a worse sentence. Baseball's 2026 regular
 * season ended on 27 September; on the 29th every baseball league still read "the board
 * lights up when games resume". Nothing was going to resume. A season that has ended is not
 * a pause, and the honest page points at the history rather than at a slate that is not
 * coming back.
 */
import { computed } from 'vue'

const props = defineProps<{
  /** 'before' the season starts, or 'after' the regular season has ended. */
  phase: 'before' | 'after'
  /** 'today' | 'tomorrow' | 'in N days' — already phrased, so the reader does no arithmetic. */
  startsWhen: string
  /** Long date of the last regular-season game, for the offseason line. */
  endDateLabel?: string
  /** Long date of the first regular-season game. */
  startDateLabel: string
  /** Games on opening night. A number beats "soon". */
  openingGames: number
  /** Only linked when the league actually has the tab — see showsHockeyBoardTab. */
  hasDraftBoard?: boolean
}>()

const isOver = computed(() => props.phase === 'after')

const headline = computed(() => {
  if (isOver.value) return 'The regular season is over.'
  if (props.startsWhen === 'today') return 'The season starts today.'
  if (props.startsWhen) return `The season starts ${props.startsWhen}.`
  return 'The season has not started yet.'
})

const subline = computed(() => {
  if (isOver.value) return props.endDateLabel ? `Last game ${props.endDateLabel}` : ''
  if (!props.startDateLabel) return ''
  return props.openingGames
    ? `${props.startDateLabel} · ${props.openingGames} games on opening night`
    : props.startDateLabel
})

/* Only what is genuinely actionable before a puck is dropped. The daily board, the matchup
   and the wire's streaming edge are all downstream of games being played, so linking them
   here would send someone to another empty page. */
const actions = computed(() => {
  /* Once the season is done there is no roster to shape and no wire to work, so the page
     points at the part of the product that is about a season already played. */
  if (isOver.value) return [
    { to: '/history', label: 'History', note: 'How the season actually went' },
    { to: '/league', label: 'League', note: 'Final standings and the landscape' },
  ]
  return [
    ...(props.hasDraftBoard
      ? [{ to: '/hockey/draft', label: 'Draft Board', note: 'Price the pool before you pick' }]
      : []),
    { to: '/rankings', label: 'Rankings', note: 'Our board for the season ahead' },
    { to: '/league', label: 'League', note: 'Who you are up against' },
  ]
})
</script>

<template>
  <section class="mb-5 rounded-xl border border-dark-border bg-dark-card px-4 py-5">
    <p class="text-center font-display text-lg font-bold text-dark-text">{{ headline }}</p>
    <p v-if="subline" class="mt-1 text-center font-mono text-[11px] text-dark-textMuted">
      {{ subline }}
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
