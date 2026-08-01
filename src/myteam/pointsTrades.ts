/**
 * The points-league Trades brain: win-win deals that raise YOUR projected
 * starting-lineup points. The realistic trade in a points league is surplus-for-
 * surplus — you give a body that rides your bench but would START for a partner,
 * and get back one that rides their bench but STARTS for you. Both optimal
 * lineups go up, so the deal is fair and actually gets accepted.
 *
 * Everything is measured in the one currency (projected points) by re-solving
 * each side's optimal lineup (assignSlots) with the swap applied.
 */
import { assignSlots, type DepthPlayer } from '@/trades/positionalLandscape'
import { parseEligible, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import { type ValueByKey } from '@/myteam/playerValue'

export interface TradeSide {
  playerKey: string
  name: string
  position: string
  proTeam?: string
  headshot?: string
  points: number
  vor?: number // football: value over replacement (season). undefined for baseball.
}

export interface TradeIdea {
  give: TradeSide // my surplus body
  get: TradeSide // their surplus body that upgrades my lineup
  oppTeamKey: string
  oppTeamName: string
  myGain: number // my optimal-lineup point gain
  theirGain: number // their optimal-lineup point gain (fairness — both improve)
}

interface Dp extends DepthPlayer {
  points: number
}

/** Optimal starting-lineup point total + the set of players who start. */
function optimal(players: Dp[], slots: Record<string, number>): { total: number; started: Set<string> } {
  const a = assignSlots(players, slots, 0)
  const valByKey = new Map(players.map((p) => [p.playerKey, p.points]))
  const started = new Set<string>()
  let total = 0
  for (const keys of Object.values(a.assignedByPos)) for (const k of keys) {
    started.add(k)
    total += valByKey.get(k) ?? 0
  }
  return { total, started }
}

const CAND = 5 // surplus candidates considered per side (keeps the search small)

export function buildPointsTrades(
  pool: PointsPoolPlayer[],
  valueByKey: ValueByKey,
  myTeamKey: string,
  slots: Record<string, number>,
  teamNames: Record<string, string> = {},
  vorByKey: Record<string, { vorRos: number }> = {},
): TradeIdea[] {
  if (!myTeamKey || !pool.length || !Object.keys(slots).length) return []

  const meta = new Map<string, PointsPoolPlayer>()
  const ptsByKey = new Map<string, number>()
  const byTeam = new Map<string, Dp[]>()
  for (const p of pool) {
    const pts = valueByKey[p.playerKey]?.total ?? 0
    ptsByKey.set(p.playerKey, pts)
    meta.set(p.playerKey, p)
    const dp: Dp = { playerKey: p.playerKey, teamKey: p.teamKey, eligiblePositions: parseEligible(p), value: pts, points: pts, status: p.onIL ? 'IL' : '' }
    ;(byTeam.get(p.teamKey) ?? byTeam.set(p.teamKey, []).get(p.teamKey)!).push(dp)
  }

  const myDp = byTeam.get(myTeamKey)
  if (!myDp) return []
  const myBase = optimal(myDp, slots)
  const sideOf = (key: string): TradeSide => {
    const p = meta.get(key)!
    return { playerKey: key, name: p.name, position: p.position, proTeam: p.proTeam, headshot: p.headshot, points: ptsByKey.get(key) ?? 0, vor: vorByKey[key]?.vorRos }
  }
  // Surplus = a healthy body with value that ISN'T in the optimal lineup.
  const surplus = (dp: Dp[], base: Set<string>): Dp[] =>
    dp.filter((p) => !base.has(p.playerKey) && p.points > 0 && !p.status).sort((a, b) => b.points - a.points).slice(0, CAND)
  const mySurplus = surplus(myDp, myBase.started)

  const swap = (dp: Dp[], outKey: string, incoming: Dp): Dp[] => [...dp.filter((p) => p.playerKey !== outKey), incoming]

  const ideas: TradeIdea[] = []
  for (const [oppKey, theirDp] of byTeam) {
    if (oppKey === myTeamKey) continue
    const theirBase = optimal(theirDp, slots)
    const theirSurplus = surplus(theirDp, theirBase.started)
    for (const mine of mySurplus) {
      for (const theirs of theirSurplus) {
        const myNew = optimal(swap(myDp, mine.playerKey, theirs), slots)
        const myGain = myNew.total - myBase.total
        if (myGain <= 0) continue
        const theirNew = optimal(swap(theirDp, theirs.playerKey, mine), slots)
        const theirGain = theirNew.total - theirBase.total
        if (theirGain <= 0) continue
        // Skip deals lopsided in THEIR favor — if you barely improve while they
        // gain a lot, it's a gift, not a deal you'd propose. You should benefit at
        // least ~40% as much as they do.
        if (myGain < 0.4 * theirGain) continue
        ideas.push({
          give: sideOf(mine.playerKey),
          get: sideOf(theirs.playerKey),
          oppTeamKey: oppKey,
          oppTeamName: teamNames[oppKey] || 'Opponent',
          myGain: Math.round(myGain),
          theirGain: Math.round(theirGain),
        })
      }
    }
  }
  // Best for me first; no duplicate acquisitions, and cap how many times the same
  // body is the one you give up (so the list isn't all one surplus player).
  ideas.sort((a, b) => b.myGain - a.myGain)
  const seenGet = new Set<string>()
  const giveCount = new Map<string, number>()
  const out: TradeIdea[] = []
  for (const idea of ideas) {
    if (seenGet.has(idea.get.playerKey)) continue
    const gc = giveCount.get(idea.give.playerKey) ?? 0
    if (gc >= 3) continue
    seenGet.add(idea.get.playerKey)
    giveCount.set(idea.give.playerKey, gc + 1)
    out.push(idea)
    if (out.length >= 8) break
  }
  return out
}
