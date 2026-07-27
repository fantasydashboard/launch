import { describe, it, expect } from 'vitest'
import { categorySeasonValue, type CatValuePlayer, type CatValueCat } from '../categorySeasonValue'

const cats: CatValueCat[] = [
  { statId: 'HR', lowerIsBetter: false },
  { statId: 'ERA', lowerIsBetter: true },
]

describe('categorySeasonValue', () => {
  it('higher-is-better: more HR ranks higher', () => {
    const players: CatValuePlayer[] = [
      { playerId: 'a', position: 'OF', stats: { HR: 40 } },
      { playerId: 'b', position: 'OF', stats: { HR: 10 } },
    ]
    const v = categorySeasonValue(players, [{ statId: 'HR', lowerIsBetter: false }])
    expect(v.get('a')!).toBeGreaterThan(v.get('b')!)
  })

  it('lowerIsBetter inverts: a low-ERA pitcher outranks a high-ERA one', () => {
    const players: CatValuePlayer[] = [
      { playerId: 'ace', position: 'SP', stats: { ERA: 2.5 } },
      { playerId: 'bad', position: 'SP', stats: { ERA: 5.5 } },
    ]
    const v = categorySeasonValue(players, [{ statId: 'ERA', lowerIsBetter: true }])
    expect(v.get('ace')!).toBeGreaterThan(v.get('bad')!)
  })

  it('a zero-variance category contributes 0 to everyone', () => {
    const players: CatValuePlayer[] = [
      { playerId: 'a', position: 'OF', stats: { HR: 20 } },
      { playerId: 'b', position: 'OF', stats: { HR: 20 } },
    ]
    const v = categorySeasonValue(players, [{ statId: 'HR', lowerIsBetter: false }])
    expect(v.get('a')).toBe(0)
    expect(v.get('b')).toBe(0)
  })

  it('a missing stat is treated as 0, never NaN', () => {
    const players: CatValuePlayer[] = [
      { playerId: 'a', position: 'OF', stats: { HR: 30 } },
      { playerId: 'b', position: 'OF', stats: {} },
    ]
    const v = categorySeasonValue(players, [{ statId: 'HR', lowerIsBetter: false }])
    expect(Number.isFinite(v.get('a')!)).toBe(true)
    expect(Number.isFinite(v.get('b')!)).toBe(true)
    expect(v.get('a')!).toBeGreaterThan(v.get('b')!)
    expect(v.get('b')!).toBeLessThan(0)
  })

  it('single-player pool → std 0 → value 0 (no NaN)', () => {
    const v = categorySeasonValue(
      [{ playerId: 'solo', position: 'OF', stats: { HR: 25 } }],
      [{ statId: 'HR', lowerIsBetter: false }],
    )
    expect(v.get('solo')).toBe(0)
  })

  it('sums across categories (stud > mid > scrub)', () => {
    const players: CatValuePlayer[] = [
      { playerId: 'stud', position: 'UTIL', stats: { HR: 40, ERA: 2.0 } },
      { playerId: 'mid', position: 'UTIL', stats: { HR: 20, ERA: 4.0 } },
      { playerId: 'scrub', position: 'UTIL', stats: { HR: 5, ERA: 6.0 } },
    ]
    const v = categorySeasonValue(players, cats)
    expect(v.get('stud')!).toBeGreaterThan(v.get('mid')!)
    expect(v.get('mid')!).toBeGreaterThan(v.get('scrub')!)
  })

  it('empty players or empty cats → all zeros, no throw', () => {
    expect(categorySeasonValue([], cats).size).toBe(0)
    const v = categorySeasonValue([{ playerId: 'a', position: 'OF', stats: { HR: 10 } }], [])
    expect(v.get('a')).toBe(0)
  })
})
