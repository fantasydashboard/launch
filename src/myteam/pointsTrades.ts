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
  /**
   * 'winWin'  both lineups improve — propose as-is.
   * 'ask'     you improve, they don't. A real deal to go after, but you'll have to
   *           sweeten it or catch them wanting the name. Surfaced separately and
   *           labelled, never mixed in with the win-wins.
   */
  kind: 'winWin' | 'ask'
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

// Candidates considered per side. Raised from 5 when starters became offerable — the
// search is CAND x CAND x opponents lineup solves, so this stays deliberately bounded.
const CAND = 8

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
  /**
   * Bodies worth offering. This used to be bench-only ("not in the optimal lineup"), which
   * cannot produce a win-win in a flex-heavy league: with three FLEX slots the optimal
   * lineup is simply your nine best players, so every bench body is worse than every
   * starter, and requiring BOTH sides to improve off a bench-for-bench swap is close to
   * arithmetically impossible. That is why a ten-team league with full rosters returned
   * "no clean win-win swap" rather than any real scarcity of deals.
   *
   * Starters are now offerable too — trading from genuine positional depth is how real
   * trades work. The honesty guard is unchanged and is the one that matters: both lineups
   * must actually improve, and you must gain at least ~40% of what they gain.
   */
  const candidates = (dp: Dp[], base: Set<string>): Dp[] => {
    const healthy = dp.filter((p) => p.points > 0 && !p.status)
    const bench = healthy.filter((p) => !base.has(p.playerKey)).sort((a, b) => b.points - a.points)
    // Starters ascending: your weakest starter is the realistic thing to move, not your best.
    const starters = healthy.filter((p) => base.has(p.playerKey)).sort((a, b) => a.points - b.points)
    return [...bench, ...starters].slice(0, CAND)
  }
  const mySurplus = candidates(myDp, myBase.started)

  const swap = (dp: Dp[], outKey: string, incoming: Dp): Dp[] => [...dp.filter((p) => p.playerKey !== outKey), incoming]

  const ideas: TradeIdea[] = []
  for (const [oppKey, theirDp] of byTeam) {
    if (oppKey === myTeamKey) continue
    const theirBase = optimal(theirDp, slots)
    const theirSurplus = candidates(theirDp, theirBase.started)
    for (const mine of mySurplus) {
      for (const theirs of theirSurplus) {
        const myNew = optimal(swap(myDp, mine.playerKey, theirs), slots)
        const myGain = myNew.total - myBase.total
        if (myGain <= 0) continue
        const theirNew = optimal(swap(theirDp, theirs.playerKey, mine), slots)
        const theirGain = theirNew.total - theirBase.total
        // Skip deals lopsided in THEIR favor — if you barely improve while they
        // gain a lot, it's a gift, not a deal you'd propose. You should benefit at
        // least ~40% as much as they do.
        if (theirGain > 0 && myGain < 0.4 * theirGain) continue
        /* A deal that helps you and not them is still information — it is the deal to go
           after. Returning nothing at all when no mutual upgrade exists left the page
           saying "no clean win-win swap" and stopping, which reads as having no opinion
           rather than having a harder-to-sell one. Kept separate and labelled. */
        ideas.push({
          give: sideOf(mine.playerKey),
          get: sideOf(theirs.playerKey),
          oppTeamKey: oppKey,
          oppTeamName: teamNames[oppKey] || 'Opponent',
          myGain: Math.round(myGain),
          theirGain: Math.round(theirGain),
          kind: theirGain > 0 ? 'winWin' : 'ask',
        })
      }
    }
  }
  // Best for me first; no duplicate acquisitions, and cap how many times the same
  // body is the one you give up (so the list isn't all one surplus player).
  // Win-wins first (proposable as-is), then asks, each by what they do for you.
  ideas.sort((a, b) => (a.kind === b.kind ? b.myGain - a.myGain : a.kind === 'winWin' ? -1 : 1))
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
