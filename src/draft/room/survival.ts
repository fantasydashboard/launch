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
  /** Projected value, used for expectedBestAtPosition. */
  value: number
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

/** Draw a position from a prior. Returns null if the prior is unusable. */
function drawPosition(prior: PositionPrior, rand: number): string | null {
  const entries = Object.entries(prior?.byPosition ?? {})
  let total = 0
  for (const [, p] of entries) total += p > 0 ? p : 0
  if (total <= 0) return null
  let r = rand * total
  for (const [pos, p] of entries) {
    if (p <= 0) continue
    r -= p
    if (r <= 0) return pos
  }
  return entries.length ? entries[entries.length - 1][0] : null
}

const normPos = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()

export function simulateSurvival(input: SurvivalInput): SurvivalResult {
  const { available, upcomingSlots, priorForSlot } = input
  const runs = Math.max(1, input.runs ?? 1000)
  const rng = mulberry32(input.seed ?? 1)

  const players = (available ?? []).map((p) => ({ ...p, position: normPos(p.position) }))
  if (!players.length) return { survival: {}, expectedBestAtPosition: {} }

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

  const survivedCount: Record<string, number> = {}
  for (const p of players) survivedCount[p.playerKey] = 0
  const bestSum: Record<string, number> = {}
  const positions = [...byPosition.keys()]

  const slots = upcomingSlots ?? []

  for (let run = 0; run < runs; run++) {
    const taken = new Set<string>()

    for (const slot of slots) {
      const pos = drawPosition(priorForSlot(slot), rng())
      if (!pos) continue
      const pool = byPosition.get(pos)
      if (!pool) continue
      // Best available at that position by ADP, skipping anyone with no ADP.
      const pick = pool.find((p) => p.adp !== null && p.adp !== undefined && !taken.has(p.playerKey))
      if (pick) taken.add(pick.playerKey)
    }

    for (const p of players) if (!taken.has(p.playerKey)) survivedCount[p.playerKey]++

    // Best remaining by VALUE at each position — this is what VONA compares against.
    for (const pos of positions) {
      const pool = byPosition.get(pos)!
      let best = Number.NEGATIVE_INFINITY
      for (const p of pool) if (!taken.has(p.playerKey) && p.value > best) best = p.value
      if (best > Number.NEGATIVE_INFINITY) bestSum[pos] = (bestSum[pos] ?? 0) + best
    }
  }

  const survival: Record<string, number> = {}
  for (const p of players) survival[p.playerKey] = survivedCount[p.playerKey] / runs

  const expectedBestAtPosition: Record<string, number> = {}
  for (const [pos, sum] of Object.entries(bestSum)) expectedBestAtPosition[pos] = sum / runs

  return { survival, expectedBestAtPosition }
}
