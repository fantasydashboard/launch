import { describe, it, expect } from 'vitest'
import { perGameLine } from '../nightlyLine'
import { buildCategoryState, scoreLine } from '../categoryBoard'

describe('perGameLine', () => {
  it('divides a season by the games it was earned over', () => {
    const line = perGameLine({ G: 40, A: 60, GP: 80 })
    expect(line?.G).toBeCloseTo(0.5)
    expect(line?.A).toBeCloseTo(0.75)
  })

  it('drops the denominator so it cannot be scored as a column', () => {
    expect(perGameLine({ G: 40, GP: 80 })).not.toHaveProperty('GP')
  })

  it.each([[undefined], [{ G: 40 }], [{ G: 40, GP: 0 }], [{ G: 40, GP: NaN }]])(
    'returns null rather than a line of zeroes for %j', (stats) => {
      expect(perGameLine(stats as Record<string, number> | undefined)).toBeNull()
    })

  /*
   * The failure this module exists to prevent, stated as a test: a season line scored against
   * a week's state produces a number ~GP times too big. The ORDER would be unchanged, which is
   * why nothing on screen would look broken — so the assertion is on the magnitude.
   */
  it('is the difference between a night and a season when scored', () => {
    const state = buildCategoryState({
      cats: [{ key: 'G', label: 'G', mine: 10, theirs: 10, sigma: 1.5, lowerIsBetter: false, isRatio: false }],
      days: 3,
      format: 'each',
    })
    const season = { G: 40, GP: 80 }
    const nightly = perGameLine(season)!
    const perNight = scoreLine(nightly, state).score
    const perSeason = scoreLine(season, state).score
    expect(perNight).toBeGreaterThan(0)
    expect(perSeason / perNight).toBeCloseTo(80, 0)
  })
})
