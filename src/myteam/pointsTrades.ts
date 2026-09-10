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
import {
  isZeroSumSwap, readNeeds, acceptOdds, rungFor, pitchFor, MIN_SENDABLE_ODDS,
  type PositionNeed, type TeamSituation, type Rung,
} from '@/myteam/tradeStrategy'
import { parseEligible, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import { canonicalPosition } from '@/trades/rosterSlots'
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
  /** 0..1 estimate that they say yes. Ranking runs on gain × this, not gain alone. */
  odds: number
  /** Where it sits on the ask ladder — open with a reach, settle at fair. */
  rung: Rung
  /** The hole on their roster this fills, when it fills one. */
  fills?: PositionNeed | null
  /** The opener, led with their angle rather than yours. */
  pitch: string
  /**
   * 2-for-1 is how a lopsided-LOOKING trade actually gets done: they gain two startable
   * bodies, you gain one better than your worst starter. It also costs you a roster spot,
   * which the view has to say out loud.
   */
  shape: '1for1' | '2for1' | '2for2'
  /** Net roster spots this costs you. +1 means you free a spot; you must fill it. */
  spots: number
}

/**
 * How much worse off the other manager is allowed to be for a deal to still count as an ASK
 * rather than a fantasy. Unbounded, the search happily proposed giving a WR44 for Sam LaPorta
 * — a 192-point hit to their lineup — which is not a negotiation, it is a punchline. An ask
 * has to be arguably fair: their loss within half again your gain.
 */
/**
 * The floor a swap must clear to be worth proposing at all.
 *
 * Deliberately left as a bare projected-point figure. I tried restating it per week and
 * dividing by each player's projected `games`, which is right for football — seventeen games
 * is seventeen weeks — and wrong for baseball, where `games` counts a hundred and fifty of
 * them across twenty-six weeks and the floor came out over a hundred times too strict. Six
 * baseball tests caught it. There is no sport-neutral week in this data, so the number stays
 * in the unit the data is actually in.
 */
export const MIN_GAIN_PER_WEEK = 1

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
  /* Whether each rival is contending, rebuilding or already done. The engine treated every
     opponent as an identical bag of players; posture is most of what decides who says yes. */
  situations: Record<string, TeamSituation> = {},
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
  const offerCandidates = (dp: Dp[], base: Set<string>): Dp[] => {
    const healthy = dp.filter((p) => p.points > 0 && !p.status)
    const bench = healthy.filter((p) => !base.has(p.playerKey)).sort((a, b) => b.points - a.points)
    // Starters ascending: your weakest starter is the realistic thing to move, not your best.
    const starters = healthy.filter((p) => base.has(p.playerKey)).sort((a, b) => a.points - b.points)
    return [...bench, ...starters].slice(0, CAND)
  }

  /**
   * Who you would ASK for. The other half of the search, and the half that was missing.
   *
   * One list served both sides — "players this team would plausibly part with", meaning bench
   * bodies and weakest starters. Correct for my side. Catastrophic for theirs: it meant the
   * engine could only ever offer me another manager's WORST startable player. On a twelve-team
   * fixture their best man was worth 233 points and the most the search would hand me was 136.
   *
   * That single fact is why consolidation never appeared. A 2-for-1 is two useful pieces for
   * one better one; pointed at their bench it becomes two useful pieces for their worst
   * starter, which cannot raise my lineup, and 885 of 890 consolidations died on exactly that
   * check. The page then reported "no swap raises both lineups" — which read as scarcity in
   * the league and was really a blind spot in the search.
   *
   * You do not have to be offered a stud to ask about one. Whether they would say yes is a
   * separate question, and acceptOdds already answers it honestly.
   */
  const targetCandidates = (dp: Dp[]): Dp[] =>
    dp.filter((p) => p.points > 0 && !p.status)
      .sort((a, b) => b.points - a.points)
      .slice(0, CAND)
  /** A player's primary position, from the pool meta already indexed above. */
  const posOf = (key: string): string =>
    canonicalPosition((meta.get(key)?.position || '').split(/[,/|]/)[0])

  const mySurplus = offerCandidates(myDp, myBase.started)

  const ideas: TradeIdea[] = []

  /** Score a candidate deal from both sides and keep it if it is worth proposing. */
  const consider = (
    oppKey: string,
    theirDp: Dp[],
    theirBase: { total: number },
    outMine: Dp[],
    outTheirs: Dp[],
    shape: '1for1' | '2for1' | '2for2',
  ) => {
    /*
     * A same-position one-for-one at a single-seat position can never help both sides — the
     * two lineups move by equal and opposite amounts, so no sweetener makes it mutual. This is
     * the rule the board broke in public when it offered a tight end for a tight end and
     * captioned it "costs them 29 — worth asking". Checked before any lineup is solved, since
     * the answer is structural rather than numeric.
     */
    if (isZeroSumSwap(
      outMine.map((p) => posOf(p.playerKey)),
      outTheirs.map((p) => posOf(p.playerKey)),
      slots,
    )) return

    const myKeys = new Set(outMine.map((p) => p.playerKey))
    const theirKeys = new Set(outTheirs.map((p) => p.playerKey))
    const myNew = optimal([...myDp.filter((p) => !myKeys.has(p.playerKey)), ...outTheirs], slots)
    const myGain = myNew.total - myBase.total
    /*
     * A gain that rounds to zero is not a deal.
     *
     * The filter was `myGain <= 0`, so a swap worth 0.3 points a week survived it and then
     * printed as "+0 PTS TO YOU" — under a "Best deals" heading, captioned "even — both win",
     * and in a dynasty league sitting above a line reading "dynasty −3,200". The page was
     * proposing that you hand over the QB4 in dynasty for the TE25 and calling it mutual.
     *
     * One point a week is the floor for a swap being worth the message you have to send to
     * make it happen. Below that the honest output is nothing at all.
     */
    const spots = outMine.length - outTheirs.length
    if (myGain < MIN_GAIN_PER_WEEK) return
    const theirNew = optimal([...theirDp.filter((p) => !theirKeys.has(p.playerKey)), ...outMine], slots)
    const theirGain = theirNew.total - theirBase.total

    /*
     * Lopsided in THEIR favour is a gift, not a deal you would propose — but only where the
     * two sides are comparable. In a consolidation they receive a net extra body, and an extra
     * body lifts a thin roster almost by construction, so their raw total OUGHT to rise more
     * than mine. Applying the ratio there rejected the one shape that works for exactly the
     * reason it works. Count-neutral deals still face it; for consolidation the roster spot
     * is reported on the card as `spots` rather than priced into a guard, because what an
     * empty seat costs depends on the manager's bench and byes, not on a constant here.
     */
    if (spots === 0 && theirGain > 0 && myGain < 0.4 * theirGain) return
    // Lopsided in YOURS past the point of plausibility is not an ask, it's a punchline.
    if (theirGain <= 0 && -theirGain > ASK_MAX_LOSS_RATIO * myGain) return

    /* Which of their holes this lands in — the reason they would want it, if there is one. */
    const theirNeeds = needsByTeam.get(oppKey) ?? {}
    /*
     * "Fills their hole" has to be true of the player you are actually sending.
     *
     * This mapped my outgoing players to THEIR need at that position and stopped there,
     * without once comparing the two. So a card offered a replacement-level tight end into a
     * team's tight-end hole and captioned itself "fills their TE hole — they're starting one
     * below replacement", directly above its own verdict of 25% and a lineup solve saying
     * they come out worse. Both facts were true and the sentence joining them was not: they
     * had a hole, and the body on offer did not fill it.
     *
     * A claim about their roster now has to clear their roster: the player has to beat the
     * starter he would replace. Where he does not, the card says nothing about their needs,
     * and acceptOdds stops handing out the hole-filling bonus for a deal that fills nothing.
     */
    const fills = outMine
      .map((p) => {
        const need = theirNeeds[posOf(p.playerKey)]
        if (!need) return null
        const mine = vorByKey[p.playerKey]?.vorRos
        // No VOR for this player is not evidence of an upgrade — say nothing rather than guess.
        if (mine === undefined || mine <= need.worstStarterVor) return null
        return need
      })
      .filter(Boolean)
      .sort((a, b) => a!.worstStarterVor - b!.worstStarterVor)[0] ?? null
    const situation = situations[oppKey]
    const oppTeamName = teamNames[oppKey] || 'Opponent'
    const giveNames = outMine.map((p) => meta.get(p.playerKey)?.name ?? '')
    const getNames = outTheirs.map((p) => meta.get(p.playerKey)?.name ?? '')

    ideas.push({
      gives: outMine.map((p) => sideOf(p.playerKey)),
      gets: outTheirs.map((p) => sideOf(p.playerKey)),
      oppTeamKey: oppKey,
      oppTeamName,
      myGain: Math.round(myGain),
      theirGain: Math.round(theirGain),
      kind: theirGain > 0 ? 'winWin' : 'ask',
      shape,
      spots,
      odds: acceptOdds({ theirGain, myGain, fills, situation }),
      rung: rungFor(theirGain, myGain),
      fills,
      pitch: pitchFor({ theirTeamName: oppTeamName, getNames, giveNames, fills, theirGain, situation }),
    })
  }

  /* Every rival's holes, read once. A hole is a starter below replacement — the difference
     between "ranked eighth at running back" and "starting someone worse than a free agent",
     which is the only version of need worth acting on. */
  const needsByTeam = new Map<string, Record<string, PositionNeed>>()
  for (const [oppKey, theirDp] of byTeam) {
    if (oppKey === myTeamKey) continue
    const base = optimal(theirDp, slots)
    needsByTeam.set(oppKey, readNeeds(
      [...base.started].map((k) => ({ position: posOf(k), vor: vorByKey[k]?.vorRos ?? 0 })),
      slots,
    ))
  }

  for (const [oppKey, theirDp] of byTeam) {
    if (oppKey === myTeamKey) continue
    const theirBase = optimal(theirDp, slots)
    /* Two different questions, two different lists: who they would part with, and who I would
       ask about. Using the first for both is what left the board empty. */
    const theirSurplus = offerCandidates(theirDp, theirBase.started)
    const theirTargets = targetCandidates(theirDp)

    for (const mine of mySurplus) {
      for (const theirs of theirTargets) {
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
    const myPairs: Dp[][] = []
    for (let i = 0; i < myPairPool.length; i++) {
      for (let j = i + 1; j < myPairPool.length; j++) myPairs.push([myPairPool[i], myPairPool[j]])
    }
    for (const pair of myPairs) {
      for (const theirs of theirTargets.slice(0, PAIR_CAND)) {
        consider(oppKey, theirDp, theirBase, pair, [theirs], '2for1')
      }
    }

    /*
     * Two-for-two: the shape that keeps both roster counts intact.
     *
     * Consolidation is the strongest move available but it always costs a seat, and a manager
     * short on bodies going into byes will not make it. Pairing one of their good players with
     * one of their spare parts keeps everyone's roster the same size, which makes it the
     * easiest version to actually get agreed. Their side is one target plus one surplus body
     * rather than every pair of their roster — asking for two of somebody's best players is
     * not a trade, it is a wish.
     */
    for (const pair of myPairs) {
      for (const target of theirTargets.slice(0, PAIR_CAND)) {
        for (const filler of theirSurplus.slice(0, 3)) {
          if (filler.playerKey === target.playerKey) continue
          consider(oppKey, theirDp, theirBase, pair, [target, filler], '2for2')
        }
      }
    }
  }

  /*
   * Win-wins first, then asks. Within asks, rank by NET surplus (my gain minus their loss)
   * rather than by my gain alone — an ask that costs them a little is a conversation, one
   * that guts them is not, and sorting on my gain alone put the least plausible first.
   */
  /*
   * Rank by what a deal is actually worth PURSUING: my gain multiplied by the chance they say
   * yes. Sorting on point delta alone is how "costs them 90 — worth asking" reaches the top of
   * a list; it is the best deal in the league on paper and nobody has ever accepted it. A
   * smaller trade a desperate manager takes beats a bigger one that gets left on read.
   *
   * Win-wins still lead. They are not merely likelier — they are the deals where the pitch
   * writes itself, because the other manager can check the claim against his own lineup.
   */
  const expected = (i: TradeIdea) => i.myGain * i.odds
  ideas.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'winWin' ? -1 : 1
    return expected(b) - expected(a)
  })

  /*
   * Variety without collapse.
   *
   * The old rule banned any player from being acquired twice, which sounds like variety and
   * behaved like a cull: win-wins cluster on the same handful of genuinely gettable players,
   * so the first one claimed the target and the next eighty were dropped — leaving the board
   * to fall through to asks nobody would send. Same-player-different-price is a real choice a
   * manager makes, so allow a target to appear twice, and spread across partners instead.
   */
  const sendable = ideas.filter((i) => i.odds >= MIN_SENDABLE_ODDS)
  const getCount = new Map<string, number>()
  const giveCount = new Map<string, number>()
  const perPartner = new Map<string, number>()
  const seenExact = new Set<string>()
  const out: TradeIdea[] = []
  for (const idea of sendable) {
    const sig = [...idea.gives, ...idea.gets].map((p) => p.playerKey).sort().join('|')
    if (seenExact.has(sig)) continue
    if (idea.gets.some((g) => (getCount.get(g.playerKey) ?? 0) >= 2)) continue
    if (idea.gives.some((g) => (giveCount.get(g.playerKey) ?? 0) >= 4)) continue
    if ((perPartner.get(idea.oppTeamKey) ?? 0) >= 3) continue
    seenExact.add(sig)
    for (const g of idea.gets) getCount.set(g.playerKey, (getCount.get(g.playerKey) ?? 0) + 1)
    for (const g of idea.gives) giveCount.set(g.playerKey, (giveCount.get(g.playerKey) ?? 0) + 1)
    perPartner.set(idea.oppTeamKey, (perPartner.get(idea.oppTeamKey) ?? 0) + 1)
    out.push(idea)
    if (out.length >= 10) break
  }
  return out
}
