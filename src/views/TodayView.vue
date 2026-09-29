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
import SeasonBreakPanel from '@/components/today/SeasonBreakPanel.vue'
import WireAddsPanel from '@/components/today/WireAddsPanel.vue'
import MatchupWinProbChart from '@/components/matchup/MatchupWinProbChart.vue'
import { useWinProbTrend } from '@/composables/useWinProbTrend'
import { useSeasonPhase } from '@/composables/useSeasonPhase'
import { showsHockeyBoardTab } from '@/lib/navTabs'

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

/*
 * BEFORE THE SEASON IS NOT THE SAME STATE AS A DARK NIGHT.
 *
 * Both have no games, so every block below renders nothing and the page falls through to
 * "the board lights up when games resume" — a sentence that is true in February and a lie in
 * September. See useSeasonPhase: this reads the NHL's own regularSeasonStartDate rather than
 * guessing from an empty slate, so a failed fetch stays 'unknown' and renders what shipped
 * before instead of hiding a live board.
 *
 * Note App.vue has its own `nhlSeasonStarted`, which answers a DIFFERENT question — does the
 * stats feed have rows yet — for a different purpose, whether to offer the Draft Board. It is
 * deliberately not unified here: that flag gates navigation and this one gates a page.
 */
const season = useSeasonPhase()
onMounted(() => season.load())
const isPreseason = computed(() => season.phase.value === 'before')
/* Both ends of the calendar suppress the same blocks: with no slate coming, a lineup, a set
   of closest calls and a ranking of tonight are all descriptions of nothing. */
const onBreak = computed(() => isPreseason.value || season.phase.value === 'after')
const platformName = computed(() => ({
  yahoo: 'Yahoo', espn: 'ESPN', sleeper: 'Sleeper',
}[String(leagueStore.activePlatform ?? '')] ?? 'this platform'))

/*
 * HOW THE WEEK HAS MOVED, which football already draws and this page did not.
 *
 * The same composable football uses, asked the daily question — and a hockey week suits it
 * better than a football one does. Football records four points, Friday to Monday, because
 * that is when its games are; a hockey week has games on most nights, so the line actually
 * describes a path rather than joining up a handful of dots.
 *
 * It only draws once the number has genuinely moved. A flat line across a week is not a
 * trend, and drawing one implies a story the data does not contain.
 */
const liveWinPct = computed(() =>
  isCategoryLeague.value
    ? (thisWeek.snapshot.value?.winPct ?? 0)
    : (matchup.snapshot.value?.winPct ?? 0))
const trend = useWinProbTrend({
  leagueId: computed(() => leagueStore.activeLeagueId),
  week: computed(() => leagueStore.currentWeek ?? 1),
  my: liveWinPct,
  opp: computed(() => 100 - liveWinPct.value),
  daysRemaining: computed(() => thisWeek.snapshot.value?.daysRemaining ?? 0),
  ready: computed(() => !onBreak.value && liveWinPct.value > 0),
})
const trendMoved = computed(() => {
  const vals = trend.points.map((pt) => pt.my)
  if (vals.length < 2) return false
  return Math.max(...vals) - Math.min(...vals) >= 1
})
const myName = computed(() =>
  matchup.snapshot.value?.me.name || daily.myTeamName.value || teamSource.myTeamName.value || 'You')
const oppName = computed(() =>
  matchup.snapshot.value?.opp.name || thisWeek.snapshot.value?.opponentName || 'Opponent')
const hasDraftBoard = computed(() => showsHockeyBoardTab({
  sport: leagueStore.activeSport,
  platform: leagueStore.activePlatform,
  seasonStarted: false,
}))

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
      <SeasonBreakPanel v-if="onBreak"
                        :phase="isPreseason ? 'before' : 'after'"
                        :starts-when="season.startsWhen.value"
                        :start-date-label="season.startDateLabel.value"
                        :end-date-label="season.endDateLabel.value"
                        :opening-games="season.openingGames.value"
                        :has-draft-board="hasDraftBoard" />

      <!-- 1. WHERE THE WEEK STANDS -->
      <TodayMatchupHeader
        :daily="matchup.snapshot.value"
        :snapshot="thisWeek.snapshot.value"
        :my-team-name="daily.myTeamName.value || teamSource.myTeamName.value"
        :my-team-logo="daily.myTeamLogo.value || teamSource.myTeamLogo.value"
        :is-category="isCategoryLeague" />

      <!-- 1a. THE PATH THE WEEK HAS TAKEN. Drawn only once it has actually moved. -->
      <section v-if="!onBreak && trendMoved"
               class="mb-5 rounded-xl border border-dark-border bg-dark-card p-4">
        <div class="mb-1 flex items-baseline justify-between">
          <h2 class="font-display text-xs font-semibold uppercase tracking-wide text-dark-textMuted">
            Win-probability trend
          </h2>
          <p class="font-mono text-[9px] text-dark-textMuted">solid = recorded &middot; dotted = projected</p>
        </div>
        <MatchupWinProbChart :points="trend.points" :projected="trend.projected"
                             :me-name="myName" :opp-name="oppName" />
      </section>

      <!-- 1b. SEAT BY SEAT — the section football leans on, asked about tonight. -->
      <TodayMatchupSpots v-if="matchup.snapshot.value"
                         :spots="matchup.snapshot.value.spots"
                         :opp-name="matchup.snapshot.value.opp.name"
                         :my-name="matchup.snapshot.value.me.name" />

      <!-- Dark night is a real answer, and it belongs inside the page rather than instead of it.
           "Resume" is only honest once the season has started; before it, say so. -->
      <p v-if="noGames && !onBreak"
         class="mb-5 rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-center font-mono text-[11px] text-dark-textMuted">
        No {{ words.league }} games today &mdash; the board lights up when games resume.
      </p>

      <!-- 2. YOUR LINEUP, AND THE ONE WE'D SET
           Suppressed before opening night: with no slate every seat reads "no game", which is
           a screen of grey that teaches nothing and buries the one thing worth saying. -->
      <DailyLineupPanel v-if="!onBreak"
        :current="daily.current.value" :optimal="daily.lineup.value"
        :bench="daily.bench.value"
        :value-label="daily.valueLabel.value"
        :can-value="daily.canValue.value"
        :values-unsupported="daily.categoryUnsupported.value" />

      <!-- ── TONIGHT'S RANKINGS ──────────────────────────────────────────── -->
      <!-- 2b. CLOSEST CALLS — the decisions where we do NOT have a real opinion, which is
           worth more daily than weekly because the same call returns every night. -->
      <section v-if="!onBreak && daily.closestCalls.value.length"
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

      <!-- 2c. THE WIRE, asked about tonight. Football's closing block, which this page lacked. -->
      <WireAddsPanel v-if="!onBreak"
                     :adds="daily.wireAdds.value"
                     :value-label="daily.valueLabel.value" />

      <DailyRankingsPanel v-if="!onBreak && daily.canValue.value"
                          :rows="daily.rankings.value"
                          :scarcity="daily.scarcity.value"
                          :opp-name="matchup.snapshot.value?.opp.name"
                          :slot-order="Object.keys(teamSource.rosterSlots.value ?? {})" />
      <!-- Absent with a reason. A panel that simply disappears reads as a page still loading,
           and a board of zeroes reads as a ranking — so say which of the two this is. -->
      <!-- Two different facts, and they were printing as one. "Still reading" is true while a
           fetch is in flight; on a platform we cannot price categories for, nothing is in
           flight and that sentence never stops being on screen. -->
      <p v-else-if="!onBreak" class="mt-5 rounded-xl border border-dark-border bg-dark-bg/40 px-4 py-6 text-center font-mono text-[11px] text-dark-textMuted">
        <template v-if="daily.categoryUnsupported.value">
          We can't price category leagues on {{ platformName }} yet, so there are no rankings
          tonight &mdash; your lineup and who plays are still right.
        </template>
        <template v-else>
          Still reading the projection universe that tonight's category values are measured against.
        </template>
      </p>
    </template>
  </div>
</template>
