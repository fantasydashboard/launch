import { describe, it, expect } from 'vitest'
import { sideCleanStats } from '../value'
import type { CatSpec } from '../value'

const CATS: CatSpec[] = [
  { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'K', lowerIsBetter: false, side: 'pit', isRatio: false },
  { statId: 'ERA', lowerIsBetter: true, side: 'pit', isRatio: true, volumeStatId: 'IP' },
  { statId: 'AVG', lowerIsBetter: false, side: 'hit', isRatio: true, volumeStatId: 'AB' },
]

describe('sideCleanStats', () => {
  it('drops a pitcher\'s stray hitting stats, keeps pitching stats + their volume', () => {
    const out = sideCleanStats('SP', { HR: 3, K: 180, ERA: 3.2, IP: 190, AVG: 0.2, AB: 5 }, CATS)
    expect(out.HR).toBeUndefined()
    expect(out.AVG).toBeUndefined()
    expect(out.AB).toBeUndefined()
    expect(out.K).toBe(180)
    expect(out.ERA).toBe(3.2)
    expect(out.IP).toBe(190)
  })
  it('drops a hitter\'s stray pitching stats (e.g. ESPN junk BF/K), keeps hitting + volume', () => {
    const out = sideCleanStats('2B', { HR: 30, K: 7, ERA: 9.9, IP: 1, AVG: 0.31, AB: 600 }, CATS)
    expect(out.HR).toBe(30)
    expect(out.AVG).toBe(0.31)
    expect(out.AB).toBe(600)
    expect(out.K).toBeUndefined()
    expect(out.ERA).toBeUndefined()
    expect(out.IP).toBeUndefined()
  })
  it('keeps both sides for a two-way player (eligible as both)', () => {
    const out = sideCleanStats('SP,DH', { HR: 20, K: 150, IP: 100, ERA: 3.0 }, CATS)
    expect(out.HR).toBe(20)
    expect(out.K).toBe(150)
  })
})
