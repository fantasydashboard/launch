import { describe, it, expect } from 'vitest'
import { pickSleeperSuccessor, type SleeperSuccessorCandidate } from '@/stores/league'

describe('pickSleeperSuccessor (Sleeper dynasty rollover matching)', () => {
  it('migrates a saved prior-season league to its current-season successor', () => {
    const current: SleeperSuccessorCandidate[] = [
      { league_id: 'B', previous_league_id: 'A', season: '2026', total_rosters: 12 },
    ]
    const successor = pickSleeperSuccessor('A', current)
    expect(successor?.league_id).toBe('B')
    expect(successor?.season).toBe('2026')
  })

  it('returns null when the saved league is already a current-season league', () => {
    const current: SleeperSuccessorCandidate[] = [
      { league_id: 'A', previous_league_id: 'oldA', season: '2026' },
    ]
    expect(pickSleeperSuccessor('A', current)).toBeNull()
  })

  it('returns null when no current league points back to the saved league', () => {
    const current: SleeperSuccessorCandidate[] = [
      { league_id: 'X', previous_league_id: 'Y', season: '2026' },
      { league_id: 'Z', previous_league_id: null, season: '2026' },
    ]
    expect(pickSleeperSuccessor('A', current)).toBeNull()
  })

  it('matches across numeric/string id representations', () => {
    const current = [
      { league_id: 123, previous_league_id: 999, season: 2026 },
    ] as unknown as SleeperSuccessorCandidate[]
    const successor = pickSleeperSuccessor('999', current)
    expect(successor && String(successor.league_id)).toBe('123')
  })

  it('is defensive against empty / null / malformed input', () => {
    expect(pickSleeperSuccessor('A', [])).toBeNull()
    expect(pickSleeperSuccessor('A', null)).toBeNull()
    expect(pickSleeperSuccessor('A', undefined)).toBeNull()
    expect(pickSleeperSuccessor('', [{ league_id: 'B', previous_league_id: '' }])).toBeNull()
    // A row with no ids must not throw.
    expect(pickSleeperSuccessor('A', [{} as SleeperSuccessorCandidate])).toBeNull()
  })

  it('does not match a self-referential league (successor id equals saved id)', () => {
    const current: SleeperSuccessorCandidate[] = [
      { league_id: 'A', previous_league_id: 'A', season: '2026' },
    ]
    expect(pickSleeperSuccessor('A', current)).toBeNull()
  })

  it('picks only the matching successor among several current leagues', () => {
    const current: SleeperSuccessorCandidate[] = [
      { league_id: 'P', previous_league_id: 'noMatch', season: '2026' },
      { league_id: 'Q', previous_league_id: 'A', season: '2026', total_rosters: 10 },
      { league_id: 'R', previous_league_id: 'other', season: '2026' },
    ]
    const successor = pickSleeperSuccessor('A', current)
    expect(successor?.league_id).toBe('Q')
    expect(successor?.total_rosters).toBe(10)
  })
})
