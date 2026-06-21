import { describe, it, expect } from 'vitest'
import { computeRosterValue, computeValueBaseline } from '@/myteam/value'
import type { CatSpec, ValuePoolPlayer } from '@/myteam/types'

const cats: CatSpec[] = [
  { statId: 'SB', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'RBI', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'R', lowerIsBetter: false, side: 'hit', isRatio: false },
]

// Universe with realistic spread in EVERY category (so a 1-unit edge is small z, an
// outright category lead is large z). Means ≈ SB 30, HR 20, RBI 60, R 60.
const universe: ValuePoolPlayer[] = Array.from({ length: 21 }, (_, i) => ({
  playerKey: `u${i}`,
  position: 'OF',
  stats: { SB: i * 3, HR: i * 2, RBI: 20 + i * 4, R: 20 + i * 4 },
}))

// Star: league-leading in SB, dead average everywhere else.
const star: ValuePoolPlayer = { playerKey: 'star', position: 'OF', stats: { SB: 60, HR: 20, RBI: 60, R: 60 } }
// Compiler: nowhere elite, a hair above average across all four (breadth).
const compiler: ValuePoolPlayer = { playerKey: 'comp', position: 'OF', stats: { SB: 33, HR: 22, RBI: 64, R: 64 } }

describe('computeRosterValue universe baseline', () => {
  it('a one-category star outranks a broad compiler when z is anchored to the universe', () => {
    const baseline = computeValueBaseline(universe, cats)
    const out = computeRosterValue([star, compiler], ['star', 'comp'], cats, { baseline, zClamp: 6 })
    const byKey = new Map(out.map((c) => [c.playerKey, c]))
    // The elite SB skill dominates; broad-but-mediocre no longer wins on category count.
    expect(byKey.get('star')!.valueScore).toBeGreaterThan(byKey.get('comp')!.valueScore)
  })

  it('omitting the baseline keeps the old pool-relative behavior intact', () => {
    const out = computeRosterValue([star, compiler], ['star', 'comp'], cats)
    expect(out).toHaveLength(2)
    expect(out.every((c) => Number.isFinite(c.valueScore))).toBe(true)
  })
})
