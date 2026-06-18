import { computed, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAvailablePlayers } from '@/composables/useAvailablePlayers'
import { useYahooLeaguePool } from '@/composables/useYahooLeaguePool'
import { useFullSeasonCategoryData } from '@/composables/useFullSeasonCategoryData'
import { useEspnCategoryTeamData } from '@/composables/useEspnCategoryTeamData'
import { isYahooCategoryLeague as isYahooCategoryScoringType } from '@/composables/useIsCategoryLeague'
import { classifyCategory } from '@/myteam/categorySide'
import { isLowerBetter } from '@/players/direction'
import { computeRosterValue, type CatSpec } from '@/myteam/value'
import { toEffectiveStats } from '@/myteam/effectiveStats'
import { mapFgStatsByKey } from '@/myteam/fgMappedStats'
// ── Wire engines ─────────────────────────────────────────────────────────────
import { aggregateTeamCatTotals, rankInCategory, addDropDelta } from '@/trades/standings'
import { rankUpgrades, type WireFreeAgent, type WireDropOption, type WireUpgrade } from '@/wire/wireUpgrades'
import { buildStreamBoard, type StreamBoard } from '@/wire/streamBoard'
import { computeDropCandidates } from '@/myteam/dropCandidates'
import { expendableKeys, parseEligible } from '@/wire/dropEligibility'
import { gradeLabel, type GradeVerdict } from '@/wire/gradeMove'
import { getWeekSchedule, type WeekSchedule } from '@/services/mlbSchedule'
import { buildPlayerMatchers } from '@/services/projectionService'
import { mlbTeamLogo } from '@/players/mlbTeamLogo'

const SEASON_FRACTION = 0.6

// buildPlayerMatchers loads league-independent FanGraphs data; build it once per session.
let matchersPromise: ReturnType<typeof buildPlayerMatchers> | null = null
const getPlayerMatchers = () => (matchersPromise ??= buildPlayerMatchers())

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Ordinal that includes the number: 2 -> "2nd", 11 -> "11th", 21 -> "21st".
// (copied from src/myteam/seasonStakes.ts `ord`)
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function useWire() {
  const leagueStore = useLeagueStore()

  // ── data loaders ──────────────────────────────────────────────────────────
  const { players: yahooFreeAgents, load: loadPlayers } = useAvailablePlayers()
  // The league-wide pool comes from light per-team roster calls + FG projections,
  // NOT the heavy throttle-prone getAllRosteredPlayers (see useYahooLeaguePool).
  const {
    pool: yahooLeaguePool,
    fgByKey: yahooLeagueFg,
    rosterSlots: yahooRosterSlots,
    load: loadYahooPool,
  } = useYahooLeaguePool()

  // ESPN category data loader
  const espn = useEspnCategoryTeamData()

  const { seasonMatchups, categoryLabels, loaded: seasonLoaded, load: loadSeasonData } =
    useFullSeasonCategoryData()

  // ── isYahooCategoryLeague (mirror the Matchup composable) ──────────────────
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

  // ── isEspnCategoryLeague ──────────────────────────────────────────────────
  const isEspnCategoryLeague = computed(
    () => leagueStore.activePlatform === 'espn' && espn.supported.value === true,
  )

  // ── platform-switched roster source ───────────────────────────────────────
  // NOTE: "which players are mine" is derived from the pool by teamKey (see
  // myRosterPool below), not from the platform's my-team list — that list proved
  // flaky on Yahoo. We only switch the league-wide pool / fg / free agents here.
  const rosterPool = computed(() =>
    isEspnCategoryLeague.value ? espn.pool.value : yahooLeaguePool.value,
  )
  const fgByKey = computed(() =>
    isEspnCategoryLeague.value ? espn.fgByKey.value : yahooLeagueFg.value,
  )
  const freeAgents = computed(() =>
    isEspnCategoryLeague.value ? espn.freeAgents.value : yahooFreeAgents.value,
  )

  // ── Yahoo season-derived categories ───────────────────────────────────────
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

  // Merge: ESPN categories take priority on ESPN leagues; else Yahoo season-derived.
  const categories = computed(() => {
    if (isEspnCategoryLeague.value) return espn.categories.value
    return yahooCategories.value
  })

  // ── cats (authoritative direction on ESPN, label heuristic on Yahoo) ───────
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

  // ── catSpecs (VERBATIM from the Matchup composable) ───────────────────────
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

  // ── fgStatsByKey + contributions (VERBATIM from the Matchup composable) ────
  const fgStatsByKey = computed<Record<string, Record<string, number>>>(() => {
    const fgMap = fgByKey.value
    if (!fgMap || !catSpecs.value.length) return {}
    const labelByStatId = new Map(categories.value.map((c) => [c.statId, c.label || c.name || c.statId]))
    return mapFgStatsByKey(fgMap, catSpecs.value, (id) => labelByStatId.get(id) ?? id)
  })

  const contributions = computed(() => {
    if (!rosterPool.value.length || !catSpecs.value.length) return []
    const myPlayerKeys = myRosterPool.value.map((p) => p.playerKey)
    if (!myPlayerKeys.length) return []
    const fgMap = fgStatsByKey.value
    const effectivePool = rosterPool.value.map((p) => ({
      playerKey: p.playerKey,
      position: p.position,
      stats: toEffectiveStats(p.stats, fgMap[p.playerKey] ?? null, catSpecs.value, SEASON_FRACTION),
    }))
    return computeRosterValue(effectivePool, myPlayerKeys, catSpecs.value)
  })

  // ── my-team id (must equal pool teamKey on BOTH platforms) ─────────────────
  // ESPN: pool teamKey = `espn_<id>`, myTeamId = `espn_<id>` (already prefixed).
  // Yahoo: pool teamKey = fantasy_team_key, myTeamId = is_my_team team_key (same).
  const myTeamId = computed<string>(() =>
    isEspnCategoryLeague.value
      ? String(espn.myTeamId.value ?? '')
      : String(leagueStore.yahooTeams?.find((t: any) => t.is_my_team)?.team_key ?? ''),
  )

  // Derive MY roster straight from the league pool by teamKey == myTeamId, rather
  // than trusting the platform's separate my-team filter (useMyRoster.players came
  // back empty on a Yahoo load where the pool itself was fully populated). The pool
  // grouping is the same one leagueTotals relies on, so this is the reliable source
  // of "which rostered players are mine" on both platforms.
  const myRosterPool = computed(() =>
    rosterPool.value.filter((p) => String((p as { teamKey?: string }).teamKey ?? '') === myTeamId.value),
  )
  // playerKey -> name across the whole pool (drop/upgrade players are all rostered).
  const nameByKey = computed(() => new Map(rosterPool.value.map((p) => [p.playerKey, p.name])))

  // Headshots for MY roster (the drop players). The light getRoster pool omits
  // headshots, so fetch player details for just my ~26 players (one call), cached
  // per-session so reloads don't re-hit Yahoo. Drops fall back to monograms until
  // this lands. Yahoo only (ESPN roster comes with headshots already).
  const rosterHeadshots = ref<Record<string, string>>({})
  watch(
    myRosterPool,
    async (mine) => {
      if (isEspnCategoryLeague.value || !mine.length || Object.keys(rosterHeadshots.value).length) return
      const cacheKey = `ufd_wirefaces_${leagueStore.activeLeagueId ?? ''}`
      try {
        const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(cacheKey) : null
        if (cached) {
          rosterHeadshots.value = JSON.parse(cached)
          return
        }
      } catch {
        /* ignore */
      }
      try {
        const { yahooService } = await import('@/services/yahoo')
        const map = await yahooService.getPlayers(mine.map((p) => p.playerKey), String(leagueStore.activeLeagueId ?? ''))
        const out: Record<string, string> = {}
        for (const [k, v] of map.entries()) if (v?.headshot) out[k] = v.headshot as string
        if (Object.keys(out).length) {
          rosterHeadshots.value = out
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(out))
          } catch {
            /* quota */
          }
        }
      } catch {
        /* keep monograms */
      }
    },
    { immediate: true },
  )

  const effStatsByKey = computed<Record<string, Record<string, number>>>(() => {
    const fg = fgStatsByKey.value
    const out: Record<string, Record<string, number>> = {}
    for (const p of rosterPool.value)
      out[p.playerKey] = toEffectiveStats(p.stats, fg[p.playerKey] ?? null, catSpecs.value, SEASON_FRACTION)
    return out
  })

  const leagueTotals = computed(() => {
    if (!rosterPool.value.length || !catSpecs.value.length) return []
    const byTeam = new Map<string, { playerKey: string; stats: Record<string, number> }[]>()
    for (const p of rosterPool.value) {
      const teamId = String((p as { teamKey?: string }).teamKey ?? '')
      if (!teamId) continue
      const arr = byTeam.get(teamId) ?? []
      arr.push({ playerKey: p.playerKey, stats: effStatsByKey.value[p.playerKey] ?? {} })
      byTeam.set(teamId, arr)
    }
    return aggregateTeamCatTotals(
      [...byTeam.entries()].map(([teamId, players]) => ({ teamId, players })),
      catSpecs.value,
    )
  })

  // ── free-agent effective stats + side ─────────────────────────────────────
  // Bound the ranking input: the ECW ranking runs addDropDelta (many category
  // re-ranks) per free agent, so an unbounded ESPN pool of hundreds/thousands
  // hangs the main thread. Rank only the most-owned free agents (the realistic
  // add targets); the rest are noise on a season-add page.
  const MAX_RANKABLE_FAS = 120
  const rankableFreeAgents = computed(() =>
    [...freeAgents.value]
      .sort((a, b) => (b.percentOwned ?? 0) - (a.percentOwned ?? 0))
      .slice(0, MAX_RANKABLE_FAS),
  )

  const faFgByKey = ref<Record<string, Record<string, number>>>({})
  watch(
    [rankableFreeAgents, catSpecs],
    async () => {
      if (!rankableFreeAgents.value.length || !catSpecs.value.length) return
      const { matchFG } = await getPlayerMatchers()
      const labelByStatId = new Map(categories.value.map((c) => [c.statId, c.label || c.name || c.statId]))
      const raw: Record<string, ReturnType<typeof matchFG>> = {}
      for (const fa of rankableFreeAgents.value) raw[fa.playerKey] = matchFG({ full_name: fa.name, mlb_team: fa.team })
      faFgByKey.value = mapFgStatsByKey(raw, catSpecs.value, (id) => labelByStatId.get(id) ?? id)
    },
    { immediate: true },
  )

  const faSide = (position: string): 'hit' | 'pit' =>
    /SP|RP|\bP\b/.test(position.toUpperCase()) ? 'pit' : 'hit'

  const wireFreeAgents = computed<WireFreeAgent[]>(() =>
    rankableFreeAgents.value.map((fa) => ({
      playerKey: fa.playerKey,
      name: fa.name,
      position: fa.position,
      team: fa.team,
      headshot: fa.headshot,
      side: faSide(fa.position),
      effStats: toEffectiveStats(fa.stats, faFgByKey.value[fa.playerKey] ?? null, catSpecs.value, SEASON_FRACTION),
    })),
  )

  // ── position-aware drop eligibility ────────────────────────────────────────
  // A roster player is "expendable" only if dropping them still leaves a legal
  // lineup (positional depth check), so we never suggest dropping your only
  // catcher. Empty roster slots (still loading) => no constraint (all expendable).
  const rosterSlots = computed(() =>
    isEspnCategoryLeague.value ? espn.rosterSlots.value : yahooRosterSlots.value,
  )
  // Players parked in an IL/NA reserve slot. They don't hold an active roster
  // spot, so dropping one never frees a spot for an add — keep them out of the
  // "drop to make room" math (both as a droppable body AND as a body that could
  // cover a starting slot, since an injured player can't actually be fielded).
  const ilKeys = computed<Set<string>>(
    () => new Set(myRosterPool.value.filter((p) => (p as { onIL?: boolean }).onIL).map((p) => p.playerKey)),
  )
  const expendable = computed<Set<string>>(() => {
    if (!myRosterPool.value.length) return new Set()
    const elig = myRosterPool.value
      .filter((p) => !ilKeys.value.has(p.playerKey))
      .map((p) => ({ playerKey: p.playerKey, eligiblePositions: parseEligible(p.position) }))
    return expendableKeys(elig, rosterSlots.value)
  })

  // ── shared drop-candidate analysis (who-to-drop suggestions) ───────────────
  const dropCandidates = computed(() => computeDropCandidates(contributions.value))

  // ── drop options: weakest EXPENDABLE roster players, weakest first ─────────
  // (an add pairs with the weakest player you can legally lose on its side).
  const dropOptions = computed<WireDropOption[]>(() =>
    contributions.value
      .filter((c) => expendable.value.has(c.playerKey))
      .sort((a, b) => a.roleValue - b.roleValue)
      .map((c) => ({
        playerKey: c.playerKey,
        side: (c.role === 'pitcher' ? 'pit' : 'hit') as 'hit' | 'pit',
        effStats: effStatsByKey.value[c.playerKey] ?? {},
      })),
  )

  // ── weak cats (my bottom-half category ranks, weakest first) ──────────────
  const weakCats = computed(() => {
    if (!leagueTotals.value.length) return []
    const n = leagueTotals.value.length
    return catSpecs.value
      .map((c) => {
        const label = categories.value.find((x) => x.statId === c.statId)?.label || c.statId
        const rank = rankInCategory(leagueTotals.value, c).get(myTeamId.value) ?? n
        return { statId: c.statId, label, rank, side: c.side, isRatio: c.isRatio }
      })
      .filter((c) => c.rank > n / 2)
      .sort((a, b) => b.rank - a.rank)
  })

  // ── surplus cats (where you're strong — the trade-from / leverage side) ────
  const strongCats = computed(() => {
    if (!leagueTotals.value.length) return []
    const n = leagueTotals.value.length
    const top = Math.max(2, Math.floor(n / 3))
    return catSpecs.value
      .map((c) => ({ statId: c.statId, label: labelOf(c.statId), rank: rankInCategory(leagueTotals.value, c).get(myTeamId.value) ?? n }))
      .filter((c) => c.rank <= top)
      .sort((a, b) => a.rank - b.rank)
  })

  // ── player values: overall (0-100 roleValue) + per-category strength (0-100) ──
  // Computed once over the rostered pool + rankable free agents. The per-cat
  // percentile drives the "category-fit" bars (how much an add plugs each weak
  // cat) — far more useful on a fit-based waiver page than absolute value.
  const playerValues = computed(() => {
    const role = new Map<string, number>()
    const pctCat = new Map<string, Map<string, number>>()
    if (!catSpecs.value.length) return { role, pctCat }
    const all = [
      ...rosterPool.value.map((p) => ({ playerKey: p.playerKey, position: p.position, stats: effStatsByKey.value[p.playerKey] ?? {} })),
      ...wireFreeAgents.value.map((f) => ({ playerKey: f.playerKey, position: f.position, stats: f.effStats })),
    ]
    if (!all.length) return { role, pctCat }
    for (const c of computeRosterValue(all, all.map((p) => p.playerKey), catSpecs.value)) {
      role.set(c.playerKey, Math.round(c.roleValue))
      const m = new Map<string, number>()
      for (const cc of c.contribs) m.set(cc.statId, Math.round(cc.percentile <= 1 ? cc.percentile * 100 : cc.percentile))
      pctCat.set(c.playerKey, m)
    }
    return { role, pctCat }
  })
  const valueByKey = computed(() => playerValues.value.role)
  const pctByKeyCat = computed(() => playerValues.value.pctCat)

  interface PlayerMeta { headshot?: string; proLogo?: string; pos: string; value: number }
  const metaByKey = computed(() => {
    const m = new Map<string, PlayerMeta>()
    for (const p of rosterPool.value)
      m.set(p.playerKey, { headshot: rosterHeadshots.value[p.playerKey] || (p as { headshot?: string }).headshot || undefined, proLogo: mlbTeamLogo((p as { proTeam?: string }).proTeam), pos: p.position, value: valueByKey.value.get(p.playerKey) ?? 0 })
    for (const f of wireFreeAgents.value)
      m.set(f.playerKey, { headshot: f.headshot || undefined, proLogo: mlbTeamLogo(f.team), pos: f.position, value: valueByKey.value.get(f.playerKey) ?? 0 })
    return m
  })

  // ── week schedule (for the streaming board) ───────────────────────────────
  const weekScheduleRef = ref<WeekSchedule>({ gamesByTeam: {}, startsByPitcher: {} })
  async function fetchWeekSchedule() {
    const start = new Date()
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    try {
      weekScheduleRef.value = await getWeekSchedule(ymd(start), ymd(end))
    } catch {
      weekScheduleRef.value = { gamesByTeam: {}, startsByPitcher: {} }
    }
  }

  // ── assemble the reactive VM ──────────────────────────────────────────────
  const labelOf = (statId: string) => categories.value.find((c) => c.statId === statId)?.label || statId

  const ready = computed(() => leagueTotals.value.length > 0 && !!myTeamId.value)

  const upgradesAll = computed<WireUpgrade[]>(() =>
    ready.value
      ? rankUpgrades({
          freeAgents: wireFreeAgents.value,
          leagueTotals: leagueTotals.value,
          myTeamId: myTeamId.value,
          cats: catSpecs.value,
          dropOptions: dropOptions.value,
          minDelta: 0.05,
        })
      : [],
  )

  const streamBoardVm = computed<StreamBoard>(() =>
    ready.value
      ? buildStreamBoard({
          freeAgents: wireFreeAgents.value.map((f) => ({
            playerKey: f.playerKey,
            name: f.name,
            position: f.position,
            team: f.team,
          })),
          weakCats: weakCats.value,
          schedule: weekScheduleRef.value,
        })
      : { weakCats: [], starters: [], relievers: [] },
  )

  const dropsVm = computed(() => {
    const healthy = dropCandidates.value.candidates
      .filter((d) => expendable.value.has(d.playerKey))
      .map((d) => {
        const meta = metaByKey.value.get(d.playerKey)
        return {
          key: d.playerKey,
          name: nameByKey.value.get(d.playerKey) ?? d.playerKey,
          pos: meta?.pos ?? '',
          headshot: meta?.headshot,
          proLogo: meta?.proLogo,
          value: meta?.value ?? 0,
          reason: d.reason,
          onIL: false,
        }
      })
    // IL players are dead weight worth clearing, but dropping them won't open an
    // active roster spot — flag them so the user knows a second (active) drop is
    // needed before an add. Listed after the healthy drops.
    const il = myRosterPool.value
      .filter((p) => ilKeys.value.has(p.playerKey))
      .map((p) => {
        const meta = metaByKey.value.get(p.playerKey)
        return {
          key: p.playerKey,
          name: p.name,
          pos: meta?.pos ?? p.position,
          headshot: meta?.headshot,
          proLogo: meta?.proLogo,
          value: meta?.value ?? 0,
          reason: "won't open an active spot",
          onIL: true,
        }
      })
    return [...healthy, ...il]
  })

  // An enriched upgrade: add + drop players carry headshot / team logo / 0-100 value
  // so the view can render the Trades-style ADD/DROP card with a value bar.
  const toUp = (u: WireUpgrade) => {
    const addMeta = metaByKey.value.get(u.player.key)
    const dropMeta = u.dropKey ? metaByKey.value.get(u.dropKey) : undefined
    const addPct = pctByKeyCat.value.get(u.player.key)
    return {
      deltaEcw: u.deltaEcw,
      add: {
        name: u.player.name,
        pos: u.player.position,
        headshot: u.player.headshot || addMeta?.headshot,
        proLogo: mlbTeamLogo(u.player.team) || addMeta?.proLogo,
        value: addMeta?.value ?? 0,
      },
      // The add's strength (0-100) in each category it fixes — the fit bars.
      fit: u.fixes.map((statId) => ({ label: labelOf(statId), pct: addPct?.get(statId) ?? 0 })),
      drop: u.dropKey
        ? {
            name: nameByKey.value.get(u.dropKey) ?? u.dropKey,
            pos: dropMeta?.pos ?? '',
            headshot: dropMeta?.headshot,
            proLogo: dropMeta?.proLogo,
            value: dropMeta?.value ?? 0,
          }
        : null,
      fixesLabels: u.fixes.map(labelOf),
      holdsLabels: u.holds.map(labelOf),
    }
  }

  // Enrich a stream target with its headshot + team logo.
  const enrichStream = (t: StreamBoard['starters'][number]) => {
    const meta = metaByKey.value.get(t.player.key)
    return { ...t, headshot: meta?.headshot, proLogo: mlbTeamLogo(t.player.team) }
  }

  // ── interactive add/drop grader ────────────────────────────────────────────
  // Pick a free agent to add + a roster player to drop and grade the move in the
  // same ECW dialect as the auto upgrades (mirrors the Trades analyzer). The
  // pickable lists; the grade is computed on demand from the current selection.
  interface GraderPick { key: string; name: string; pos: string; headshot?: string; proLogo?: string; value: number; onIL?: boolean }
  interface GradeResult {
    deltaEcw: number
    verdict: GradeVerdict
    add: GraderPick | null
    drop: GraderPick | null
    fit: { label: string; pct: number }[]
    holdsLabels: string[]
    valueGap: number
    ilWarning: boolean
  }
  const graderAdds = computed<GraderPick[]>(() =>
    wireFreeAgents.value
      .map((f) => {
        const meta = metaByKey.value.get(f.playerKey)
        return { key: f.playerKey, name: f.name, pos: f.position, headshot: f.headshot || meta?.headshot, proLogo: mlbTeamLogo(f.team) || meta?.proLogo, value: meta?.value ?? 0 }
      })
      .sort((a, b) => b.value - a.value),
  )
  const graderDrops = computed<GraderPick[]>(() =>
    myRosterPool.value
      .map((p) => {
        const meta = metaByKey.value.get(p.playerKey)
        return { key: p.playerKey, name: p.name, pos: meta?.pos ?? p.position, headshot: meta?.headshot, proLogo: meta?.proLogo, value: meta?.value ?? 0, onIL: ilKeys.value.has(p.playerKey) }
      })
      .sort((a, b) => a.value - b.value),
  )
  function gradeMove(addKey: string | null, dropKey: string | null): GradeResult | null {
    if (!ready.value || (!addKey && !dropKey)) return null
    const addFa = addKey ? wireFreeAgents.value.find((f) => f.playerKey === addKey) : undefined
    const addStats = addFa ? addFa.effStats : {}
    const dropStats = dropKey ? effStatsByKey.value[dropKey] ?? {} : null
    const d = addDropDelta(leagueTotals.value, catSpecs.value, myTeamId.value, addStats, dropStats)
    const addMeta = addKey ? metaByKey.value.get(addKey) : undefined
    const dropMeta = dropKey ? metaByKey.value.get(dropKey) : undefined
    const addPct = addKey ? pctByKeyCat.value.get(addKey) : undefined
    const addVal = addKey ? valueByKey.value.get(addKey) ?? 0 : 0
    const dropVal = dropKey ? valueByKey.value.get(dropKey) ?? 0 : 0
    return {
      deltaEcw: d.deltaEcw,
      verdict: gradeLabel(d.deltaEcw),
      add: addFa ? { key: addFa.playerKey, name: addFa.name, pos: addFa.position, headshot: addFa.headshot || addMeta?.headshot, proLogo: mlbTeamLogo(addFa.team) || addMeta?.proLogo, value: addVal } : null,
      drop: dropKey ? { key: dropKey, name: nameByKey.value.get(dropKey) ?? dropKey, pos: dropMeta?.pos ?? '', headshot: dropMeta?.headshot, proLogo: dropMeta?.proLogo, value: dropVal, onIL: ilKeys.value.has(dropKey) } : null,
      fit: d.fixes.map((statId) => ({ label: labelOf(statId), pct: addPct?.get(statId) ?? 0 })),
      holdsLabels: d.holds.map(labelOf),
      valueGap: addVal - dropVal,
      ilWarning: dropKey ? ilKeys.value.has(dropKey) : false,
    }
  }

  const vm = computed(() => {
    const holesText = weakCats.value.slice(0, 2).map((c) => `${ordinal(Math.round(c.rank))} in ${c.label}`)
    // Stream board: drop anyone already shown as a hero/upgrade so the two lists
    // never surface the same player twice.
    const upgradeKeys = new Set([
      ...(upgradesAll.value[0] ? [upgradesAll.value[0].player.key] : []),
      ...upgradesAll.value.slice(1, 8).map((u) => u.player.key),
    ])
    const board = streamBoardVm.value
    const dedupeStream = (list: StreamBoard['starters']) =>
      list.filter((t) => !upgradeKeys.has(t.player.key)).map(enrichStream)
    return {
      ready: ready.value,
      supported: isEspnCategoryLeague.value || isYahooCategoryLeague.value,
      loadState: {
        categories: catSpecs.value.length,
        pool: rosterPool.value.length,
        teamFound: !!myTeamId.value,
        standings: leagueTotals.value.length,
      },
      subtitle: holesText.length
        ? `Fix your roster for the season, you're ${holesText.join(', ')}.`
        : 'Fix your roster for the season.',
      // Leverage header (Trades-style): where you're strong vs your holes.
      surplus: strongCats.value.map((c) => ({ label: c.label, rank: ordinal(Math.round(c.rank)) })),
      holes: weakCats.value.map((c) => ({ label: c.label, rank: ordinal(Math.round(c.rank)) })),
      hero: upgradesAll.value.length ? toUp(upgradesAll.value[0]) : null,
      upgrades: upgradesAll.value.slice(1, 8).map(toUp),
      streamBoard: {
        weakCats: board.weakCats,
        starters: dedupeStream(board.starters),
        relievers: dedupeStream(board.relievers),
      },
      drops: dropsVm.value,
    }
  })

  // ── loaders ────────────────────────────────────────────────────────────────
  function maybeLoadSeasonData() {
    const id = leagueStore.activeLeagueId
    if (id && isYahooCategoryLeague.value) loadSeasonData(id)
  }
  function maybeLoadEspn() {
    if (leagueStore.activePlatform === 'espn') espn.load()
  }
  function maybeLoadRoster() {
    if (isYahooCategoryLeague.value) loadYahooPool()
  }
  function maybeLoadPlayers() {
    if (isYahooCategoryLeague.value) loadPlayers()
  }

  async function refresh() {
    maybeLoadSeasonData()
    maybeLoadEspn()
    maybeLoadPlayers()
    maybeLoadRoster()
    fetchWeekSchedule()
  }

  // ESPN league data + the week schedule: load on activeLeagueId / platform settle.
  // CRITICAL: do NOT watch isEspnCategoryLeague here — espn.load() reset()s
  // espn.supported, which IS that flag, so re-firing this off it calls espn.load()
  // forever (reset + refetch each time = the OOM crash that killed the ESPN tab).
  watch(
    [() => leagueStore.activeLeagueId, () => leagueStore.activePlatform],
    () => {
      maybeLoadEspn()
      fetchWeekSchedule()
    },
    { immediate: true },
  )

  // Yahoo season-derived categories: load when the Yahoo category flag settles late
  // (a direct /players navigation finishes loading league details after mount, so
  // without this the categories never arrive and the page deadlocks on "Reading...").
  // isYahooCategoryLeague does NOT depend on espn.load(), so no loop here.
  watch(
    [() => leagueStore.activeLeagueId, isYahooCategoryLeague],
    () => {
      maybeLoadSeasonData()
    },
    { immediate: true },
  )

  // The single, order-independent Yahoo roster trigger: fire only once BOTH the
  // category flag and the my-team key are present, so the load always reads a real
  // team key. Guard on the POOL (the league-wide list the Wire actually needs and
  // that reliably loads), not the platform's my-team list.
  const yahooRosterReady = computed(
    () =>
      isYahooCategoryLeague.value &&
      !!leagueStore.yahooTeams?.find((t: any) => t.is_my_team)?.team_key,
  )

  watch(
    yahooRosterReady,
    (isReady) => {
      if (!isReady) return
      if (!yahooLeaguePool.value.length) maybeLoadRoster()
      if (!yahooFreeAgents.value.length) maybeLoadPlayers()
    },
    { immediate: true },
  )

  // Return vm as a plain ComputedRef (NOT wrapped in reactive): the view does
  // `const { vm } = useWire()`, and destructuring out of a reactive() object would
  // unwrap vm into a frozen snapshot that never updates. As a top-level ref it
  // auto-unwraps in the template and stays reactive (same as the Matchup composable).
  return { vm, refresh, grader: { adds: graderAdds, drops: graderDrops, grade: gradeMove } }
}
