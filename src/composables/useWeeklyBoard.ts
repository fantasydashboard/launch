import { computed, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useActivePointsSource } from '@/composables/useActivePointsSource'
import { useFootballVor } from '@/composables/useFootballVor'
import { sleeperService } from '@/services/sleeper'
import { opponentMap } from '@/football/footballBye'
import { buildWeeklyBoard, type WeeklyBoard } from '@/football/weeklyBoard'
import { useThisWeekOpponent } from '@/composables/useThisWeekOpponent'
import { usePointsValue } from '@/composables/usePointsValue'
import { useSeasonOutlook } from '@/composables/useSeasonOutlook'
import { seasonStakes, type Stakes } from '@/myteam/seasonStakes'
import { useCustomRankings } from '@/composables/useCustomRankings'
import { applyRankingOrder } from '@/draft/room/customRankings'
import { getImpliedTeamTotals } from '@/services/gameLines'
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
  /** True when the viewer is in this league without a roster — no lineup, no matchup. */
  spectator: ComputedRef<boolean>
  outlook: ComputedRef<ReturnType<typeof useSeasonOutlook>['outlook']['value']>
} {
  const leagueStore = useLeagueStore()
  const isFootball = computed(() => leagueStore.activeSport === 'football')
  const src = useActivePointsSource()
  const season = computed(() => '') // useFootballVor falls back to the Sleeper NFL state season

  const { vorByKey, loading: vorLoading } = useFootballVor({
    pool: src.pool,
    freeAgents: src.freeAgents,
    slots: src.rosterSlots,
    teams: src.leagueSize,
    season,
    enabled: isFootball,
  })

  /* This Week is now the Sunday page: the fantasy opponent belongs here, beside the lineup
     it is measured against, rather than on a separate tab computed from a different model. */
  const oppSvc = useThisWeekOpponent()

  const live = ref(false)
  const currentWeek = ref(0)
  const opponentByTeam = ref<Record<string, { opp: string; home: boolean }>>({})
  const scheduleLoading = ref(false)

  async function loadWeek() {
    if (!isFootball.value) { live.value = false; return }
    scheduleLoading.value = true
    try {
      const state = await sleeperService.getNflState()
      const st = String(state.season_type || '')
      live.value = st === 'regular' || st === 'post'
      currentWeek.value = Number(state.week) || 0
      opponentByTeam.value =
        live.value && currentWeek.value
          ? opponentMap(await sleeperService.getNflSchedule(state.season, currentWeek.value, st))
          : {}
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

  /*
   * An uploaded weekly list drives EVERYTHING here, not just the order of a list. Earlier I
   * left this out precisely because a reorder would have been a lie next to a lineup chosen
   * by an optimiser that ignored it — a control labelled "your rankings" that the headline
   * recommendation overrules is worse than no control.
   *
   * applyRankingOrder re-seats our projected points onto the analyst's order: ranked players
   * take the point values already occupied by that slot on our board, unranked players keep
   * their own. So the optimiser, the closest calls, the streamers and the board all move
   * together, and every number on screen is still a projection rather than a rank pretending
   * to be one.
   */
  const weekRankings = useCustomRankings('week')
  const nameByKey = computed(() => {
    const m = new Map<string, { name: string; position: string; team: string }>()
    for (const p of src.pool.value) m.set(p.playerKey, { name: p.name, position: p.position ?? '', team: p.proTeam ?? '' })
    for (const fa of src.freeAgents.value)
      m.set(fa.playerKey ?? `fa:${fa.name}`, { name: fa.name, position: fa.position ?? '', team: fa.team ?? '' })
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
  watch(live, async (isLive) => {
    if (!isLive) return
    impliedTotals.value = await getImpliedTeamTotals()
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
    if (!mean || !Object.keys(base).length) return base
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

  const effectiveVor = computed(() => {
    const base = environmentVor.value
    if (!weekRankings.enabled.value || !Object.keys(base).length) return base
    const named = Object.keys(base).map((k) => ({
      playerKey: k,
      name: nameByKey.value.get(k)?.name ?? '',
      position: nameByKey.value.get(k)?.position ?? '',
    }))
    const { rankByKey } = weekRankings.match(named)
    if (!Object.keys(rankByKey).length) return base

    const normPos = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()
    const entries = Object.entries(base).map(([k, v]) => ({
      playerKey: k, value: v.pointsNextWeek, position: normPos(nameByKey.value.get(k)?.position ?? ''),
    }))

    /*
     * Scoped per position when the list was built from per-position files.
     *
     * Analyst weekly rankings arrive one file per position and each restarts at rank 1, so a
     * global re-seat would treat the best quarterback and the best running back as tied for
     * first and hand out point values accordingly. Grouping first keeps a rank meaning what
     * the file meant: first AT THAT POSITION.
     *
     * A single cross-position list keeps the old global behaviour, because for that shape the
     * ranks genuinely are one order.
     */
    let reseated: Record<string, number>
    if (weekRankings.partPositions.value.length) {
      reseated = {}
      const byPos = new Map<string, typeof entries>()
      for (const e of entries) byPos.set(e.position, [...(byPos.get(e.position) ?? []), e])
      for (const group of byPos.values()) Object.assign(reseated, applyRankingOrder(group, rankByKey))
    } else {
      reseated = applyRankingOrder(entries, rankByKey)
    }

    const out: typeof base = {}
    for (const [k, v] of Object.entries(base)) {
      out[k] = { ...v, pointsNextWeek: reseated[k] ?? v.pointsNextWeek }
    }
    return out
  })

  /*
   * You can be in a Sleeper league without holding a roster — a commissioner, or somebody
   * following along. sleeperMyTeamKey returns '' for them because no roster's owner_id
   * matches, and everything personal on this page is correctly empty as a result.
   */
  /*
   * The tiers the active weekly list declares, when it declares any.
   *
   * The analyst files carry a Tier column and the parser has always read it — matchRankings
   * returns tierByKey and the Draft Room has used it for a while. This board never asked,
   * so it derived its own cliffs from our points while sitting under a header naming
   * somebody else's order. Their tiering is the better answer: it is a judgement about who
   * is interchangeable this week, from the person whose order the reader chose.
   */
  const weekTierByKey = computed<Record<string, number>>(() => {
    if (!weekRankings.enabled.value || !weekRankings.hasOwnTiers.value) return {}
    const named = Object.keys(environmentVor.value).map((k) => ({
      playerKey: k,
      name: nameByKey.value.get(k)?.name ?? '',
      position: nameByKey.value.get(k)?.position ?? '',
    }))
    return weekRankings.match(named).tierByKey
  })

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
    weekSource: computed(() => (weekRankings.enabled.value ? weekRankings.sourceName.value : 'UFD')),
    sourceTiers: computed(() => Object.keys(weekTierByKey.value).length > 0),
  }
}
