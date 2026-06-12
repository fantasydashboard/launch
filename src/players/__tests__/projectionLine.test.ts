import { describe, it, expect } from 'vitest'
import { projectionLine, formatProj } from '../projectionLine'
import type { CatSpec } from '@/myteam/value'

const label = (id: string) => id

const pitCats: CatSpec[] = [
  { statId: 'ERA', lowerIsBetter: true, side: 'pit', isRatio: true },
  { statId: 'WHIP', lowerIsBetter: true, side: 'pit', isRatio: true },
  { statId: 'K', lowerIsBetter: false, side: 'pit', isRatio: false },
  { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false }, // wrong side, must be ignored
]

describe('formatProj', () => {
  it('rate under 1 reads as a leading-dot rate', () => {
    expect(formatProj(0.288, true)).toBe('.288')
  })
  it('rate over 1 reads as two decimals', () => {
    expect(formatProj(3.74, true)).toBe('3.74')
  })
  it('counting stats round to whole numbers', () => {
    expect(formatProj(142.4, false)).toBe('142')
  })
})

describe('projectionLine', () => {
  it('puts helped cats first and flags them, ignoring the other side', () => {
    const stats = { ERA: 3.74, WHIP: 1.19, K: 142 }
    const segs = projectionLine(stats, pitCats, 'pit', ['ERA', 'WHIP'], label)
    expect(segs.map((s) => s.statId)).toEqual(['ERA', 'WHIP', 'K'])
    expect(segs.filter((s) => s.helped).map((s) => s.statId)).toEqual(['ERA', 'WHIP'])
    expect(segs.find((s) => s.statId === 'ERA')!.value).toBe('3.74')
  })

  it('never includes a category the player has no value for', () => {
    const segs = projectionLine({ ERA: 3.5 }, pitCats, 'pit', ['ERA'], label)
    expect(segs.map((s) => s.statId)).toEqual(['ERA'])
  })

  it('caps at max segments', () => {
    const segs = projectionLine({ ERA: 3.5, WHIP: 1.2, K: 100 }, pitCats, 'pit', [], label, 2)
    expect(segs).toHaveLength(2)
  })
})
