import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAvailablePlayers } from '@/composables/useAvailablePlayers'
import { useMyRoster } from '@/composables/useMyRoster'
import { useFullSeasonCategoryData } from '@/composables/useFullSeasonCategoryData'
import { useEspnCategoryTeamData } from '@/composables/useEspnCategoryTeamData'
import { isYahooCategoryLeague as isYahooCategoryScoringType } from '@/composables/useIsCategoryLeague'
import { getLeagueType } from '@/config/sports'
import { classifyCategory } from '@/myteam/categorySide'
import { isLowerBetter } from '@/players/direction'
import { resolveVolumeStatId } from '@/myteam/catVolume'
import type { CatSpec } from '@/myteam/value'
import type { AvailablePlayer } from '@/players/types'
import { sideOf } from '@/myteam/yourMove/helpedCats'
import type { MoveCandidate } from '@/myteam/yourMove/types'
import { dailyCandidates } from '@/myteam/yourMove/dailyCandidates'
import { projectGames } from '@/myteam/yourMove/projectRemainingWeek'
import type { BenchPlayer } from '@/myteam/yourMove/generators/startSitGenerator'
import { getWeekSchedule, type WeekSchedule } from '@/services/mlbSchedule'
import { buildPlayerMatchers, type FGProjection } from '@/services/projectionService'
import { findOpenSlots, type LineupSlot, type OpenSlot } from '@/today/openSlots'
import { scoreToday } from '@/today/scoreToday'
import { parkFactor } from '@/today/parkFactors'
import { opposingStarterName, spQualityFactor, type PitcherQuality } from '@/today/oppMatchup'
import { buildTodayBoard, positionsOverlap, type ScoredPlay, type TodayBoard, type LineupValue } from '@/today/todayBoard'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { pointsDailyValue } from '@/today/pointsDailyValue'
import { injuryTier } from '@/myteam/injuryStatus'
import { useValueBaseline } from '@/composables/useValueBaseline'
import { computeRosterValue, type ValuePoolPlayer } from '@/myteam/value'
import { computeDropCandidates } from '@/myteam/dropCandidates'
import { expendableKeys, parseEligible } from '@/wire/dropEligibility'
import { buildPointsTeam, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import { buildBaseballValue, baseballValueOne, type PlayerValue } from '@/myteam/playerValue'
import { pickSafeDrop, type DroppableBody, type SafeDrop } from '@/today/safeDrop'
import { normalizeMoves } from '@/today/normalizeValue'
import { useEspnPointsTeamData } from '@/composables/useEspnPointsTeamData'
import { pointsRosValue } from '@/today/pointsRosValue'
import { yahooService } from '@/services/yahoo'
import { parseEspnAddBudget, parseYahooAddBudget } from '@/wire/acquisition'
import { annotateAddBudget, type AddBudget } from '@/today/addBudget'

const EMPTY_SCHEDULE: WeekSchedule = { gamesByTeam: {}, startsByPitcher: {}, homeTeamByTeam: {} }
const EMPTY_BOARD: TodayBoard = { hero: null, openSlots: [], streamers: [], upgrades: [], sitAlerts: [] }
const MAX_SIT_ALERTS = 2

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// buildPlayerMatchers loads league-independent FanGraphs data; build it once per
// session (mirror useWire.ts's module-level cache).
let matchersPromise: ReturnType<typeof buildPlayerMatchers> | null = null
const getPlayerMatchers = () => (matchersPromise ??= buildPlayerMatchers())

/**
 * The Today board: today's MLB schedule, the manager's open lineup slots, and every
 * daily play (streams / adds / start-sits) scored by a matchup-adjusted single-game
 * projection. Orchestration only — enumeration comes from dailyCandidates (mirrors
 * useYourMove's daily layer), scoring/shaping from the pure today/ modules.
 *
 * Scope: baseball + ESPN/Yahoo category leagues only (mirrors useWire.ts's platform
 * switch and catSpecs). Anything else — non-baseball, Sleeper, an off-day, a schedule
 * fetch failure — degrades to an empty board with error='no-games'. Never throws.
 */
export function useToday(): {
  vm: ComputedRef<TodayBoard>
  loading: Ref<boolean>
  error: Ref<string | null>
  load: () => Promise<void>
  isPoints: ComputedRef<boolean>
  budget: ComputedRef<AddBudget>
} {
  const leagueStore = useLeagueStore()
  const seasonFraction = computed(() => leagueStore.seasonFractionComplete)

  // ── data loaders (mirror useWire.ts / useMatchupBattlePlan.ts) ────────────
  const { players: yahooFreeAgentsRaw, load: loadYahooFreeAgents, loaded: yahooFaLoaded } = useAvailablePlayers()
  const {
    players: yahooRosterPlayers,
    load: loadYahooRoster,
    loaded: yahooRosterLoaded,
    rosterSlots: yahooRosterSlots,
  } = useMyRoster()
  const espn = useEspnCategoryTeamData()
  const espnPoints = useEspnPointsTeamData()
  const { seasonMatchups, categoryLabels, loaded: seasonLoaded, load: loadSeasonData } =
    useFullSeasonCategoryData()

  // ── isYahooCategoryLeague / isEspnCategoryLeague (verbatim from useWire.ts) ─
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

  const isEspnCategoryLeague = computed(
    () => leagueStore.activePlatform === 'espn' && espn.supported.value === true,
  )
  const isEspnPointsLeague = computed(
    () => leagueStore.activePlatform === 'espn' && espnPoints.supported.value === true,
  )
  const isYahooPointsLeague = computed(
    () => leagueStore.activePlatform === 'yahoo' && isPointsLeague.value,
  )

  // Position-aware drop eligibility needs the league's required starting-slot counts (mirrors
  // useWire.ts) — same per-platform switch as the roster/free-agent sources.
  const rosterSlots = computed(() =>
    isEspnCategoryLeague.value
      ? espn.rosterSlots.value
      : isEspnPointsLeague.value
        ? espnPoints.rosterSlots.value
        : yahooRosterSlots.value,
  )

  // The active league's add constraint (count limit / FAAB / unlimited). Unlimited fallback everywhere.
  const addBudget = computed<AddBudget>(() => {
    if (isEspnCategoryLeague.value) return parseEspnAddBudget(espn.acquisitionSettings.value, espn.myTeamTransactionCounter.value)
    if (isEspnPointsLeague.value) return parseEspnAddBudget(espnPoints.acquisitionSettings.value, espnPoints.myTeamTransactionCounter.value)
    if (leagueStore.activePlatform === 'yahoo') return parseYahooAddBudget(yahooSettings.value, yahooAddInfo.value)
    return { kind: 'unlimited' }
  })

  // ── platform-switched roster / free-agent source ───────────────────────────
  // rosterPlayers carries `started` (active lineup vs bench) for MY team on both
  // platforms — the same source useMatchupBattlePlan.ts uses for its lineup engine.
  const rosterPlayers = computed(() =>
    isEspnCategoryLeague.value
      ? espn.rosterPlayers.value
      : isEspnPointsLeague.value
        ? espnPoints.rosterPlayers.value
        : yahooRosterPlayers.value,
  )
  const rawFreeAgents = computed<AvailablePlayer[]>(() =>
    isEspnCategoryLeague.value
      ? espn.freeAgents.value
      : isEspnPointsLeague.value
        ? espnPoints.freeAgents.value
        : yahooFreeAgentsRaw.value,
  )
  // ESPN's free-agent feed leaks rostered players (see useWire.ts) — exclude anyone already in
  // that ESPN source's league-wide pool. Yahoo's feed doesn't need the guard.
  const freeAgents = computed<AvailablePlayer[]>(() => {
    const espnSrc = isEspnCategoryLeague.value ? espn : isEspnPointsLeague.value ? espnPoints : null
    if (!espnSrc) return rawFreeAgents.value
    const guard = espnSrc.pool.value.length > 0
    const rostered = new Set(espnSrc.pool.value.map((p) => p.playerKey))
    return rawFreeAgents.value.filter((fa) => !guard || !rostered.has(fa.playerKey))
  })

  // ── categories / catSpecs (verbatim pattern from useWire.ts) ────────────────
  const sourceMatchups = computed(() =>
    seasonLoaded.value && seasonMatchups.value.length
      ? seasonMatchups.value
      : leagueStore.yahooMatchups || [],
  )
  const yahooStatIds = computed(() => {
    const ids = new Set<string>()
    for (const m of sourceMatchups.value) {
      if (!m?.stat_winners?.length) continue
      for (const sw of m.stat_winners) ids.add(String(sw.stat_id))
    }
    return ids
  })
  const yahooCategories = computed(() => {
    const labels = categoryLabels.value
    return [...yahooStatIds.value].map((statId) => {
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
  const categories = computed(() =>
    isEspnCategoryLeague.value ? espn.categories.value : yahooCategories.value,
  )
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
    for (const c of cats.value) m.set(c.statId, c.lowerIsBetter)
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
        volumeStatId: resolveVolumeStatId(isRatio, side, ipStatId, abStatId),
      }
    })
  })

  // ── rest-of-season value for the rostered + free-agent pools (same model as Wire/My Team,
  // so the drop's "vs all" value matches the rest of the app) ─────────────────────────────
  const valueBaselineSvc = useValueBaseline()
  valueBaselineSvc.load()
  const valueBaseline = computed(() =>
    valueBaselineSvc.ready.value
      ? valueBaselineSvc.build(catSpecs.value, (id) => categories.value.find((c) => c.statId === id)?.label || id)
      : null,
  )
  const valueOpts = computed(() => ({ baseline: valueBaseline.value ?? undefined, zClamp: 8 }))

  // Category contributions (roster + FA pool), computed once — the same shape the Wire feeds into
  // computeDropCandidates (src/composables/useWire.ts ~line 213). myPlayerKeys spans the WHOLE
  // pool here (roster + FA) because this map also serves FA lookups (rosValueByKey/
  // replacementBySide below) — computeRosterValue returns every requested key, not just "my team".
  //  - roleValue: within-role percentile — "is this a body I can afford to lose", judged against
  //    its own role's pool.
  //  - crossPercentile: cross-role comparable value (the same number My Team's "vs all" shows). A
  //    hitter's and a pitcher's roleValue are on separate scales and are NOT comparable to each
  //    other — ranking a mixed hitter/pitcher drop pool by roleValue picks the wrong body (e.g. an
  //    IL pitcher over a far-less-valuable IL hitter). crossPercentile is the single comparable
  //    scale used to rank eligible drop candidates against each other.
  const categoryContributions = computed(() => {
    if (!valueBaseline.value || !rosterPlayers.value.length || !catSpecs.value.length) return []
    const pool: ValuePoolPlayer[] = [
      ...rosterPlayers.value.map((p) => ({ playerKey: p.playerKey, position: p.position, stats: p.stats })),
      ...freeAgents.value.map((p) => ({ playerKey: p.playerKey, position: p.position ?? '', stats: p.stats })),
    ]
    return computeRosterValue(pool, pool.map((p) => p.playerKey), catSpecs.value, valueOpts.value)
  })
  const categoryValueByKey = computed<Map<string, { roleValue: number; crossPercentile: number }>>(() => {
    const m = new Map<string, { roleValue: number; crossPercentile: number }>()
    for (const c of categoryContributions.value) m.set(c.playerKey, { roleValue: c.roleValue, crossPercentile: c.crossPercentile })
    return m
  })
  // MY roster's contributions only (a filter of the above, not a second computeRosterValue pass) —
  // the exact input computeDropCandidates expects (mirrors useWire.ts's `contributions`).
  const myCategoryContributions = computed(() => {
    const mine = new Set(rosterPlayers.value.map((p) => p.playerKey))
    return categoryContributions.value.filter((c) => mine.has(c.playerKey))
  })

  // The Wire's actual drop-to-make-room set for CATEGORY leagues (verbatim pipeline from
  // src/composables/useWire.ts ~lines 400-415): bottom-tier-of-role candidates (computeDropCandidates
  // — protects roleValue >= 50, candidates < 25) intersected with position-legal expendability
  // (expendableKeys — excludes IL bodies, since dropping one never frees an active spot, plus any
  // body whose loss would leave the lineup unfillable). Today's drop MUST equal this set so the two
  // pages can never disagree — this is the fix for the Helsley/Griffin IL-drop bug: Today's own
  // "not-contributing-today" heuristic diverged from the Wire's real expendability test.
  const categoryEligibility = computed(() =>
    rosterPlayers.value
      .filter((p) => !p.onIL)
      .map((p) => ({
        playerKey: p.playerKey,
        eligiblePositions: p.eligiblePositions?.length
          ? p.eligiblePositions.map((s) => s.toUpperCase())
          : parseEligible(p.position),
      })),
  )
  const categoryExpendable = computed(() => expendableKeys(categoryEligibility.value, rosterSlots.value))
  const categoryDropCandidates = computed(() => computeDropCandidates(myCategoryContributions.value))
  const categoryDropSet = computed<DroppableBody[]>(() => {
    const nameByKey = new Map(rosterPlayers.value.map((p) => [p.playerKey, p.name]))
    const roleByKey = new Map(myCategoryContributions.value.map((c) => [c.playerKey, c.role]))
    return categoryDropCandidates.value.candidates
      .filter((c) => categoryExpendable.value.has(c.playerKey))
      .map((c) => ({
        playerKey: c.playerKey,
        name: nameByKey.get(c.playerKey) ?? c.playerKey,
        side: roleByKey.get(c.playerKey) === 'pitcher' ? ('pit' as const) : ('hit' as const),
        rosValue: categoryValueByKey.value.get(c.playerKey)?.crossPercentile ?? 0,
        bottomTier: true,
        reason: c.reason,
      }))
  })

  // Points-league drop currency: projected rest-of-season points per player (roster + FA). Empty
  // until the FG matcher is ready (gated by pointsScoringReady in dataReady, so the board waits).
  const pointsValueByKey = computed<Map<string, number>>(() => {
    const matchFG = matchFGRef.value
    if (!matchFG || !isPointsLeague.value) return new Map()
    return pointsRosValue(
      [...rosterPlayers.value, ...freeAgents.value].map((p) => ({
        playerKey: p.playerKey,
        name: p.name,
        team: p.team,
        position: p.position,
      })),
      baseballValueOfWith(matchFG),
    )
  })

  // The cross-comparable drop-ranking currency for THIS league: category crossPercentile (see
  // categoryValueByKey above — NOT roleValue, which isn't comparable across hitter/pitcher), or
  // points ROS points (already one currency).
  const rosValueByKey = computed<Map<string, number>>(() => {
    if (isPointsLeague.value) return pointsValueByKey.value
    const m = new Map<string, number>()
    for (const [k, v] of categoryValueByKey.value) m.set(k, v.crossPercentile)
    return m
  })

  // This league's wire replacement level per side = the best available FA's rosValue (crossPercentile
  // for category, ROS points for points) on that side. Feeds the `dropCandidate` flag below only —
  // NOT pickSafeDrop, which uses the Wire's drop-to-make-room set instead (see below).
  // Empty wire for a side → -Infinity, so no body of that side is ever flagged (conservative).
  const replacementBySide = computed<Record<'hit' | 'pit', number>>(() => {
    const rv = rosValueByKey.value
    const out: Record<'hit' | 'pit', number> = { hit: -Infinity, pit: -Infinity }
    for (const fa of freeAgents.value) {
      const v = rv.get(fa.playerKey)
      if (v == null) continue
      const side = sideOf(fa.position ?? '')
      if (v > out[side]) out[side] = v
    }
    return out
  })

  // The Wire's actual drop-to-make-room set for POINTS leagues (mirrors PointsWireView.vue's "Drop
  // to make room": src/myteam/pointsTeam.ts's buildPointsTeam, called on JUST my roster — its
  // within-roster CORE/SOLID/FRINGE tiering, identical formula/cutoffs to My Team, needs no
  // league-wide pool to compute rosterRows). Never a CORE/SOLID body (only FRINGE is a safe cut)
  // and never an IL body (dropping one never frees an active spot — mirrors buildPointsWire's
  // `weakest()` helper in src/myteam/pointsWire.ts, which filters `!b.onIL` the same way).
  const pointsRosterModel = computed(() => {
    const matchFG = matchFGRef.value
    if (!isPointsLeague.value || !matchFG || !rosterPlayers.value.length) return null
    const fgByKey: Record<string, FGProjection | null> = {}
    const pool: PointsPoolPlayer[] = rosterPlayers.value.map((p) => {
      const hasTeam = !!p.team && p.team.toUpperCase() !== 'FA'
      fgByKey[p.playerKey] = hasTeam ? matchFG({ full_name: p.name, mlb_team: p.team }) : null
      return {
        playerKey: p.playerKey,
        name: p.name,
        position: p.position,
        eligiblePositions: p.eligiblePositions,
        teamKey: 'me',
        onIL: p.onIL,
        status: p.status,
      }
    })
    return buildPointsTeam(pool, buildBaseballValue(fgByKey, scoring.weights.value), 'me', rosterSlots.value)
  })
  const pointsDropSet = computed<DroppableBody[]>(() =>
    (pointsRosterModel.value?.rosterRows ?? [])
      .filter((r) => !r.player.onIL && r.tier === 'FRINGE')
      .map((r) => ({
        playerKey: r.player.playerKey,
        name: r.player.name,
        side: r.side,
        rosValue: r.points,
        bottomTier: true,
        reason: 'lowest projected',
      })),
  )

  // The candidate set pickSafeDrop chooses from — the Wire's drop-to-make-room set for THIS
  // league, cats or points. Replaces the old "not contributing today" heuristic: that gate
  // excluded any hitter whose MLB team played today (most of the roster), so it routinely
  // surfaced only an IL body (Helsley/Griffin) or nothing at all. The Wire's set has no notion of
  // "today" — a safe cut is safe every day.
  const wireDropSet = computed<DroppableBody[]>(() => (isPointsLeague.value ? pointsDropSet.value : categoryDropSet.value))

  // Points vs category, for baseValue's branch (categories.value is empty for a
  // points league on both platforms today, so this currently only tilts which
  // empty/degenerate path a points league takes — see the report for detail).
  const isPointsLeague = computed(
    () => getLeagueType(leagueStore.currentLeague?.scoring_type ?? undefined) === 'points',
  )

  // League points weights (for the points-league daily base value). Loaded alongside the
  // other sources; empty until loaded, which keeps the board on its loading/empty state.
  const scoring = useLeagueScoring()

  // Baseball PlayerValue resolver bound to a FanGraphs matcher + the league's live weights —
  // the shared `valueOf` shape the points value modules (pointsRosValue / pointsDailyValue)
  // consume. A bare 'FA' team can't be projected (name-only match collides prospects), so it
  // resolves to null, exactly as the pre-value FG path did.
  const baseballValueOfWith =
    (matchFG: (p: { full_name?: string; mlb_team?: string }) => FGProjection | null) =>
    (p: { name?: string; position?: string; team?: string }): PlayerValue | null => {
      const hasTeam = !!p.team && p.team.toUpperCase() !== 'FA'
      const fg = hasTeam ? matchFG({ full_name: p.name, mlb_team: p.team }) : null
      return fg ? baseballValueOne(fg, scoring.weights.value) : null
    }

  // On points leagues the daily base value needs the FanGraphs matcher + league weights loaded
  // (scoring.ready — the real league weights, not the default seed). Until both settle, every play
  // scores 0 and would be filtered to an empty board — which must read as "loading", not "you're
  // set". Category leagues don't use these, so they're ready immediately.
  const pointsScoringReady = computed(
    () => !isPointsLeague.value || (matchFgSettled.value && scoring.ready.value),
  )

  // ── platform / sport scope ──────────────────────────────────────────────────
  const isBaseball = computed(() => leagueStore.activeSport === 'baseball')
  const platformSupported = computed(
    () => leagueStore.activePlatform === 'espn' || leagueStore.activePlatform === 'yahoo',
  )

  // ── today's schedule ─────────────────────────────────────────────────────────
  const schedule = ref<WeekSchedule>({ ...EMPTY_SCHEDULE })
  const scheduleLoaded = ref(false)
  const playsToday = (team: string) => (schedule.value.gamesByTeam[team] ?? 0) > 0

  // ── Yahoo add-limit inputs (league settings + my-team weekly-adds/FAAB) ────────
  const yahooSettings = ref<any>(null)
  const yahooAddInfo = ref<{ weeklyAddsUsed: number | null; faabBalance: number | null }>({ weeklyAddsUsed: null, faabBalance: null })

  // ── FanGraphs matcher — best-effort opposing-SP quality, degrades to null ────
  const matchFGRef = ref<((p: { full_name?: string; mlb_team?: string }) => FGProjection | null) | null>(
    null,
  )
  const matchFgSettled = ref(false)
  ;(async () => {
    try {
      const { matchFG } = await getPlayerMatchers()
      matchFGRef.value = matchFG
      matchFgSettled.value = true
    } catch {
      matchFGRef.value = null
      matchFgSettled.value = true
    }
  })()

  // ── active lineup + open slots ────────────────────────────────────────────
  // No platform exposes a granular active-slot label (C/1B/OF/SP/UTIL) through the
  // composables this file is allowed to touch — ESPN's lineupSlot and Yahoo's
  // selected_position are both stripped before reaching RosterPlayer. The occupant's
  // primary eligible position is the best available stand-in for `slot`; `position`
  // still carries the full eligibility string, matching LineupSlot's contract.
  const lineup = computed<LineupSlot[]>(() =>
    rosterPlayers.value
      .filter((p) => p.started)
      .map((p) => {
        const primary = (p.position || '').split(/[,/|]/)[0]?.trim() || p.position || ''
        return {
          slot: primary,
          playerKey: p.playerKey,
          name: p.name,
          team: p.team,
          position: p.position,
          status: p.status,
        }
      }),
  )
  const openSlots = computed<OpenSlot[]>(() => findOpenSlots(lineup.value, schedule.value))

  // ── benched roster (mirror useYourMove.ts) ──────────────────────────────────
  const benched = computed<BenchPlayer[]>(() =>
    rosterPlayers.value
      .filter((p) => !p.started)
      .map((p) => ({ playerKey: p.playerKey, name: p.name, team: p.team, position: p.position, stats: p.stats })),
  )
  const statsByKey = computed(() => new Map(rosterPlayers.value.map((p) => [p.playerKey, p.stats])))

  // Player headshot lookup by playerKey, over the combined roster + free-agent pools — mirrors
  // the Wire's headshot treatment (RosterPlayer/AvailablePlayer both carry `headshot`).
  const headshotByKey = computed<Map<string, string | undefined>>(() => {
    const m = new Map<string, string | undefined>()
    for (const p of rosterPlayers.value) if (p.headshot) m.set(p.playerKey, p.headshot)
    for (const p of freeAgents.value) if (p.headshot) m.set(p.playerKey, p.headshot)
    return m
  })

  // ── candidates (mirror useYourMove.ts's daily layer) ────────────────────────
  const candidates = computed<MoveCandidate[]>(() =>
    dailyCandidates(freeAgents.value, benched.value, schedule.value, catSpecs.value, seasonFraction.value),
  )

  // ── base value: category league = sum of the positive (helped-cat) deltas — a
  // single comparable magnitude across counting + ratio cats. Points league = the
  // candidate player's projected per-game fantasy points (FanGraphs projection x
  // league scoring weights), independent of addDelta's category-shaped deltas.
  function baseValue(candidate: MoveCandidate): number {
    if (isPointsLeague.value) {
      const matchFG = matchFGRef.value
      if (!matchFG) return 0
      return pointsDailyValue(candidate.player.name, candidate.player.team, candidate.player.position, baseballValueOfWith(matchFG))
    }
    // Category league: sum of the positive (helped-cat) deltas — a single comparable magnitude.
    const vals = Object.values(candidate.addDelta).filter((v) => Number.isFinite(v))
    return vals.reduce((s, v) => s + (v > 0 ? v : 0), 0)
  }

  // Which open slot (if any) a candidate is eligible to fill: an exact position
  // match first, a pitcher candidate to any generic SP/RP/P slot, a hitter to UTIL.
  function findFillsSlot(position: string, side: 'hit' | 'pit', slots: OpenSlot[]): string | undefined {
    const toks = (position || '').split(/[,/|]/).map((t) => t.trim().toUpperCase()).filter(Boolean)
    if (side === 'pit') {
      const exact = slots.find((s) => toks.includes(s.slot.toUpperCase()))
      if (exact) return exact.slot
      return slots.find((s) => ['SP', 'RP', 'P'].includes(s.slot.toUpperCase()))?.slot
    }
    const exact = slots.find((s) => toks.includes(s.slot.toUpperCase()))
    if (exact) return exact.slot
    return slots.find((s) => s.slot.toUpperCase() === 'UTIL')?.slot
  }

  // Best-effort quality of the pitcher opposing `teamAbbr` today, from the same
  // league-independent FanGraphs matcher useWire.ts uses for free agents — a more
  // reliable source than the app's own rostered/FA stats, which are empty for the
  // Yahoo league-wide pool (see the report). THE lossy step: any unmatched name,
  // wrong player type, or missing ERA -> null (neutral spFactor).
  function resolveOppQuality(teamAbbr: string): PitcherQuality | null {
    const matchFG = matchFGRef.value
    if (!matchFG) return null
    const oppName = opposingStarterName(schedule.value, teamAbbr)
    if (!oppName) return null
    const fg = matchFG({ full_name: oppName })
    if (!fg || fg.player_type !== 'pitcher') return null
    return typeof fg.era === 'number' && Number.isFinite(fg.era) ? { era: fg.era } : null
  }

  function spFactorFor(candidate: MoveCandidate): number {
    // Stream (my own SP candidate): neutral spFactor in Phase 1 — only park applies.
    if (candidate.kind === 'stream' || candidate.side !== 'hit') return 1
    return spQualityFactor(resolveOppQuality(candidate.player.team))
  }

  function scoreCandidate(candidate: MoveCandidate): ScoredPlay {
    const home = schedule.value.homeTeamByTeam[candidate.player.team] ?? ''
    const pf = parkFactor(home)
    const parkVal = candidate.side === 'hit' ? pf.hit : pf.pit
    const { value, bucket } = scoreToday(baseValue(candidate), {
      parkFactor: parkVal,
      spFactor: spFactorFor(candidate),
    })
    // Rest-of-season "drop candidate" flag: is this play's OWN body at/below this side's wire
    // replacement level (i.e. the rest of the app would flag it to drop, not start)? Deliberately
    // a DIFFERENT, looser test than pickSafeDrop's bottom-tier-of-MY-roster bar (see safeDrop.ts) —
    // this one only gates the hero/upgrade sections (todayBoard.ts), not which body gets cut.
    // Streams are exempt — a streamer is disposable by design, not a roster asset being pitched
    // as a keeper. -Infinity replacement (empty wire) never flags a candidate (conservative).
    const rosValue = rosValueByKey.value.get(candidate.player.key)
    const dropCandidate =
      candidate.kind !== 'stream' && rosValue != null && rosValue <= replacementBySide.value[candidate.side]
    return {
      kind: candidate.kind,
      playerKey: candidate.player.key,
      name: candidate.player.name,
      team: candidate.player.team,
      position: candidate.player.position,
      headshot: headshotByKey.value.get(candidate.player.key),
      side: candidate.side,
      value,
      score: 0, // assigned by normalizeMoves
      bucket,
      detail: candidate.detail,
      oneDay: candidate.kind === 'stream',
      fillsSlot: findFillsSlot(candidate.player.position, candidate.side, openSlots.value),
      helpsCats: Object.entries(candidate.addDelta)
        .filter(([, v]) => Number.isFinite(v) && v > 0)
        .map(([statId]) => categories.value.find((c) => c.statId === statId)?.label || statId),
      dropCandidate,
    }
  }

  // Free agents on the IL/OUT are never a stream — skip them on the points board. DTD stays
  // (still likely to play today). Reuses the Phase-2 injury tier. Only FAs carry a status here.
  const outFaKeys = computed(() => {
    const s = new Set<string>()
    for (const fa of freeAgents.value) if (injuryTier(fa.status) === 'il') s.add(fa.playerKey)
    return s
  })

  const scoredPlays = computed<ScoredPlay[]>(() => {
    const scored = candidates.value.map(scoreCandidate)
    const filtered = !isPointsLeague.value
      ? scored
      : scored.filter((p) => p.value > 0 && !outFaKeys.value.has(p.playerKey))
    const ranked = isPointsLeague.value ? pointsRanked(filtered) : normalizeMoves(filtered)
    return annotateAddBudget(attachDrops(ranked), addBudget.value)
  })

  // Points display: no percentile normalization — `score` IS the raw per-game points (so the board
  // sorts by real points and a pitcher's start correctly tops a hitter-game), and `barPct` fills
  // proportional to the day's top move (points are cross-type comparable).
  function pointsRanked(plays: ScoredPlay[]): ScoredPlay[] {
    const max = plays.reduce((m, p) => Math.max(m, p.value), 0)
    return plays.map((p) => ({
      ...p,
      score: p.value,
      barPct: max > 0 ? Math.round((p.value / max) * 100) : 0,
    }))
  }

  // Pair each free-agent add/stream with a safe drop, best moves first so they claim the cheapest
  // expendable body; a startSit (bench move) needs no drop. Bodies are claimed once per build.
  function attachDrops(plays: ScoredPlay[]): ScoredPlay[] {
    const claimed = new Set<string>()
    const patch = new Map<string, { drop?: SafeDrop; noCleanDrop?: boolean }>()
    for (const p of [...plays].sort((a, b) => b.score - a.score)) {
      if (p.kind !== 'stream' && p.kind !== 'add') continue
      const drop = pickSafeDrop(wireDropSet.value, claimed)
      if (drop) {
        claimed.add(drop.playerKey)
        patch.set(p.playerKey, { drop })
      } else {
        patch.set(p.playerKey, { noCleanDrop: true })
      }
    }
    return plays.map((p) => ({ ...p, ...(patch.get(p.playerKey) ?? {}) }))
  }

  // Today's matchup-adjusted value for each currently-started hitter whose team plays today,
  // scored through the exact same pipeline as every other candidate (apples-to-apples). Shared by
  // sitAlerts (a poor-matchup starter vs. the bench) and the Upgrades gate in buildTodayBoard (any
  // starter a bench/FA play must actually beat to count as a genuine upgrade).
  const activeLineupScored = computed<ScoredPlay[]>(() => {
    const out: ScoredPlay[] = []
    for (const p of lineup.value) {
      if (!p.playerKey || sideOf(p.position) !== 'hit' || !playsToday(p.team)) continue
      const startedCandidate: MoveCandidate = {
        kind: 'startSit',
        player: { key: p.playerKey, name: p.name, team: p.team, position: p.position },
        side: 'hit',
        addDelta: projectGames(statsByKey.value.get(p.playerKey) ?? {}, null, catSpecs.value, 1, seasonFraction.value),
        detail: '',
      }
      out.push(scoreCandidate(startedCandidate))
    }
    return out
  })

  // ── sit alerts (capped at 2) ─────────────────────────────────────────────────
  // A rostered active hitter playing today with a poor matchup (bucket <= 1) whose
  // bench/FA startSit alternative at a compatible position projects higher. Never
  // throws — an unresolved lookup for one slot just yields no alert for that slot.
  const sitAlerts = computed<ScoredPlay[]>(() => {
    const alerts: ScoredPlay[] = []
    const benchPlays = scoredPlays.value.filter((p) => p.kind === 'startSit')
    if (!benchPlays.length) return alerts
    for (const startedScore of activeLineupScored.value) {
      if (alerts.length >= MAX_SIT_ALERTS) break
      if (startedScore.bucket > 1) continue
      const better = benchPlays.find((b) => b.value > startedScore.value && positionsOverlap(b.position, startedScore.position))
      if (better) alerts.push({ ...startedScore, detail: `Tough matchup today — ${better.name} projects higher` })
    }
    return alerts
  })

  const board = computed<TodayBoard>(() =>
    buildTodayBoard(
      scoredPlays.value,
      openSlots.value,
      activeLineupScored.value.map((p): LineupValue => ({ playerKey: p.playerKey, position: p.position, value: p.value })),
    ),
  )

  const loading = ref(false)
  const error = ref<string | null>(null)

  // Nothing renders until the schedule fetch has actually settled — before that,
  // `lineup` can already be populated (roster loads independently) while `schedule`
  // is still the EMPTY placeholder, which would make findOpenSlots flag every
  // started player as an 'off-day' false positive.
  const vm = computed<TodayBoard>(() => {
    if (!isBaseball.value || !platformSupported.value) return EMPTY_BOARD
    if (!scheduleLoaded.value) return EMPTY_BOARD
    if (!Object.keys(schedule.value.gamesByTeam).length) return EMPTY_BOARD
    return { ...board.value, sitAlerts: sitAlerts.value }
  })

  // ── loaders ──────────────────────────────────────────────────────────────
  function maybeLoadSeasonData() {
    const id = leagueStore.activeLeagueId
    if (id && isYahooCategoryLeague.value) loadSeasonData(id)
  }
  // Today is baseball-only, so no roster/FA loader should fire for a non-baseball active league —
  // gate every trigger on isBaseball (the broadened points triggers otherwise fetch full rosters
  // for football/hockey/etc. leagues that render an empty board anyway).
  function maybeLoadEspn() {
    if (!isBaseball.value) return
    if (leagueStore.activePlatform === 'espn') {
      espn.load() // self-bails unless H2H_CATEGORY
      espnPoints.load() // self-bails unless points
    }
  }
  function maybeLoadYahoo() {
    if (!isBaseball.value || leagueStore.activePlatform !== 'yahoo') return
    if (!yahooRosterPlayers.value.length) loadYahooRoster()
    if (!yahooFreeAgentsRaw.value.length) loadYahooFreeAgents()
  }

  // The single, order-independent Yahoo roster trigger (mirror useWire.ts's
  // clobber-race lesson): fire only once the my-team key is present, never off a
  // half-ready store — otherwise an early load can resolve empty and clobber a
  // later good load.
  const yahooRosterReady = computed(
    () => isBaseball.value && leagueStore.activePlatform === 'yahoo' && !!leagueStore.yahooTeams?.find((t: any) => t.is_my_team)?.team_key,
  )
  watch(yahooRosterReady, (ready) => { if (ready) maybeLoadYahoo() }, { immediate: true })

  // CRITICAL: watch activeLeagueId/activePlatform, NOT isEspnCategoryLeague —
  // espn.load() reset()s espn.supported (which IS that flag), so watching it here
  // would re-fire forever (mirror useWire.ts).
  watch(
    [() => leagueStore.activeLeagueId, () => leagueStore.activePlatform],
    () => {
      maybeLoadEspn()
      maybeLoadSeasonData()
      scoring.load()
    },
    { immediate: true },
  )

  async function load() {
    loading.value = true
    try {
      if (!isBaseball.value || !platformSupported.value) {
        error.value = 'no-games'
        return
      }
      maybeLoadEspn()
      maybeLoadSeasonData()
      maybeLoadYahoo()
      scoring.load()
      // Add-budget data is annotation-only — fire-and-forget so it NEVER delays the board (the
      // addBudget computed picks it up reactively once it lands). Awaiting here would block the
      // schedule fetch on 2+ extra Yahoo round-trips (getTeams + team resource).
      if (leagueStore.activePlatform === 'yahoo') {
        const lk = leagueStore.activeLeagueId
        if (lk) {
          yahooService.getLeagueSettings(lk).then((s) => { yahooSettings.value = s }).catch(() => {})
          yahooService.getTeamAddInfo(lk).then((info) => { yahooAddInfo.value = info }).catch(() => {})
        }
      }
      const today = ymd(new Date())
      schedule.value = await getWeekSchedule(today, today)
      error.value = Object.keys(schedule.value.gamesByTeam).length ? null : 'no-games'
    } catch {
      schedule.value = { ...EMPTY_SCHEDULE }
      error.value = 'no-games'
    } finally {
      scheduleLoaded.value = true
      loading.value = false
    }
  }

  // The board's real inputs beyond the schedule are my roster + the free-agent pool.
  // Only the two category paths load them (ESPN category → espn.loaded; Yahoo category →
  // useMyRoster/useAvailablePlayers.loaded — both Yahoo-specific). Every other league type
  // loads nothing into the board, so it's ready the moment the schedule settles.
  const boardInputsReady = computed(() => {
    if (isEspnCategoryLeague.value) return espn.loaded.value && valueBaselineSvc.ready.value
    if (isEspnPointsLeague.value) return espnPoints.loaded.value
    if (isYahooCategoryLeague.value)
      return yahooRosterLoaded.value && yahooFaLoaded.value && valueBaselineSvc.ready.value
    if (isYahooPointsLeague.value) return yahooRosterLoaded.value && yahooFaLoaded.value
    return true
  })

  // Fully resolved = safe to show the board (or the genuine empty state). This is the fix
  // for the "You're set for today" flash: `load()` awaits only the schedule (fast), but the
  // roster + free-agent fetches settle later and weren't part of the loading signal — so the
  // empty copy rendered in the gap. Keeping this false until the roster/FAs land holds the
  // "Reading today's slate…" affordance up, so a fast navigate-away can't miss late data.
  const dataReady = computed(() => {
    if (!isBaseball.value || !platformSupported.value) return true // resolves to no-games
    if (!scheduleLoaded.value) return false
    if (!Object.keys(schedule.value.gamesByTeam).length) return true // no games → resolved
    return boardInputsReady.value && pointsScoringReady.value
  })
  const isLoading = computed(() => !dataReady.value)

  return { vm, loading: isLoading, error, load, isPoints: isPointsLeague, budget: addBudget }
}
