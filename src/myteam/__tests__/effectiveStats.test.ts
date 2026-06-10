import { describe, it, expect } from 'vitest'
import { toEffectiveStats } from '../effectiveStats'
import type { CatSpec } from '../types'

const cats: CatSpec[] = [
  { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'ERA', lowerIsBetter: true, side: 'pit', isRatio: true, volumeStatId: 'IP' },
  { statId: 'IP', lowerIsBetter: false, side: 'pit', isRatio: false },
]

describe('toEffectiveStats', () => {
  it('returns raw stats unchanged when fgStats is null and fraction is 1 (Slice 1 mode)', () => {
    const raw = { HR: 20, ERA: 3.5, IP: 100 }
    expect(toEffectiveStats(raw, null, cats, 1)).toEqual({ HR: 20, ERA: 3.5, IP: 100 })
  })
  it('extrapolates counting stats to full season when no FG and fraction < 1', () => {
    const raw = { HR: 20, ERA: 3.5, IP: 100 }
    const out = toEffectiveStats(raw, null, cats, 0.5)
    expect(out.HR).toBe(40)   // counting doubled
    expect(out.IP).toBe(200)  // volume doubled
    expect(out.ERA).toBe(3.5) // ratio rate unchanged
  })
  it('prefers FG values where present, falls back to extrapolated raw otherwise', () => {
    const raw = { HR: 20, ERA: 3.5, IP: 100 }
    const fg = { HR: 35, ERA: 4.0 } // FG has HR + ERA, not IP
    const out = toEffectiveStats(raw, fg, cats, 0.5)
    expect(out.HR).toBe(35)   // FG full-season total used directly
    expect(out.ERA).toBe(4.0) // FG rate used
    expect(out.IP).toBe(200)  // no FG IP -> extrapolated raw
  })
})
