import { describe, it, expect } from 'vitest'
import { pointsRosValue } from '../pointsRosValue'
import type { PlayerValue } from '@/myteam/playerValue'

// Stub valueOf: resolves a canned PlayerValue for a real-team match, null otherwise (a bare 'FA'/
// blank team or an unmatched name → null, mirroring the shared resolver's no-team/no-match guard).
function stubValueOf(byName: Record<string, PlayerValue>) {
  return (p: { name?: string; team?: string }): PlayerValue | null =>
    p.team && p.team.toUpperCase() !== 'FA' ? byName[p.name ?? ''] ?? null : null
}

const V = (total: number): PlayerValue => ({ total, games: 150, perStat: {}, side: 'hit', weeklyCap: 6.5 })

describe('pointsRosValue', () => {
  it('sets an entry for every resolved player; omits no-team and unmatched players', () => {
    const m = pointsRosValue(
      [
        { playerKey: 'matched', name: 'Bat Man', team: 'LAD' },
        { playerKey: 'noTeam', name: 'FA Guy', team: 'FA' },
        { playerKey: 'blankTeam', name: 'Blank', team: '' },
        { playerKey: 'noMatch', name: 'Ghost', team: 'NYY' },
      ],
      stubValueOf({ 'Bat Man': V(300) }),
    )
    expect(m.has('matched')).toBe(true)
    expect(m.has('noTeam')).toBe(false)
    expect(m.has('blankTeam')).toBe(false)
    expect(m.has('noMatch')).toBe(false)
  })

  it('returns the PlayerValue total for a resolved player (numeric)', () => {
    const m = pointsRosValue([{ playerKey: 'k', name: 'X', team: 'LAD' }], stubValueOf({ X: V(275) }))
    expect(m.get('k')).toBe(275)
  })
})
