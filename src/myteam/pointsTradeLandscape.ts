/**
 * Positional trade landscape for points leagues: each team's strength at every
 * lineup position (their best body's projected points, ranked across the league).
 * Powers the trade-from-strength / fix-your-holes read, the best-partner-by-need
 * list, and the landscape heatmap — the points analogs of the category Trades
 * scaffolding.
 */
import { coversSlot, positionRowsFor } from '@/trades/positionalLandscape'
import { FLEX_ELIGIBILITY } from '@/trades/rosterSlots'
import { lineupEligFor } from '@/trades/lineupEligibility'
import { type PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { FGProjection } from '@/services/projectionService'
import { type ValueByKey } from '@/myteam/playerValue'


/** The synthetic row for the seats a league fills from leftovers. */
export const FLEX_ROW = 'FLEX'

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
  /**
   * The league's starting slots. When supplied, a position's strength counts as many
   * bodies as the league actually starts there instead of only the best one — see
   * `strengthAt`. Omitted (baseball today) keeps the single-best-body behaviour.
   */
  slots?: Record<string, number>,
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

  /**
   * A team's strength at a position: the sum of its top-N bodies there, where N is how
   * many that league actually starts. Null = no eligible body.
   *
   * Ranking on the single best body is why Trades and My Team contradicted each other on
   * the same roster: Trades saw one elite RB and called RB a strength to trade FROM,
   * while My Team ranked the RB slots — including a weak RB2 — and called RB the biggest
   * hole. Both were right about different questions. Counting the bodies the league
   * actually starts asks the question the manager is actually asking.
   */
  const depthFor = (pos: string): number => Math.max(1, Math.floor(Number(slots?.[pos] ?? 1)) || 1)

  /*
   * THE FLEX SEATS, WHICH THIS GRID USED TO PRETEND DID NOT EXIST.
   *
   * The rows are the concrete positions, and flex was left out as "overflow, not a target
   * position". But a league running QB/RB/RB/WR/WR/TE/FLEX x3 starts NINE skill players, and
   * this grid was reading five of those seats. Two teams whose RB and WR rows are identical
   * are not the same team when one has a fourth startable back and the other starts a warm
   * body three times — and that difference is the trade, not a detail about it.
   *
   * Which slots count as flex is derived rather than listed: a slot the league starts, that
   * names the positions it accepts, and that is not itself one of the ranked rows. That picks
   * up FLEX and SUPER_FLEX without naming them, ignores K and DEF (no eligibility entry), and
   * will pick up whatever a future league calls its flex.
   */
  const rowSet = new Set(positionRowsFor(sport))
  const flexSlots = Object.keys(slots ?? {}).filter(
    (slot) => !rowSet.has(slot) && !!FLEX_ELIGIBILITY[slot] && depthFor(slot) > 0 && Number(slots?.[slot]) > 0,
  )
  const flexOpenings = flexSlots.reduce((n, slot) => n + Math.floor(Number(slots?.[slot]) || 0), 0)

  /**
   * A team's flex strength: the bodies it has LEFT OVER once its committed seats are filled.
   *
   * Measured after assignment rather than as "best RB/WR/TE", because otherwise it would
   * simply restate the rows above it — a team's best flex body is its RB1, who is already
   * counted. The question this row answers is the one a manager actually has: once everybody
   * is in a seat, who still has startable surplus and who is filling three seats with filler.
   *
   * Greedy and scarcity-blind, unlike assignSlots: the committed football seats here are
   * single-position (QB, RB, WR, TE) so there is no contention to resolve, and borrowing
   * assignSlots would also borrow its startable bar and its injury rule, which answer a
   * different question than "how deep is this roster".
   */
  const flexStrengthAt = (team: string): number | null => {
    if (!flexOpenings) return null
    const squad = (byTeam.get(team) ?? []).map((pl, i) => ({ ...pl, i }))
    const used = new Set<number>()
    for (const pos of positionRowsFor(sport)) {
      const need = Math.floor(Number(slots?.[pos]) || 0)
      if (need <= 0) continue
      const pick = squad
        .filter((pl) => !used.has(pl.i) && coversSlot(pl.eligible, pos))
        .sort((a, b) => b.points - a.points)
        .slice(0, need)
      for (const pl of pick) used.add(pl.i)
    }
    const spare = squad
      .filter((pl) => !used.has(pl.i) && flexSlots.some((slot) => coversSlot(pl.eligible, slot)))
      .sort((a, b) => b.points - a.points)
      .slice(0, flexOpenings)
    if (!spare.length) return null
    return spare.reduce((sum, pl) => sum + pl.points, 0)
  }

  const strengthAt = (team: string, pos: string): number | null => {
    if (pos === FLEX_ROW) return flexStrengthAt(team)
    const vals: number[] = []
    for (const pl of byTeam.get(team) ?? []) {
      if (coversSlot(pl.eligible, pos)) vals.push(pl.points)
    }
    if (!vals.length) return null
    vals.sort((a, b) => b - a)
    return vals.slice(0, depthFor(pos)).reduce((sum, v) => sum + v, 0)
  }
  // A position "shows" if some team has a startable body there. Baseball keeps the
  // >0 gate (non-positive points = no real body); football (VOR) counts any eligible
  // body, since a below-replacement starter is still a real, rankable body.
  const present = (t: string, pos: string): boolean => {
    const v = strengthAt(t, pos)
    return useVor ? v !== null : v !== null && v > 0
  }
  const positions = [...positionRowsFor(sport), ...(flexOpenings ? [FLEX_ROW] : [])]
    .filter((pos) => teamKeys.some((t) => present(t, pos)))
  const rank: Record<string, Record<string, number>> = {}
  for (const pos of positions) {
    const rows = teamKeys
      .map((t) => ({ t, v: strengthAt(t, pos) }))
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
