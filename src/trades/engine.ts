import type { CatSpec } from '@/myteam/value'
import { computeRosterValue } from '@/myteam/value'
import { toEffectiveStats } from '@/myteam/effectiveStats'
import { mapFgStatsByKey } from '@/myteam/fgMappedStats'
import type { PoolPlayer } from '@/composables/useMyRoster'
import { computeLuck, type FGProjection, type StatcastData } from '@/services/projectionService'
import { aggregateTeamCats, type AggPlayer } from './aggregate'
import { aggregateTeamCatTotals, type TeamCategoryTotals } from './standings'
import { buildLandscape, type Landscape, type TeamTotals } from './landscape'
import { computeTiming, type PlayerTiming } from './timing'

/**
 * The shared trade-scoring primitives, derived once from league data: per-player cross-role
 * value, per-category volume-weighted strength (z), buy-low/sell-high timing, and the category
 * landscape. Both the deal GENERATOR (useTradeTargets) and the custom ANALYZER consume these,
 * so a player's value/strength is identical in both. (The generator currently derives these
 * inline; this module mirrors that derivation exactly so the analyzer can't diverge — a later
 * pass should DRY the generator onto buildEngine.)
 */
export interface TradeEngine {
  pool: PoolPlayer[]
  cats: CatSpec[]
  statIds: string[]
  byTeam: Map<string, PoolPlayer[]>
  landscape: Landscape
  valueByKey: Map<string, number> // cross-role percentile, 0-100
  roleValueByKey: Map<string, number> // within-role percentile, 0-100 (pitcher-vs-pitcher etc.)
  strengthByKey: Map<string, Record<string, number>> // per-category z
  // Standings-delta inputs: per-team ROS-projected category totals (ratio cats retain num/den),
  // each player's projected stat line, the team each player is on, and the league size.
  teamCatTotals: TeamCategoryTotals[]
  projByKey: Map<string, Record<string, number>>
  teamByKey: Map<string, string>
  numTeams: number
  timingByKey: Map<string, PlayerTiming>
}

export interface BuildEngineInput {
  pool: PoolPlayer[]
  fgByKey: Record<string, FGProjection | null>
  statcastByKey?: Record<string, StatcastData | null>
  cats: CatSpec[]
  teamCatWins?: TeamTotals[]
  seasonFraction: number
  labelOf: (statId: string) => string
}

export function buildEngine(input: BuildEngineInput): TradeEngine | null {
  const { pool, fgByKey, cats, teamCatWins, seasonFraction, labelOf } = input
  if (!cats.length || pool.length < 2) return null
  const statIds = cats.map((c) => c.statId)
  // Rekey raw FanGraphs projections onto league stat_ids before blending (see mapFgStatsByKey).
  const fg = mapFgStatsByKey(fgByKey, cats, labelOf)

  const eff = new Map<string, AggPlayer>()
  const byTeam = new Map<string, PoolPlayer[]>()
  for (const p of pool) {
    if (!p.teamKey) continue
    eff.set(p.playerKey, { playerKey: p.playerKey, stats: toEffectiveStats(p.stats, fg[p.playerKey] ?? null, cats, seasonFraction) })
    ;(byTeam.get(p.teamKey) ?? byTeam.set(p.teamKey, []).get(p.teamKey)!).push(p)
  }

  const playersByTeam = [...byTeam.entries()].map(([teamId, ps]) => ({ teamId, players: ps.map((p) => eff.get(p.playerKey)!) }))
  // Standings totals are ALWAYS the projected roster output (not the win-record landscape), because
  // only projected output can be re-ranked under a trade preview. Ratio cats retain num/den.
  const teamCatTotals = aggregateTeamCatTotals(playersByTeam, cats)
  const projByKey = new Map([...eff.entries()].map(([k, v]) => [k, v.stats]))
  const teamByKey = new Map<string, string>()
  for (const [teamId, ps] of byTeam) for (const pl of ps) teamByKey.set(pl.playerKey, teamId)
  const wins = teamCatWins ?? []
  const useWins = wins.length >= 2 && wins.some((w) => Object.keys(w.totals).length > 0)
  const teamTotals = useWins ? wins : aggregateTeamCats(playersByTeam, cats)
  const landscapeCats = useWins ? cats.map((c) => ({ ...c, lowerIsBetter: false })) : cats
  const { landscape } = buildLandscape(teamTotals, landscapeCats)

  const valued = computeRosterValue(
    pool.map((p) => ({ playerKey: p.playerKey, position: p.position, stats: eff.get(p.playerKey)!.stats })),
    pool.map((p) => p.playerKey),
    cats,
  )
  const valueByKey = new Map(valued.map((c) => [c.playerKey, c.crossPercentile]))
  const roleValueByKey = new Map(valued.map((c) => [c.playerKey, c.roleValue]))
  const strengthByKey = new Map(valued.map((c) => [c.playerKey, Object.fromEntries(c.contribs.map((k) => [k.statId, k.z]))]))

  // Timing: perceived (season-pace) value vs ROS value + Statcast luck.
  const perceivedValued = computeRosterValue(
    pool.map((p) => ({ playerKey: p.playerKey, position: p.position, stats: toEffectiveStats(p.stats, null, cats, seasonFraction) })),
    pool.map((p) => p.playerKey),
    cats,
  )
  const perceivedPct = new Map(perceivedValued.map((c) => [c.playerKey, c.crossPercentile]))
  const rosPct = new Map(valued.map((c) => [c.playerKey, c.crossPercentile]))
  const statcast = input.statcastByKey ?? {}
  const timingByKey = new Map<string, PlayerTiming>()
  for (const p of pool) {
    const sc = statcast[p.playerKey]
    let luck: 'over' | 'under' | null = null
    let luckStrong = false
    if (sc) {
      for (const c of cats) {
        const ld = computeLuck(labelOf(c.statId), p.stats[c.statId], sc)
        if (ld?.direction && (!luck || (ld.severity === 'strong' && !luckStrong))) {
          luck = ld.direction
          luckStrong = ld.severity === 'strong'
        }
      }
    }
    timingByKey.set(p.playerKey, computeTiming(perceivedPct.get(p.playerKey) ?? 50, rosPct.get(p.playerKey) ?? 50, luck, luckStrong))
  }

  return { pool, cats, statIds, byTeam, landscape, valueByKey, roleValueByKey, strengthByKey, teamCatTotals, projByKey, teamByKey, numTeams: byTeam.size, timingByKey }
}
