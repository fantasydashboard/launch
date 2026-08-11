/**
 * Will he still be there at my next pick?
 *
 * Rather than compare a player's ADP to your next pick number — which treats a
 * mean as a certainty and ignores who is actually picking — this plays out the
 * intervening picks. For each upcoming pick, draw a position from THAT manager's
 * prior, then take the best available player at that position by ADP. Repeat a
 * thousand times and count.
 *
 * The same pass yields the expected best available at each position at your next
 * turn, which is what VONA is measured against. One simulation, both answers.
 *
 * Deterministic by seed: a recommendation that flickers between renders is worse
 * than no recommendation.
 */

import type { PositionPrior } from './tendencies'

export interface SurvivalPlayer {
  playerKey: string
  position: string
  /** Null when the market has no ADP for him — he is never auto-drafted below. */
  adp: number | null
  /** Ranking value — decides WHO the best available is. */
  value: number
  /**
   * Our own projected points for that same player. Carried alongside so the
   * expectation can be reported in points as well: when a ranking list re-seats
   * `value`, a gap measured in `value` is not a number the user can check
   * against the points column.
   */
  projected?: number
}

export interface SurvivalInput {
  available: SurvivalPlayer[]
  /** Draft slots picking between now and my next turn, in order. */
  upcomingSlots: number[]
  priorForSlot: (slot: number) => PositionPrior
  runs?: number
  seed?: number
}

export interface SurvivalResult {
  /** playerKey -> probability still available at my next pick. */
  survival: Record<string, number>
  /** position -> expected value of the best available there at my next pick. */
  expectedBestAtPosition: Record<string, number>
  /** The same expectation in projected points — what that player actually scores. */
  expectedBestProjectedAtPosition: Record<string, number>
}

/** Small deterministic PRNG — no dependency, and reproducible across runs. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Draw a position from a prior, restricted to positions that actually exist in
 * the pool and renormalised over them.
 *
 * Without the restriction, a no-history prior spreads evenly over six positions
 * including kicker and defense — and in a league that starts neither, those draws
 * found no pool and removed NOBODY. A third of every simulated pick did nothing,
 * which is a third of the reason the model kept saying players would last.
 */
function drawPosition(prior: PositionPrior, rand: number, allowed: Set<string>): string | null {
  const entries = Object.entries(prior?.byPosition ?? {}).filter(
    ([pos, p]) => p > 0 && allowed.has(pos),
  )
  let total = 0
  for (const [, p] of entries) total += p
  if (total <= 0) return null
  let r = rand * total
  for (const [pos, p] of entries) {
    r -= p
    if (r <= 0) return pos
  }
  return entries[entries.length - 1][0]
}

/**
 * How far down a list a manager might reach. Always taking the very top of the
 * board is too tidy: it concentrates every simulation on the same handful of
 * players and leaves everyone behind them looking safe.
 *
 * Both numbers come off calibration runs, not intuition, and they have moved
 * twice as the sample grew.
 *
 * Pooled over three drafts (n=1371) the error is a DISTRIBUTION problem, not a
 * volume one — the same number of players leaves the board either way. The model
 * took the obvious names too often (the 20-30% band survived 38% of the time
 * against 26% predicted) and reached deep too rarely (60-90% survived 66%
 * against 78%, a 12.6-point gap on n=163, about three and a half standard
 * errors). A six-deep window cannot express a reach past the seventh-best player
 * available, and real drafts are full of them.
 *
 * So the window widens and the head flattens: the top of the board is taken 25%
 * of the time per pick rather than 34%, and 18% of the mass now lands beyond the
 * sixth name, where it was previously zero.
 */
const REACH_WINDOW = 12
/** Probability of taking the next man rather than reaching past him. */
const REACH_DECAY = 0.25

/** The next player off a list, with a little reach. */
function chooseFrom<T extends { playerKey: string; adp: number | null }>(
  pool: T[],
  taken: Set<string>,
  rand: number,
): T | null {
  const free: T[] = []
  for (const p of pool) {
    if (taken.has(p.playerKey) || p.adp === null || p.adp === undefined) continue
    free.push(p)
    if (free.length >= REACH_WINDOW) break
  }
  if (!free.length) return null
  let acc = 0
  for (let i = 0; i < free.length; i++) {
    acc += REACH_DECAY * Math.pow(1 - REACH_DECAY, i)
    if (rand <= acc) return free[i]
  }
  return free[free.length - 1]
}

const normPos = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()

export function simulateSurvival(input: SurvivalInput): SurvivalResult {
  const { available, upcomingSlots, priorForSlot } = input
  const runs = Math.max(1, input.runs ?? 1000)
  const rng = mulberry32(input.seed ?? 1)

  const players = (available ?? []).map((p) => ({ ...p, position: normPos(p.position) }))
  if (!players.length) {
    return { survival: {}, expectedBestAtPosition: {}, expectedBestProjectedAtPosition: {} }
  }

  // Draft candidates per position, best-ADP-first. A null ADP means the market has
  // no opinion, so nobody reaches for him — he is never auto-drafted.
  const byPosition = new Map<string, typeof players>()
  for (const p of players) {
    const arr = byPosition.get(p.position) ?? []
    arr.push(p)
    byPosition.set(p.position, arr)
  }
  for (const arr of byPosition.values()) {
    arr.sort((a, b) => {
      const av = a.adp ?? Number.POSITIVE_INFINITY
      const bv = b.adp ?? Number.POSITIVE_INFINITY
      return av - bv
    })
  }

  // The whole board by ADP — how a manager we have no read on actually drafts.
  const byAdp = players
    .filter((p) => p.adp !== null && p.adp !== undefined)
    .sort((a, b) => (a.adp as number) - (b.adp as number))
  const allowedPositions = new Set(byPosition.keys())

  const survivedCount: Record<string, number> = {}
  for (const p of players) survivedCount[p.playerKey] = 0
  const bestSum: Record<string, number> = {}
  const bestProjSum: Record<string, number> = {}
  const positions = [...byPosition.keys()]

  const slots = upcomingSlots ?? []

  for (let run = 0; run < runs; run++) {
    const taken = new Set<string>()

    for (const slot of slots) {
      const prior = priorForSlot(slot)
      /**
       * With no read on this manager, model the MARKET rather than a position
       * lottery. A no-history prior is a flat spread across positions, which
       * scatters the intervening picks evenly instead of concentrating them on
       * the top of the board — where they actually land. Measured against a
       * completed draft, that scatter overstated survival by about half again.
       */
      const pool = (prior?.sample ?? 0) > 0
        ? byPosition.get(drawPosition(prior, rng(), allowedPositions) ?? '') ?? null
        : byAdp
      if (!pool) continue
      const pick = chooseFrom(pool, taken, rng())
      if (pick) taken.add(pick.playerKey)
    }

    for (const p of players) if (!taken.has(p.playerKey)) survivedCount[p.playerKey]++

    // Best remaining by VALUE at each position — this is what VONA compares against.
    for (const pos of positions) {
      const pool = byPosition.get(pos)!
      let best = Number.NEGATIVE_INFINITY
      let bestProj = 0
      for (const p of pool) {
        if (taken.has(p.playerKey) || p.value <= best) continue
        best = p.value
        // The SAME player's points — not the highest-projecting one left, which
        // would be a different man than the one you'd actually be choosing.
        bestProj = p.projected ?? p.value
      }
      if (best > Number.NEGATIVE_INFINITY) {
        bestSum[pos] = (bestSum[pos] ?? 0) + best
        bestProjSum[pos] = (bestProjSum[pos] ?? 0) + bestProj
      }
    }
  }

  const survival: Record<string, number> = {}
  for (const p of players) survival[p.playerKey] = survivedCount[p.playerKey] / runs

  const expectedBestAtPosition: Record<string, number> = {}
  for (const [pos, sum] of Object.entries(bestSum)) expectedBestAtPosition[pos] = sum / runs
  const expectedBestProjectedAtPosition: Record<string, number> = {}
  for (const [pos, sum] of Object.entries(bestProjSum)) expectedBestProjectedAtPosition[pos] = sum / runs

  return { survival, expectedBestAtPosition, expectedBestProjectedAtPosition }
}
