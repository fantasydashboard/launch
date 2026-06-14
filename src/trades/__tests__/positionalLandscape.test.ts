import { describe, it, expect } from 'vitest'
import { assignSlots, buildPositionalLandscape, type DepthPlayer } from '../positionalLandscape'

// value high enough to be "startable" (>= STARTABLE_BAR=45 default).
const P = (key: string, elig: string[], value: number, status = ''): DepthPlayer =>
  ({ playerKey: key, teamKey: 't1', eligiblePositions: elig, value, status })

describe('assignSlots', () => {
  it('a flex player fills exactly one slot — no double count', () => {
    // Tatis 2B,OF; one OF slot + one UTIL slot. He fills one, not both.
    const players = [P('tatis', ['2B', 'OF'], 90)]
    const a = assignSlots(players, { OF: 1, UTIL: 1 }, 45)
    expect(a.filledSlots).toBe(1)
    expect(a.benchStartable).toHaveLength(0) // he's a starter, not surplus
    expect(a.unfilled).toContainEqual(expect.objectContaining({ position: expect.any(String) }))
  })

  it('extra startable body at a position becomes surplus (bench-bound)', () => {
    const players = [P('a', ['3B'], 80), P('b', ['3B'], 70)] // two 3B, one slot
    const a = assignSlots(players, { '3B': 1 }, 45)
    expect(a.filledSlots).toBe(1)
    expect(a.benchStartable.map((p) => p.playerKey)).toContain('b')
  })

  it('below-bar players are not startable and never fill a slot', () => {
    const players = [P('weak', ['SS'], 20)] // below STARTABLE_BAR
    const a = assignSlots(players, { SS: 1 }, 45)
    expect(a.filledSlots).toBe(0)
    expect(a.unfilled).toContainEqual(expect.objectContaining({ position: 'SS' }))
  })
})

describe('buildPositionalLandscape', () => {
  const mk = (teamKey: string, players: Array<[string, string[], number, string?]>): DepthPlayer[] =>
    players.map(([k, e, v, s]) => ({ playerKey: k, teamKey, eligiblePositions: e, value: v, status: s ?? '' }))

  it('marks a hole when a team cannot fill a required slot', () => {
    // t1 has no 3B; t2 has one. t1 should read need>0 at 3B, t2 should not.
    const pool = [
      ...mk('t1', [['ss1', ['SS'], 80]]),
      ...mk('t2', [['ss2', ['SS'], 80], ['tb2', ['3B'], 75]]),
    ]
    const ls = buildPositionalLandscape(pool, { SS: 1, '3B': 1 }, 45)
    expect(ls.get('t1')!.get('3B')!.need).toBeGreaterThan(0)
    expect(ls.get('t2')!.get('3B')!.need).toBe(0)
  })

  it('marks surplus + best depthRank for the deepest team at a position', () => {
    const pool = [
      ...mk('t1', [['a', ['3B'], 80], ['b', ['3B'], 70]]), // deep at 3B
      ...mk('t2', [['c', ['3B'], 75]]),                    // exactly one
    ]
    const ls = buildPositionalLandscape(pool, { '3B': 1 }, 45)
    expect(ls.get('t1')!.get('3B')!.surplus).toBeGreaterThan(0)
    expect(ls.get('t1')!.get('3B')!.depthRank).toBe(1)
    expect(ls.get('t2')!.get('3B')!.surplus).toBe(0)
  })

  it('an injured starter leaves the slot a hole even with a body present', () => {
    const pool = mk('t1', [['hurt', ['3B'], 80, 'IL']])
    const ls = buildPositionalLandscape(pool, { '3B': 1 }, 45)
    expect(ls.get('t1')!.get('3B')!.need).toBeGreaterThan(0)
  })
})
