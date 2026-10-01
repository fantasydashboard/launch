import { describe, it, expect } from 'vitest'
import { priorSnapshot, powerMovement, standingsMovement } from '../rankMovement'
import type { TalentSnapshot } from '../powerTrajectory'

const snaps: TalentSnapshot[] = [
  { week: 2, ranks: { a: 1, b: 2, c: 3 } },
  { week: 4, ranks: { a: 3, b: 1, c: 2 } },
]

describe('priorSnapshot', () => {
  it('ignores the current week, which is rewritten on every visit', () => {
    expect(priorSnapshot(snaps, 4)?.week).toBe(2)
  })

  it('reaches back past a week the reader never opened the page on', () => {
    expect(priorSnapshot([{ week: 1, ranks: { a: 1 } }, { week: 2, ranks: { a: 2 } }], 6)?.week).toBe(2)
  })

  it('has nothing to compare against on a league seen for the first time', () => {
    expect(priorSnapshot([{ week: 4, ranks: { a: 1 } }], 4)).toBeNull()
    expect(priorSnapshot([], 4)).toBeNull()
  })

  it('refuses to guess when the week is unknown', () => {
    expect(priorSnapshot(snaps, 0)).toBeNull()
  })
})

describe('powerMovement', () => {
  const rows = [
    { teamKey: 'a', strengthRank: 3 },
    { teamKey: 'b', strengthRank: 1 },
    { teamKey: 'c', strengthRank: 2 },
  ]

  it('signs a climb positive even though the rank number falls', () => {
    const mv = powerMovement(rows, snaps[0])
    expect(mv.b).toBe(1)   // 2nd → 1st
    expect(mv.c).toBe(1)   // 3rd → 2nd
    expect(mv.a).toBe(-2)  // 1st → 3rd
  })

  it('leaves out a team with no earlier reading rather than calling it unchanged', () => {
    const mv = powerMovement([...rows, { teamKey: 'd', strengthRank: 4 }], snaps[0])
    expect('d' in mv).toBe(false)
  })

  it('reports nothing at all with no prior snapshot', () => {
    expect(powerMovement(rows, null)).toEqual({})
  })
})

describe('standingsMovement', () => {
  it('differences the last two weeks of the race, climb positive', () => {
    const mv = standingsMovement([
      { teamKey: 'a', standings: [{ rank: 1 }, { rank: 2 }, { rank: 5 }] },
      { teamKey: 'b', standings: [{ rank: 6 }, { rank: 6 }, { rank: 2 }] },
    ])
    expect(mv.a).toBe(-3)
    expect(mv.b).toBe(4)
  })

  it('says nothing after a single week, when there is no "last week"', () => {
    expect(standingsMovement([{ teamKey: 'a', standings: [{ rank: 1 }] }])).toEqual({})
  })
})
