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
        <template v-if="mode === 'points'">
          Every skater ranked by the points he is projected to score under your league's own
          scoring, for the rest of the season.
        </template>
        <template v-else>
          Every skater ranked by what he contributes across the categories your league counts,
          measured in standard deviations rather than points. A player can rank here on volume
          alone.
        </template>
      </p>

      <p class="mt-3 max-w-xl rounded-lg border border-dark-border bg-dark-card/60 px-3 py-2 font-mono text-[11px] leading-relaxed text-dark-textMuted">
        <!--
          The columns, named. A category board that does not say which categories it counted is
          asking to be trusted about the one thing the reader can check.
        -->
        <!--
          A points league is not a category league with the columns hidden — it is a different
          question, and calling its scoring items "categories" was how this page came to
          z-score a ten-team H2H_POINTS league across fourteen columns it does not have.
        -->
        <template v-if="mode === 'points'">
          Scored on your league's own point values.
        </template>
        <template v-else-if="fromLeague">
          Scored on your league's columns: {{ categories.map((c) => c.key).join(' · ') }}.
        </template>
        <template v-else>
          {{ categories.map((c) => c.key).join(' · ') }} — the standard set, because we could
          not read your league's own columns.
        </template>
        <!--
          Said once, here, rather than as a badge on every row. A flag that appears on all of
          them carries no information — it is the same claim repeated, and the reader has to
          scan past it to find the rows it does not apply to, of which there are none.
        -->
        <template v-if="allThin">
          Nobody has played yet, so every rating is last season's.
        </template>
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

      <!--
        Position, because a hockey roster is built by it. A manager needs two centres and four
        defencemen, not "the best twenty players" — and Cale Makar sitting twentieth on a mixed
        board is unfindable by the person who came here to fix his blue line.
        G is its own list rather than a filter: a goalie's categories are not a skater's, so
        they are ranked against each other and never against a winger.
      -->
      <div v-else class="mt-4 flex flex-wrap gap-1.5">
        <button
          v-for="p in POSITIONS"
          :key="p"
          class="rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors"
          :class="active === p ? 'bg-primary font-bold text-dark-bg' : 'bg-dark-card text-dark-textMuted hover:text-dark-text'"
          @click="active = p"
        >{{ p }}</button>
      </div>

      <div v-if="ready" class="mt-3 rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="mb-2 flex items-center gap-2.5 border-b border-dark-border/40 pb-1.5 font-mono text-[9px] uppercase tracking-wide text-dark-textMuted/60">
          <span class="w-8 shrink-0"></span>
          <span class="h-7 w-7 shrink-0"></span>
          <span class="min-w-0 flex-1"></span>
          <span v-if="active !== 'G'" class="hidden w-12 shrink-0 text-right sm:block" title="Power-play minutes per game — where points are scored">PP</span>
          <span class="hidden w-12 shrink-0 text-right sm:block"
                :title="active === 'G' ? 'Games started — the thing that decides a goalie' : 'Points per game'"
          >{{ active === 'G' ? 'GS' : 'PTS/G' }}</span>
          <span class="w-12 shrink-0 text-right"
                :title="mode === 'points'
                  ? 'Projected points under your league\'s scoring'
                  : 'Total standard deviations across the scored categories'"
          >{{ mode === 'points' ? 'PTS' : 'VALUE' }}</span>
        </div>

        <div v-for="row in visible" :key="row.playerKey"
             class="flex items-center gap-2.5 border-b border-dark-border/40 py-1.5 text-sm text-dark-text last:border-0">
          <span class="w-8 shrink-0 text-right font-mono text-[11px] text-dark-textMuted/60">{{ row.rank }}</span>
          <img v-if="row.headshot" :src="row.headshot" :alt="row.name" loading="lazy" @error="onImgErr"
               class="h-7 w-7 shrink-0 rounded-full bg-dark-border object-cover" />
          <span v-else class="h-7 w-7 shrink-0 rounded-full bg-dark-border" />
          <span class="min-w-0 flex-1 truncate">
            {{ row.name }}
            <span class="ml-1 font-mono text-[10px] text-dark-textMuted/70">{{ row.position }} · {{ row.team }}</span>
            <!--
              WHICH columns he wins, not just how many deviations he is worth in total. The sum
              is what ranks him; this is what tells you whether he fixes YOUR team. Two players
              at 5.0 are not the same player when one brings goals and the other penalty
              minutes, which is the whole way a category league differs from a points one.
            -->
            <!--
              NOT PLAYING, said on the row rather than left for the reader to know. A board
              that ranked Cale Makar twelfth while he was listed OUT was answering a question
              about talent when the person reading it was asking one about this week. The rate
              cannot know this — an injury is a fact about the present, not a measured rate —
              so it comes from ESPN, which is what the league itself shows.
            -->
            <span v-if="injuryLabel(row.injuryStatus)"
                  class="ml-1 rounded px-1 py-0.5 font-mono text-[9px] font-bold uppercase"
                  :class="row.injuryStatus === 'DAY_TO_DAY'
                    ? 'bg-[#e69a4a]/20 text-[#e69a4a]' : 'bg-[#ef4444]/20 text-[#ef4444]'"
            >{{ injuryLabel(row.injuryStatus) }}</span>
            <span v-for="w in row.wins" :key="w"
                  class="ml-1 rounded bg-dark-bg px-1 py-0.5 font-mono text-[9px] uppercase text-[#2dd4bf]">{{ w }}</span>
            <!--
              THE SAMPLE, as a number rather than an adjective.
              This was the word "thin", which told a reader that something was uncertain
              without telling them how uncertain. Nine games and nineteen games are both thin
              and they are not the same claim. The number also does work the rest of the row
              cannot: the GP column shows the games he is EXPECTED to play, so a rookie rated
              off nine appearances reads as an 82-game player with nothing to say otherwise.
              Shown only below twenty, because past that the sample is the answer.
            -->
            <span v-if="row.gamesPlayed > 0 && row.gamesPlayed < 20"
                  class="ml-1 font-mono text-[9px] uppercase text-[#e69a4a]"
                  :title="`Rated off only ${row.gamesPlayed} games — mostly last season and the league average`"
            >{{ row.gamesPlayed }} gp</span>
          </span>
          <span v-if="active !== 'G'" class="hidden w-12 shrink-0 text-right font-mono text-[10px] text-dark-textSecondary sm:block">
            {{ (row.ppSecondsPerGame / 60).toFixed(1) }}
          </span>
          <span class="hidden w-12 shrink-0 text-right font-mono text-[10px] text-dark-textSecondary sm:block">
            {{ active === 'G' ? row.pointsPerGame.toFixed(0) : row.pointsPerGame.toFixed(2) }}
          </span>
          <span class="w-12 shrink-0 text-right font-mono text-xs">
            {{ mode === 'points' ? Math.round(row.value) : row.value.toFixed(1) }}
          </span>
        </div>

        <button
          v-if="!expanded && pool.length > visible.length"
          class="mt-3 w-full rounded-lg border border-dark-border bg-dark-bg/60 py-2 font-mono text-[11px] text-dark-textSecondary transition-colors hover:text-dark-text"
          @click="expanded = true"
        >Show all {{ Math.min(pool.length, FULL_DEPTH) }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useHockeyRankings } from '@/composables/useHockeyRankings'

const { rows, goalies, loading, ready, missing, categories, fromLeague, mode } = useHockeyRankings()

/* Skater positions as the NHL spells them, plus goalies as their own list. */
const POSITIONS = ['ALL', 'C', 'L', 'R', 'D', 'G'] as const
const active = ref<string>('ALL')

const expanded = ref(false)
const DEPTH = 50
const FULL_DEPTH = 200

watch(active, () => { expanded.value = false })

const pool = computed(() => {
  if (active.value === 'G') return goalies.value
  if (active.value === 'ALL') return rows.value
  /* Re-ranked within the position, so the numbers read 1..n rather than the gaps a filtered
     overall list would leave. A defenceman being "20th" is a different claim from his being
     the best defenceman available, and only one of them helps. */
  return rows.value.filter((r) => r.position === active.value)
    .map((r, i) => ({ ...r, rank: i + 1 }))
})
const visible = computed(() => pool.value.slice(0, expanded.value ? FULL_DEPTH : DEPTH))

/*
 * ESPN's designations, shortened to what fits on a row. ACTIVE never arrives — the feed drops
 * it deliberately, because a flag on every healthy player is a flag that says nothing.
 */
const INJURY_LABEL: Record<string, string> = {
  OUT: 'OUT',
  INJURY_RESERVE: 'IR',
  DAY_TO_DAY: 'DTD',
  SUSPENSION: 'SUSP',
}
function injuryLabel(status: string | null): string {
  return status ? INJURY_LABEL[status] ?? '' : ''
}

function onImgErr(e: Event) {
  const el = e.target as HTMLImageElement
  el.style.visibility = 'hidden'
}

/* Nobody having played is one fact about the board, not a property of nine hundred players, so
   it is stated once above rather than stamped on each row. Read off games rather than a derived
   confidence, because the sentence it controls is literally "nobody has played yet". */
const allThin = computed(() => rows.value.length > 0 && rows.value.every((r) => r.gamesPlayed === 0))
</script>
