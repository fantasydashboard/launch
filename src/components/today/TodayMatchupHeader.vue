<script setup lang="ts">
/**
 * Where the week stands, at the top of the daily page.
 *
 * WHY IT BELONGS HERE RATHER THAN ON ITS OWN TAB. The reason to care who you are playing is
 * that it changes what you do tonight — a manager comfortably ahead conserves moves, one
 * behind in two categories streams for them. Splitting "who am I playing" from "what do I do
 * about it" across two tabs made the second page answer a question the first one asked.
 *
 * TWO SOURCES, ONE SCOREBOARD. A points league's standing is a score and a margin; a category
 * league's is a column count, and the per-category strip below is its real scoreboard. Both
 * arrive here and the header renders whichever the league actually has, rather than printing
 * a shape the league cannot fill.
 */
import { computed } from 'vue'
import type { ThisWeekSnapshot } from '@/composables/useThisWeekMatchup'
import type { DailyMatchupSnapshot } from '@/composables/useDailyMatchup'

const props = defineProps<{
  /** Points and categories alike: identity, banked score, seats won tonight. */
  daily: DailyMatchupSnapshot | null
  /** Category leagues only — the column-by-column state of the week. */
  snapshot: ThisWeekSnapshot | null
  myTeamName?: string
  myTeamLogo?: string
  isCategory?: boolean
  /** Days left in the scoring period, when the league publishes one. */
  daysRemaining?: number
}>()

function onImgErr(e: Event) { (e.target as HTMLImageElement).style.display = 'none' }

const meName = computed(() => props.daily?.me.name || props.myTeamName || 'Your team')
const meLogo = computed(() => props.daily?.me.logo || props.myTeamLogo || '')
const oppName = computed(() => props.daily?.opp.name || props.snapshot?.opponentName || '')
const oppLogo = computed(() => props.daily?.opp.logo || props.snapshot?.oppAvatar || '')

/*
 * Safe / tossup / loss, which is what CatStatus actually is.
 *
 * This was keyed on winning/losing/tied — words that read correctly and match nothing, so
 * every column fell through to the muted default and the strip lost the one thing it exists
 * to show. The tossups are the ones worth a manager's night, so they are the highlighted
 * state rather than the neutral one.
 */
const CAT_TONE: Record<string, string> = {
  safe: 'text-[#7ee787]', tossup: 'text-[#e69a4a]', loss: 'text-[#FF5C5C]',
}
const tone = (c: { status: string }) => CAT_TONE[c.status] ?? 'text-dark-textMuted'

/*
 * A PROBABILITY WE DID NOT COMPUTE IS NOT A PROBABILITY.
 *
 * The category snapshot returns 0% win and 100% tie when it could not read the matchup, and
 * rendered as-is that reads "you cannot win" — a confident claim about somebody's week drawn
 * from nothing at all. A points league now has its own number from a projected-points margin;
 * a category league keeps the column split. Neither is faked when it is missing.
 */
const catOdds = computed(() => {
  const s = props.snapshot
  if (!s) return null
  if (s.tiePct >= 100 && !s.projWins && !s.projLosses) return null
  if (!(s.winPct > 0 || s.lossPct > 0 || s.projWins > 0 || s.projLosses > 0)) return null
  return s
})
const winPct = computed(() =>
  props.isCategory ? (catOdds.value?.winPct ?? null) : (props.daily?.winPct ?? null))

/** Banked so far. Shown only when the platform actually published a running score. */
const hasScore = computed(() =>
  props.daily?.me.score != null && props.daily?.opp.score != null)
const margin = computed(() =>
  hasScore.value ? (props.daily!.me.score! - props.daily!.opp.score!) : 0)
const one = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

/** The columns still winnable tonight — the only ones a lineup change can move. */
const contested = computed(() =>
  (props.snapshot?.categories ?? []).filter((c) => c.status === 'tossup'),
)

const days = computed(() => props.daysRemaining ?? props.snapshot?.daysRemaining ?? null)
</script>

<template>
  <section v-if="daily || snapshot"
           class="mb-5 rounded-xl border border-dark-border bg-dark-card px-4 py-3">
    <div class="flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-2">
        <img v-if="meLogo" :src="meLogo" alt="" @error="onImgErr"
             class="h-8 w-8 shrink-0 rounded-full object-cover" />
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-dark-text">{{ meName }}</p>
          <p v-if="hasScore" class="font-mono text-lg font-bold text-primary">
            {{ one(daily!.me.score!) }}
          </p>
          <!-- "0d left" above a blank score reads as a broken page, so the day count only
               appears when there is a real number beside it to give it a context. -->
          <p v-else-if="days != null" class="font-mono text-[10px] text-dark-textMuted">
            {{ days }}d left
          </p>
        </div>
      </div>

      <div class="shrink-0 text-center">
        <p v-if="winPct != null" class="font-mono text-lg font-bold"
           :class="winPct >= 50 ? 'text-primary' : 'text-[#e69a4a]'">{{ Math.round(winPct) }}%</p>
        <p v-else-if="hasScore" class="font-mono text-sm font-bold"
           :class="margin >= 0 ? 'text-primary' : 'text-[#e69a4a]'">
          {{ margin >= 0 ? 'you +' : '' }}{{ one(Math.abs(margin)) }}
        </p>
        <p v-else class="font-mono text-sm text-dark-textMuted">&mdash;</p>

        <p class="font-mono text-[10px] text-dark-textMuted">
          <template v-if="winPct == null && !hasScore">win chance unavailable</template>
          <template v-else-if="isCategory && catOdds">
            proj {{ catOdds.projWins }}&ndash;{{ catOdds.projLosses }}<span
              v-if="catOdds.projTies">&ndash;{{ catOdds.projTies }}</span>
          </template>
          <template v-else-if="winPct != null">to win</template>
          <template v-else>so far</template>
        </p>
        <p v-if="daily && daily.spots.length" class="font-mono text-[9px] text-dark-textMuted/60">
          {{ daily.won }} up &middot; {{ daily.lost }} down tonight
        </p>
      </div>

      <div class="flex min-w-0 items-center justify-end gap-2">
        <div class="min-w-0 text-right">
          <p class="truncate text-sm font-semibold text-dark-text">{{ oppName || 'Opponent' }}</p>
          <p v-if="hasScore" class="font-mono text-lg font-bold text-[#e69a4a]">
            {{ one(daily!.opp.score!) }}
          </p>
        </div>
        <img v-if="oppLogo" :src="oppLogo" alt="" @error="onImgErr"
             class="h-8 w-8 shrink-0 rounded-full object-cover" />
      </div>
    </div>

    <!-- One sentence, and only when it changes what you do tonight. -->
    <p v-if="daily?.verdict" class="mt-2 text-center text-xs text-dark-text">
      {{ daily.verdict }}
    </p>

    <!--
      THE COLUMN-BY-COLUMN SCOREBOARD. In a category league this is the actual state of the
      week; the percentage above is a summary of it. A manager losing one column by a hair
      and another by a mile should spend tonight on the first, and only this says which.
    -->
    <div v-if="isCategory && snapshot?.categories.length"
         class="mt-3 border-t border-dark-border/50 pt-3">
      <p class="mb-2 font-mono text-[9px] uppercase tracking-widest text-dark-textMuted/70">
        where the week stands
        <span v-if="contested.length" class="normal-case tracking-normal text-dark-textMuted/50">
          &middot; {{ contested.length }} still in play
        </span>
      </p>
      <div class="flex flex-wrap gap-x-4 gap-y-1.5">
        <span v-for="c in snapshot.categories" :key="c.statId"
              class="font-mono text-[11px]" :title="`${c.myWinPct}% to win ${c.label}`">
          <span :class="tone(c)">{{ c.label }}</span>
          <span class="ml-1 text-dark-textMuted/50">{{ Math.round(c.myWinPct) }}%</span>
        </span>
      </div>
    </div>
  </section>
</template>
