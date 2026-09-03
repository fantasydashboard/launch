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
  /** What leaves your roster. Two bodies in a consolidation. */
  gives: TradeSide[]
  /** What arrives. One body in a consolidation. */
  gets: TradeSide[]
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
  /**
   * 2-for-1 is how a lopsided-LOOKING trade actually gets done: they gain two startable
   * bodies, you gain one better than your worst starter. It also costs you a roster spot,
   * which the view has to say out loud.
   */
  shape: '1for1' | '2for1'
}

/**
 * How much worse off the other manager is allowed to be for a deal to still count as an ASK
 * rather than a fantasy. Unbounded, the search happily proposed giving a WR44 for Sam LaPorta
 * — a 192-point hit to their lineup — which is not a negotiation, it is a punchline. An ask
 * has to be arguably fair: their loss within half again your gain.
 */
const ASK_MAX_LOSS_RATIO = 1.5

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
/** Per side for the 2-for-1 pass. Pairs are quadratic, so this stays well under CAND. */
const PAIR_CAND = 6

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

  /** Score a candidate deal from both sides and keep it if it is worth proposing. */
  const consider = (
    oppKey: string,
    theirDp: Dp[],
    theirBase: { total: number },
    outMine: Dp[],
    outTheirs: Dp[],
    shape: '1for1' | '2for1',
  ) => {
    const myKeys = new Set(outMine.map((p) => p.playerKey))
    const theirKeys = new Set(outTheirs.map((p) => p.playerKey))
    const myNew = optimal([...myDp.filter((p) => !myKeys.has(p.playerKey)), ...outTheirs], slots)
    const myGain = myNew.total - myBase.total
    if (myGain <= 0) return
    const theirNew = optimal([...theirDp.filter((p) => !theirKeys.has(p.playerKey)), ...outMine], slots)
    const theirGain = theirNew.total - theirBase.total

    // Lopsided in THEIR favour is a gift, not a deal you'd propose.
    if (theirGain > 0 && myGain < 0.4 * theirGain) return
    // Lopsided in YOURS past the point of plausibility is not an ask, it's a punchline.
    if (theirGain <= 0 && -theirGain > ASK_MAX_LOSS_RATIO * myGain) return

    ideas.push({
      gives: outMine.map((p) => sideOf(p.playerKey)),
      gets: outTheirs.map((p) => sideOf(p.playerKey)),
      oppTeamKey: oppKey,
      oppTeamName: teamNames[oppKey] || 'Opponent',
      myGain: Math.round(myGain),
      theirGain: Math.round(theirGain),
      kind: theirGain > 0 ? 'winWin' : 'ask',
      shape,
    })
  }

  for (const [oppKey, theirDp] of byTeam) {
    if (oppKey === myTeamKey) continue
    const theirBase = optimal(theirDp, slots)
    const theirSurplus = candidates(theirDp, theirBase.started)

    for (const mine of mySurplus) {
      for (const theirs of theirSurplus) {
        consider(oppKey, theirDp, theirBase, [mine], [theirs], '1for1')
      }
    }

    /*
     * Consolidation. Two of your bodies for one of theirs: they gain depth, you gain at the
     * top. This is the shape that produces a genuine win-win when 1-for-1 cannot — in a
     * 1-for-1 the only way you gain a lot is if they lose a lot, which is why every
     * suggestion read as a beg. Bounded to the strongest few per side to keep the search
     * from exploding: pairs are quadratic and every candidate costs two lineup solves.
     */
    const myPairPool = mySurplus.slice(0, PAIR_CAND)
    for (let i = 0; i < myPairPool.length; i++) {
      for (let j = i + 1; j < myPairPool.length; j++) {
        for (const theirs of theirSurplus.slice(0, PAIR_CAND)) {
          consider(oppKey, theirDp, theirBase, [myPairPool[i], myPairPool[j]], [theirs], '2for1')
        }
      }
    }
  }

  /*
   * Win-wins first, then asks. Within asks, rank by NET surplus (my gain minus their loss)
   * rather than by my gain alone — an ask that costs them a little is a conversation, one
   * that guts them is not, and sorting on my gain alone put the least plausible first.
   */
  const net = (i: TradeIdea) => i.myGain + i.theirGain
  ideas.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'winWin' ? -1 : 1
    return a.kind === 'winWin' ? b.myGain - a.myGain : net(b) - net(a)
  })

  // No duplicate acquisitions, and cap how often the same body is the one you give up, so
  // the list isn't four variations on offering the same fringe player.
  const seenGet = new Set<string>()
  const giveCount = new Map<string, number>()
  const out: TradeIdea[] = []
  for (const idea of ideas) {
    if (idea.gets.some((g) => seenGet.has(g.playerKey))) continue
    if (idea.gives.some((g) => (giveCount.get(g.playerKey) ?? 0) >= 2)) continue
    for (const g of idea.gets) seenGet.add(g.playerKey)
    for (const g of idea.gives) giveCount.set(g.playerKey, (giveCount.get(g.playerKey) ?? 0) + 1)
    out.push(idea)
    if (out.length >= 8) break
  }
  return out
}
