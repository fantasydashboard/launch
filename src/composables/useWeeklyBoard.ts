import { computed, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { useFootballVor } from '@/composables/useFootballVor'
import { useFootballScoring } from '@/composables/useFootballScoring'
import { sleeperService } from '@/services/sleeper'
import { opponentMap } from '@/football/footballBye'
import { buildWeeklyBoard, RULED_OUT, type WeeklyBoard } from '@/football/weeklyBoard'
import { useThisWeekOpponent } from '@/composables/useThisWeekOpponent'
import { usePointsValue } from '@/composables/usePointsValue'
import { useSeasonOutlook } from '@/composables/useSeasonOutlook'
import { seasonStakes, type Stakes } from '@/myteam/seasonStakes'
import { fetchPublishedWeekly, type PublishedWeekly } from '@/services/weeklyRankings'
import { blendBoardWithList } from '@/football/weeklyBlend'
import { getImpliedTeamTotals, getGameStates, type GameState } from '@/services/gameLines'
import { getSeasonLines } from '@/services/playerUsage'
import { buildAllowed, rankAllowed } from '@/football/defenseAllowed'
import { startingSlotOrder } from '@/trades/rosterSlots'
import { adjustQbForEnvironment, meanImplied, type ImpliedTotals } from '@/football/gameEnvironment'
import type { SleeperRoster } from '@/types/sleeper'

/**
 * The football "This Week" board: optimal weekly lineup vs the manager's set
 * lineup + streamers. `live` gates on the NFL state's season_type (regular/post);
 * offseason yields live=false and a null board (the view shows an empty state).
 */
export function useWeeklyBoard(): {
  board: ComputedRef<WeeklyBoard | null>
  live: Ref<boolean>
  currentWeek: Ref<number>
  hasCurrentLineup: ComputedRef<boolean>
  loading: ComputedRef<boolean>
  myTeamName: ComputedRef<string>
  myTeamLogo: ComputedRef<string>
  stakes: ComputedRef<Stakes | null>
  weekSource: ComputedRef<string>
  /** True when the active weekly list declares its own tiers and the board is using them. */
  sourceTiers: ComputedRef<boolean>
  /** The published weekly list for this week, when one exists. */
  publishedWeek: Ref<PublishedWeekly | null>
  reloadPublished: () => Promise<void>
  /** True when the viewer is in this league without a roster — no lineup, no matchup. */
  spectator: ComputedRef<boolean>
  outlook: ComputedRef<ReturnType<typeof useSeasonOutlook>['outlook']['value']>
  /** NFL season the board is live for (0 until the state loads). */
  nflSeason: Ref<number>
} {
  const leagueStore = useLeagueStore()
  const isFootball = computed(() => leagueStore.activeSport === 'football')
  const src = useActivePointsSource()
  const season = computed(() => '') // useFootballVor falls back to the Sleeper NFL state season
  const fbScoring = useFootballScoring()

  const { vorByKey, loading: vorLoading } = useFootballVor({
    pool: src.pool,
    freeAgents: src.freeAgents,
    slots: src.rosterSlots,
    teams: src.leagueSize,
    season,
    enabled: isFootball,
    scoring: fbScoring.weights,
  })

  /* This Week is now the Sunday page: the fantasy opponent belongs here, beside the lineup
     it is measured against, rather than on a separate tab computed from a different model. */
  const oppSvc = useThisWeekOpponent()

  const live = ref(false)
  const currentWeek = ref(0)
  const opponentByTeam = ref<Record<string, { opp: string; home: boolean }>>({})
  const scheduleLoading = ref(false)
  const publishedWeek = ref<PublishedWeekly | null>(null)
  const nflSeason = ref(0)
  async function reloadPublished() {
    publishedWeek.value = live.value && nflSeason.value && currentWeek.value
      ? await fetchPublishedWeekly('football', nflSeason.value, currentWeek.value)
      : null
  }

  async function loadWeek() {
    if (!isFootball.value) { live.value = false; return }
    scheduleLoading.value = true
    try {
      const state = await sleeperService.getNflState()
      const st = String(state.season_type || '')
      live.value = st === 'regular' || st === 'post'
      currentWeek.value = Number(state.week) || 0
      nflSeason.value = Number(state.season) || 0
      opponentByTeam.value =
        live.value && currentWeek.value
          ? opponentMap(await sleeperService.getNflSchedule(state.season, currentWeek.value, st))
          : {}
      await reloadPublished()
    } catch (e) {
      console.error('[useWeeklyBoard] load failed', e)
      live.value = false
      opponentByTeam.value = {}
    } finally {
      scheduleLoading.value = false
    }
  }

  function init() {
    src.load()
    src.loadFreeAgents(200)
    loadWeek()
    oppSvc.load()
  }
  onMounted(init)
  watch(() => leagueStore.activeLeagueId, init)

  // The manager's set lineup comes from the Sleeper roster; ESPN/Yahoo football
  // leagues have no equivalent here, so the board falls back to "optimal only"
  // (no moves) and the view suppresses any already-optimal claim.
  const currentStarters = computed<string[]>(() => {
    const mine = (leagueStore.rosters as any as SleeperRoster[])?.find(
      (r) => String(r.roster_id) === src.myTeamKey.value,
    )
    return (mine?.starters ?? []).filter(Boolean)
  })
  const hasCurrentLineup = computed(() => currentStarters.value.length > 0)

  const nameByKey = computed(() => {
    const m = new Map<string, { name: string; position: string; team: string; status: string }>()
    const status = (s: unknown) => String(s ?? '').toUpperCase().trim()
    for (const p of src.pool.value) m.set(p.playerKey, { name: p.name, position: p.position ?? '', team: p.proTeam ?? '', status: status(p.status) })
    for (const fa of src.freeAgents.value)
      m.set(fa.playerKey ?? `fa:${fa.name}`, { name: fa.name, position: fa.position ?? '', team: fa.team ?? '', status: status(fa.status) })
    return m
  })
  /*
   * This week's implied team totals, for the quarterback adjustment below.
   *
   * Loaded best-effort and independently of everything else: an empty map means no adjustment
   * at all, which is the correct behaviour when the games are not priced yet rather than a
   * reason to hold up the board.
   */
  const impliedTotals = ref<ImpliedTotals>({})
  /* Which games have kicked off, from the same scoreboard. Loaded beside the totals rather
     than inside them so a failure in one never silently decides the other. */
  const gameStates = ref<Record<string, GameState>>({})
  watch(live, async (isLive) => {
    if (!isLive) return
    impliedTotals.value = await getImpliedTeamTotals()
    gameStates.value = await getGameStates()
  }, { immediate: true })

  /*
   * How each defence has actually held up, by position — the one difficulty number a start/sit
   * needs and the board never had.
   *
   * The Wire has printed rest-of-season and next-four difficulty for a while off exactly this
   * pipeline; This Week showed neither, nor the matchup directly in front of the player. Same
   * source, same adjustment for the offences each defence has faced, so the two pages cannot
   * disagree about who is a soft matchup.
   *
   * `currentWeek`, not `currentWeek - 1`: a league stays on a week until the next opens, so
   * subtracting one skipped the week that had just finished, and on the Tuesday after week one
   * left every column blank. getSeasonLines drops weeks nobody has played.
   */
  const matchupRankByPos = ref<Record<string, Record<string, number>>>({})
  watch([live, () => leagueStore.currentWeek], async ([isLive, week]) => {
    if (!isLive) return
    const lines = await getSeasonLines(new Date().getFullYear(), Number(week ?? 1))
    if (!lines.length) { matchupRankByPos.value = {}; return }
    const allowed = buildAllowed(lines)
    const out: Record<string, Record<string, number>> = {}
    for (const pos of ['QB', 'RB', 'WR', 'TE']) out[pos] = rankAllowed(allowed, pos)
    matchupRankByPos.value = out
  }, { immediate: true })

  /*
   * Quarterbacks only, scaled by how many points their own offence is expected to score.
   *
   * Against an analyst's weekly lists our ordering already matched at running back (0.95),
   * receiver (0.91) and tight end (0.88); quarterback was the outlier at 0.79, and the misses
   * ran one way — he was higher on passers in high-scoring games, we were higher on passers in
   * low-scoring ones. Herbert at an implied 28.5 was his QB4 and our QB14; Bo Nix at 19.75 was
   * our QB12 and his QB21. Applying the fitted adjustment lifts that correlation to 0.90.
   *
   * A quarterback's week is mostly a function of how much his offence scores. A receiver's is
   * mostly target share, which the game total barely moves — hence the scope.
   */
  const environmentVor = computed(() => {
    const base = vorByKey.value
    const implied = impliedTotals.value
    const mean = meanImplied(implied)
    if (blendedPoints.value || !mean || !Object.keys(base).length) return base
    const out: typeof base = {}
    for (const [k, v] of Object.entries(base)) {
      const meta = nameByKey.value.get(k)
      const pos = (meta?.position ?? '').toUpperCase().split(/[,/|]/)[0].trim()
      out[k] = pos === 'QB'
        ? { ...v, pointsNextWeek: adjustQbForEnvironment(v.pointsNextWeek, meta?.team, implied, mean) }
        : v
    }
    return out
  })

  /*
   * The published weekly list blended into our points per position (see weeklyBlend), or null
   * when there is no list OR it blended to nothing — a row that matches no one must behave
   * exactly like no list, so everything downstream gates on this rather than on the row.
   *
   * Built from the un-adjusted base (vorByKey) so it cannot loop through environmentVor.
   * The ladder is the players who can actually play this week: ruled-out and bye players are
   * dropped before it is built (as position-tiers.py does) and keep their base value.
   */
  const blendedPoints = computed<Record<string, number> | null>(() => {
    const base = vorByKey.value
    const list = publishedWeek.value
    if (!list || !Object.keys(base).length) return null
    const normPos = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()
    const scheduleKnown = Object.keys(opponentByTeam.value).length > 0
    const names: { playerKey: string; name: string; position: string }[] = []
    const entries: { playerKey: string; value: number; position: string }[] = []
    for (const [k, v] of Object.entries(base)) {
      const meta = nameByKey.value.get(k)
      if (meta && RULED_OUT.has(meta.status)) continue
      if (scheduleKnown && !opponentByTeam.value[(meta?.team ?? '').toUpperCase()]) continue
      const position = normPos(meta?.position ?? '')
      entries.push({ playerKey: k, value: v.pointsNextWeek, position })
      names.push({ playerKey: k, name: meta?.name ?? '', position })
    }
    return blendBoardWithList(entries, names, list.body)
  })

  const effectiveVor = computed(() => {
    const blended = blendedPoints.value
    if (!blended) return environmentVor.value
    const out: typeof vorByKey.value = {}
    for (const [k, v] of Object.entries(vorByKey.value)) out[k] = { ...v, pointsNextWeek: blended[k] ?? v.pointsNextWeek }
    return out
  })

  /*
   * You can be in a Sleeper league without holding a roster — a commissioner, or somebody
   * following along. sleeperMyTeamKey returns '' for them because no roster's owner_id
   * matches, and everything personal on this page is correctly empty as a result.
   */
  /* Tiers are drawn on the blended points, so no source declares its own. */
  const weekTierByKey = computed<Record<string, number>>(() => ({}))

  const starterSlots = computed(() =>
    startingSlotOrder(
      leagueStore.activePlatform ?? '',
      leagueStore.activePlatform === 'sleeper'
        ? { roster_positions: (leagueStore.currentLeague as any)?.roster_positions ?? [] }
        : {},
      leagueStore.activeSport,
    ))

  const spectator = computed(() => !src.myTeamKey.value)

  const board = computed<WeeklyBoard | null>(() => {
    /*
     * A missing team is no longer a reason to render nothing.
     *
     * The guard treated an empty myTeamKey as a failure and the page said "Couldn't assemble
     * this week's board" for a league whose data had loaded perfectly. Most of what is here
     * never needed a team: the rankings, what each position costs on the wire and the
     * streamers are facts about the LEAGUE. Only the lineup, the start/sit and the matchup are
     * personal, and the builder already returns those empty rather than inventing them.
     */
    if (!isFootball.value || !live.value || !Object.keys(effectiveVor.value).length) return null
    return buildWeeklyBoard({
      pool: src.pool.value,
      vorByKey: effectiveVor.value,
      slots: src.rosterSlots.value,
      myTeamKey: src.myTeamKey.value,
      currentStarters: currentStarters.value,
      freeAgents: src.freeAgents.value,
      opponentByTeam: opponentByTeam.value,
      oppTeamKey: oppSvc.opponent.value?.opponentKey,
      oppTeamName: oppSvc.opponent.value?.opponentName,
      oppTeamLogo: oppSvc.opponent.value?.opponentLogo,
      teamNames: src.teamNames.value,
      tierByKey: weekTierByKey.value,
      /* Their real decision, and the points already on the board — both off the matchup
         payload useThisWeekOpponent already fetches, so neither costs a request. */
      oppStarterKeys: oppSvc.opponent.value?.opponentStarters ?? [],
      actualPoints: oppSvc.opponent.value?.actualPoints ?? {},
      gameStates: gameStates.value,
      /* The league's own slot order, so a set lineup can be read positionally instead of
         re-solved. Without it a receiver lands in the flex because that is where the solver
         would have played him, not where his manager did. */
      starterSlots: starterSlots.value,
      myStarterKeys: oppSvc.opponent.value?.myStarters ?? [],
      matchupRankByPos: matchupRankByPos.value,
    })
  })

  /*
   * Season context. This lived on the Matchup page and was stranded when that tab was hidden
   * for football — along with a 0-0 fix and football copy written for it days earlier. It
   * belongs beside the lineup: what a week is worth depends on where the season stands.
   */
  const { valueByKey } = usePointsValue({
    pool: src.pool,
    fgByKey: src.fgByKey,
    sport: computed(() => leagueStore.activeSport),
    season,
    leagueId: computed(() => String(leagueStore.activeLeagueId ?? '')),
})
  const { outlook } = useSeasonOutlook({
    pool: src.pool,
    valueByKey,
    rosterSlots: src.rosterSlots,
    myTeamKey: src.myTeamKey,
    teamMeta: src.teamMeta,
  })
  const stakes = computed<Stakes | null>(() => {
    const o = outlook.value
    if (!o) return null
    const leagueSize = new Set(src.pool.value.map((p) => p.teamKey)).size
    if (!leagueSize) return null
    return seasonStakes({
      rank: o.recordRank,
      leagueSize,
      weeksLeft: Math.max(0, leagueStore.playoffWeekStart - leagueStore.currentWeek),
      playoffSpots: Math.ceil(leagueSize / 2),
      // At 0-0 the rank is a tiebreak artifact; seasonStakes says so rather than inventing one.
      gamesPlayed: o.record.wins + o.record.losses + o.record.ties,
    })
  })

  const loading = computed(() => scheduleLoading.value || vorLoading.value || src.loading.value)

  return {
    board, live, currentWeek, hasCurrentLineup, loading,
    myTeamName: src.myTeamName, myTeamLogo: src.myTeamLogo,
    stakes, outlook, spectator,
    /** Whose weekly numbers are driving the page — 'UFD' unless a list is active. */
    weekSource: computed(() => (blendedPoints.value ? 'UFD weekly rankings' : 'UFD')),
    sourceTiers: computed(() => false),
    publishedWeek,
    reloadPublished,
    nflSeason,
  }
}
