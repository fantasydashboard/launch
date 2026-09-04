// services/betting/pickem.ts
//
// Evaluating DFS pick'em entries (Sleeper, PrizePicks, Underdog) against the
// sportsbook market.
//
// A pick'em app is a different animal from a sportsbook and the difference is
// the whole reason this file exists. A sportsbook prices both sides of a bet and
// competes on that price. A pick'em app posts ONE number per player and pays a
// fixed multiplier on an entry of several picks. It does not compete on price at
// all, so the only question worth asking is whether its LINE is in the right
// place. If the market thinks a player's true rushing line is 74.5 and the app
// is offering 68.5, the over is a good pick regardless of what any book is
// paying, because the app has simply put the number in the wrong spot.
//
// So the output here is not "this price beats fair value". It is "this line is
// N units away from where the market has it, which makes it an X% shot, and an
// entry built out of picks like it returns Y".

import { fairPriceFromAmericans } from './devig'
import { impliedProbability } from './odds'
import type { DevigMethod, Market, Quote } from './types'
import { SHARP_BOOKS } from './types'

// ── Normal distribution helpers ──────────────────────────────────────────────
// Needed because the market rarely prices the exact number a pick'em app posts,
// so the gap between the two has to be turned into a probability somehow.

/** Standard normal CDF. Abramowitz and Stegun 7.1.26, accurate to about 1e-7. */
export function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const z = Math.abs(x) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * z)
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
    - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z)
  return 0.5 * (1 + sign * y)
}

/** Inverse standard normal CDF. Acklam's rational approximation. */
export function normalInv(p: number): number {
  if (!(p > 0) || p >= 1) return p <= 0 ? -Infinity : Infinity

  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01]
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00]
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
             3.754408661907416e+00]

  const pLow = 0.02425, pHigh = 1 - pLow
  let q: number, r: number

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p > pHigh) {
    q = Math.sqrt(-2 * Math.log(1 - p))
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  q = p - 0.5
  r = q * q
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
         (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}

// ── Turning the market into a distribution ───────────────────────────────────

/**
 * Rough coefficient of variation by market, used only when the market prices a
 * single line and we have to assume a spread to reach any other number.
 *
 * These are estimates, not measurements, and every probability derived from them
 * is labelled 'modeled' downstream so it can be told apart from one that came
 * straight off a real price. Passing yards is the tightest of the three because
 * volume is stable; rushing and receiving yards carry far more game-to-game
 * variance. When there is enough stored line history, these should be replaced
 * with numbers fitted to it rather than guessed.
 */
export const MARKET_CV: Record<string, number> = {
  player_pass_yds: 0.26,
  player_rush_yds: 0.58,
  player_reception_yds: 0.62,
  player_receptions: 0.45,
  player_pass_tds: 0.70,
}

const DEFAULT_CV = 0.5

export type ProbabilityConfidence = 'exact' | 'interpolated' | 'modeled'

export interface LineAssessment {
  /** Probability the OVER hits at the offered line. */
  probOver: number
  /** Where the market thinks the true number sits (its 50/50 point). */
  marketLine: number
  /** Offered line minus market line. Positive means the app set it too high. */
  gap: number
  confidence: ProbabilityConfidence
  anchorBooks: string[]
}

interface PricedPoint {
  point: number
  /** Devigged probability of going OVER this point. */
  probOver: number
}

/**
 * Every point the anchor books price for one player and stat, devigged.
 * Alternate lines are gold here: two priced points pin down both the middle and
 * the spread of the distribution, and no assumption is needed at all.
 */
function anchorPoints(markets: Market[], method: DevigMethod): { points: PricedPoint[]; books: string[] } {
  const points: PricedPoint[] = []
  const books = new Set<string>()

  for (const m of markets) {
    const byBook = new Map<string, Map<string, Quote>>()
    for (const q of m.quotes) {
      if (!SHARP_BOOKS.includes(q.book)) continue
      if (!byBook.has(q.book)) byBook.set(q.book, new Map())
      byBook.get(q.book)!.set(q.outcome, q)
    }

    for (const [book, sides] of byBook) {
      const over = sides.get('Over')
      const under = sides.get('Under')
      if (!over || !under || m.point == null) continue

      const fair = fairPriceFromAmericans([over.american, under.american], method)
      if (!fair) continue

      books.add(book)
      points.push({ point: m.point, probOver: fair.probabilities[0] })
    }
  }

  return { points: points.sort((a, b) => a.point - b.point), books: [...books] }
}

/**
 * Fit a normal to the priced points and read off the probability at any line.
 *
 * With two or more points this solves for both the middle and the spread, which
 * is the honest version. With one point it has to borrow a spread from MARKET_CV
 * and the result is flagged 'modeled' so nothing downstream mistakes it for a
 * measurement.
 */
export function assessLine(
  offeredPoint: number,
  markets: Market[],
  marketKey: string,
  method: DevigMethod = 'worstCase'
): LineAssessment | null {
  const { points, books } = anchorPoints(markets, method)
  if (points.length === 0) return null

  // Exact hit: the market prices this very number, so no model is involved.
  const exact = points.find(p => Math.abs(p.point - offeredPoint) < 1e-9)
  if (exact) {
    const median = solveMedian(points, marketKey)
    return {
      probOver: exact.probOver,
      marketLine: median.mu,
      gap: offeredPoint - median.mu,
      confidence: 'exact',
      anchorBooks: books,
    }
  }

  const { mu, sigma, fitted } = solveMedian(points, marketKey)
  if (!(sigma > 0)) return null

  return {
    probOver: 1 - normalCdf((offeredPoint - mu) / sigma),
    marketLine: mu,
    gap: offeredPoint - mu,
    confidence: fitted ? 'interpolated' : 'modeled',
    anchorBooks: books,
  }
}

/**
 * Recover the middle and spread of the implied distribution.
 * P(X > L) = p  implies  L = mu + sigma * z, where z = normalInv(1 - p).
 * Two points give two equations and a real fit; one point leaves sigma to the
 * CV table.
 */
function solveMedian(points: PricedPoint[], marketKey: string): { mu: number; sigma: number; fitted: boolean } {
  if (points.length >= 2) {
    // Least squares on L against z. With exactly two points this is the exact
    // solution; with more it averages out the disagreement between books.
    const zs = points.map(p => normalInv(1 - p.probOver))
    const n = points.length
    const meanZ = zs.reduce((a, b) => a + b, 0) / n
    const meanL = points.reduce((a, b) => a + b.point, 0) / n
    let num = 0, den = 0
    for (let i = 0; i < n; i++) {
      num += (zs[i] - meanZ) * (points[i].point - meanL)
      den += (zs[i] - meanZ) ** 2
    }
    if (den > 1e-9) {
      const sigma = num / den
      if (sigma > 0) return { mu: meanL - sigma * meanZ, sigma, fitted: true }
    }
  }

  // One point, or a degenerate fit. Borrow a spread.
  const p = points[0]
  const cv = MARKET_CV[marketKey] ?? DEFAULT_CV
  // Approximate the middle first using the line itself as a scale reference,
  // then refine once. Good enough given sigma is already an assumption.
  const sigma0 = Math.max(p.point * cv, 1e-6)
  const mu = p.point - sigma0 * normalInv(1 - p.probOver)
  const sigma = Math.max(mu * cv, 1e-6)
  return { mu: p.point - sigma * normalInv(1 - p.probOver), sigma, fitted: false }
}

// ── Entry structures ─────────────────────────────────────────────────────────

export interface PayoutStructure {
  name: string
  legs: number
  /** Return per unit staked, indexed by number of correct picks. 0 means lose. */
  payouts: number[]
}

/**
 * Default payout tables.
 *
 * IMPORTANT: these are shaped after the commonly published PrizePicks tables and
 * are here so the engine has something to run on. They are NOT verified against
 * Sleeper, whose exact multipliers are not published anywhere I could confirm,
 * and every one of these apps changes them. Read the numbers off the app you are
 * actually using and override these before trusting any EV figure. A payout
 * table that is quietly wrong produces confident output that is wrong by exactly
 * the same amount, which is the worst failure mode available here.
 */
export const DEFAULT_STRUCTURES: PayoutStructure[] = [
  { name: 'Power 2', legs: 2, payouts: [0, 0, 3] },
  { name: 'Power 3', legs: 3, payouts: [0, 0, 0, 5] },
  { name: 'Power 4', legs: 4, payouts: [0, 0, 0, 0, 10] },
  { name: 'Flex 3',  legs: 3, payouts: [0, 0, 1.25, 2.25] },
  { name: 'Flex 4',  legs: 4, payouts: [0, 0, 0, 1.5, 5] },
  { name: 'Flex 5',  legs: 5, payouts: [0, 0, 0, 0.4, 2, 10] },
  { name: 'Flex 6',  legs: 6, payouts: [0, 0, 0, 0.4, 2, 12, 25] },
]

// ── Joint outcomes across legs ───────────────────────────────────────────────

/** P(exactly k successes) for independent trials with different probabilities. */
export function poissonBinomial(probs: number[]): number[] {
  let dist = [1]
  for (const p of probs) {
    const next = new Array(dist.length + 1).fill(0)
    for (let k = 0; k < dist.length; k++) {
      next[k] += dist[k] * (1 - p)
      next[k + 1] += dist[k] * p
    }
    dist = next
  }
  return dist
}

// Fixed grid over the common factor. Wide enough that the tails contribute
// nothing measurable, fine enough that rho = 0 reproduces the independent case
// to well past any precision that matters here.
const Z_NODES = 121
const Z_RANGE = 6

/**
 * Distribution of correct picks when the legs are correlated.
 *
 * Uses a one-factor Gaussian copula: every leg is driven partly by a shared
 * factor (the game script, the weather, the pace) and partly by its own noise.
 * Conditional on the shared factor the legs are independent, so the whole thing
 * is a Poisson-binomial averaged over that factor.
 *
 * The direction of this effect is worth stating because it is easy to assume
 * backwards: positive correlation makes all-hit AND all-miss more likely, so it
 * HELPS a power play, which needs everything to land, and it is a mixed bag for
 * a flex, which is partly betting on the middle of the distribution. Treating
 * correlated legs as independent understates a power play and overstates the
 * safety of a flex.
 *
 * rho = 0 collapses to plain independence, which is the test.
 */
export function correlatedDistribution(probs: number[], rho: number): number[] {
  if (!(rho > 0)) return poissonBinomial(probs)

  const r = Math.min(Math.max(rho, 0), 0.95)
  const sqrtR = Math.sqrt(r)
  const sqrtOneMinusR = Math.sqrt(1 - r)
  const thresholds = probs.map(p => normalInv(1 - p))

  const out = new Array(probs.length + 1).fill(0)
  const step = (2 * Z_RANGE) / (Z_NODES - 1)
  let weightSum = 0

  for (let i = 0; i < Z_NODES; i++) {
    const z = -Z_RANGE + i * step
    const w = Math.exp(-0.5 * z * z)
    // Simpson's rule weights over an odd number of nodes.
    const simpson = i === 0 || i === Z_NODES - 1 ? 1 : i % 2 === 1 ? 4 : 2
    const weight = w * simpson
    weightSum += weight

    const conditional = thresholds.map(t => 1 - normalCdf((t - sqrtR * z) / sqrtOneMinusR))
    const dist = poissonBinomial(conditional)
    for (let k = 0; k < dist.length; k++) out[k] += dist[k] * weight
  }

  return out.map(x => x / weightSum)
}

export interface EntryLeg {
  player: string
  marketKey: string
  side: 'Over' | 'Under'
  offeredPoint: number
  probability: number
  eventId: string
  confidence: ProbabilityConfidence
}

export interface EntryEvaluation {
  structure: PayoutStructure
  /** Return per unit staked, minus the stake. Zero is break even. */
  ev: number
  /** Chance of getting every pick right. */
  probAllHit: number
  /** Full distribution of correct picks, index = number correct. */
  distribution: number[]
  /** Correlation actually applied, after checking whether legs share a game. */
  rhoUsed: number
  sameGameLegs: number
  /** True if any leg's probability came from a model rather than a real price. */
  hasModeledLegs: boolean
}

/**
 * Expected value of one entry.
 *
 * Correlation is applied only when legs actually share a game, because that is
 * the only place the shared-factor story holds. Two receivers in different
 * stadiums have nothing in common worth modelling.
 */
export function evaluateEntry(
  legs: EntryLeg[],
  structure: PayoutStructure,
  sameGameRho = 0.15
): EntryEvaluation | null {
  if (legs.length !== structure.legs) return null
  if (structure.payouts.length !== structure.legs + 1) return null

  const byEvent = new Map<string, number>()
  for (const l of legs) byEvent.set(l.eventId, (byEvent.get(l.eventId) || 0) + 1)
  const sameGameLegs = [...byEvent.values()].filter(n => n > 1).reduce((a, b) => a + b, 0)
  const rho = sameGameLegs > 0 ? sameGameRho : 0

  const probs = legs.map(l => l.probability)
  const distribution = correlatedDistribution(probs, rho)
  const ev = distribution.reduce((sum, p, k) => sum + p * structure.payouts[k], 0) - 1

  return {
    structure,
    ev,
    probAllHit: distribution[distribution.length - 1],
    distribution,
    rhoUsed: rho,
    sameGameLegs,
    hasModeledLegs: legs.some(l => l.confidence === 'modeled'),
  }
}

// ── Ranking single picks ─────────────────────────────────────────────────────

export interface RankedPick {
  player: string
  marketKey: string
  eventId: string
  book: string
  side: 'Over' | 'Under'
  offeredPoint: number
  marketLine: number
  /** How far the app's line sits from the market's, in stat units, signed
   *  toward the good side of the pick. */
  edgeUnits: number
  probability: number
  confidence: ProbabilityConfidence
  anchorBooks: string[]
  observedAt: string
}

/**
 * Score one DFS line and return the better side of it.
 *
 * There is always a better side: a pick'em app makes you choose over or under on
 * a single number, so the question is never "is there a bet here" but "which way
 * is this number wrong". A line sitting exactly where the market has it produces
 * a coin flip and a zero edge, which is the correct answer rather than a missing
 * row.
 */
export function rankPick(args: {
  player: string
  marketKey: string
  eventId: string
  book: string
  offeredPoint: number
  observedAt: string
  anchorMarkets: Market[]
  method?: DevigMethod
}): RankedPick | null {
  const assessment = assessLine(
    args.offeredPoint, args.anchorMarkets, args.marketKey, args.method ?? 'worstCase'
  )
  if (!assessment) return null

  const overIsBetter = assessment.probOver >= 0.5
  const side: 'Over' | 'Under' = overIsBetter ? 'Over' : 'Under'
  const probability = overIsBetter ? assessment.probOver : 1 - assessment.probOver

  return {
    player: args.player,
    marketKey: args.marketKey,
    eventId: args.eventId,
    book: args.book,
    side,
    offeredPoint: args.offeredPoint,
    marketLine: assessment.marketLine,
    // Signed so that a bigger number is always a better pick, whichever side won.
    edgeUnits: Math.abs(assessment.gap),
    probability,
    confidence: assessment.confidence,
    anchorBooks: assessment.anchorBooks,
    observedAt: args.observedAt,
  }
}

/** Convert a probability into the fair American price, for readability. */
export function impliedFromProbability(p: number): number {
  return p >= 0.5 ? -Math.round((100 * p) / (1 - p)) : Math.round((100 * (1 - p)) / p)
}

export { impliedProbability }
