// services/betting/devig.ts
//
// Removing the sportsbook margin to recover what the market actually believes.
//
// Every method here takes a complete set of raw implied probabilities that sums
// to more than 1, and returns a set that sums to exactly 1. They disagree about
// HOW to take the margin out, and the disagreement is not academic: on a lopsided
// player prop the methods can differ by a couple of points of probability, which
// is larger than the edge you are trying to detect. That is why the engine
// defaults to reporting the least flattering answer rather than the prettiest one.

import { probabilityToAmerican, impliedProbability } from './odds'
import type { DevigMethod, FairPrice } from './types'

const EPS = 1e-9

function normalizeInput(raw: number[]): number[] {
  const total = raw.reduce((s, q) => s + q, 0)
  if (!(total > 1 - EPS)) {
    // A set summing to less than 1 is arbitrage or bad data, not a book's market.
    // Return it normalized rather than throwing, and let the caller decide.
    return raw.map(q => q / total)
  }
  return raw
}

/** Proportional split. Higher-probability outcomes absorb more of the margin. */
export function devigMultiplicative(raw: number[]): number[] {
  const q = normalizeInput(raw)
  const total = q.reduce((s, x) => s + x, 0)
  return q.map(x => x / total)
}

/**
 * Even split. Counteracts the tendency for long shots to be overpriced, but on a
 * heavily lopsided market it can drive an outcome negative, so we clamp and
 * renormalize rather than returning nonsense.
 */
export function devigAdditive(raw: number[]): number[] {
  const q = normalizeInput(raw)
  const excess = q.reduce((s, x) => s + x, 0) - 1
  const share = excess / q.length
  const adjusted = q.map(x => Math.max(EPS, x - share))
  const total = adjusted.reduce((s, x) => s + x, 0)
  return adjusted.map(x => x / total)
}

/**
 * Power method: find k > 1 such that the probabilities raised to k sum to 1.
 * Its advantage over additive is that results can never leave the 0..1 range,
 * so it degrades gracefully on the lopsided markets where additive breaks.
 */
export function devigPower(raw: number[]): number[] {
  const q = normalizeInput(raw)
  const f = (k: number) => q.reduce((s, x) => s + Math.pow(x, k), 0) - 1

  let lo = 1
  let hi = 1
  // Push the upper bound out until the sum drops below 1.
  for (let i = 0; i < 60 && f(hi) > 0; i++) hi *= 1.5
  if (f(hi) > 0) return devigMultiplicative(q)

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (f(mid) > 0) lo = mid
    else hi = mid
    if (hi - lo < 1e-12) break
  }
  const k = (lo + hi) / 2
  const out = q.map(x => Math.pow(x, k))
  const total = out.reduce((s, x) => s + x, 0)
  return out.map(x => x / total)
}

/**
 * Shin method: solves for an implied proportion of insider money z, then backs
 * out the probabilities the book would hold absent that adversarial flow. It
 * targets the same favorite/longshot bias as additive but stays well behaved,
 * and it is generally the most accurate of the four on real data. On a two-way
 * market it converges to roughly the additive answer, which is a useful sanity
 * check when reading the numbers side by side.
 */
export function devigShin(raw: number[]): number[] {
  const q = normalizeInput(raw)
  const total = q.reduce((s, x) => s + x, 0)

  const probsAt = (z: number) =>
    q.map(x => (Math.sqrt(z * z + 4 * (1 - z) * ((x * x) / total)) - z) / (2 * (1 - z)))

  const f = (z: number) => probsAt(z).reduce((s, x) => s + x, 0) - 1

  let lo = 0
  let hi = 0.9999
  if (f(lo) <= 0) return devigMultiplicative(q)

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (f(mid) > 0) lo = mid
    else hi = mid
    if (hi - lo < 1e-12) break
  }
  const out = probsAt((lo + hi) / 2)
  const s = out.reduce((a, b) => a + b, 0)
  return out.map(x => x / s)
}

export const DEVIG_FNS: Record<Exclude<DevigMethod, 'worstCase'>, (raw: number[]) => number[]> = {
  multiplicative: devigMultiplicative,
  additive: devigAdditive,
  power: devigPower,
  shin: devigShin,
}

/**
 * The conservative reading: for each outcome, the LOWEST fair probability any
 * method produced.
 *
 * Unlike every other function in this file, the result deliberately sums to LESS
 * than 1 and must not be renormalized. Renormalizing was the first version of
 * this and it was wrong: scaling the minimums back up to sum to 1 pushes them
 * above the floor they were chosen to represent, so the "conservative" number
 * came out less conservative than the individual methods it was built from.
 *
 * The deeper reason no normalized vector can do this job: being pessimistic
 * about one side of a two-way market is the same as being optimistic about the
 * other, so a single coherent set of probabilities cannot be conservative on
 * both. That is fine here, because an edge row is always about ONE outcome. Read
 * these numbers per outcome, never as a market.
 *
 * The point of understating every edge is retention. A user whose results beat
 * the tool's own projection stays. A user told 6% who realizes 2% concludes the
 * tool is broken, and from their side of it they are not wrong to.
 */
export function devigWorstCase(raw: number[]): number[] {
  const results = Object.values(DEVIG_FNS).map(fn => fn(raw))
  return raw.map((_, i) => Math.min(...results.map(r => r[i])))
}

export function devig(raw: number[], method: DevigMethod): number[] {
  if (method === 'worstCase') return devigWorstCase(raw)
  return DEVIG_FNS[method](raw)
}

/**
 * Full fair-price object from a set of American prices covering one market.
 * Returns null for an incomplete market: one side of a two-way price tells you
 * nothing about fair value, and guessing the other side would be inventing data.
 */
export function fairPriceFromAmericans(
  americans: number[],
  method: DevigMethod = 'worstCase'
): FairPrice | null {
  if (americans.length < 2 || americans.some(a => !Number.isFinite(a) || a === 0)) return null

  const raw = americans.map(impliedProbability)
  if (raw.some(q => !Number.isFinite(q))) return null

  const total = raw.reduce((s, q) => s + q, 0)
  const probabilities = devig(raw, method)

  return {
    probabilities,
    american: probabilities.map(probabilityToAmerican),
    overround: total - 1,
    hold: 1 - 1 / total,
    method,
  }
}
