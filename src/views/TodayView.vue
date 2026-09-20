<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useToday } from '@/composables/useToday'
import { wordsFor } from '@/lib/sportWords'
import { useDailyLineup } from '@/composables/useDailyLineup'
import DailyLineupPanel from '@/components/today/DailyLineupPanel.vue'
import DailyRankingsPanel from '@/components/today/DailyRankingsPanel.vue'
import TodayMatchupHeader from '@/components/today/TodayMatchupHeader.vue'
import TodayMatchupSpots from '@/components/today/TodayMatchupSpots.vue'
import { useDailyMatchup } from '@/composables/useDailyMatchup'
import { useThisWeekMatchup } from '@/composables/useThisWeekMatchup'
import { useActivePointsSource } from '@/composables/useActivePointsSource'

const leagueStore = useLeagueStore()
const words = computed(() => wordsFor(leagueStore.activeSport))

/*
 * YOUR LINEUP, WHICH IS THE QUESTION THIS PAGE EXISTS FOR.
 *
 * Today was built around MOVES — streams, adds, sit alerts — which is the second thing a
 * manager wants. The first is "who do I start tonight out of what I already have", and the
 * page never answered it. This sits above the move board for that reason.
 */
const daily = useDailyLineup()

const { vm, loading, error, load, isPoints, categories } = useToday()
/*
 * THE MATCHUP BELONGS ON THIS PAGE, NOT ITS OWN TAB. The reason to care who you are playing
 * is that it changes what you do tonight — comfortably ahead you conserve moves, behind in
 * two categories you stream for them. Split across two tabs, the second page was answering a
 * question the first one asked.
 */
const thisWeek = useThisWeekMatchup()
const teamSource = useActivePointsSource()
const isCategoryLeague = computed(() => !isPoints.value)

/*
 * The scoreboard and the seat-by-seat both come from here, off ONE opponent fetch. The header
 * used to show a dash and "win chance unavailable" because the only matchup source on this
 * page counted category columns — a shape a points league does not have — while
 * buildPointsMatchup, which computes exactly the missing number, went uncalled.
 */
const matchup = useDailyMatchup({
  pool: daily.pool,
  valueByKey: daily.valueByKey,
  myTeamKey: daily.myTeamKey,
  myTeamName: daily.myTeamName,
  myTeamLogo: daily.myTeamLogo,
  rosterSlots: daily.rosterSlots,
  current: daily.current,
  todaySchedule: daily.schedule,
  weekSchedule: daily.weekSchedule,
  playsToday: daily.playsToday,
  isCategory: daily.isCategory,
})
/* Category specs drive the column strip; a points league passes none and gets the score. */
onMounted(() => {
  thisWeek.load((categories.value ?? []).map((c) => ({ statId: c.statId, label: c.label })))
  /* These composables do not self-load. Without this the roster is empty, so the lineup and
     rankings render nothing and the header falls back to "My Team" — which is exactly what
     shipped. */
  teamSource.load()
  daily.load()
  matchup.load()
})

// Today is a daily-optimizer built for baseball's game-by-game slate. Football is weekly, not
// daily, so the nav hides this tab for football leagues — but a direct nav to /today should still
// show a graceful, sport-appropriate message instead of the baseball framing.
const isFootball = computed(() => leagueStore.activeSport === 'football')

onMounted(() => load())
watch(() => leagueStore.activeLeagueId, () => load())

const today = computed(() =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
)

const board = computed(() => vm.value)
const hasNothing = computed(
  () =>
    !board.value.hero &&
    !board.value.openSlots.length &&
    !board.value.streamers.length,
)
// No MLB games at all (off-day / All-Star break) is different from "you have games but
// nothing to change" — keep the two apart so the copy doesn't imply a lineup is optimized
// on a day nobody plays.
const noGames = computed(() => error.value === 'no-games')
const showFailed = computed(() => error.value === 'failed')
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 pt-6 pb-20">
    <header class="mb-6">
      <h1 class="font-display text-2xl font-bold text-dark-text">Today</h1>
      <p class="font-mono text-xs text-dark-textMuted">{{ today }}</p>
      <p class="mt-1 font-mono text-xs text-dark-textMuted">
        <template v-if="isFootball">Weekly, not daily &mdash; football lives on This Week.</template>
        <template v-else>Set your lineup. Start the right players.</template>
      </p>
    </header>

    <!-- ── LOADING ─────────────────────────────────────────────────────────── -->
    <!-- `loading` now reflects the full board inputs (schedule + roster + free agents),
         not just the schedule fetch — so this stays up until the board is genuinely ready
         and the empty "you're set" copy can't flash in the gap. -->
    <div v-if="loading && hasNothing && !showFailed" class="py-16 text-center">
      <div class="inline-flex items-center gap-2 font-mono text-xs text-dark-textMuted">
        <span class="h-1.5 w-1.5 animate-ping rounded-full bg-primary"></span>
        Reading today's slate…
      </div>
    </div>

    <!-- ── FAILED ──────────────────────────────────────────────────────────── -->
    <div v-else-if="showFailed" class="py-16 text-center font-mono text-xs text-dark-textMuted">
      Couldn't load today's slate. Try refreshing.
    </div>

    <!--
      ONE SHAPE, EVERY DAILY LEAGUE. Points or categories, baseball or hockey, the page is the
      same three things in the same order: where the week stands, what you are starting
      against what you should start, and who is worth starting tonight. The old page branched
      into different layouts depending on whether there were moves to make, so two managers on
      the same morning saw structurally different products.
    -->
    <template v-else>
      <!-- 1. WHERE THE WEEK STANDS -->
      <TodayMatchupHeader
        :daily="matchup.snapshot.value"
        :snapshot="thisWeek.snapshot.value"
        :my-team-name="daily.myTeamName.value || teamSource.myTeamName.value"
        :my-team-logo="daily.myTeamLogo.value || teamSource.myTeamLogo.value"
        :is-category="isCategoryLeague" />

      <!-- 1b. SEAT BY SEAT — the section football leans on, asked about tonight. -->
      <TodayMatchupSpots v-if="matchup.snapshot.value"
                         :spots="matchup.snapshot.value.spots"
                         :opp-name="matchup.snapshot.value.opp.name"
                         :my-name="matchup.snapshot.value.me.name" />

      <!-- Dark night is a real answer, and it belongs inside the page rather than instead of it. -->
      <p v-if="noGames"
         class="mb-5 rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-center font-mono text-[11px] text-dark-textMuted">
        No {{ words.league }} games today &mdash; the board lights up when games resume.
      </p>

      <!-- 2. YOUR LINEUP, AND THE ONE WE'D SET -->
      <DailyLineupPanel
        :current="daily.current.value" :optimal="daily.lineup.value"
        :bench="daily.bench.value"
        :value-label="daily.valueLabel.value"
        :can-value="daily.canValue.value" />

      <!-- ── TONIGHT'S RANKINGS ──────────────────────────────────────────── -->
      <!-- 2b. CLOSEST CALLS — the decisions where we do NOT have a real opinion, which is
           worth more daily than weekly because the same call returns every night. -->
      <section v-if="daily.closestCalls.value.length"
               class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <h2 class="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
          Closest calls
          <span class="font-mono text-[10px] normal-case text-dark-textMuted/70">
            &middot; near coin-flips &mdash; the projection barely separates these
          </span>
        </h2>
        <div v-for="c in daily.closestCalls.value" :key="c.slot + c.start.playerKey"
             class="flex items-center gap-3 border-b border-dark-border/40 py-2 text-sm last:border-0">
          <span class="w-10 shrink-0 font-mono text-[10px] uppercase text-dark-textMuted">{{ c.slot }}</span>
          <span class="min-w-0 flex-1 truncate">
            <span class="font-semibold text-dark-text">{{ c.start.name }}</span>
            <span class="font-mono text-[11px] text-dark-textMuted"> {{ c.start.today.toFixed(1) }}</span>
            <span class="text-dark-textMuted"> over </span>
            <span class="text-dark-text">{{ c.over.name }}</span>
            <span class="font-mono text-[11px] text-dark-textMuted"> {{ c.over.today.toFixed(1) }}</span>
          </span>
          <span class="shrink-0 font-mono text-[11px] text-dark-textMuted">by {{ c.by.toFixed(1) }}</span>
        </div>
      </section>

      <DailyRankingsPanel v-if="daily.canValue.value"
                          :rows="daily.rankings.value"
                          :scarcity="daily.scarcity.value"
                          :opp-name="matchup.snapshot.value?.opp.name"
                          :slot-order="Object.keys(teamSource.rosterSlots.value ?? {})" />
      <!-- Absent with a reason. A panel that simply disappears reads as a page still loading,
           and a board of zeroes reads as a ranking — so say which of the two this is. -->
      <p v-else class="mt-5 rounded-xl border border-dark-border bg-dark-bg/40 px-4 py-6 text-center font-mono text-[11px] text-dark-textMuted">
        Still reading the projection universe tonight's category values are measured against.
      </p>
    </template>
  </div>
</template>
