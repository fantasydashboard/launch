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

const PCT = (p: number) => `${Math.round(p * 100)}%`
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
const rows = computed(() =>
  [...props.week.cats].sort((a, b) =>
    (ORDER[a.status] - ORDER[b.status]) || (b.unitValue - a.unitValue)))

const chase = computed(() => props.week.worthChasing.slice(0, 3))
const gone = computed(() => props.week.cats.filter((c) => c.status === 'gone').map((c) => c.key))
const banked = computed(() => props.week.cats.filter((c) => c.status === 'safe').map((c) => c.key))
const settled = computed(() => props.daysRemaining <= 0)

/** How many columns take the week, in a format where only the count matters. */
const needed = computed(() => Math.floor(props.week.cats.length / 2) + 1)
const leading = computed(() => props.week.cats.filter((c) => c.winPct > 0.5).length)

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
    </div>

    <div class="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-dark-textMuted/60">
      <span class="w-14 shrink-0">cat</span>
      <span class="w-14 shrink-0 text-right">{{ (myName || 'you').slice(0, 10) }}</span>
      <span class="w-14 shrink-0 text-right">{{ (oppName || 'opp').slice(0, 10) }}</span>
      <span class="min-w-0 flex-1 text-right">win chance</span>
    </div>

    <div v-for="c in rows" :key="c.key"
         class="flex items-center gap-2 border-b border-dark-border/40 py-2 text-base last:border-0">
      <span class="w-14 shrink-0 font-mono text-xs font-semibold uppercase" :class="toneOf(c.status)">
        {{ c.label }}
        <!-- A ratio cannot be chased by adding bodies the way a count can, and a reader who
             does not know which columns are ratios will misread a flat win chance as a bug. -->
        <span v-if="c.isRatio" class="text-dark-textMuted/50" title="A rate — more starts dilute it rather than add to it">%</span>
      </span>
      <span class="w-14 shrink-0 text-right font-display text-base font-bold tabular-nums"
            :class="c.winPct > 0.5 ? 'text-dark-text' : 'text-dark-textMuted'">{{ fmt(c.mine) }}</span>
      <span class="w-14 shrink-0 text-right font-display text-base font-bold tabular-nums"
            :class="c.winPct < 0.5 ? 'text-dark-text' : 'text-dark-textMuted'">{{ fmt(c.theirs) }}</span>
      <span class="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span class="hidden h-1.5 w-20 overflow-hidden rounded-full bg-dark-border sm:block">
          <span class="block h-full rounded-full" :class="barOf(c.status)"
                :style="{ width: `${Math.max(2, Math.min(100, c.winPct * 100))}%` }"></span>
        </span>
        <span class="w-10 shrink-0 text-right font-mono text-xs" :class="toneOf(c.status)">{{ PCT(c.winPct) }}</span>
      </span>
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
