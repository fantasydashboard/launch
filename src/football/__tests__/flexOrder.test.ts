import { describe, it, expect } from 'vitest'
import { orderSeatsByKickoff, seatWidth } from '../flexOrder'

const THU = 1_000
const SUN_EARLY = 2_000
const SUN_LATE = 3_000
const MNF = 4_000

/** Shorthand: each player is a key, its eligible positions, and a kickoff. */
function run(
  assigned: Record<string, string[]>,
  players: Record<string, { pos: string[]; ko: number }>,
) {
  return orderSeatsByKickoff({
    assigned,
    eligibleOf: (k) => players[k]?.pos ?? [],
    kickoffOf: (k) => players[k]?.ko ?? Infinity,
  })
}

describe('seatWidth', () => {
  it('orders rigid seats below the flex and the flex below superflex', () => {
    expect(seatWidth('RB')).toBe(1)
    expect(seatWidth('FLEX')).toBeGreaterThan(seatWidth('RB'))
    expect(seatWidth('SUPER_FLEX')).toBeGreaterThan(seatWidth('FLEX'))
  })
})

describe('the Thursday player in the flex', () => {
  const players = {
    thuRB: { pos: ['RB'], ko: THU },
    sunRB: { pos: ['RB'], ko: SUN_EARLY },
    mnfRB: { pos: ['RB'], ko: MNF },
  }

  it('moves him into the rigid seat and leaves the latest kickoff in the flex', () => {
    const r = run({ RB: ['sunRB', 'mnfRB'], FLEX: ['thuRB'] }, players)
    expect(r.assigned.FLEX).toEqual(['mnfRB'])
    expect(new Set(r.assigned.RB)).toEqual(new Set(['thuRB', 'sunRB']))
  })

  it('starts exactly the same players — this is a seating change, not a lineup change', () => {
    const r = run({ RB: ['sunRB', 'mnfRB'], FLEX: ['thuRB'] }, players)
    const before = ['sunRB', 'mnfRB', 'thuRB'].sort()
    expect(Object.values(r.assigned).flat().sort()).toEqual(before)
  })

  it('reports the seat changes and nothing else', () => {
    const r = run({ RB: ['sunRB', 'mnfRB'], FLEX: ['thuRB'] }, players)
    expect(r.moved.map((m) => m.playerKey).sort()).toEqual(['mnfRB', 'thuRB'])
    expect(r.moved.find((m) => m.playerKey === 'thuRB')).toMatchObject({ fromSlot: 'FLEX', toSlot: 'RB' })
  })

  it('leaves an already-correct lineup alone', () => {
    const r = run({ RB: ['thuRB', 'sunRB'], FLEX: ['mnfRB'] }, players)
    expect(r.moved).toEqual([])
  })
})

describe('across positions', () => {
  it('prefers the latest body in the flex even when it changes which position fills it', () => {
    const r = run(
      { RB: ['thuRB'], WR: ['sunWR'], FLEX: ['earlyWR'] },
      {
        thuRB: { pos: ['RB'], ko: THU },
        sunWR: { pos: ['WR'], ko: MNF },
        earlyWR: { pos: ['WR'], ko: SUN_EARLY },
      },
    )
    expect(r.assigned.FLEX).toEqual(['sunWR'])
    expect(r.assigned.WR).toEqual(['earlyWR'])
    expect(r.assigned.RB).toEqual(['thuRB'])
  })

  it('fills superflex last, so the quarterback seat takes the earlier of two QBs', () => {
    const r = run(
      { QB: ['lateQB'], SUPER_FLEX: ['earlyQB'], RB: ['rb'] },
      {
        lateQB: { pos: ['QB'], ko: MNF },
        earlyQB: { pos: ['QB'], ko: THU },
        rb: { pos: ['RB'], ko: SUN_EARLY },
      },
    )
    expect(r.assigned.QB).toEqual(['earlyQB'])
    expect(r.assigned.SUPER_FLEX).toEqual(['lateQB'])
  })
})

describe('never breaks the lineup to tidy the seating', () => {
  it('keeps a seat fillable rather than handing it to the earliest body', () => {
    /* The dual-eligible man kicks off first, so a naive pass gives him the RB seat and leaves
       the WR seat with nobody. */
    const r = run(
      { RB: ['pureRB'], WR: ['dual'], FLEX: ['lateRB'] },
      {
        dual: { pos: ['RB', 'WR'], ko: THU },
        pureRB: { pos: ['RB'], ko: SUN_EARLY },
        lateRB: { pos: ['RB'], ko: MNF },
      },
    )
    expect(r.assigned.WR).toEqual(['dual'])
    expect(r.assigned.RB).toEqual(['pureRB'])
    expect(r.assigned.FLEX).toEqual(['lateRB'])
    expect(Object.values(r.assigned).flat()).toHaveLength(3)
  })
})

describe('what it does with players it cannot time', () => {
  it('treats a bye-week starter as the latest body, because he never locks', () => {
    const r = run(
      { RB: ['sunRB'], FLEX: ['bye'] },
      { sunRB: { pos: ['RB'], ko: SUN_LATE }, bye: { pos: ['RB'], ko: Infinity } },
    )
    expect(r.assigned.FLEX).toEqual(['bye'])
    expect(r.moved).toEqual([])
  })

  it('changes nothing when no kickoff is known at all', () => {
    const r = run(
      { RB: ['a', 'b'], FLEX: ['c'] },
      {
        a: { pos: ['RB'], ko: Infinity },
        b: { pos: ['RB'], ko: Infinity },
        c: { pos: ['RB'], ko: Infinity },
      },
    )
    expect(r.assigned).toEqual({ RB: ['a', 'b'], FLEX: ['c'] })
    expect(r.moved).toEqual([])
  })

  it('has nothing to say about a one-seat lineup', () => {
    const r = run({ QB: ['q'] }, { q: { pos: ['QB'], ko: THU } })
    expect(r.moved).toEqual([])
  })
})
