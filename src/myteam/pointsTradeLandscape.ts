/**
 * Positional trade landscape for points leagues: each team's strength at every
 * lineup position (their best body's projected points, ranked across the league).
 * Powers the trade-from-strength / fix-your-holes read, the best-partner-by-need
 * list, and the landscape heatmap — the points analogs of the category Trades
 * scaffolding.
 */
import { coversSlot, positionRowsFor } from '@/trades/positionalLandscape'
import { lineupEligFor } from '@/trades/lineupEligibility'
import { type PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { FGProjection } from '@/services/projectionService'
import { type ValueByKey } from '@/myteam/playerValue'


export interface TradePartner {
  teamKey: string
  teamName: string
  fit: number // count of complementary positions
  youBuy: string[] // positions they're strong, you're weak — what you'd acquire
  theyNeed: string[] // positions you're strong, they're weak — your leverage
}

export interface PointsTradeLandscape {
  positions: string[] // positions actually present in the league
  teamKeys: string[] // me first, then others
  teamNames: Record<string, string>
  rank: Record<string, Record<string, number>> // position → teamKey → rank (1 = best); 0 = none
  teams: number
  myStrong: string[] // positions where you rank top-third
  myWeak: string[] // positions where you rank bottom-third
  partners: TradePartner[]
}

export function buildPointsTradeLandscape(
  pool: PointsPoolPlayer[],
  valueByKey: ValueByKey,
  fgByKey: Record<string, FGProjection | null>,
  myTeamKey: string,
  teamNames: Record<string, string> = {},
  sport: string = 'baseball',
  vorByKey?: Record<string, { vorRos: number }>,
): PointsTradeLandscape | null {
  if (!myTeamKey || !pool.length) return null

  // Football ranks positional strength by VOR (replacement-relative, negatives real);
  // baseball keeps raw projected points (non-positive = no startable body).
  const useVor = !!vorByKey
  // Group players (with points + eligibility) by team.
  interface P { eligible: string[]; points: number }
  const byTeam = new Map<string, P[]>()
  for (const p of pool) {
    const points = useVor ? (vorByKey![p.playerKey]?.vorRos ?? 0) : (valueByKey[p.playerKey]?.total ?? 0)
    // Role-based eligibility: a starter counts for SP, a reliever for RP — ESPN
    // lists most pitchers as eligible for BOTH, which made the SP/RP rows identical.
    ;(byTeam.get(p.teamKey) ?? byTeam.set(p.teamKey, []).get(p.teamKey)!).push({ eligible: lineupEligFor(p, fgByKey), points })
  }
  const teamKeys = [...byTeam.keys()]
  if (!teamKeys.includes(myTeamKey)) return null
  const teams = teamKeys.length

  // Best body's value per team per position (null = no eligible body), then rank teams desc.
  const bestAt = (team: string, pos: string): number | null => {
    let best: number | null = null
    for (const pl of byTeam.get(team) ?? []) {
      if (!coversSlot(pl.eligible, pos)) continue
      if (best === null || pl.points > best) best = pl.points
    }
    return best
  }
  // A position "shows" if some team has a startable body there. Baseball keeps the
  // >0 gate (non-positive points = no real body); football (VOR) counts any eligible
  // body, since a below-replacement starter is still a real, rankable body.
  const present = (t: string, pos: string): boolean => {
    const v = bestAt(t, pos)
    return useVor ? v !== null : v !== null && v > 0
  }
  const positions = positionRowsFor(sport).filter((pos) => teamKeys.some((t) => present(t, pos)))
  const rank: Record<string, Record<string, number>> = {}
  for (const pos of positions) {
    const rows = teamKeys
      .map((t) => ({ t, v: bestAt(t, pos) }))
      .sort((a, b) => (b.v ?? -Infinity) - (a.v ?? -Infinity))
    const r: Record<string, number> = {}
    let prev = Infinity
    let rk = 0
    rows.forEach((row, i) => {
      const none = row.v === null || (!useVor && row.v <= 0)
      if (none) { r[row.t] = 0; return }
      if (row.v! < prev) { rk = i + 1; prev = row.v! }
      r[row.t] = rk
    })
    rank[pos] = r
  }

  const third = Math.max(1, Math.round(teams / 3))
  const isStrong = (team: string, pos: string) => { const x = rank[pos]?.[team] ?? 0; return x > 0 && x <= third }
  const isWeak = (team: string, pos: string) => { const x = rank[pos]?.[team] ?? 0; return x === 0 || x >= teams - third + 1 }

  const myStrong = positions.filter((pos) => isStrong(myTeamKey, pos))
  const myWeak = positions.filter((pos) => isWeak(myTeamKey, pos))

  // Partner fit: they're strong where you're weak (you buy) and weak where you're
  // strong (your leverage). More complementary positions = better partner. A partner
  // qualifies if EITHER side holds — a two-way fit (youBuy > 0) or a pure sell-from-
  // strength target (theyNeed > 0, youBuy 0): a team weak where you're loaded is
  // worth surfacing even if you have no hole of your own to fill. A stacked roster
  // (myWeak empty) would otherwise get zero partners, which is the bug this fixes.
  const partners: TradePartner[] = []
  for (const t of teamKeys) {
    if (t === myTeamKey) continue
    const youBuy = myWeak.filter((pos) => isStrong(t, pos))
    const theyNeed = myStrong.filter((pos) => isWeak(t, pos))
    const fit = youBuy.length + theyNeed.length
    if (youBuy.length > 0 || theyNeed.length > 0) partners.push({ teamKey: t, teamName: teamNames[t] || 'Team', fit, youBuy, theyNeed })
  }
  // Two-way fits first (most to acquire, then easiest deal); pure sell targets follow,
  // ranked by how much leverage you'd have (more positions they need from you).
  partners.sort((a, b) => b.youBuy.length - a.youBuy.length || b.theyNeed.length - a.theyNeed.length)

  return {
    positions,
    teamKeys: [myTeamKey, ...teamKeys.filter((t) => t !== myTeamKey)],
    teamNames,
    rank,
    teams,
    myStrong,
    myWeak,
    partners: partners.slice(0, 6),
  }
}
