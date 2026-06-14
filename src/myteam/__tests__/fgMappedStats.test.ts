import { describe, it, expect } from 'vitest'
import { mapFgStatsByKey } from '../fgMappedStats'
import { toEffectiveStats } from '../effectiveStats'
import type { CatSpec } from '../types'
import type { FGProjection } from '@/services/projectionService'

// Numeric league stat_ids (as ESPN/Yahoo supply) — deliberately NOT FanGraphs field names.
const cats: CatSpec[] = [
  { statId: '5', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: '20', lowerIsBetter: false, side: 'hit', isRatio: false },
]
const labelOf = (id: string) => (id === '5' ? 'HR' : 'SB')

const batter: FGProjection = {
  mlbam_id: 1, player_name: 'Test Bat', team: 'OAK', position: 'DH', player_type: 'batter',
  hr: 30, sb: 12,
}

describe('mapFgStatsByKey', () => {
  it('rekeys a raw FanGraphs projection onto league stat_ids', () => {
    const mapped = mapFgStatsByKey({ p1: batter }, cats, labelOf)
    expect(mapped.p1).toEqual({ '5': 30, '20': 12 })
  })

  it('skips null projections', () => {
    const mapped = mapFgStatsByKey({ p1: null }, cats, labelOf)
    expect(mapped.p1).toBeUndefined()
  })

  // The regression this whole file exists to prevent: a RAW FGProjection passed straight to
  // toEffectiveStats misses every statId lookup, so the projection is ignored and the player
  // falls back to extrapolated season-to-date. Mapping first makes the ROS blend actually apply.
  it('makes toEffectiveStats use the projection (vs ignoring a raw FGProjection)', () => {
    const ytd = { '5': 9, '20': 3 } // half-season pace
    const rawIgnored = toEffectiveStats(ytd, batter as unknown as Record<string, number>, cats, 0.5)
    expect(rawIgnored['5']).toBe(18) // raw object had no key "5" -> extrapolated 9 / 0.5

    const mapped = mapFgStatsByKey({ p1: batter }, cats, labelOf)
    const blended = toEffectiveStats(ytd, mapped.p1, cats, 0.5)
    expect(blended['5']).toBe(30) // FG full-season total used, not extrapolation
  })
})
