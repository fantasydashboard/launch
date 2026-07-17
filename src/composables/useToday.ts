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
import { buildTodayBoard, type ScoredPlay, type TodayBoard } from '@/today/todayBoard'
import { useLeagueScoring } from '@/composables/useLeagueScoring'
import { pointsDailyValue } from '@/today/pointsDailyValue'
import { injuryTier } from '@/myteam/injuryStatus'

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
} {
  const leagueStore = useLeagueStore()
  const seasonFraction = computed(() => leagueStore.seasonFractionComplete)

  // ── data loaders (mirror useWire.ts / useMatchupBattlePlan.ts) ────────────
  const { players: yahooFreeAgentsRaw, load: loadYahooFreeAgents, loaded: yahooFaLoaded } = useAvailablePlayers()
  const { players: yahooRosterPlayers, load: loadYahooRoster, loaded: yahooRosterLoaded } = useMyRoster()
  const espn = useEspnCategoryTeamData()
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

  // ── platform-switched roster / free-agent source ───────────────────────────
  // rosterPlayers carries `started` (active lineup vs bench) for MY team on both
  // platforms — the same source useMatchupBattlePlan.ts uses for its lineup engine.
  const rosterPlayers = computed(() =>
    isEspnCategoryLeague.value ? espn.rosterPlayers.value : yahooRosterPlayers.value,
  )
  const rawFreeAgents = computed<AvailablePlayer[]>(() =>
    isEspnCategoryLeague.value ? espn.freeAgents.value : yahooFreeAgentsRaw.value,
  )
  // ESPN's free-agent feed leaks rostered players (see useWire.ts) — exclude anyone
  // already in the league-wide pool.
  const freeAgents = computed<AvailablePlayer[]>(() => {
    if (!isEspnCategoryLeague.value) return rawFreeAgents.value
    const guard = espn.pool.value.length > 0
    const rostered = new Set(espn.pool.value.map((p) => p.playerKey))
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

  // Points vs category, for baseValue's branch (categories.value is empty for a
  // points league on both platforms today, so this currently only tilts which
  // empty/degenerate path a points league takes — see the report for detail).
  const isPointsLeague = computed(
    () => getLeagueType(leagueStore.currentLeague?.scoring_type ?? undefined) === 'points',
  )

  // League points weights (for the points-league daily base value). Loaded alongside the
  // other sources; empty until loaded, which keeps the board on its loading/empty state.
  const scoring = useLeagueScoring()

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
      return pointsDailyValue(candidate.player.name, candidate.player.team, matchFG, scoring.weights.value)
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
    return {
      kind: candidate.kind,
      playerKey: candidate.player.key,
      name: candidate.player.name,
      team: candidate.player.team,
      position: candidate.player.position,
      value,
      bucket,
      detail: candidate.detail,
      oneDay: candidate.kind === 'stream',
      fillsSlot: findFillsSlot(candidate.player.position, candidate.side, openSlots.value),
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
    if (!isPointsLeague.value) return scored
    return scored.filter((p) => p.value > 0 && !outFaKeys.value.has(p.playerKey))
  })

  function positionsOverlap(a: string, b: string): boolean {
    const ta = new Set((a || '').split(/[,/|]/).map((t) => t.trim().toUpperCase()).filter(Boolean))
    return (b || '')
      .split(/[,/|]/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)
      .some((t) => ta.has(t))
  }

  // ── sit alerts (capped at 2) ─────────────────────────────────────────────────
  // A rostered active hitter playing today with a poor matchup (bucket <= 1) whose
  // bench/FA startSit alternative at a compatible position projects higher. Scores
  // the started player through the exact same pipeline as every other candidate so
  // the comparison is apples-to-apples; never throws — an unresolved lookup for one
  // slot just yields no alert for that slot.
  const sitAlerts = computed<ScoredPlay[]>(() => {
    const alerts: ScoredPlay[] = []
    const benchPlays = scoredPlays.value.filter((p) => p.kind === 'startSit')
    if (!benchPlays.length) return alerts
    for (const p of lineup.value) {
      if (alerts.length >= MAX_SIT_ALERTS) break
      if (!p.playerKey || sideOf(p.position) !== 'hit' || !playsToday(p.team)) continue
      const startedCandidate: MoveCandidate = {
        kind: 'startSit',
        player: { key: p.playerKey, name: p.name, team: p.team, position: p.position },
        side: 'hit',
        addDelta: projectGames(statsByKey.value.get(p.playerKey) ?? {}, null, catSpecs.value, 1, seasonFraction.value),
        detail: '',
      }
      const startedScore = scoreCandidate(startedCandidate)
      if (startedScore.bucket > 1) continue
      const better = benchPlays.find((b) => b.value > startedScore.value && positionsOverlap(b.position, p.position))
      if (better) alerts.push({ ...startedScore, detail: `Tough matchup today — ${better.name} projects higher` })
    }
    return alerts
  })

  const board = computed<TodayBoard>(() => buildTodayBoard(scoredPlays.value, openSlots.value))

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
  function maybeLoadEspn() {
    if (leagueStore.activePlatform === 'espn') espn.load()
  }
  function maybeLoadYahoo() {
    if (!isYahooCategoryLeague.value) return
    if (!yahooRosterPlayers.value.length) loadYahooRoster()
    if (!yahooFreeAgentsRaw.value.length) loadYahooFreeAgents()
  }

  // The single, order-independent Yahoo roster trigger (mirror useWire.ts's
  // clobber-race lesson): fire only once the my-team key is present, never off a
  // half-ready store — otherwise an early load can resolve empty and clobber a
  // later good load.
  const yahooRosterReady = computed(
    () => isYahooCategoryLeague.value && !!leagueStore.yahooTeams?.find((t: any) => t.is_my_team)?.team_key,
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
    if (isEspnCategoryLeague.value) return espn.loaded.value
    if (isYahooCategoryLeague.value) return yahooRosterLoaded.value && yahooFaLoaded.value
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

  return { vm, loading: isLoading, error, load }
}
