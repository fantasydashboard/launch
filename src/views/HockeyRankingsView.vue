<!--
  Rest-of-season hockey rankings, in the currency a category league settles in.

  WHY THIS IS NOT THE FOOTBALL PAGE WITH DIFFERENT NAMES. Football ranks on value over
  replacement: points above the last startable body at the position, which works because a
  points league has an exchange rate. A category league has none — you win a column by having
  more of it than the man opposite — so the unit here is standard deviations across the columns
  the league counts, and a player can rank highly on penalty minutes and shots while scoring
  almost nothing. Brady Tkachuk at 0.76 points a game belongs on this board and would be
  nowhere near a points one. That is the whole difference and it is why the two pages are two
  pages.
-->
<template>
  <div class="min-h-screen bg-dark-bg px-4 py-8">
    <div class="mx-auto max-w-3xl">
      <div class="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Rest of season</div>
      <h1 class="mt-2 font-display text-3xl font-extrabold tracking-tight text-dark-text">
        Hockey rankings
      </h1>
      <p class="mt-2 max-w-xl text-sm leading-relaxed text-dark-textSecondary">
        Every skater ranked by what he contributes across the categories a league counts —
        goals, assists, points, plus-minus, penalty minutes and shots — measured in standard
        deviations, not points. A player can rank here on volume alone.
      </p>

      <p class="mt-3 max-w-xl rounded-lg border border-dark-border bg-dark-card/60 px-3 py-2 font-mono text-[11px] leading-relaxed text-dark-textMuted">
        Standard six-category scoring, the same board for everyone.
        <!--
          Said plainly because the alternative is a column that always reads zero, which ranks
          every player as equally bad at it rather than as unmeasured.
        -->
        <template v-if="missing.length">
          Your league's {{ missing.join(' and ') }} {{ missing.length > 1 ? 'are' : 'is' }} not
          in this feed yet.
        </template>
      </p>

      <div v-if="loading" class="mt-8 font-mono text-xs text-dark-textMuted">Loading the board…</div>

      <div v-else-if="!ready" class="mt-8 rounded-xl border border-dark-border bg-dark-card p-4">
        <p class="text-sm text-dark-textSecondary">
          The NHL feed is not answering right now, so there is no board to show. This is our
          end, not yours — try again shortly.
        </p>
      </div>

      <div v-else class="mt-6 rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="mb-2 flex items-center gap-2.5 border-b border-dark-border/40 pb-1.5 font-mono text-[9px] uppercase tracking-wide text-dark-textMuted/60">
          <span class="w-8 shrink-0"></span>
          <span class="min-w-0 flex-1"></span>
          <span class="hidden w-12 shrink-0 text-right sm:block" title="Power-play minutes per game — where points are scored">PP</span>
          <span class="hidden w-12 shrink-0 text-right sm:block" title="Points per game">PTS/G</span>
          <span class="w-12 shrink-0 text-right" title="Total standard deviations across the scored categories">VALUE</span>
        </div>

        <div v-for="row in visible" :key="row.playerKey"
             class="flex items-center gap-2.5 border-b border-dark-border/40 py-1.5 text-sm text-dark-text last:border-0">
          <span class="w-8 shrink-0 text-right font-mono text-[11px] text-dark-textMuted/60">{{ row.rank }}</span>
          <span class="min-w-0 flex-1 truncate">
            {{ row.name }}
            <span class="ml-1 font-mono text-[10px] text-dark-textMuted/70">{{ row.position }} · {{ row.team }}</span>
            <!--
              How much of this rating is the player rather than last season standing in for
              him. Shown only where it is genuinely thin, because a confidence badge on every
              row in March would be noise nobody reads.
            -->
            <span v-if="row.confidence < 0.4"
                  class="ml-1 font-mono text-[9px] uppercase text-[#e69a4a]"
                  title="Mostly last season — he has barely played yet">thin</span>
          </span>
          <span class="hidden w-12 shrink-0 text-right font-mono text-[10px] text-dark-textSecondary sm:block">
            {{ (row.ppSecondsPerGame / 60).toFixed(1) }}
          </span>
          <span class="hidden w-12 shrink-0 text-right font-mono text-[10px] text-dark-textSecondary sm:block">
            {{ row.pointsPerGame.toFixed(2) }}
          </span>
          <span class="w-12 shrink-0 text-right font-mono text-xs">{{ row.value.toFixed(1) }}</span>
        </div>

        <button
          v-if="!expanded && rows.length > visible.length"
          class="mt-3 w-full rounded-lg border border-dark-border bg-dark-bg/60 py-2 font-mono text-[11px] text-dark-textSecondary transition-colors hover:text-dark-text"
          @click="expanded = true"
        >Show all {{ Math.min(rows.length, FULL_DEPTH) }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useHockeyRankings } from '@/composables/useHockeyRankings'

const { rows, loading, ready, missing } = useHockeyRankings()

const expanded = ref(false)
const DEPTH = 50
const FULL_DEPTH = 200
const visible = computed(() => rows.value.slice(0, expanded.value ? FULL_DEPTH : DEPTH))
</script>
