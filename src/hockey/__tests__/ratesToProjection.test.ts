import { describe, it, expect } from 'vitest'
import { ratesToProjection, UNSUPPLIED_KEYS } from '../ratesToProjection'
import type { SkaterRate } from '../nhlRates'

const rate = (over: Partial<SkaterRate> = {}): SkaterRate => ({
  playerId: 8478402,
  name: 'A Player',
  position: 'C',
  team: 'EDM',
  gamesPlayed: 40,
  perGame: { goals: 0.5, assists: 0.8, points: 1.3, plusMinus: 0.1, penaltyMinutes: 0.4, ppPoints: 0.3, shots: 3.2 },
  ppSecondsPerGame: 180,
  confidence: 0.8,
  ...over,
})

describe('ratesToProjection', () => {
  it('multiplies a rate by the games left to get a season total', () => {
    const { projections } = ratesToProjection([rate()], 20)
    const p = projections['8478402']
    expect(p.stats.G).toBeCloseTo(10, 5)   // 0.5 * 20
    expect(p.stats.A).toBeCloseTo(16, 5)   // 0.8 * 20
    expect(p.stats.SOG).toBeCloseTo(64, 5) // 3.2 * 20
    expect(p.stats.GP).toBe(20)
  })

  it('carries position through, since the value model splits goalies from skaters on it', () => {
    const { projections } = ratesToProjection([rate({ position: 'D' })], 10)
    expect(projections['8478402'].position).toBe('D')
  })

  /*
   * Ice time stays a RATE while everything else becomes a total. Power-play minutes are read
   * as "is he on the first unit", which is a per-game question — multiplying it by games left
   * would produce a number nobody compares players on.
   */
  it('keeps power-play time per game rather than totalling it', () => {
    const { projections } = ratesToProjection([rate({ ppSecondsPerGame: 180 })], 20)
    expect(projections['8478402'].stats.PPTOIG).toBe(180)
  })

  it('omits power-play time entirely when there is none', () => {
    const { projections } = ratesToProjection([rate({ ppSecondsPerGame: 0 })], 20)
    expect(projections['8478402'].stats.PPTOIG).toBeUndefined()
  })

  /*
   * The honest part. A category we cannot supply must be REPORTED, not left absent — the value
   * model z-scores what it is given, so an absent category reads as "contributes nothing",
   * which is below average rather than unknown. In a league that counts hits that would bury
   * every hit-heavy forward behind a ranking that looks considered.
   */
  it('names the league categories it cannot fill', () => {
    const { missing } = ratesToProjection([rate()], 20, ['G', 'A', 'HITS', 'BLK', 'SOG'])
    expect(missing).toEqual(['HITS', 'BLK'])
  })

  it('reports nothing missing when the league scores only what we have', () => {
    const { missing } = ratesToProjection([rate()], 20, ['G', 'A', 'PTS', 'SOG', 'PIM'])
    expect(missing).toEqual([])
  })

  it('lists the unsuppliable keys for a surface to explain itself', () => {
    expect(UNSUPPLIED_KEYS).toContain('HITS')
    expect(UNSUPPLIED_KEYS).toContain('BLK')
  })

  /* A season that is over. Everything is zero because nothing is left to play, which is the
     true answer, and GP says so rather than the stats quietly reading as a bad player. */
  it('gives a finished season zeroes rather than negatives or NaN', () => {
    const { projections } = ratesToProjection([rate()], 0)
    const p = projections['8478402']
    expect(p.stats.G).toBe(0)
    expect(p.stats.GP).toBe(0)
    expect(Number.isNaN(p.stats.SOG)).toBe(false)
  })

  it('refuses to invent games from a negative horizon', () => {
    const { projections } = ratesToProjection([rate()], -10)
    expect(projections['8478402'].stats.GP).toBe(0)
    expect(projections['8478402'].stats.G).toBe(0)
  })

  it('survives an empty league', () => {
    expect(ratesToProjection([], 20).projections).toEqual({})
  })
})
