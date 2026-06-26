/**
 * The points-league "brain": turns a league-wide pool + FG projections + the
 * league's scoring weights into the My Team view model — roster rows tiered by
 * projected points, the slot-value-vs-league landscape (your starter at each
 * lineup slot ranked against every other team's starter there), and the league
 * standings by projected starting-lineup points.
 *
 * This is the points analog of the category model. Everything is one currency
 * (projected fantasy points), so there are no per-category z-scores, no ratio
 * cats, no baselines — just points and ranks.
 */
import { projectPlayerPoints, type PointsSide } from '@/myteam/pointsValue'
import { assignSlots, type DepthPlayer } from '@/trades/positionalLandscape'
import type { FGProjection } from '@/services/projectionService'

export interface PointsPoolPlayer {
  playerKey: string
  name: string
  position: string
  eligiblePositions?: string[]
  teamKey: string
  proTeam?: string
  headshot?: string
  onIL?: boolean
}

export type Tier = 'CORE' | 'SOLID' | 'FRINGE'

export interface PointsRosterRow {
  player: PointsPoolPlayer
  side: PointsSide
  points: number // projected rest-of-season fantasy points
  perGame: number
  games: number
  tier: Tier
  rankVsAll: number // 0-100 percentile vs all rostered players on the same side
  perStat: Record<string, number>
}

export interface SlotRankRow {
  slot: string // concrete lineup slot (C, OF, SP, …)
  starterName: string
  starterKey: string | null
  points: number
  rank: number // 1..teams; your starter vs every team's starter at this opening
  teams: number
}

export interface TeamStanding {
  teamKey: string
  startingPoints: number // sum of the team's optimal-lineup projected points
  rank: number
}

export interface PointsTeamModel {
  rosterRows: PointsRosterRow[]
  slotRanks: SlotRankRow[]
  myLineupRank: number // your optimal lineup's projected-points rank in the league
  teams: number
  standings: TeamStanding[]
  myStanding: TeamStanding | null
}

/** Split a comma/slash-delimited position string into eligible slots. */
export function parseEligible(p: PointsPoolPlayer): string[] {
  if (p.eligiblePositions?.length) return p.eligiblePositions
  return String(p.position || '')
    .split(/[,/|]/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

/** Display order for the slot-value landscape (hitters first, then arms). */
const SLOT_ORDER = ['C', '1B', '2B', '3B', 'SS', 'CI', 'MI', 'IF', 'OF', 'LF', 'CF', 'RF', 'DH', 'UTIL', 'SP', 'RP', 'P']
const slotIdx = (s: string) => {
  const i = SLOT_ORDER.indexOf(s.toUpperCase())
  return i < 0 ? SLOT_ORDER.length : i
}

export function buildPointsTeam(
  pool: PointsPoolPlayer[],
  fgByKey: Record<string, FGProjection | null>,
  weights: Record<string, number>,
  myTeamKey: string | null,
  slots: Record<string, number>,
): PointsTeamModel {
  // 1) Project every rostered player's points once.
  const ptsByKey = new Map<string, ReturnType<typeof projectPlayerPoints>>()
  for (const p of pool) ptsByKey.set(p.playerKey, projectPlayerPoints(fgByKey[p.playerKey], weights))

  // 2) Percentile within side, across every rostered player (the "VS ALL" rank).
  const sidePoints: Record<PointsSide, number[]> = { hit: [], pit: [] }
  for (const p of pool) {
    const r = ptsByKey.get(p.playerKey)!
    sidePoints[r.side].push(r.total)
  }
  for (const k of ['hit', 'pit'] as PointsSide[]) sidePoints[k].sort((a, b) => a - b)
  const percentile = (side: PointsSide, v: number): number => {
    const arr = sidePoints[side]
    if (arr.length < 2) return 50
    let below = 0
    for (const x of arr) if (x < v) below++
    return Math.round((below / (arr.length - 1)) * 100)
  }

  // 3) My roster rows, tiered by VS-ALL percentile within side.
  const tierOf = (pct: number): Tier => (pct >= 66 ? 'CORE' : pct >= 33 ? 'SOLID' : 'FRINGE')
  const rosterRows: PointsRosterRow[] = pool
    .filter((p) => myTeamKey != null && p.teamKey === myTeamKey)
    .map((p) => {
      const r = ptsByKey.get(p.playerKey)!
      const pct = percentile(r.side, r.points)
      return {
        player: p,
        side: r.side,
        points: r.total,
        perGame: r.games > 0 ? r.total / r.games : 0,
        games: r.games,
        tier: tierOf(pct),
        rankVsAll: pct,
        perStat: r.perStat,
      }
    })
    .sort((a, b) => b.points - a.points)

  // 4) Per-team optimal lineup (assignSlots over projected points), for standings
  //    AND the slot-value landscape. bar=0 so even weak rosters field a full lineup.
  const byTeam = new Map<string, DepthPlayer[]>()
  for (const p of pool) {
    const r = ptsByKey.get(p.playerKey)!
    const dp: DepthPlayer = {
      playerKey: p.playerKey,
      teamKey: p.teamKey,
      eligiblePositions: parseEligible(p),
      value: r.total,
      status: p.onIL ? 'IL' : '',
    }
    ;(byTeam.get(p.teamKey) ?? byTeam.set(p.teamKey, []).get(p.teamKey)!).push(dp)
  }

  const pointsOf = (key: string) => ptsByKey.get(key)?.total ?? 0
  const nameOf = new Map(pool.map((p) => [p.playerKey, p.name]))

  // assignedByPos per team, plus each team's starting-lineup point total.
  const assignedByTeam = new Map<string, Record<string, string[]>>()
  const standings: TeamStanding[] = []
  for (const [teamKey, players] of byTeam) {
    const a = assignSlots(players, slots, 0)
    assignedByTeam.set(teamKey, a.assignedByPos)
    let startingPoints = 0
    for (const keys of Object.values(a.assignedByPos)) for (const k of keys) startingPoints += pointsOf(k)
    standings.push({ teamKey, startingPoints, rank: 0 })
  }
  standings.sort((a, b) => b.startingPoints - a.startingPoints)
  standings.forEach((s, i) => (s.rank = i + 1))
  const teams = standings.length
  const myStanding = myTeamKey ? standings.find((s) => s.teamKey === myTeamKey) ?? null : null
  const myLineupRank = myStanding?.rank ?? 0

  // 5) Slot-value landscape: for each concrete opening, rank my starter against
  //    every team's starter at that same opening index (their nth-best body there).
  const slotRanks: SlotRankRow[] = []
  if (myTeamKey && assignedByTeam.has(myTeamKey)) {
    // Per position, each team's assigned starters sorted by points desc.
    const sortedAt = (teamKey: string, pos: string): string[] =>
      [...(assignedByTeam.get(teamKey)?.[pos] ?? [])].sort((a, b) => pointsOf(b) - pointsOf(a))
    const positions = Object.keys(slots).sort((a, b) => slotIdx(a) - slotIdx(b))
    for (const pos of positions) {
      const mine = sortedAt(myTeamKey, pos)
      const openings = slots[pos]
      for (let i = 0; i < openings; i++) {
        const myKey = mine[i] ?? null
        const myPts = myKey ? pointsOf(myKey) : 0
        // Rank: 1 + number of teams whose i-th starter at this pos outscores mine.
        let rank = 1
        for (const [teamKey] of byTeam) {
          if (teamKey === myTeamKey) continue
          const theirs = sortedAt(teamKey, pos)[i]
          if (theirs != null && pointsOf(theirs) > myPts) rank++
        }
        slotRanks.push({
          slot: pos,
          starterName: myKey ? nameOf.get(myKey) ?? '—' : '—',
          starterKey: myKey,
          points: myPts,
          rank,
          teams,
        })
      }
    }
  }

  return { rosterRows, slotRanks, myLineupRank, teams, standings, myStanding }
}
