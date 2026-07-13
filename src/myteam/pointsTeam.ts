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
import { projectPlayerPoints, weeklyRate, type PointsSide } from '@/myteam/pointsValue'
import { assignSlots, type DepthPlayer } from '@/trades/positionalLandscape'
import type { FGProjection } from '@/services/projectionService'
import { injuryTier, injuryDiscount, type InjuryTier } from './injuryStatus'

export interface PointsPoolPlayer {
  playerKey: string
  name: string
  position: string
  eligiblePositions?: string[]
  teamKey: string
  proTeam?: string
  headshot?: string
  onIL?: boolean
  status?: string // raw platform injury status ('IL10' / 'DTD' / 'DAY_TO_DAY' / '' …)
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
  chips: string[] // specialist edges (SB/SV/HLD/QS) where this player is a standout
  injury: InjuryTier // 'healthy' | 'dtd' | 'il' — drives the badge + the points discount
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

export interface PitchingRank {
  rank: number // your staff's projected starter-points rank in the league
  teams: number
  points: number // your starting staff's total projected points
  arms: { name: string; starterKey: string; points: number }[] // your starting arms, by points
}

export interface PointsTeamModel {
  rosterRows: PointsRosterRow[]
  slotRanks: SlotRankRow[] // POSITION-PLAYER slots only (pitching folds into `pitching`)
  pitching: PitchingRank | null
  myLineupRank: number // your optimal lineup's projected-points rank in the league
  teams: number
  standings: TeamStanding[]
  myStanding: TeamStanding | null
}

// Pitcher lineup slots — ranked as ONE staff unit, not per-opening. Ranking each
// arm against every team's same-rank arm (your ace vs their aces) inverts: your
// best pitcher shows the worst rank. A single staff rank is how managers actually
// read it ("my pitching vs theirs") and stays monotonic.
const PITCHER_SLOTS = new Set(['SP', 'RP', 'P', 'SP/RP', 'RP/SP'])
const isPitcherSlot = (pos: string) => PITCHER_SLOTS.has(pos.toUpperCase())

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
  // `basis` controls how a player's lineup value is measured. 'total' (default,
  // used by My Team) = rest-of-season projected points. 'perWeek' (Power Rankings)
  // = schedule-neutral weekly rate, so a late-season two-start week can't inflate a
  // team's strength. Only the optimal-lineup VALUE/standings honour this; the
  // roster-row tiers stay on totals (My Team's basis), which 'perWeek' callers ignore.
  opts: { basis?: 'total' | 'perWeek'; weeksLeft?: number } = {},
): PointsTeamModel {
  const basis = opts.basis ?? 'total'
  const weeksLeft = opts.weeksLeft ?? 1

  // 1) Project every rostered player's points once.
  const ptsByKey = new Map<string, ReturnType<typeof projectPlayerPoints>>()
  for (const p of pool) ptsByKey.set(p.playerKey, projectPlayerPoints(fgByKey[p.playerKey], weights))

  // Injury haircut per player (IL x0.5 / DTD x0.9), applied to every value read below so it
  // flows into tiers, the slot spine, standings strength, and myLineupRank consistently.
  const injuryByKey = new Map<string, InjuryTier>(pool.map((p) => [p.playerKey, injuryTier(p.status, p.onIL)]))
  const discountOf = (key: string) => injuryDiscount(injuryByKey.get(key) ?? 'healthy')

  // Lineup value per the chosen basis — totals for My Team, weekly rate for ranking.
  const valueOf = (key: string): number => {
    const r = ptsByKey.get(key)
    if (!r) return 0
    const base = basis === 'perWeek' ? weeklyRate(r, fgByKey[key], weeksLeft) : r.total
    return base * discountOf(key)
  }

  // Specialist-chip thresholds. A chip should mark a STANDOUT, not anyone who
  // accrues a scored stat (every hitter steals a few bases, every starter logs a
  // few QS). Threshold = the 65th percentile among the league pool's NONZERO
  // contributors on that side, so only the upper slice earns the chip.
  // Side per player. An unmatched player (no FG row) has no player_type, so fall
  // back to POSITION — otherwise a projection-less reliever defaults to 'hit' and
  // shows up under your hitters (the Carlos Estevez / category-Cantillo bug).
  const isPitcherPos = (pos: string) =>
    String(pos || '').split(/[,/|]/).some((t) => ['SP', 'RP', 'P'].includes(t.trim().toUpperCase()))
  const sideByKey = new Map<string, PointsSide>()
  for (const p of pool) {
    const fg = fgByKey[p.playerKey]
    sideByKey.set(p.playerKey, fg ? (fg.player_type === 'pitcher' ? 'pit' : 'hit') : isPitcherPos(p.position) ? 'pit' : 'hit')
  }

  const SPECIALIST_STATS = ['SB', 'SV', 'HLD', 'QS']
  const pctileNonzero = (vals: number[], p: number): number => {
    const pos = vals.filter((v) => v > 0).sort((a, b) => a - b)
    if (!pos.length) return Infinity
    return pos[Math.floor((pos.length - 1) * p)]
  }
  const chipThresh: Record<PointsSide, Record<string, number>> = { hit: {}, pit: {} }
  for (const side of ['hit', 'pit'] as PointsSide[]) {
    for (const st of SPECIALIST_STATS) {
      const vals: number[] = []
      for (const p of pool) {
        const r = ptsByKey.get(p.playerKey)!
        if (sideByKey.get(p.playerKey) === side && r.perStat[st] != null) vals.push(r.perStat[st])
      }
      chipThresh[side][st] = pctileNonzero(vals, 0.65)
    }
  }
  const chipsFor = (side: PointsSide, perStat: Record<string, number>): string[] =>
    SPECIALIST_STATS.filter((st) => (perStat[st] ?? 0) > 0 && perStat[st] >= chipThresh[side][st])

  // 2) My roster rows. Tiers are WITHIN-ROSTER (your studs vs your scrubs) so every
  //    roster spreads CORE→FRINGE like the category page. A league-wide percentile
  //    compresses to all-FRINGE: additive points push the median rostered player
  //    high, so even a team's best bat sits below the league median. The bar
  //    (rankVsAll) is the within-side, within-roster percentile (best ≈ 100).
  const rawRows = pool
    .filter((p) => myTeamKey != null && p.teamKey === myTeamKey)
    .map((p) => {
      const r = ptsByKey.get(p.playerKey)!
      const disc = discountOf(p.playerKey)
      return {
        player: p,
        side: sideByKey.get(p.playerKey)!,
        points: r.total * disc, // discounted — drives tiers + display
        perGame: r.games > 0 ? r.total / r.games : 0, // healthy "when he plays" rate
        games: r.games,
        perStat: r.perStat,
        injury: injuryByKey.get(p.playerKey) ?? 'healthy',
      }
    })

  const rosterRows: PointsRosterRow[] = []
  for (const side of ['hit', 'pit'] as PointsSide[]) {
    const sideRows = rawRows.filter((r) => r.side === side).sort((a, b) => b.points - a.points)
    const n = sideRows.length
    sideRows.forEach((r, i) => {
      const pct = n < 2 ? 50 : Math.round(((n - 1 - i) / (n - 1)) * 100)
      const tier: Tier = pct >= 66 ? 'CORE' : pct >= 33 ? 'SOLID' : 'FRINGE'
      rosterRows.push({
        player: r.player,
        side: r.side,
        points: r.points,
        perGame: r.perGame,
        games: r.games,
        tier,
        rankVsAll: pct,
        perStat: r.perStat,
        chips: chipsFor(r.side, r.perStat),
        injury: r.injury,
      })
    })
  }
  rosterRows.sort((a, b) => b.points - a.points)

  // 4) Per-team optimal lineup (assignSlots over projected points), for standings
  //    AND the slot-value landscape. bar=0 so even weak rosters field a full lineup.
  const byTeam = new Map<string, DepthPlayer[]>()
  for (const p of pool) {
    const dp: DepthPlayer = {
      playerKey: p.playerKey,
      teamKey: p.teamKey,
      eligiblePositions: parseEligible(p),
      value: valueOf(p.playerKey),
      status: p.onIL ? 'IL' : '',
    }
    ;(byTeam.get(p.teamKey) ?? byTeam.set(p.teamKey, []).get(p.teamKey)!).push(dp)
  }

  const pointsOf = (key: string) => valueOf(key)
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

  // 5) Slot-value landscape: POSITION-PLAYER slots ranked per-opening (your starter
  //    vs every team's starter at that opening). Pitching is handled as a unit below.
  const sortedAt = (teamKey: string, pos: string): string[] =>
    [...(assignedByTeam.get(teamKey)?.[pos] ?? [])].sort((a, b) => pointsOf(b) - pointsOf(a))
  const slotRanks: SlotRankRow[] = []
  if (myTeamKey && assignedByTeam.has(myTeamKey)) {
    const positions = Object.keys(slots)
      .filter((p) => !isPitcherSlot(p))
      .sort((a, b) => slotIdx(a) - slotIdx(b))
    for (const pos of positions) {
      const mine = sortedAt(myTeamKey, pos)
      for (let i = 0; i < slots[pos]; i++) {
        const myKey = mine[i] ?? null
        const myPts = myKey ? pointsOf(myKey) : 0
        let rank = 1
        for (const [teamKey] of byTeam) {
          if (teamKey === myTeamKey) continue
          const theirs = sortedAt(teamKey, pos)[i]
          if (theirs != null && pointsOf(theirs) > myPts) rank++
        }
        slotRanks.push({ slot: pos, starterName: myKey ? nameOf.get(myKey) ?? '—' : '—', starterKey: myKey, points: myPts, rank, teams })
      }
    }
  }

  // 6) Pitching as ONE staff unit: sum each team's optimal-lineup pitcher points,
  //    rank mine against the league, and list my starting arms by points.
  const pitcherSlotKeys = Object.keys(slots).filter((p) => isPitcherSlot(p))
  const staffPointsOf = (teamKey: string): number => {
    const ass = assignedByTeam.get(teamKey) ?? {}
    let sum = 0
    for (const pos of pitcherSlotKeys) for (const k of ass[pos] ?? []) sum += pointsOf(k)
    return sum
  }
  let pitching: PitchingRank | null = null
  if (myTeamKey && assignedByTeam.has(myTeamKey) && pitcherSlotKeys.length) {
    const myStaff = staffPointsOf(myTeamKey)
    let rank = 1
    for (const [teamKey] of byTeam) if (teamKey !== myTeamKey && staffPointsOf(teamKey) > myStaff) rank++
    const myAss = assignedByTeam.get(myTeamKey) ?? {}
    const arms: PitchingRank['arms'] = []
    for (const pos of pitcherSlotKeys) for (const k of myAss[pos] ?? []) arms.push({ name: nameOf.get(k) ?? '—', starterKey: k, points: pointsOf(k) })
    arms.sort((a, b) => b.points - a.points)
    pitching = { rank, teams, points: myStaff, arms }
  }

  return { rosterRows, slotRanks, pitching, myLineupRank, teams, standings, myStanding }
}
