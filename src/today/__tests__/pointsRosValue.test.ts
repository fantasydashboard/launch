import { describe, it, expect } from 'vitest'
import { pointsRosValue } from '../pointsRosValue'
import type { FGProjection } from '@/services/projectionService'

// Minimal stub matcher: returns a canned FGProjection for known names, null otherwise.
function stubMatcher(byName: Record<string, FGProjection>) {
  return (p: { full_name?: string }) => byName[p.full_name ?? ''] ?? null
}

describe('pointsRosValue', () => {
  it('sets an entry for every matched player; omits no-team and unmatched players', () => {
    const fg = {} as unknown as FGProjection // matched but unmappable → total 0, still keyed
    const m = pointsRosValue(
      [
        { playerKey: 'matched', name: 'Bat Man', team: 'LAD' },
        { playerKey: 'noTeam', name: 'FA Guy', team: 'FA' },
        { playerKey: 'blankTeam', name: 'Blank', team: '' },
        { playerKey: 'noMatch', name: 'Ghost', team: 'NYY' },
      ],
      stubMatcher({ 'Bat Man': fg }),
      { R: 1 },
    )
    expect(m.has('matched')).toBe(true)
    expect(m.has('noTeam')).toBe(false)
    expect(m.has('blankTeam')).toBe(false)
    expect(m.has('noMatch')).toBe(false)
  })

  it('returns the projectPlayerPoints total for a matched player (numeric)', () => {
    const fg = {} as unknown as FGProjection
    const m = pointsRosValue([{ playerKey: 'k', name: 'X', team: 'LAD' }], stubMatcher({ X: fg }), { R: 1 })
    expect(typeof m.get('k')).toBe('number')
  })
})
