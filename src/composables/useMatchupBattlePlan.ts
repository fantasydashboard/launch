import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useLeaguesStore } from '@/stores/leaguesNew'
import { useThisWeekMatchup } from '@/composables/useThisWeekMatchup'
import { useAvailablePlayers } from '@/composables/useAvailablePlayers'
import { useMyRoster } from '@/composables/useMyRoster'
import { useFullSeasonCategoryData } from '@/composables/useFullSeasonCategoryData'
import { useEspnCategoryTeamData } from '@/composables/useEspnCategoryTeamData'
import { useYourMove } from '@/composables/useYourMove'
import { isYahooCategoryLeague as isYahooCategoryScoringType } from '@/composables/useIsCategoryLeague'
import { seasonStakes, type StakesMode } from '@/myteam/seasonStakes'
import { matchupPlan, type PlanCategory } from '@/myteam/matchupPlan'
import { volumeEdge, type VolPlayer } from '@/myteam/volumeEdge'
import { classifyCategory } from '@/myteam/categorySide'
import { isLowerBetter } from '@/players/direction'
import { computeRosterValue, type CatSpec } from '@/myteam/value'
import { toEffectiveStats } from '@/myteam/effectiveStats'
import { mapFgStatsByKey } from '@/myteam/fgMappedStats'
import type { RosterSlotPlayer } from '@/myteam/yourMove/pairDrop'
import { getWeekSchedule } from '@/services/mlbSchedule'
import { classifyContested, isAccumulatorCat } from '@/myteam/contestedTiers'
import { useWinProbTrend } from '@/composables/useWinProbTrend'

export interface CoinFlip {
  statId: string
  label: string
  myWinPct: number // 0..100
  move?: { text: string; lift: number; today: boolean }
  dir?: 'win' | 'loss' // for the muted "leaning" tier — which way it's tipping
  accumulator?: boolean // volume cat (IP/AB/BF…) won by games, not a waiver move
}

// One actionable move, with every contested category it swings. A single lineup
// change (e.g. starting a hitter) often helps multiple cats, so the to-do list
// is keyed by the move, not the category — never the same move twice.
export interface SwingMove {
  text: string
  lift: number
  today: boolean
  cats: { label: string; myWinPct: number }[]
}

export interface BattlePlanVM {
  ready: boolean
  me: { name: string; avatar?: string; winPct: number }
  opp: { name: string; avatar?: string; winPct: number }
  week: number
  daysLeft: number
  tiePct: number
  projWins: number
  projLosses: number
  cadence: 'daily' | 'weekly'
  stakes: { mode: StakesMode; reasoning: string }
  path: string
  swingMoves: SwingMove[] // the to-do list — one row per move, with the cats it swings
  coinFlips: CoinFlip[] // tight 45–55 holds that still decide the week (no lever)
  leaning: CoinFlip[] // near-decided contested cats, de-emphasized
  volumeCats: { statId: string; label: string; myWinPct: number }[] // won by games played
  banked: { statId: string; label: string }[]
  conceded: { statId: string; label: string }[]
  swing: { statId: string; label: string }[]
  volume: { myGames: number; myStarts: number; oppGames: number; oppStarts: number; read: string }
  lineupCheck: { ok: boolean; message: string } | null
}

const SEASON_FRACTION = 0.6

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useMatchupBattlePlan(): {
  vm: ComputedRef<BattlePlanVM>
  cadence: Ref<'daily' | 'weekly'>
  override: Ref<StakesMode | 'auto'>
  refresh: () => Promise<void>
} {
  const leagueStore = useLeagueStore()
  const leaguesStore = useLeaguesStore()

  // ── data loaders (mirror MyTeamView.vue lines 34-45) ──────────────────────
  const { players: yahooFreeAgents, load: loadPlayers } = useAvailablePlayers()
  const {
    players: yahooRosterPlayers,
    pool: yahooRosterPool,
    fgByKey: yahooFgByKey,
    load: loadRoster,
  } = useMyRoster()

  // ESPN category data loader (mirror MyTeamView.vue line 44)
  const espn = useEspnCategoryTeamData()

  const thisWeek = useThisWeekMatchup()

  const { seasonMatchups, categoryLabels, loaded: seasonLoaded, load: loadSeasonData } =
    useFullSeasonCategoryData()

  // ── cadence (mirror MyTeamView.vue lines 558-571) ─────────────────────────
  const cadenceKey = (id: string | null | undefined) => `ufd_ym_cadence_${id ?? ''}`
  const cadence = ref<'daily' | 'weekly'>('daily')
  watch(
    () => leagueStore.activeLeagueId,
    (id) => {
      const stored = id ? localStorage.getItem(cadenceKey(id)) : null
      cadence.value = stored === 'weekly' ? 'weekly' : 'daily'
    },
    { immediate: true },
  )
  watch(cadence, (v) => {
    const id = leagueStore.activeLeagueId
    if (id) localStorage.setItem(cadenceKey(id), v)
  })

  // ── stakes override ────────────────────────────────────────────────────────
  const override = ref<StakesMode | 'auto'>('auto')

  // ── isYahooCategoryLeague (mirror MyTeamView.vue lines 104-118) ───────────
  const isYahooCategoryLeague = computed(() => {
    const id = leagueStore.activeLeagueId
    if (!id) return false
    if (isYahooCategoryScoringType(leagueStore.currentLeague?.scoring_type)) return true
    const saved = leagueStore.savedLeagues?.find((l: any) => l.league_id === id)
    if (saved?.platform && saved.platform !== 'yahoo') return false
    const st = saved?.scoring_type || ''
    if (st) return isYahooCategoryScoringType(st)
    return (leagueStore.yahooMatchups || []).some(
      (m: any) => m?.is_category_league || m?.stat_winners?.length,
    )
  })

  // ── isEspnCategoryLeague (mirror MyTeamView.vue lines 46-48) ──────────────
  const isEspnCategoryLeague = computed(
    () => leagueStore.activePlatform === 'espn' && espn.supported.value === true,
  )

  // ── platform-switched roster source (mirror MyTeamView.vue lines 65-80) ───
  // The move (useYourMove) and volume engines read the roster, pool, FanGraphs
  // projections and free agents from these. On ESPN the data lives in the
  // espn.* loader; on Yahoo in useMyRoster/useAvailablePlayers. Without this
  // switch the ESPN matchup gets an empty roster → every coin-flip reads
  // "no move" and the volume edge never renders.
  const rosterPlayers = computed(() =>
    isEspnCategoryLeague.value ? espn.rosterPlayers.value : yahooRosterPlayers.value,
  )
  const rosterPool = computed(() =>
    isEspnCategoryLeague.value ? espn.pool.value : yahooRosterPool.value,
  )
  const fgByKey = computed(() =>
    isEspnCategoryLeague.value ? espn.fgByKey.value : yahooFgByKey.value,
  )
  const freeAgents = computed(() =>
    isEspnCategoryLeague.value ? espn.freeAgents.value : yahooFreeAgents.value,
  )

  // ── sourceMatchups + perCategory + yahooCategories (mirror lines 175-264) ─
  const sourceMatchups = computed(() =>
    seasonLoaded.value && seasonMatchups.value.length
      ? seasonMatchups.value
      : leagueStore.yahooMatchups || [],
  )

  const perCategory = computed(() => {
    const wins = new Map<string, Record<string, number>>()
    const losses = new Map<string, Record<string, number>>()
    const statIds = new Set<string>()

    for (const m of sourceMatchups.value) {
      if (!m?.stat_winners?.length) continue
      const team1 = m.teams?.[0]
      const team2 = m.teams?.[1]
      const team1Key = team1?.team_key || team1?.team_id
      const team2Key = team2?.team_key || team2?.team_id
      if (!team1Key || !team2Key) continue

      for (const key of [team1Key, team2Key]) {
        if (!wins.has(key)) {
          wins.set(key, {})
          losses.set(key, {})
        }
      }

      for (const sw of m.stat_winners) {
        const statId = String(sw.stat_id)
        statIds.add(statId)
        const t1Wins = wins.get(team1Key)!
        const t1Losses = losses.get(team1Key)!
        const t2Wins = wins.get(team2Key)!
        const t2Losses = losses.get(team2Key)!

        if (sw.is_tied === true || sw.is_tied === '1') {
          // tie — no credit
        } else if (sw.winner_team_key === team1Key) {
          t1Wins[statId] = (t1Wins[statId] || 0) + 1
          t2Losses[statId] = (t2Losses[statId] || 0) + 1
        } else if (sw.winner_team_key === team2Key) {
          t2Wins[statId] = (t2Wins[statId] || 0) + 1
          t1Losses[statId] = (t1Losses[statId] || 0) + 1
        }
      }
    }

    return { wins, losses, statIds }
  })

  const yahooCategories = computed(() => {
    const labels = categoryLabels.value
    return [...perCategory.value.statIds].map((statId) => {
      const meta = labels.get(statId)
      return {
        statId,
        label: meta?.label || `S${statId}`,
        name: meta?.name || `Stat ${statId}`,
        side: 'hit' as const,
        higherIsBetter: true,
      }
    })
  })

  // Merge: ESPN categories take priority on ESPN leagues; else prefer season-derived
  // Yahoo categories; fall back to snapshot categories (which always have statId +
  // label once the snapshot loads). Mirror MyTeamView.vue lines 55-57.
  const categories = computed(() => {
    if (isEspnCategoryLeague.value) return espn.categories.value
    if (yahooCategories.value.length) return yahooCategories.value
    const snap = thisWeek.snapshot.value
    if (!snap) return []
    return snap.categories.map((c) => ({
      statId: c.statId,
      label: c.label,
      name: c.label,
      side: 'hit' as const,
      higherIsBetter: true,
    }))
  })

  // ── catSpecs (mirror MyTeamView.vue lines 429-446) ────────────────────────
  // On ESPN use espn.cats (which carries the authoritative lowerIsBetter from ESPN's
  // own scoring direction), on Yahoo derive it from label heuristics. Mirror the `cats`
  // computed in MyTeamView.vue lines 429-436 and `lowerBetterByStatId` lines 439-443.
  const cats = computed(() =>
    isEspnCategoryLeague.value
      ? espn.cats.value
      : categories.value.map((c) => ({
          statId: c.statId,
          lowerIsBetter: isLowerBetter(c.label || c.name || c.statId),
        })),
  )

  const lowerBetterByStatId = computed(() => {
    const m = new Map<string, boolean>()
    for (const c of cats.value) {
      m.set(c.statId, c.lowerIsBetter)
    }
    return m
  })

  function isLowerBetterFor(statId: string): boolean {
    return lowerBetterByStatId.value.get(statId) ?? false
  }

  const catSpecs = computed<CatSpec[]>(() => {
    const findStatId = (names: string[]): string | undefined => {
      for (const c of categories.value) {
        const label = (c.label || c.name || '').toUpperCase().trim()
        if (names.includes(label)) return c.statId
      }
      return undefined
    }
    const ipStatId = findStatId(['IP', 'INNINGS PITCHED'])
    const abStatId = findStatId(['AB', 'AT BATS', 'PA', 'PLATE APPEARANCES'])
    return categories.value.map((c) => {
      const { side, isRatio } = classifyCategory(
        c.label || c.name || c.statId,
        isLowerBetterFor(c.statId),
      )
      return {
        statId: c.statId,
        lowerIsBetter: isLowerBetterFor(c.statId),
        side,
        isRatio,
        volumeStatId: isRatio ? (side === 'pit' ? ipStatId : abStatId) : undefined,
      }
    })
  })

  // ── contributions (for rosterSlotPlayers) (mirror lines 490-499, 539-554) ─
  const fgStatsByKey = computed<Record<string, Record<string, number>>>(() => {
    const fgMap = fgByKey.value
    if (!fgMap || !catSpecs.value.length) return {}
    const labelByStatId = new Map(categories.value.map((c) => [c.statId, c.label || c.name || c.statId]))
    return mapFgStatsByKey(fgMap, catSpecs.value, (id) => labelByStatId.get(id) ?? id)
  })

  const contributions = computed(() => {
    if (!rosterPool.value.length || !catSpecs.value.length) return []
    const myPlayerKeys = rosterPlayers.value.map((p) => p.playerKey)
    if (!myPlayerKeys.length) return []
    const fgMap = fgStatsByKey.value
    const effectivePool = rosterPool.value.map((p) => ({
      playerKey: p.playerKey,
      position: p.position,
      stats: toEffectiveStats(p.stats, fgMap[p.playerKey] ?? null, catSpecs.value, SEASON_FRACTION),
    }))
    return computeRosterValue(effectivePool, myPlayerKeys, catSpecs.value)
  })

  const rosterSlotPlayers = computed<RosterSlotPlayer[]>(() => {
    const byKey = new Map(contributions.value.map((c) => [c.playerKey, c]))
    return rosterPlayers.value.map((p) => {
      const c = byKey.get(p.playerKey)
      return {
        playerKey: p.playerKey,
        name: p.name,
        team: (p as { team?: string }).team ?? '',
        position: (p as { position?: string }).position ?? '',
        side: (c?.role === 'pitcher' ? 'pit' : 'hit') as 'hit' | 'pit',
        roleValue: c?.roleValue ?? 50,
        started: (p as { started?: boolean }).started ?? true,
        stats: (p as { stats?: Record<string, number> }).stats ?? {},
      }
    })
  })

  // ── useYourMove (mirror MyTeamView.vue lines 576-583) ─────────────────────
  const yourMove = useYourMove({
    catSpecs,
    freeAgents,
    roster: rosterSlotPlayers,
    snapshot: thisWeek.snapshot,
    seasonFraction: computed(() => SEASON_FRACTION),
    cadence,
  })

  // ── week schedule for volumeEdge ──────────────────────────────────────────
  // useYourMove already fetches the schedule internally; we fetch it again here
  // for volumeEdge so this composable is self-contained and doesn't couple to
  // useYourMove internals.
  const EMPTY_SCHEDULE: import('@/services/mlbSchedule').WeekSchedule = { gamesByTeam: {}, startsByPitcher: {} }
  const weekScheduleRef = ref<import('@/services/mlbSchedule').WeekSchedule>({ ...EMPTY_SCHEDULE })
  // Today-only schedule so the daily cadence can show TODAY's games, not the week's.
  const todayScheduleRef = ref<import('@/services/mlbSchedule').WeekSchedule>({ ...EMPTY_SCHEDULE })

  watch(
    () => thisWeek.snapshot.value,
    async (snap) => {
      if (!snap || snap.completed) {
        weekScheduleRef.value = { gamesByTeam: {}, startsByPitcher: {} }
        todayScheduleRef.value = { gamesByTeam: {}, startsByPitcher: {} }
        return
      }
      const start = new Date()
      const end = new Date(start)
      end.setDate(end.getDate() + Math.max(0, snap.daysRemaining))
      try {
        weekScheduleRef.value = await getWeekSchedule(ymd(start), ymd(end))
      } catch {
        weekScheduleRef.value = { gamesByTeam: {}, startsByPitcher: {} }
      }
      try {
        todayScheduleRef.value = await getWeekSchedule(ymd(start), ymd(start))
      } catch {
        todayScheduleRef.value = { gamesByTeam: {}, startsByPitcher: {} }
      }
    },
    { immediate: true },
  )

  // ── me/opp names from league store (mirror MyTeamView.vue lines 267-277) ──
  const myTeam = computed(() => {
    return leagueStore.yahooTeams?.find((t: any) => t.is_my_team) ?? null
  })

  // ── load helpers (mirror MyTeamView.vue lines 120-165) ────────────────────
  async function maybeLoadSeasonData() {
    const id = leagueStore.activeLeagueId
    if (id && isYahooCategoryLeague.value) loadSeasonData(id)
  }

  async function maybeLoadPlayers() {
    if (isYahooCategoryLeague.value) loadPlayers()
  }

  async function maybeLoadRoster() {
    if (isYahooCategoryLeague.value) loadRoster()
  }

  // Mirror MyTeamView.vue lines 144-148
  function maybeLoadEspn() {
    if (leagueStore.activePlatform === 'espn') {
      espn.load()
    }
  }

  function maybeLoadThisWeek() {
    if (!categories.value.length) return
    thisWeek.load(categories.value.map((c) => ({ statId: c.statId, label: c.label })))
  }

  async function refresh() {
    await maybeLoadSeasonData()
    maybeLoadPlayers()
    maybeLoadRoster()
    maybeLoadEspn()
    maybeLoadThisWeek()
  }

  // NOTE: the Yahoo roster/players load is deliberately NOT triggered here.
  // useMyRoster.load() resolves the logged-in team from leagueStore.yahooTeams
  // at call time and filters the league-wide pool down to that team. If it runs
  // before the my-team key is ready it filters to an empty roster AND sets
  // loaded=true; worse, that null-key load can finish *after* a later good load
  // and clobber it back to empty — the intermittent "no volume / no moves" bug.
  // So the Yahoo roster loads ONLY off the readiness watch below, never with a
  // half-ready store. ESPN roster still loads here via maybeLoadEspn().
  watch(() => leagueStore.activeLeagueId, () => {
    maybeLoadSeasonData()
    maybeLoadEspn()
    maybeLoadThisWeek()
  }, { immediate: true })
  watch(categories, () => {
    maybeLoadThisWeek()
  })

  // The single, order-independent Yahoo roster trigger: fire only once BOTH the
  // category flag and the my-team key are present (they settle in unpredictable
  // order on a direct /matchup navigation), so the load always reads a real team
  // key. Guarded so the heavy getAllRosteredPlayers call doesn't re-run once the
  // roster has populated.
  const yahooRosterReady = computed(
    () =>
      isYahooCategoryLeague.value &&
      !!leagueStore.yahooTeams?.find((t: any) => t.is_my_team)?.team_key,
  )

  // The volume edge only needs each rostered player's MLB team + whether they
  // pitch. On Yahoo we fetch that from the light getRoster(teamKey) call — ONE
  // reliable request — instead of leaning on the heavy, rate-limit-prone
  // getAllRosteredPlayers that useMyRoster uses for moves. That way the volume
  // edge shows every load, even when the heavy call flakes and the move roster
  // comes back empty.
  const yahooVolumeRoster = ref<VolPlayer[]>([])
  async function loadYahooVolumeRoster() {
    const myTeamKey = leagueStore.yahooTeams?.find((t: any) => t.is_my_team)?.team_key
    if (!myTeamKey) return
    try {
      const { yahooService } = await import('@/services/yahoo')
      const roster = await yahooService.getRoster(String(myTeamKey))
      yahooVolumeRoster.value = roster.map((p: any) => ({
        name: p.name?.full ?? '',
        teamAbbr: p.team_abbr ?? '',
        isPitcher: /SP|RP|\bP\b/.test(p.position ?? ''),
      }))
    } catch {
      /* leave empty — volume edge just won't render, same as before */
    }
  }

  watch(
    yahooRosterReady,
    (ready) => {
      if (!ready) return
      if (!yahooRosterPlayers.value.length) maybeLoadRoster()
      if (!yahooFreeAgents.value.length) maybeLoadPlayers()
      if (!yahooVolumeRoster.value.length) loadYahooVolumeRoster()
    },
    { immediate: true },
  )

  // ── main view-model ────────────────────────────────────────────────────────
  const vm = computed<BattlePlanVM>(() => {
    const snap = thisWeek.snapshot.value
    const ready = snap != null

    const emptyVolume = { myGames: 0, myStarts: 0, oppGames: 0, oppStarts: 0, read: '' }

    if (!ready) {
      return {
        ready: false,
        me: { name: '', winPct: 0 },
        opp: { name: '', winPct: 0 },
        week: leagueStore.currentWeek,
        daysLeft: 0,
        tiePct: 0,
        projWins: 0,
        projLosses: 0,
        cadence: cadence.value,
        stakes: { mode: 'clinch', reasoning: '' },
        path: '',
        swingMoves: [],
        coinFlips: [],
        leaning: [],
        volumeCats: [],
        banked: [],
        conceded: [],
        swing: [],
        volume: emptyVolume,
        lineupCheck: null,
      }
    }

    // ── me / opp ────────────────────────────────────────────────────────────
    const meName = myTeam.value?.name ?? ''
    const meAvatar: string | undefined = myTeam.value?.logo_url || myTeam.value?.logo || undefined

    const meWinPct = Math.round(snap.winPct)
    const oppWinPct = Math.round(snap.lossPct)

    // ── stakes ──────────────────────────────────────────────────────────────
    const leagueSize =
      leaguesStore.activeLeague?.league_size ??
      (leagueStore.yahooTeams?.length || 12)
    const weeksLeft = Math.max(0, leagueStore.playoffWeekStart - leagueStore.currentWeek)
    // TODO(phase-2): plumb the real playoff-spots league setting; half-league is the common default. The manual stakes override covers leagues that differ.
    const playoffSpots = Math.round(leagueSize / 2)

    // My team rank: from yahooTeams is_my_team entry (same source as MyTeamView yahooMyOverallRank)
    const myTeamRank: number = (() => {
      const t = myTeam.value
      if (!t) return Math.ceil(leagueSize / 2) // ESPN standings rank isn't loaded here → falls back to mid-table, so ESPN stakes auto-detect to 'clinch' unless the user sets the manual override.
      if (t.rank && Number(t.rank) > 0) return Number(t.rank)
      const idx = (leagueStore.yahooTeams || []).indexOf(t)
      return idx >= 0 ? idx + 1 : Math.ceil(leagueSize / 2)
    })()

    const auto = seasonStakes({ rank: myTeamRank, leagueSize, weeksLeft, playoffSpots })
    const mode: StakesMode = override.value === 'auto' ? auto.mode : override.value
    const reasoning = override.value === 'auto' ? auto.reasoning : 'Goal set manually.'

    // ── status mapping + matchupPlan ────────────────────────────────────────
    // SnapshotCategory.status is the CatStatus type — already 'safe' | 'tossup' | 'loss',
    // exactly PlanCategory['status']. Pass it through directly.
    const planCats: PlanCategory[] = snap.categories.map((c) => ({
      statId: c.statId,
      myWinPct: c.myWinPct,
      status: c.status,
    }))

    // On a manual override there's no standings signal, so don't pass a coast
    // kind — matchupPlan falls back to the neutral conserve copy.
    const coastKind = override.value === 'auto' ? auto.coastKind : undefined
    const plan = matchupPlan(planCats, mode, coastKind)

    // ── label lookup from snapshot ───────────────────────────────────────────
    const labelByStatId = new Map(snap.categories.map((c) => [c.statId, c.label]))
    const toStatLabel = (statId: string) => ({
      statId,
      label: labelByStatId.get(statId) ?? statId,
    })

    // ── banked / conceded / swing ────────────────────────────────────────────
    const banked = planCats
      .filter((c) => c.status === 'safe')
      .map((c) => toStatLabel(c.statId))

    const conceded = plan.concede.map(toStatLabel)
    const swing = plan.swing.map(toStatLabel)

    // ── contested cats (tossups): build each row, then tier ───────────────────
    const moves = yourMove.moves.value

    const buildRow = (cat: PlanCategory): CoinFlip => {
      // Find the highest-lift move whose categories include this statId.
      const bestMove = moves
        .filter((m) => m.categories.includes(cat.statId))
        .sort((a, b) => b.winProbLift - a.winProbLift)[0]

      let move: CoinFlip['move'] | undefined
      if (bestMove) {
        const playerName = bestMove.player.name
        const cpName = bestMove.counterparty?.name
        let text: string
        if (bestMove.kind === 'startSit') {
          text = cpName ? `Start ${playerName} over ${cpName}` : `Start ${playerName}`
        } else if (bestMove.kind === 'stream') {
          text = `Stream ${playerName}`
        } else {
          // 'add'
          text = `Add ${playerName}`
        }
        move = {
          text,
          lift: Math.round(bestMove.winProbLift),
          today: bestMove.layer === 'today',
        }
      }

      const label = labelByStatId.get(cat.statId) ?? cat.statId
      return { statId: cat.statId, label, myWinPct: cat.myWinPct, move, accumulator: isAccumulatorCat(label) }
    }

    const tossupRows = planCats
      .filter((c) => c.status === 'tossup')
      .sort((a, b) => a.myWinPct - b.myWinPct)
      .map(buildRow)

    // Actionability-first split. A move is the only thing you DO, so any
    // contested cat that has one floats to its own group regardless of win% band
    // — never buried in a chip tier. The rest (no lever) split by where they sit:
    //   • swingMoves — has a move (the to-do list), sorted by lift
    //   • volumeCats — accumulator cats won by games, not a waiver move
    //   • coinFlips  — the true 45–55 holds that still decide the week
    //   • leaning    — near-decided, muted, tagged which way it tips
    const withMove = tossupRows.filter((r) => r.move)
    const noMove = tossupRows.filter((r) => !r.move)

    // Group the move-bearing cats by the move itself (keyed by its text — player
    // + counterparty is unique) so one lineup change is one row listing every cat
    // it swings, not a duplicate row per cat.
    const moveGroups = new Map<string, SwingMove>()
    for (const r of withMove) {
      const mv = r.move! // withMove guarantees move is defined
      const g = moveGroups.get(mv.text)
      if (g) {
        g.cats.push({ label: r.label, myWinPct: r.myWinPct })
        if (mv.lift > g.lift) g.lift = mv.lift
        g.today = g.today || mv.today
      } else {
        moveGroups.set(mv.text, {
          text: mv.text,
          lift: mv.lift,
          today: mv.today,
          cats: [{ label: r.label, myWinPct: r.myWinPct }],
        })
      }
    }
    const swingMoves: SwingMove[] = [...moveGroups.values()]
      .map((g) => ({ ...g, cats: g.cats.sort((a, b) => b.myWinPct - a.myWinPct) }))
      .sort((a, b) => b.lift - a.lift)
    const volumeCats = noMove
      .filter((r) => r.accumulator)
      .map((r) => ({ statId: r.statId, label: r.label, myWinPct: r.myWinPct }))
    const coinFlips: CoinFlip[] = noMove.filter(
      (r) => !r.accumulator && classifyContested(r.myWinPct) === 'coinflip',
    )
    const leaning: CoinFlip[] = noMove
      .filter((r) => !r.accumulator && classifyContested(r.myWinPct) !== 'coinflip')
      .map((r) => ({ ...r, dir: (r.myWinPct >= 50 ? 'win' : 'loss') as 'win' | 'loss' }))

    // ── volume edge ──────────────────────────────────────────────────────────
    // ESPN: reuse the already-loaded espn roster. Yahoo: prefer the light
    // getRoster fetch (reliable), falling back to the heavy move-roster if it
    // hasn't landed yet.
    const mine: VolPlayer[] =
      !isEspnCategoryLeague.value && yahooVolumeRoster.value.length
        ? yahooVolumeRoster.value
        : rosterPlayers.value.map((p) => ({
            name: p.name,
            teamAbbr: (p as { team?: string }).team ?? '',
            isPitcher: /SP|RP|\bP\b/.test((p as { position?: string }).position ?? ''),
          }))

    // Daily cadence shows TODAY's volume; weekly shows the rest of the week — so
    // the toggle changes what "bank the counting cats" actually means right now.
    const isDaily = cadence.value === 'daily'
    const v = volumeEdge(mine, [] /* opponent roster unavailable */, isDaily ? todayScheduleRef.value : weekScheduleRef.value)
    // Opponent roster isn't available in v1, so a comparative read would always say "volume on your
    // side" (opp = 0). Show YOUR remaining volume honestly instead; opponent-vs-you is a phase-2 add.
    const horizon = isDaily ? 'today' : 'left this week'
    const volume = {
      myGames: v.myGames,
      myStarts: v.myStarts,
      oppGames: 0,
      oppStarts: 0,
      read: v.myGames > 0 || v.myStarts > 0
        ? `You have ${v.myGames} hitter-games and ${v.myStarts} ${v.myStarts === 1 ? 'start' : 'starts'} ${horizon} — bank the counting cats.`
        : '',
    }

    // ── lineupCheck (Yahoo only) ──────────────────────────────────────────────
    // Only a startSit today-move means a benched player who should be started.
    // Stream/add waiver suggestions also have layer === 'today' but are not lineup errors.
    let lineupCheck: BattlePlanVM['lineupCheck'] = null
    if (snap.platform === 'yahoo') {
      const benchedStarter = moves.find((m) => m.layer === 'today' && m.kind === 'startSit')
      lineupCheck = benchedStarter
        ? { ok: false, message: `${benchedStarter.player.name} is on your bench and plays today — start them.` }
        : { ok: true, message: 'Lineup set for today.' }
    }

    return {
      ready: true,
      me: { name: meName, avatar: meAvatar, winPct: meWinPct },
      opp: { name: snap.opponentName, avatar: snap.oppAvatar, winPct: oppWinPct },
      week: leagueStore.currentWeek,
      daysLeft: snap.daysRemaining,
      tiePct: snap.tiePct,
      projWins: snap.projWins,
      projLosses: snap.projLosses,
      cadence: cadence.value,
      stakes: { mode, reasoning },
      path: plan.path,
      swingMoves,
      coinFlips,
      leaning,
      volumeCats,
      banked,
      conceded,
      swing,
      volume,
      lineupCheck,
    }
  })

  // ── win-probability trend (captured daily, projected flat to week end) ──────
  const trend = useWinProbTrend({
    leagueId: computed(() => leagueStore.activeLeagueId),
    week: computed(() => leagueStore.currentWeek),
    my: computed(() => Math.round(thisWeek.snapshot.value?.winPct ?? 0)),
    opp: computed(() => Math.round(thisWeek.snapshot.value?.lossPct ?? 0)),
    daysRemaining: computed(() => thisWeek.snapshot.value?.daysRemaining ?? 0),
    ready: computed(() => {
      const s = thisWeek.snapshot.value
      return !!s && !s.completed
    }),
  })

  return { vm, cadence, override, refresh, trend }
}
