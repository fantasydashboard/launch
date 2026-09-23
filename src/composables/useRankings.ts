import { computed, onMounted, watch, type ComputedRef } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { useFootballWire } from '@/composables/useFootballWire'
import { useFootballScoring } from '@/composables/useFootballScoring'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import { usePublicRankings, publicWeeksLeft } from '@/composables/usePublicRankings'
import { rankingsAccess, type RankingsAccess } from '@/football/rankingsAccess'
import type { BoardRow } from '@/football/footballWire'
import type { FootballScoringSource } from '@/football/footballScoring'

/** Column order tabs are offered in. A league board can show K/DEF; the public board never
 *  has them, so filtering this list down to what the active board actually populated is what
 *  keeps both boards' tabs honest without maintaining two lists. */
const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

/**
 * Which board Rankings shows.
 *
 * There is no second data path here, deliberately. `useFootballWire` already assembles the
 * board this page wants — every player, tiered, with `owned`, `free` and `ownerName` on each
 * row, scored for the league — because the Wire was built on it before the board moved out.
 * Rankings reads that same object rather than rebuilding it, which is the only way two pages
 * showing one ranked list can be guaranteed to agree: they are not two lists that match, they
 * are one list rendered twice.
 *
 * The public board stays for readers with no league. It is a genuinely different question —
 * standard scoring, nobody's roster — not a degraded version of the same one.
 */
export function useRankings(): {
  board: ComputedRef<Record<string, BoardRow[]>>
  positions: ComputedRef<string[]>
  loading: ComputedRef<boolean>
  ready: ComputedRef<boolean>
  access: ComputedRef<RankingsAccess>
  accessKnown: ComputedRef<boolean>
  scoringSource: ComputedRef<FootballScoringSource>
} {
  const leagueStore = useLeagueStore()
  const isFootball = computed(() => leagueStore.activeSport === 'football')
  /*
   * A football league, specifically, and the SAME ref that enables the league board below.
   *
   * Two things had to be true at once and were not. `savedLeagues.length` is sport-blind, so a
   * reader whose only league is baseball was told the board was "scored for your league" while
   * looking at the public one — and with a pass, got a ROSTERED pill on every row, because the
   * public board marks every entry unavailable.
   *
   * The second half is why this exact ref is passed as `enabled` rather than a broader
   * `activeSport === 'football'`: the broader one stays true when the active league is removed,
   * and the underlying source loader returns early without clearing its pool — so the wire went
   * on serving a board built from the league you just deleted, under copy saying no league was
   * loaded. One ref for both means the claim and the board cannot disagree.
   */
  const hasLeague = computed(
    () => leagueStore.activeSport === 'football' && !!leagueStore.activeLeagueId,
  )

  const publicRankings = usePublicRankings()
  const { hasFullAccess, accessKnown } = useFeatureAccess()

  const source = useActivePointsSource()
  const fbScoring = useFootballScoring()

  const pool = source.pool
  const rosterSlots = source.rosterSlots
  const myTeamKey = source.myTeamKey
  const leagueSize = source.leagueSize
  const teamNames = source.teamNames
  const season = computed(() => '') // useFootballProjections falls back to Sleeper NFL state season
  const weeksLeft = computed(() => publicWeeksLeft(leagueStore.currentWeek ?? 1))

  // Free agents minus anyone already rostered (the platform FA feed leaks rostered players) —
  // same guard PointsWireView applies before handing free agents to the Wire.
  const freeAgents = computed(() => {
    const rostered = new Set(pool.value.map((p) => p.playerKey))
    const guard = pool.value.length > 0
    return source.freeAgents.value.filter((fa) => !guard || !rostered.has(fa.playerKey))
  })

  const { wire: fbWire, loading: fbLoading } = useFootballWire({
    pool,
    freeAgents,
    slots: rosterSlots,
    teams: leagueSize,
    myTeamKey,
    season,
    enabled: hasLeague,
    weeksLeft,
    teamNames,
    scoring: fbScoring.weights,
  })

  function loadLeagueBoard() {
    if (!isFootball.value) return
    source.load()
    source.loadFreeAgents(200)
  }
  onMounted(loadLeagueBoard)
  watch(() => leagueStore.activeLeagueId, loadLeagueBoard)

  const leagueBoard = computed(() => fbWire.value?.board ?? null)
  const board = computed(() => leagueBoard.value ?? publicRankings.board.value)

  const positions = computed(() => {
    const b = board.value
    const withRows = POSITION_ORDER.filter((p) => b[p]?.length)
    return b.ALL?.length ? ['ALL', ...withRows] : withRows
  })

  const loading = computed(() =>
    hasLeague.value ? fbLoading.value : publicRankings.loading.value,
  )
  const ready = computed(() => !!board.value.ALL?.length)

  /* Not "no pass" until we have actually asked. Until then the page must not draw the locked
     state, or a pass holder watches their own page tell them they have not paid. */
  const access = computed(() =>
    rankingsAccess({
      hasLeague: hasLeague.value,
      hasPass: accessKnown.value ? hasFullAccess.value : true,
    }),
  )

  return {
    board,
    positions,
    loading,
    ready,
    access,
    accessKnown,
    scoringSource: fbScoring.source,
  }
}
