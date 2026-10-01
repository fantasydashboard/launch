import { describe, it, expect } from 'vitest'
import { buildCategoryWeek, type WeekCat } from '../categoryWeek'

const cat = (over: Partial<WeekCat>): WeekCat => ({
  key: 'G', label: 'Goals', lowerIsBetter: false, isRatio: false, ...over,
})

const base = {
  cats: [cat({ key: 'G' }), cat({ key: 'A' }), cat({ key: 'SOG' })],
  myStats: { G: 10, A: 14, SOG: 60 },
  oppStats: { G: 10, A: 4, SOG: 120 },
  myRemaining: { G: 4, A: 5, SOG: 24 },
  oppRemaining: { G: 4, A: 5, SOG: 24 },
  days: 3,
  format: 'each' as const,
  bodies: 8,
}

describe('buildCategoryWeek', () => {
  it('reads the week column by column', () => {
    const w = buildCategoryWeek(base)
    expect(w.cats.map((c) => c.key)).toEqual(['G', 'A', 'SOG'])
    const byKey = Object.fromEntries(w.cats.map((c) => [c.key, c]))
    expect(byKey.G.status).toBe('live')     // level
    expect(byKey.A.status).toBe('safe')     // ten clear with four to come
    expect(byKey.SOG.status).toBe('gone')   // sixty behind with twenty-four to come
  })

  /* The spread comes from BOTH sides' remaining production, because the margin is a difference
     of two uncertain totals — using one side alone understates it by root two. */
  it('widens a column when both sides have more still to play', () => {
    const busy = buildCategoryWeek({ ...base, myRemaining: { ...base.myRemaining, G: 20 }, oppRemaining: { ...base.oppRemaining, G: 20 } })
    const quiet = buildCategoryWeek({ ...base, myRemaining: { ...base.myRemaining, G: 1 }, oppRemaining: { ...base.oppRemaining, G: 1 } })
    const busyG = busy.cats.find((c) => c.key === 'G')!
    const quietG = quiet.cats.find((c) => c.key === 'G')!
    expect(busyG.sigma).toBeGreaterThan(quietG.sigma)
  })

  it('counts the week for a manager in one line', () => {
    const w = buildCategoryWeek(base)
    expect(w.live).toBe(1)
    expect(w.safe).toBe(1)
    expect(w.gone).toBe(1)
  })

  it('ranks the columns worth spending tonight on, best first', () => {
    const w = buildCategoryWeek(base)
    expect(w.worthChasing[0]).toBe('G')
    expect(w.worthChasing).not.toContain('A')
    expect(w.worthChasing).not.toContain('SOG')
  })

  /*
   * A ratio column is reported with a verdict but never priced as a counting stat — its spread
   * comes from the volume underneath it, and a marginal start can move it the wrong way.
   */
  it('prices a ratio column at nothing and says why', () => {
    const w = buildCategoryWeek({
      ...base,
      cats: [...base.cats, cat({ key: 'SVPCT', isRatio: true, ratioKind: 'proportion', volumeKey: 'SA' })],
      myStats: { ...base.myStats, SVPCT: 0.915, SA: 300 },
      oppStats: { ...base.oppStats, SVPCT: 0.905, SA: 310 },
      myRemaining: { ...base.myRemaining, SA: 90 },
      oppRemaining: { ...base.oppRemaining, SA: 90 },
    })
    const sv = w.cats.find((c) => c.key === 'SVPCT')!
    expect(sv.isRatio).toBe(true)
    expect(sv.unitValue).toBe(0)
    expect(sv.winPct).toBeGreaterThan(0.5)
    expect(w.worthChasing).not.toContain('SVPCT')
  })

  it('tightens a ratio as the volume behind it piles up', () => {
    const mk = (lockedVolume: number) => buildCategoryWeek({
      ...base,
      cats: [cat({ key: 'SVPCT', isRatio: true, ratioKind: 'proportion', volumeKey: 'SA' })],
      myStats: { SVPCT: 0.915, SA: lockedVolume },
      oppStats: { SVPCT: 0.905, SA: lockedVolume },
      myRemaining: { SA: 60 }, oppRemaining: { SA: 60 },
    }).cats[0].sigma
    expect(mk(600)).toBeLessThan(mk(60))
  })

  it('handles a decided week and an empty category list', () => {
    const over = buildCategoryWeek({ ...base, days: 0 })
    expect(over.cats.every((c) => c.unitValue === 0)).toBe(true)
    expect(buildCategoryWeek({ ...base, cats: [] }).cats).toEqual([])
  })
})

describe('what is worth chasing is what you can actually move', () => {
  const base = {
    myStats: {} as Record<string, number>,
    oppStats: {} as Record<string, number>,
    oppRemaining: {} as Record<string, number>,
    days: 4,
    format: 'each' as const,
    bodies: 10,
  }

  /*
   * THE REGRESSION, from a real league. Ranked by unitValue alone, shutouts led "spend tonight
   * on" — one shutout swings the column, so its per-unit worth is enormous. But a goalie
   * produces about a third of one across a whole week, while the same roster puts ninety shots
   * on net. The board underneath, which prices what players actually produce, was recommending
   * shooters at the same time. The chase list was the half that was wrong.
   */
  it('ranks a column you can move above one you cannot, however decisive a unit is', () => {
    const week = buildCategoryWeek({
      ...base,
      cats: [
        { key: 'SHO', label: 'SHO', lowerIsBetter: false, isRatio: false },
        { key: 'SOG', label: 'SOG', lowerIsBetter: false, isRatio: false },
      ],
      myStats: { SHO: 0, SOG: 29 },
      oppStats: { SHO: 0, SOG: 30 },
      myRemaining: { SHO: 0.3, SOG: 90 },
      oppRemaining: { SHO: 0.3, SOG: 90 },
    })
    expect(week.worthChasing[0]).toBe('SOG')
  })

  /* A column with nothing left to produce cannot be chased at all, whatever it is worth. */
  it('drops a column with no production left to come', () => {
    const week = buildCategoryWeek({
      ...base,
      cats: [
        { key: 'SHO', label: 'SHO', lowerIsBetter: false, isRatio: false },
        { key: 'SOG', label: 'SOG', lowerIsBetter: false, isRatio: false },
      ],
      myStats: { SHO: 0, SOG: 29 },
      oppStats: { SHO: 0, SOG: 30 },
      myRemaining: { SHO: 0, SOG: 90 },
      oppRemaining: { SHO: 0, SOG: 90 },
    })
    expect(week.worthChasing).toEqual(['SOG'])
  })
})
