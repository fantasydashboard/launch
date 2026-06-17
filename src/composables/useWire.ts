import { computed, reactive, ref, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAvailablePlayers } from '@/composables/useAvailablePlayers'
import { useMyRoster } from '@/composables/useMyRoster'
import { useFullSeasonCategoryData } from '@/composables/useFullSeasonCategoryData'
import { useEspnCategoryTeamData } from '@/composables/useEspnCategoryTeamData'
import { isYahooCategoryLeague as isYahooCategoryScoringType } from '@/composables/useIsCategoryLeague'
import { classifyCategory } from '@/myteam/categorySide'
import { isLowerBetter } from '@/players/direction'
import { computeRosterValue, type CatSpec } from '@/myteam/value'
import { toEffectiveStats } from '@/myteam/effectiveStats'
import { mapFgStatsByKey } from '@/myteam/fgMappedStats'
// ── Wire engines ─────────────────────────────────────────────────────────────
import { aggregateTeamCatTotals, rankInCategory } from '@/trades/standings'
import { rankUpgrades, type WireFreeAgent, type WireDropOption, type WireUpgrade } from '@/wire/wireUpgrades'
import { buildStreamBoard, type StreamBoard } from '@/wire/streamBoard'
import { computeDropCandidates } from '@/myteam/dropCandidates'
import { getWeekSchedule, type WeekSchedule } from '@/services/mlbSchedule'
import { buildPlayerMatchers } from '@/services/projectionService'

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

  // ── data loaders (mirror the Matchup composable) ──────────────────────────
  const { players: yahooFreeAgents, load: loadPlayers } = useAvailablePlayers()
  const {
    players: yahooRosterPlayers,
    pool: yahooRosterPool,
    fgByKey: yahooFgByKey,
    load: loadRoster,
  } = useMyRoster()

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

  // ── my-team id (must equal pool teamKey on BOTH platforms) ─────────────────
  // ESPN: pool teamKey = `espn_<id>`, myTeamId = `espn_<id>` (already prefixed).
  // Yahoo: pool teamKey = fantasy_team_key, myTeamId = is_my_team team_key (same).
  const myTeamId = computed<string>(() =>
    isEspnCategoryLeague.value
      ? String(espn.myTeamId.value ?? '')
      : String(leagueStore.yahooTeams?.find((t: any) => t.is_my_team)?.team_key ?? ''),
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
  const faFgByKey = ref<Record<string, Record<string, number>>>({})
  watch(
    [freeAgents, catSpecs],
    async () => {
      if (!freeAgents.value.length || !catSpecs.value.length) return
      const { matchFG } = await getPlayerMatchers()
      const labelByStatId = new Map(categories.value.map((c) => [c.statId, c.label || c.name || c.statId]))
      const raw: Record<string, ReturnType<typeof matchFG>> = {}
      for (const fa of freeAgents.value) raw[fa.playerKey] = matchFG({ full_name: fa.name, mlb_team: fa.team })
      faFgByKey.value = mapFgStatsByKey(raw, catSpecs.value, (id) => labelByStatId.get(id) ?? id)
    },
    { immediate: true },
  )

  const faSide = (position: string): 'hit' | 'pit' =>
    /SP|RP|\bP\b/.test(position.toUpperCase()) ? 'pit' : 'hit'

  const wireFreeAgents = computed<WireFreeAgent[]>(() =>
    freeAgents.value.map((fa) => ({
      playerKey: fa.playerKey,
      name: fa.name,
      position: fa.position,
      team: fa.team,
      headshot: fa.headshot,
      side: faSide(fa.position),
      effStats: toEffectiveStats(fa.stats, faFgByKey.value[fa.playerKey] ?? null, catSpecs.value, SEASON_FRACTION),
    })),
  )

  // ── shared drop-candidate analysis (computed once, consumed by dropOptions + dropsVm) ──
  const dropCandidates = computed(() => computeDropCandidates(contributions.value))

  // ── drop options (weakest same-side roster players, weakest first) ─────────
  const dropOptions = computed<WireDropOption[]>(() => {
    const drops = dropCandidates.value.candidates
    const byKey = new Map(contributions.value.map((c) => [c.playerKey, c]))
    return drops.map((d) => {
      const contrib = byKey.get(d.playerKey)
      return {
        playerKey: d.playerKey,
        side: (contrib?.role === 'pitcher' ? 'pit' : 'hit') as 'hit' | 'pit',
        effStats: effStatsByKey.value[d.playerKey] ?? {},
      }
    })
  })

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

  const dropsVm = computed(() =>
    dropCandidates.value.candidates.map((d) => ({
      key: d.playerKey,
      name: rosterPlayers.value.find((p) => p.playerKey === d.playerKey)?.name ?? d.playerKey,
      reason: d.reason,
    })),
  )

  const toUp = (u: WireUpgrade) => ({
    ...u,
    dropName: u.dropKey ? (rosterPlayers.value.find((p) => p.playerKey === u.dropKey)?.name ?? null) : null,
    fixesLabels: u.fixes.map(labelOf),
    holdsLabels: u.holds.map(labelOf),
  })

  const vm = computed(() => {
    const holes = weakCats.value.slice(0, 2).map((c) => `${ordinal(Math.round(c.rank))} in ${c.label}`)
    return {
      ready: ready.value,
      supported: isEspnCategoryLeague.value || isYahooCategoryLeague.value,
      subtitle: holes.length
        ? `Fix your roster for the season, you're ${holes.join(', ')}.`
        : 'Fix your roster for the season.',
      hero: upgradesAll.value.length ? toUp(upgradesAll.value[0]) : null,
      upgrades: upgradesAll.value.slice(1, 8).map(toUp),
      streamBoard: streamBoardVm.value,
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
    if (isYahooCategoryLeague.value) loadRoster()
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

  // NOTE: the Yahoo roster/players load is deliberately NOT triggered here — see
  // the yahooRosterReady watch below (mirrors the Matchup composable's clobber-race fix).
  // Also watch the category flags: on a direct navigation the league details settle
  // AFTER mount, so isYahooCategoryLeague flips true late — without re-firing here the
  // season-derived categories never load and the page deadlocks on "Reading the wire".
  watch(
    [() => leagueStore.activeLeagueId, isYahooCategoryLeague, isEspnCategoryLeague],
    () => {
      maybeLoadSeasonData()
      maybeLoadEspn()
      fetchWeekSchedule()
    },
    { immediate: true },
  )

  // TEMP DIAGNOSTIC — trace why `ready` isn't flipping true. Flat string so it copies
  // cleanly from the console. Also logs a sample of pool teamKeys vs myTeamId, since the
  // league-totals grouping is by teamKey and must match myTeamId. Remove once confirmed.
  watch(
    [isYahooCategoryLeague, categories, catSpecs, rosterPool, myTeamId, leagueTotals, seasonLoaded],
    () => {
      const poolTeamKeys = [...new Set(rosterPool.value.map((p) => String((p as { teamKey?: string }).teamKey ?? '∅')))]
      // eslint-disable-next-line no-console
      console.log(
        `[wire-diag] yCat=${isYahooCategoryLeague.value} eCat=${isEspnCategoryLeague.value}` +
          ` seasonLoaded=${seasonLoaded.value} cats=${categories.value.length} catSpecs=${catSpecs.value.length}` +
          ` pool=${rosterPool.value.length} myRoster=${rosterPlayers.value.length} FAs=${freeAgents.value.length}` +
          ` leagueTotals=${leagueTotals.value.length} ready=${ready.value}` +
          ` | myTeamId="${myTeamId.value}" poolTeamKeys=[${poolTeamKeys.slice(0, 14).join(', ')}]`,
      )
    },
    { immediate: true },
  )

  // The single, order-independent Yahoo roster trigger: fire only once BOTH the
  // category flag and the my-team key are present, so the load always reads a real
  // team key (never a half-ready store that filters to an empty roster).
  const yahooRosterReady = computed(
    () =>
      isYahooCategoryLeague.value &&
      !!leagueStore.yahooTeams?.find((t: any) => t.is_my_team)?.team_key,
  )

  watch(
    yahooRosterReady,
    (ready) => {
      if (!ready) return
      if (!yahooRosterPlayers.value.length) maybeLoadRoster()
      if (!yahooFreeAgents.value.length) maybeLoadPlayers()
    },
    { immediate: true },
  )

  return reactive({ vm, refresh })
}
