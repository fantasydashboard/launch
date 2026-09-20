<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useToday } from '@/composables/useToday'
import type { ScoredPlay } from '@/today/todayBoard'
import { teamLogoFor } from '@/players/teamLogo'
import { wordsFor } from '@/lib/sportWords'
import { useDailyLineup } from '@/composables/useDailyLineup'
import DailyLineupPanel from '@/components/today/DailyLineupPanel.vue'
import DailyRankingsPanel from '@/components/today/DailyRankingsPanel.vue'
import TodayMatchupHeader from '@/components/today/TodayMatchupHeader.vue'
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

const { vm, loading, error, load, isPoints, budget, categories } = useToday()
/*
 * THE MATCHUP BELONGS ON THIS PAGE, NOT ITS OWN TAB. The reason to care who you are playing
 * is that it changes what you do tonight — comfortably ahead you conserve moves, behind in
 * two categories you stream for them. Split across two tabs, the second page was answering a
 * question the first one asked.
 */
const thisWeek = useThisWeekMatchup()
const teamSource = useActivePointsSource()
const isCategoryLeague = computed(() => !isPoints.value)
/* Category specs drive the column strip; a points league passes none and gets the score. */
onMounted(() => {
  thisWeek.load((categories.value ?? []).map((c) => ({ statId: c.statId, label: c.label })))
  /* These composables do not self-load. Without this the roster is empty, so the lineup and
     rankings render nothing and the header falls back to "My Team" — which is exactly what
     shipped. */
  teamSource.load()
  daily.load()
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

const bar = (bucket: number) => '▓'.repeat(bucket) + '░'.repeat(6 - bucket)

const scoreBar = (score: number) => bar(Math.round((Math.max(0, Math.min(100, score)) / 100) * 6))

const moveBar = (p: ScoredPlay) => scoreBar(p.barPct ?? p.score)
const scoreText = (p: ScoredPlay) => (isPoints.value ? `${Math.round(p.score)} pts` : String(p.score))

function dropLabel(play: ScoredPlay): string | null {
  if (play.noCleanDrop) return 'no clean drop — you’d be cutting into value'
  if (play.drop) return `drop ${play.drop.name} (${play.drop.reason})`
  return null
}

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
const showEmpty = computed(() => noGames.value || (!loading.value && hasNothing.value))
const showFailed = computed(() => error.value === 'failed')

function fillLabel(play: ScoredPlay): string {
  return play.kind === 'startSit' ? `(free) start ${play.name} from your bench` : `add ${play.name}`
}

// Team-logo <img> load failure → hide the broken image (mirrors PointsWireView.vue's onLogoErr).
const onLogoErr = (e: Event) => ((e.target as HTMLElement).style.display = 'none')
// Headshot <img> load failure → fall back to the neutral placeholder circle by swapping which
// element renders, mirroring the v-if/v-else pattern used elsewhere for a missing headshot.
// Keyed by playerKey (not object identity) so the flag survives the board's re-computation.
const brokenHeadshots = reactive(new Set<string>())
function onHeadshotErr(playerKey: string) {
  brokenHeadshots.add(playerKey)
}
function hasHeadshot(play: ScoredPlay): boolean {
  return !!play.headshot && !brokenHeadshots.has(play.playerKey)
}

function reasonLabel(reason: string): string {
  if (reason === 'off-day') return 'off today'
  if (reason === 'injured') return 'injured'
  return 'empty'
}

const budgetBanner = computed(() => {
  const b = budget.value
  if (b.kind === 'count') return `${b.remaining} of ${b.limit} adds left ${b.period === 'week' ? 'this week' : 'this season'}`
  if (b.kind === 'faab') return b.budget != null ? `$${b.remaining} of $${b.budget} FAAB left` : `$${b.remaining} FAAB left`
  return null
})
function budgetTagText(p: ScoredPlay): string | null {
  if (p.budgetTag === 'worth-add') return '✓ worth an add'
  if (p.budgetTag === 'worth-bid') return 'worth a bid'
  if (p.budgetTag === 'save-add') return budget.value.kind === 'faab' ? 'no FAAB budget left' : 'save your add'
  return null
}
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
        :snapshot="thisWeek.snapshot.value"
        :my-team-name="teamSource.myTeamName.value"
        :my-team-logo="teamSource.myTeamLogo.value"
        :is-category="isCategoryLeague" />

      <!-- Dark night is a real answer, and it belongs inside the page rather than instead of it. -->
      <p v-if="noGames"
         class="mb-5 rounded-xl border border-dark-border bg-dark-card px-4 py-3 text-center font-mono text-[11px] text-dark-textMuted">
        No {{ words.league }} games today &mdash; the board lights up when games resume.
      </p>

      <!-- 2. YOUR LINEUP, AND THE ONE WE'D SET -->
      <DailyLineupPanel
        :current="daily.current.value" :optimal="daily.lineup.value"
        :bench="daily.bench.value"
        :value-label="isPoints ? 'projected points' : 'category value'" />

      <!-- ── TONIGHT'S RANKINGS ──────────────────────────────────────────── -->
      <DailyRankingsPanel :rows="daily.rankings.value"
                          :slot-order="Object.keys(teamSource.rosterSlots.value ?? {})" />
    </template>
  </div>
</template>
