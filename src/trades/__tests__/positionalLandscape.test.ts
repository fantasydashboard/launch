import { describe, it, expect } from 'vitest'
import { assignSlots, buildPositionalLandscape, coversSlot, positionRowsFor, type DepthPlayer } from '../positionalLandscape'

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

  it('surfaces concrete surplus even when flex/UTIL slots would absorb the spare (ESPN deep lineup)', () => {
    // 4 startable OF, lineup is 3 OF + 2 UTIL. The old "leftover after greedy assignment" model
    // dropped the 4th OF into a UTIL slot, so surplus read 0 everywhere. Concrete redundancy keeps
    // OF surplus visible; flex UTIL never registers surplus itself.
    const pool = mk('t1', [
      ['of1', ['OF'], 90], ['of2', ['OF'], 80], ['of3', ['OF'], 70], ['of4', ['OF'], 60],
    ])
    const ls = buildPositionalLandscape(pool, { OF: 3, UTIL: 2 }, 45)
    expect(ls.get('t1')!.get('OF')!.surplus).toBeGreaterThan(0)
    expect(ls.get('t1')!.get('OF')!.surplusBodies).toBe(1)
    expect(ls.get('t1')!.get('UTIL')!.surplus).toBe(0)
  })

  it('an injured starter leaves the slot a hole even with a body present', () => {
    const pool = mk('t1', [['hurt', ['3B'], 80, 'IL']])
    const ls = buildPositionalLandscape(pool, { '3B': 1 }, 45)
    expect(ls.get('t1')!.get('3B')!.need).toBeGreaterThan(0)
  })
})

describe('football flex eligibility', () => {
  it('an RB fills a FLEX slot; a QB does not', () => {
    expect(coversSlot(['RB'], 'FLEX')).toBe(true)
    expect(coversSlot(['WR'], 'FLEX')).toBe(true)
    expect(coversSlot(['TE'], 'FLEX')).toBe(true)
    expect(coversSlot(['QB'], 'FLEX')).toBe(false)
  })

  it('a QB fills SUPER_FLEX; concrete positions still match themselves', () => {
    expect(coversSlot(['QB'], 'SUPER_FLEX')).toBe(true)
    expect(coversSlot(['RB'], 'SUPER_FLEX')).toBe(true)
    expect(coversSlot(['QB'], 'QB')).toBe(true)
    expect(coversSlot(['WR'], 'RB')).toBe(false)
  })
})

describe('positionRowsFor', () => {
  it('football → skill positions', () => {
    expect(positionRowsFor('football')).toEqual(['QB', 'RB', 'WR', 'TE'])
  })
  /* Hockey used to be asserted here, as one of the sports that "fell through" to baseball.
     It has its own rows now — see the block at the end of this file for what that cost. An
     unknown sport still falls through, which is the rule this test exists for. */
  it('baseball / unknown → MLB positions', () => {
    expect(positionRowsFor('baseball')).toEqual(['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'])
    expect(positionRowsFor('cricket')).toEqual(['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'])
  })
})

describe('the seating engine has to know the sport too', () => {
  /*
   * Giving basketball its own flex table in rosterSlots is only half the job: assignSlots
   * judges eligibility through coversSlot, which read the merged table with no sport at all.
   *
   * So a basketball G seat resolved to the concrete letter "G" — the hockey goalie — and a
   * point guard, whose position is "PG", could not fill it. Every guard seat in every
   * basketball league sat open while guards rode the bench as surplus.
   */
  const P2 = (key: string, elig: string[], value: number): DepthPlayer =>
    ({ playerKey: key, teamKey: 't1', eligiblePositions: elig, value, status: '' })

  it('seats a point guard in a basketball G slot', () => {
    const a = assignSlots([P2('pg', ['PG'], 90)], { G: 1 }, 45, 'basketball')
    expect(a.assignedByPos.G).toEqual(['pg'])
    expect(a.unfilled).toHaveLength(0)
  })

  it('seats a power forward in a basketball F slot', () => {
    const a = assignSlots([P2('pf', ['PF'], 90)], { F: 1 }, 45, 'basketball')
    expect(a.assignedByPos.F).toEqual(['pf'])
  })

  /* A goalie must still be the only thing that fills a hockey G seat. */
  it('does not let a hockey winger into the goalie seat', () => {
    const a = assignSlots([P2('lw', ['LW'], 90)], { G: 1 }, 45, 'hockey')
    expect(a.assignedByPos.G).toBeUndefined()
    expect(a.unfilled).toEqual([{ position: 'G' }])
  })

  it('still seats a hockey goalie there', () => {
    const a = assignSlots([P2('g', ['G'], 90)], { G: 1 }, 45, 'hockey')
    expect(a.assignedByPos.G).toEqual(['g'])
  })

  it('coversSlot answers the same question the same way', () => {
    expect(coversSlot(['PG'], 'G', 'basketball')).toBe(true)
    expect(coversSlot(['LW'], 'G', 'hockey')).toBe(false)
  })
})

describe('which positions a sport is ranked across', () => {
  /*
   * positionRowsFor was `sport === 'football' ? NFL : MLB`, so HOCKEY GOT BASEBALL'S ROWS —
   * C, 1B, 2B, 3B, SS, OF, SP, RP. The only token the two sports share is C, and every other
   * row was filtered out by `present()` because no hockey player is first-base eligible.
   *
   * The whole positional half of the Trades page is built on this list: the landscape grid,
   * the best-partner fits, the head-to-head columns and "your leverage". All of them were
   * answering about centres only — on a league whose slots are UTIL/F/D/G and which has no
   * centre slot at all.
   */
  it('ranks hockey across hockey positions', () => {
    const rows = positionRowsFor('hockey')
    expect(rows).toEqual(expect.arrayContaining(['C', 'LW', 'RW', 'D', 'G']))
    expect(rows).not.toContain('1B')
    expect(rows).not.toContain('SP')
  })

  it('ranks basketball across basketball positions', () => {
    const rows = positionRowsFor('basketball')
    expect(rows).toEqual(expect.arrayContaining(['PG', 'SG', 'SF', 'PF', 'C']))
    expect(rows).not.toContain('OF')
  })

  it('leaves football and baseball as they were', () => {
    expect(positionRowsFor('football')).toEqual(['QB', 'RB', 'WR', 'TE'])
    expect(positionRowsFor('baseball')).toEqual(['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'])
  })

  /* An unknown sport keeps the baseball list rather than returning nothing: a grid with no
     rows reads as "this league has no positions", which is never true. */
  it('falls back to baseball for a sport it does not know', () => {
    expect(positionRowsFor('cricket')).toEqual(positionRowsFor('baseball'))
  })
})
