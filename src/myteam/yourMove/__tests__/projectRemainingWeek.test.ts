import { describe, it, expect } from 'vitest'
import { projectRemainingWeek } from '../projectRemainingWeek'
import type { CatSpec } from '@/myteam/value'

const cats: CatSpec[] = [
  { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'AVG', lowerIsBetter: false, side: 'hit', isRatio: true },
]

describe('projectRemainingWeek', () => {
  it('scales counting stats by the remaining fraction of the season', () => {
    const out = projectRemainingWeek({ HR: 18, AVG: 0.3 }, null, cats, 6, 0.6)
    // full-season HR = 18 / 0.6 = 30; remaining = 30 * 6/183
    expect(out.HR).toBeCloseTo(30 * (6 / 183), 3)
  })

  it('passes ratio stats through unchanged (scorer volume-weights them)', () => {
    const out = projectRemainingWeek({ HR: 18, AVG: 0.3 }, null, cats, 6, 0.6)
    expect(out.AVG).toBeCloseTo(0.3, 6)
  })

  it('prefers FanGraphs rest-of-season values when present', () => {
    const out = projectRemainingWeek({ HR: 18, AVG: 0.3 }, { AVG: 0.28 }, cats, 6, 0.6)
    expect(out.AVG).toBeCloseTo(0.28, 6)
  })

  it('zero days remaining -> zero counting contribution', () => {
    const out = projectRemainingWeek({ HR: 18 }, null, cats, 0, 0.6)
    expect(out.HR).toBe(0)
  })
})
