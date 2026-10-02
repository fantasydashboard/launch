<script setup lang="ts">
/**
 * Where you stand column by column — the question a category league actually asks.
 *
 * WHAT WAS HERE BEFORE. This page showed a category league the same seat-by-seat board a
 * points league gets: your man against the man opposite, a points margin beside each pair.
 * That is the wrong question twice over. A category week is not won seat by seat, and the
 * margin it reported was in a currency the league does not keep score in. A manager reading
 * it could not tell which columns he was winning, which were already gone, or where tonight's
 * start would land.
 *
 * THE ANALYSIS IS THE POINT, NOT THE TABLE. Nine rows of totals is a scoreboard, and the
 * platform already has one. What the platform does not say is which column is cheapest to
 * flip tonight, which is banked, and which to stop paying for — and that depends on the
 * league's format, which is why the format is read rather than assumed. See categoryLeverage.
 */
import { computed } from 'vue'
import type { CategoryWeek } from '@/category/categoryWeek'

const props = defineProps<{
  week: CategoryWeek
  myName: string
  oppName: string
  daysRemaining: number
}>()

/**
 * A win chance, never claiming certainty while games remain.
 *
 * A four-goal lead in a thin column rounds to 100%, and printing that tells a manager the
 * column cannot be lost — on a Thursday, with three days of hockey still to play. The model
 * does not believe that either; it is rounding that says it. Settled weeks are exempt, because
 * then it is simply true.
 */
const PCT = (p: number) => {
  const raw = p * 100
  if (props.daysRemaining <= 0) return `${Math.round(raw)}%`
  return `${Math.min(99, Math.max(1, Math.round(raw)))}%`
}
/* Totals span goals (single digits) and save percentage (three decimals), so the format has
   to follow the magnitude or one of the two columns reads as nonsense. */
function fmt(v: number): string {
  if (!Number.isFinite(v)) return '—'
  if (v === 0) return '0'
  const a = Math.abs(v)
  if (a < 1) return v.toFixed(3).replace(/^0/, '')
  if (a < 10) return Number.isInteger(v) ? String(v) : v.toFixed(2)
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

/*
 * In play first, richest first inside that — because the live columns are the only ones any
 * decision tonight touches. Banked and gone follow, present so the week can be read whole but
 * deliberately not at the top competing for attention they do not deserve.
 */
const ORDER: Record<string, number> = { live: 0, safe: 1, gone: 2 }
/*
 * Sorted by what chasing the column is WORTH, which is the same number the advice below ranks
 * on. This used to sort by unitValue — the worth of one unit — under a heading that says "most
 * movable first", so the table led with shutouts (one is decisive, none are coming) while the
 * line underneath told you to spend on shots. The heading was right and the sort was wrong.
 */
const rows = computed(() =>
  [...props.week.cats].sort((a, b) =>
    (ORDER[a.status] - ORDER[b.status]) || (b.movable - a.movable)))

const chase = computed(() => props.week.worthChasing.slice(0, 3))
const gone = computed(() => props.week.cats.filter((c) => c.status === 'gone').map((c) => c.key))
const banked = computed(() => props.week.cats.filter((c) => c.status === 'safe').map((c) => c.key))
const settled = computed(() => props.daysRemaining <= 0)

/** How many columns take the week, in a format where only the count matters. */
const needed = computed(() => Math.floor(props.week.cats.length / 2) + 1)
const leading = computed(() => props.week.cats.filter((c) => c.winPct > 0.5).length)

/**
 * How far ahead you are, signed so that POSITIVE always means good.
 *
 * GAA and goals-against read the other way, so a raw subtraction prints "-0.01" on a column
 * you are winning. Reading the sign is the whole point of the column, and a sign that means
 * different things on different rows is worse than no column at all.
 */
const edgeOf = (c: { mine: number; theirs: number; lowerIsBetter: boolean }) =>
  c.lowerIsBetter ? c.theirs - c.mine : c.mine - c.theirs
function signed(v: number): string {
  if (!Number.isFinite(v) || v === 0) return 'level'
  return (v > 0 ? '+' : '\u2212') + fmt(Math.abs(v))
}

/*
 * ONE grid definition, shared by the header row and every data row.
 *
 * They were two independent flex rows with hand-matched widths, which is why the headers sat
 * off their columns and the whole table read as sloppy: "MY TEAM" floated between the cat name
 * and the number it was supposed to label. Declaring the track list once makes that class of
 * drift impossible rather than merely fixed.
 *
 * The margin and the bar drop away under 640px, where six columns cannot fit — they are the
 * two a reader can do without, since the totals and the win chance carry the same facts.
 */
const GRID = 'grid items-center gap-x-3 grid-cols-[3.5rem_3.5rem_3rem_3.5rem] '
  + 'sm:grid-cols-[4rem_4rem_4rem_1fr_3rem_4rem]'

const list = (keys: string[]) => keys.join(', ')
const toneOf = (status: string) =>
  status === 'safe' ? 'text-[#7ee787]' : status === 'gone' ? 'text-[#FF5C5C]' : 'text-dark-text'
const barOf = (status: string) =>
  status === 'safe' ? 'bg-[#7ee787]' : status === 'gone' ? 'bg-[#FF5C5C]' : 'bg-primary'
</script>

<template>
  <section class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
    <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
      Your categories
      <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">
        &middot; vs {{ oppName || 'your opponent' }}
        &middot; {{ settled ? 'week over' : daysRemaining === 1 ? 'last day' : `${daysRemaining} days left` }}
      </span>
    </h2>

    <!-- The objective, said out loud. The two formats reward opposite behaviour in a losing
         week, so a board that does not say which one it is scoring is guessing on the
         reader's behalf. -->
    <p class="mb-3 font-mono text-[10px] text-dark-textMuted/60">
      <template v-if="week.format === 'each'">
        every column is its own win &mdash; one taken back on the last day counts the same as one led all week
      </template>
      <template v-else>
        most columns takes the week &mdash; {{ needed }} of {{ week.cats.length }} wins it
      </template>
    </p>

    <!-- Counts a manager reads in one glance, before any row. -->
    <div class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
      <span class="text-[#7ee787]">{{ week.safe }} banked</span>
      <span class="text-dark-text">{{ week.live }} in play</span>
      <span class="text-[#FF5C5C]">{{ week.gone }} gone</span>
      <span v-if="week.format === 'most'" class="text-dark-textMuted">
        leading {{ leading }} of {{ week.cats.length }}
      </span>
      <!-- Said out loud. Sorted by what tonight can still move, the order looks arbitrary to a
           reader expecting the platform's — and an order you cannot explain reads as a bug. -->
      <span class="text-dark-textMuted/50">most movable first</span>
    </div>

    <!--
      Headers and rows share GRID, so a column cannot drift off its label.

      YOUR TOTAL AND THEIRS SIT ON OPPOSITE SIDES, with the margin, the bar and the win chance
      between them — the same geometry as the seat-by-seat board a points league gets, and the
      shape the matchup actually has. Both totals adjacent in one block read as a table of
      numbers; split around the bar they read as two teams, and the bar becomes the ground
      being fought over rather than a decoration at the end of the row.
    -->
    <div :class="GRID" class="mb-1 border-b border-dark-border/40 pb-1 font-mono text-[9px] uppercase tracking-widest text-dark-textMuted/60">
      <span>cat</span>
      <span class="truncate text-right" :title="myName">{{ myName || 'you' }}</span>
      <span class="hidden text-right sm:block">margin</span>
      <span class="hidden sm:block"></span>
      <span class="text-right">win</span>
      <span class="truncate" :title="oppName">{{ oppName || 'opp' }}</span>
    </div>

    <div v-for="c in rows" :key="c.key" :class="GRID"
         class="border-b border-dark-border/40 py-2 text-base last:border-0">
      <span class="truncate font-mono text-xs font-semibold uppercase" :class="toneOf(c.status)">
        {{ c.label }}
        <!-- A ratio cannot be chased by adding bodies the way a count can, and a reader who
             does not know which columns are ratios will misread a flat win chance as a bug. -->
        <span v-if="c.isRatio" class="text-dark-textMuted/50" title="A rate — more starts dilute it rather than add to it">%</span>
      </span>
      <span class="text-right font-display text-base font-bold tabular-nums"
            :class="c.winPct > 0.5 ? 'text-dark-text' : 'text-dark-textMuted'">{{ fmt(c.mine) }}</span>
      <!-- The subtraction a reader was doing in their head, with the sign already corrected
           for the columns where lower wins. -->
      <span class="hidden text-right font-mono text-xs tabular-nums sm:block"
            :class="edgeOf(c) > 0 ? 'text-[#7ee787]' : edgeOf(c) < 0 ? 'text-[#e69a4a]' : 'text-dark-textMuted/50'">
        {{ signed(edgeOf(c)) }}
      </span>
      <!-- The bar fills the space the old layout left empty between the totals and the
           percentage. The tick is the half-way mark, so "which side of even am I on" is
           readable without comparing the number to 50 every row. -->
      <span class="relative hidden h-1.5 overflow-hidden rounded-full bg-dark-border sm:block">
        <span class="block h-full rounded-full" :class="barOf(c.status)"
              :style="{ width: `${Math.max(2, Math.min(100, c.winPct * 100))}%` }"></span>
        <span class="absolute inset-y-0 left-1/2 w-px bg-dark-bg/80"></span>
      </span>
      <span class="text-right font-mono text-xs tabular-nums" :class="toneOf(c.status)">{{ PCT(c.winPct) }}</span>
      <!-- Their side of the column, left-aligned so the two totals face each other across the
           bar rather than both hugging the same edge. -->
      <span class="font-display text-base font-bold tabular-nums"
            :class="c.winPct < 0.5 ? 'text-dark-text' : 'text-dark-textMuted'">{{ fmt(c.theirs) }}</span>
    </div>

    <!-- WHAT TO DO. The reason this section exists rather than a prettier scoreboard. -->
    <div v-if="!settled" class="mt-3 space-y-1 rounded-lg border border-dark-border bg-dark-bg px-3 py-2">
      <p v-if="chase.length" class="font-mono text-[11px] text-[#7ee787]">
        Spend tonight on {{ list(chase) }} &mdash;
        {{ chase.length === 1 ? 'the one column' : 'the columns' }} where a start still changes the week.
      </p>
      <p v-else class="font-mono text-[11px] text-dark-textMuted">
        Nothing you start tonight is likely to flip a column. Play your best lineup and keep your moves.
      </p>
      <p v-if="gone.length" class="font-mono text-[11px] text-[#e69a4a]">
        Stop paying for {{ list(gone) }}.
        <template v-if="week.format === 'each'">
          Lost is lost either way, so the bodies you'd spend there are worth more in a live column.
        </template>
        <template v-else>
          Giving these up costs nothing extra &mdash; only the column count decides this week.
        </template>
      </p>
      <p v-if="banked.length" class="font-mono text-[11px] text-dark-textMuted">
        {{ list(banked) }} {{ banked.length === 1 ? 'is' : 'are' }} banked barring a collapse &mdash;
        no need to add to {{ banked.length === 1 ? 'it' : 'them' }}.
      </p>
      <!-- The honest losing-week line, and it differs by format. In a total-categories league a
           late column is still a real win; in most-categories it is worth nothing at all. -->
      <p v-if="week.format === 'each' && week.live && leading < needed"
         class="font-mono text-[11px] text-dark-textMuted/80">
        You're behind on the week, but this format pays for every column &mdash; taking one or two
        back at the end is still worth the moves.
      </p>
      <p v-else-if="week.format === 'most' && leading < needed && week.live < needed - leading"
         class="font-mono text-[11px] text-dark-textMuted/80">
        Even winning every column still in play leaves you short, so this week is decided.
        Spend moves on next week instead.
      </p>
    </div>
  </section>
</template>
