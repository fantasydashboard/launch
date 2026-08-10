import { describe, it, expect } from 'vitest'
import { positionColor, positionBadge, POSITION_COLORS } from '../positionColors'

describe('positionColors', () => {
  it('gives the four skill positions four different hues', () => {
    // The complaint that started this: a purple and two blues, unreadable at speed.
    const hues = ['QB', 'RB', 'WR', 'TE'].map((p) => positionBadge(p))
    expect(new Set(hues).size).toBe(4)
    // And none of them may be a near-neighbour of another on the wheel.
    const family = (c: string) => c.split('-')[1]
    expect(new Set(['QB', 'RB', 'WR', 'TE'].map((p) => family(positionBadge(p)))).size).toBe(4)
  })

  it('reads a multi-position listing', () => {
    expect(positionColor('RB/WR')).toEqual(POSITION_COLORS.RB)
  })

  it('falls back rather than throwing on something unexpected', () => {
    const c = positionColor('LB')
    expect(c.badge).toContain('dark-border')
    expect(positionColor('')).toEqual(positionColor('nonsense'))
  })

  it('offers a badge, a cell wash and an accent for every position', () => {
    for (const pos of Object.keys(POSITION_COLORS)) {
      const c = positionColor(pos)
      expect(c.badge).toBeTruthy()
      expect(c.cell).toBeTruthy()
      expect(c.accent).toBeTruthy()
    }
  })
})
