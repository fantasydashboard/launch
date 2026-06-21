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

// The product reason useValueBaseline filters to the STARTABLE pool: a scrub-laden reference
// population (the full projection universe) pushes every real player positive in every cat,
// compressing a star and a merely-average regular together so breadth wins. Restricting the
// reference to regulars makes the average regular ~zero and lets the star's elite skill separate.
describe('startable vs scrub-laden reference population', () => {
  // 30 everyday regulars with realistic, independent spread in each category.
  const regulars: ValuePoolPlayer[] = Array.from({ length: 30 }, (_, i) => ({
    playerKey: `reg${i}`,
    position: 'OF',
    stats: {
      SB: 2 + ((i * 37) % 40),
      HR: 5 + ((i * 23) % 35),
      RBI: 30 + ((i * 41) % 70),
      R: 30 + ((i * 53) % 70),
    },
  }))
  // 60 minor-leaguers / part-timers: tiny counting lines that drag the universe mean down.
  const scrubs: ValuePoolPlayer[] = Array.from({ length: 60 }, (_, j) => ({
    playerKey: `scr${j}`,
    position: 'OF',
    stats: { SB: j % 4, HR: j % 5, RBI: 5 + (j % 10), R: 5 + (j % 10) },
  }))
  // Carroll-like: elite SB, roughly regular-average elsewhere.
  const eliteSkill: ValuePoolPlayer = { playerKey: 'elite', position: 'OF', stats: { SB: 45, HR: 15, RBI: 60, R: 70 } }
  // Duran-like: right around the regular mean in everything, elite in nothing.
  const broadMediocre: ValuePoolPlayer = { playerKey: 'broad', position: 'OF', stats: { SB: 12, HR: 16, RBI: 62, R: 68 } }

  const scoreUnder = (universe: ValuePoolPlayer[]) => {
    const baseline = computeValueBaseline(universe, cats)
    const out = computeRosterValue([eliteSkill, broadMediocre], ['elite', 'broad'], cats, { baseline, zClamp: 4 })
    const byKey = new Map(out.map((c) => [c.playerKey, c.valueScore]))
    return { elite: byKey.get('elite')!, broad: byKey.get('broad')! }
  }

  it('startable-only baseline separates the elite skill; scrub-laden baseline compresses it', () => {
    const scrubLaden = scoreUnder([...regulars, ...scrubs])
    const startableOnly = scoreUnder(regulars)

    const gapScrub = scrubLaden.elite - scrubLaden.broad
    const gapStartable = startableOnly.elite - startableOnly.broad

    // Under the startable-only reference the star clearly outranks the broad-mediocre player...
    expect(startableOnly.elite).toBeGreaterThan(startableOnly.broad)
    // ...and the separation is larger than under the scrub-laden universe, which compresses them.
    expect(gapStartable).toBeGreaterThan(gapScrub)
  })
})
