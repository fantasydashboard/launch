import { computed, ref } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { usePlatformsStore } from '@/stores/platforms'
import { espnService } from '@/services/espn'
import type { Sport } from '@/types/supabase'
import { useFullSeasonCategoryData } from '@/composables/useFullSeasonCategoryData'
import { useMyRoster } from '@/composables/useMyRoster'
import { useYahooLeaguePool } from '@/composables/useYahooLeaguePool'
import { useEspnCategoryTeamData } from '@/composables/useEspnCategoryTeamData'
import { useValueBaseline } from '@/composables/useValueBaseline'
import { toEffectiveStats } from '@/myteam/effectiveStats'
import { isLowerBetter } from '@/players/direction'
import { classifyCategory } from '@/myteam/categorySide'
import { resolveVolumeStatId } from '@/myteam/catVolume'
import type { CatSpec } from '@/myteam/value'
import { buildEngine } from '@/trades/engine'
import { ecwByTeam } from '@/trades/standings'
import { espnStatNamesForSport } from '@/myteam/espn/statNames'
import { useHockeyValue } from '@/composables/useHockeyValue'
import { platformFromLeagueId } from '@/hockey/platformFromLeagueId'
import { buildHockeyTeamTotals, hockeyCatSpecs, hockeyProjectionCoverage } from '@/hockey/hockeyTeamTotals'

/**
 * Below this share of priced rosters the ECW number is withheld rather than shown quietly
 * wrong. A real NHL roster matches our feed almost entirely, so a figure this low means the
 * join is broken, not that the league is unusual — and the .000 this path replaced was itself
 * a confident number with nothing behind it.
 */
const MIN_HOCKEY_COVERAGE = 0.5

/** Parse an ESPN league key `espn_{sport}_{leagueId}_{season}`. */
function parseEspnKey(key: string): { sport: Sport; leagueId: string; season: number } | null {
  const parts = key.split('_')
  if (parts.length < 4 || parts[0] !== 'espn') return null
  return { sport: parts[1] as Sport, leagueId: parts[2], season: parseInt(parts[3], 10) }
}

export interface CategoryTeamMeta {
  name: string
  logo: string
  wins: number
  losses: number
  ties: number
}

/**
 * H2H-CATEGORY roster STRENGTH for the projection-driven Power Rankings: each team's
 * expected categories won per week (ECW) from its PROJECTED roster output. Self-contained —
 * replicates TradesView's ESPN/Yahoo engine assembly (pool + FG + catSpecs + value baseline)
 * and reduces the engine's per-team category totals to one ECW per team.
 *
 * `strengths` keys are the same teamKeys the engine/standings use (ESPN team id `espn_<id>`,
 * Yahoo full team_key), so they line up with `teamMeta` for the luck comparison downstream.
 */
export function useCategoryStrength() {
  const leagueStore = useLeagueStore()
  const isEspn = computed(() => leagueStore.activePlatform === 'espn')
  const espnSport = computed<Sport>(() => parseEspnKey(leagueStore.activeLeagueId ?? '')?.sport ?? 'baseball')

  // Yahoo sources.
  const { categoryLabels, load: loadSeasonData } = useFullSeasonCategoryData()
  // Actual pool (headshots + season pace) for the perceived leg; ranks/values come off the
  // projected pool (FG ROS), mapped together by playerKey — exactly as TradesView does.
  const { pool: yPool, statcastByKey: yStatcast, load: loadRoster } = useMyRoster()
  const yahooLeague = useYahooLeaguePool()
  // ESPN source (self-detects H2H_CATEGORY).
  const espn = useEspnCategoryTeamData()

  /*
   * HOCKEY RUNS ON ITS OWN PROJECTIONS, because it cannot run on these.
   *
   * Everything above prices players through FanGraphs — `matchFG({ full_name, mlb_team })`.
   * A hockey roster matches none of it and the pool carries no raw stats, so the engine summed
   * nothing: every team tied at zero in every column and the League page reported .000
   * categories won for all of them, with power rankings falling back to whatever a week of
   * counting stats had produced. The NHL feed the draft board, the Wire and Today already
   * price from is the answer, and using it here is also what keeps those four surfaces from
   * holding four opinions about the same roster.
   *
   * The league id is not the same string on both platforms — ESPN wants the bare numeric id
   * out of our composite key, Yahoo wants the key whole. Sending one to the other's endpoint
   * resolves to nothing, and a league with no settings has no columns.
   */
  const isHockey = computed(() => leagueStore.activeSport === 'hockey')
  const hockeyPlatform = computed(() => platformFromLeagueId(leagueStore.activeLeagueId))
  const hockeyLeagueId = computed(() => {
    const raw = String(leagueStore.activeLeagueId ?? '')
    if (hockeyPlatform.value === 'yahoo') return raw
    const parts = raw.split('_')
    return parts.length >= 4 && parts[0] === 'espn' ? parts[2] : ''
  })
  const hockeySeason = computed(() => {
    const parts = String(leagueStore.activeLeagueId ?? '').split('_')
    const fromKey = parts.length >= 4 ? parseInt(parts[3], 10) : NaN
    if (Number.isFinite(fromKey) && fromKey > 2000) return fromKey
    const now = new Date()
    return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
  })
  /* Sleeper has no hockey, and falls out of this on the id shape rather than on a name check. */
  const hockeyServes = computed(() =>
    isHockey.value && !!hockeyLeagueId.value && hockeyPlatform.value !== 'sleeper')
  const hockeyValue = useHockeyValue({
    leagueId: hockeyLeagueId,
    platform: hockeyPlatform,
    season: hockeySeason,
    enabled: hockeyServes,
    weeksLeft: computed(() =>
      Math.max(1, Math.round(26 * (1 - (leagueStore.seasonFractionComplete ?? 0))))),
  })

  // ESPN team W/L records, keyed `espn_<id>` to match the standings/pool teamKeys. The category
  // standings carry only per-category wins, not the head-to-head W/L record, so we source the
  // record the same way the points Power Rankings path does — from getTeamsWithRosters' team
  // record.overall.
  const espnRecords = ref<Record<string, { name: string; logo: string; wins: number; losses: number; ties: number }>>({})
  const espnRecordsLoading = ref(false)

  const seasonFraction = computed(() => leagueStore.seasonFractionComplete)

  // === Platform-neutral inputs into the trade engine (mirrors TradesView) ===
  const pool = computed(() => {
    /* The remap below translates ESPN's BASEBALL player-stat id space into the league's
       category ids. Hockey's totals come from the projection feed, not from these stats, so
       the raw pool is what it needs — and running a baseball id map over hockey ids would
       invent stats rather than find none. */
    if (isHockey.value) return isEspn.value ? espn.pool.value : yahooLeague.pool.value
    if (isEspn.value) {
      // ESPN player-level season stats are keyed in a DIFFERENT stat-id space than the
      // league's category statIds (e.g. player R=2/HR=3/TB=19/RBI=4 vs category
      // R=32/HR=33/TB=34/RBI=23), so feeding raw stats straight into toEffectiveStats made
      // its fallback read the WRONG stat for any cat a FanGraphs projection didn't rescue — a
      // systematic wrong-stat substitution that INVERTED the ECW ranking.
      //
      // Fix: translate each player's raw stats from the PLAYER-LEVEL id space into the
      // league's CATEGORY id space by matching on display NAME (the same bridge the FG path
      // uses via labels). FG-matched players still prefer FG inside toEffectiveStats; FG-
      // UNMATCHED players now contribute their correct season-to-date stats again instead of
      // nothing (which understated genuinely strong, sparsely-projected rosters).
      const playerStatNames = espnStatNamesForSport(espnSport.value) // player-level id → {display}
      const specs = catSpecs.value
      // Category statIds whose display label maps onto a player-level display name.
      const catTargets = categories.value
        .map((c) => ({ statId: c.statId, label: (c.label || c.name || '').toUpperCase().trim() }))
        .filter((c) => c.label)
      // Volume stats (IP/PA/AB) referenced by ratio cats but NOT scored as their own category —
      // remap these too (under the synthetic volume id) so ratio weighting works for unmatched
      // players. Map the volume id back to the player-level display to look it up.
      const VOL_LABEL: Record<string, string[]> = { __volip: ['IP'], __volpa: ['PA', 'AB'] }
      const synthVolTargets = specs
        .filter((s) => s.isRatio && s.volumeStatId && VOL_LABEL[s.volumeStatId])
        .map((s) => ({ statId: s.volumeStatId as string, labels: VOL_LABEL[s.volumeStatId as string] }))

      return espn.pool.value.map((p) => {
        const raw = p.stats || {}
        // Re-key the player's raw stats from player-level id → display name (uppercased).
        const byName: Record<string, number> = {}
        for (const [idStr, val] of Object.entries(raw)) {
          if (typeof val !== 'number' || !Number.isFinite(val)) continue
          const display = playerStatNames[Number(idStr)]?.display
          if (display) byName[display.toUpperCase().trim()] = val
        }
        const out: Record<string, number> = {}
        for (const t of catTargets) {
          const v = byName[t.label]
          if (v !== undefined) out[t.statId] = v // omit missing (don't zero)
        }
        for (const t of synthVolTargets) {
          if (out[t.statId] !== undefined) continue
          for (const lbl of t.labels) {
            const v = byName[lbl]
            if (v !== undefined) { out[t.statId] = v; break }
          }
        }
        return { ...p, stats: out }
      })
    }
    const shots = new Map(yPool.value.map((p) => [p.playerKey, (p as { headshot?: string }).headshot]))
    return yahooLeague.pool.value.map((p) => ({
      ...p,
      headshot: (p as { headshot?: string }).headshot || shots.get(p.playerKey) || '',
    }))
  })
  const fgByKey = computed(() => (isEspn.value ? espn.fgByKey.value : yahooLeague.fgByKey.value))
  const statcastByKey = computed(() => (isEspn.value ? espn.statcastByKey.value : yStatcast.value))
  const perceivedStatsByKey = computed<Record<string, Record<string, number>>>(() => {
    if (isEspn.value) return {}
    const out: Record<string, Record<string, number>> = {}
    for (const p of yPool.value) out[p.playerKey] = toEffectiveStats(p.stats, null, catSpecs.value, seasonFraction.value)
    return out
  })

  const categories = computed<{ statId: string; label: string; name: string }[]>(() => {
    if (isEspn.value) return espn.categories.value.map((c) => ({ statId: c.statId, label: c.label, name: c.name }))
    const out: { statId: string; label: string; name: string }[] = []
    for (const [statId, meta] of categoryLabels.value) out.push({ statId, label: meta.label, name: meta.name })
    return out
  })
  const lowerBetterByStat = computed(() => {
    const m = new Map<string, boolean>()
    if (isEspn.value) for (const c of espn.cats.value) m.set(c.statId, c.lowerIsBetter)
    else for (const c of categories.value) m.set(c.statId, isLowerBetter(c.label || c.name || c.statId))
    return m
  })
  /** The league's columns, from its own settings — ESPN's scoringItems or Yahoo's categories. */
  const hockeySpecs = computed<CatSpec[]>(() =>
    hockeyServes.value ? hockeyCatSpecs(hockeyValue.categories.value) : [])

  const catSpecs = computed<CatSpec[]>(() => {
    if (isHockey.value) return hockeySpecs.value
    const findStatId = (names: string[]) => categories.value.find((c) => names.includes((c.label || c.name || '').toUpperCase().trim()))?.statId
    const ipStatId = findStatId(['IP', 'INNINGS PITCHED'])
    const abStatId = findStatId(['AB', 'AT BATS', 'PA', 'PLATE APPEARANCES'])
    return categories.value.map((c) => {
      const lowerIsBetter = lowerBetterByStat.value.get(c.statId) ?? isLowerBetter(c.label || c.name || c.statId)
      const { side, isRatio } = classifyCategory(c.label || c.name || c.statId, lowerIsBetter)
      return { statId: c.statId, lowerIsBetter, side, isRatio, volumeStatId: resolveVolumeStatId(isRatio, side, ipStatId, abStatId) }
    })
  })
  /* A hockey statId is already the column's name ('G', 'SVPCT') — there is no separate label
     to look up, and falling through to the baseball list would return the id anyway. */
  const labelOf = (statId: string) =>
    isHockey.value ? statId : (categories.value.find((c) => c.statId === statId)?.label ?? statId)

  // Value baseline anchored to the STARTABLE projected-player universe (same as Trades / My Team).
  const valueBaselineSvc = useValueBaseline()
  const ZCLAMP = 8
  const valueBaseline = computed(() =>
    valueBaselineSvc.ready.value ? valueBaselineSvc.build(catSpecs.value, labelOf) : null,
  )

  const engine = computed(() =>
    pool.value.length && catSpecs.value.length
      ? buildEngine({
          pool: pool.value,
          fgByKey: fgByKey.value,
          statcastByKey: statcastByKey.value,
          cats: catSpecs.value,
          seasonFraction: seasonFraction.value,
          labelOf,
          baseline: valueBaseline.value ?? undefined,
          zClamp: ZCLAMP,
          perceivedStatsByKey: perceivedStatsByKey.value,
        })
      : null,
  )

  /* How much of the league the NHL feed could actually price. Exposed so a surface can say
     so, and used to withhold the number entirely when the join has clearly failed. */
  const hockeyCoverage = computed(() => {
    if (!isHockey.value) return 1
    const roster = pool.value.map((p) => ({ playerKey: p.playerKey, teamKey: p.teamKey, name: p.name }))
    return hockeyProjectionCoverage({ roster, projectionFor: (x) => hockeyValue.projectionOf.value(x) })
  })

  const hockeyTotals = computed(() => {
    if (!isHockey.value || !hockeySpecs.value.length) return []
    if (hockeyCoverage.value < MIN_HOCKEY_COVERAGE) return []
    return buildHockeyTeamTotals({
      roster: pool.value.map((p) => ({ playerKey: p.playerKey, teamKey: p.teamKey, name: p.name })),
      projectionFor: (x) => hockeyValue.projectionOf.value(x),
      cats: hockeySpecs.value,
    })
  })

  /**
   * Per-team projected category totals — the one input everything downstream ranks on.
   *
   * Exposed in its own right rather than reached through `engine`, because for hockey there is
   * no engine to reach through: the totals come straight off the NHL projections.
   */
  const teamCatTotals = computed(() =>
    isHockey.value ? hockeyTotals.value : (engine.value?.teamCatTotals ?? []))

  // ECW per team — the category strength signal. Empty until the totals assemble.
  const strengths = computed<{ teamKey: string; strength: number }[]>(() => {
    const totals = teamCatTotals.value
    if (!totals.length || !catSpecs.value.length) return []
    return ecwByTeam(totals, catSpecs.value).map((r) => ({ teamKey: r.teamId, strength: r.strength }))
  })

  // teamKey -> record/name/logo for the luck comparison. ESPN from the team-record fetch;
  // Yahoo from yahooTeams.
  const teamMeta = computed<Record<string, CategoryTeamMeta>>(() => {
    if (isEspn.value) return { ...espnRecords.value }
    const out: Record<string, CategoryTeamMeta> = {}
    for (const t of leagueStore.yahooTeams ?? []) {
      out[String(t.team_key)] = {
        name: String(t.name ?? 'Team'),
        logo: String((t as any).logo_url ?? (t as any).logo ?? ''),
        wins: Number(t.wins ?? 0),
        losses: Number(t.losses ?? 0),
        ties: Number(t.ties ?? 0),
      }
    }
    return out
  })

  // teamKey -> name, for the landscape (which keys names separately from records).
  const teamNameByKey = computed(() => {
    const m = new Map<string, string>()
    for (const [k, v] of Object.entries(teamMeta.value)) m.set(k, v.name)
    return m
  })

  const myTeamKey = computed<string>(() => {
    if (isEspn.value) return espn.myTeamId.value ?? ''
    const me = (leagueStore.yahooTeams ?? []).find((t: any) => t?.is_my_team)
    return me ? String(me.team_key) : ''
  })

  const loading = computed(() => {
    const base = isEspn.value ? espn.loading.value || espnRecordsLoading.value : yahooLeague.loading.value
    return isHockey.value ? base || hockeyValue.loading.value : base
  })

  // Fetch ESPN team W/L records (keyed `espn_<id>`) — see espnRecords note above.
  async function loadEspnRecords() {
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey) return
    const parsed = parseEspnKey(leagueKey)
    if (!parsed) return
    const { sport, leagueId, season } = parsed
    const requestedId = leagueKey
    espnRecordsLoading.value = true
    try {
      const authStore = useAuthStore()
      const platformsStore = usePlatformsStore()
      if (authStore.user?.id) await espnService.initialize(authStore.user.id)
      const creds = platformsStore.getEspnCredentials()
      if (creds) espnService.setCredentials(creds.espn_s2, creds.swid)
      const teams = await espnService.getTeamsWithRosters(sport, leagueId, season)
      if (leagueStore.activeLeagueId !== requestedId) return
      const out: Record<string, CategoryTeamMeta> = {}
      for (const t of teams) {
        const o = (t as any).record?.overall ?? {}
        out[`espn_${t.id}`] = {
          name: String((t as any).name ?? 'Team'),
          logo: String((t as any).logo ?? ''),
          wins: Number(o.wins ?? (t as any).wins ?? 0),
          losses: Number(o.losses ?? (t as any).losses ?? 0),
          ties: Number(o.ties ?? (t as any).ties ?? 0),
        }
      }
      espnRecords.value = out
    } catch (e) {
      console.error('[useCategoryStrength] ESPN records load failed', e)
    } finally {
      if (leagueStore.activeLeagueId === requestedId) espnRecordsLoading.value = false
    }
  }

  function load() {
    if (isHockey.value) {
      /* The NHL feed and the league's own settings. The FanGraphs baseline below prices
         nothing here, so asking for it would only be a request that cannot answer. */
      hockeyValue.load()
      if (isEspn.value) { espn.load(); loadEspnRecords() } else { yahooLeague.load() }
      return
    }
    valueBaselineSvc.load()
    if (isEspn.value) {
      espn.load()
      loadEspnRecords()
    } else {
      const id = leagueStore.activeLeagueId
      if (id) loadSeasonData(id)
      loadRoster()
      yahooLeague.load()
    }
  }

  // Number of scored categories — for the "X.X of N cats/wk" label context.
  const catCount = computed(() => catSpecs.value.length)

  return {
    strengths, teamMeta, myTeamKey, catCount, loading, load,
    // Exposed for the League page's all-team landscape (already computed above).
    engine, fgByKey, catSpecs, labelOf, teamNameByKey, pool,
    /** The totals every category surface ranks on, whichever sport produced them. */
    teamCatTotals,
    /** Hockey only: the share of rostered players the NHL feed could price. 1 elsewhere. */
    hockeyCoverage,
  }
}
