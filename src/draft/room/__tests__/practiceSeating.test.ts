import { describe, it, expect } from 'vitest'
import { buildSeatMap, isCompleteSeatMap, shuffledSeating } from '../practiceSeating'

/** A 10-team league: slot 1 -> roster 'r1', slot 2 -> 'r2', and so on. */
const realOrder: Record<number, string> = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => [i + 1, `r${i + 1}`]),
)

const base = {
  mockTeams: 10,
  leagueTeams: 10,
  mySlotInMock: 3,
  mySlotInLeague: 7,
  realSlotToRosterId: realOrder,
}

describe('buildSeatMap', () => {
  it('puts me in my own mock seat', () => {
    const map = buildSeatMap(base)!
    expect(map[3]).toBe('r7')
  })

  it('seats the league mate who picks after me immediately after me', () => {
    // This is the entire point: "who picks between my picks" has to be the
    // same people in the mock as on draft night.
    const map = buildSeatMap(base)!
    expect(map[4]).toBe('r8')
    expect(map[5]).toBe('r9')
  })

  it('seats the league mate who picks before me immediately before me', () => {
    const map = buildSeatMap(base)!
    expect(map[2]).toBe('r6')
    expect(map[1]).toBe('r5')
  })

  it('wraps around the end of the ring', () => {
    const map = buildSeatMap(base)!
    // My league seat is 7, so seats 8,9,10 land at mock 4,5,6 and the ring
    // wraps: mock 7 must be league slot 1.
    expect(map[6]).toBe('r10')
    expect(map[7]).toBe('r1')
    expect(map[10]).toBe('r4')
  })

  it('is the identity map when my seat is the same in both', () => {
    const map = buildSeatMap({ ...base, mySlotInMock: 7, mySlotInLeague: 7 })!
    for (let slot = 1; slot <= 10; slot++) expect(map[slot]).toBe(`r${slot}`)
  })

  it('rotates the other way when my mock seat is later than my league seat', () => {
    const map = buildSeatMap({ ...base, mySlotInMock: 9, mySlotInLeague: 2 })!
    expect(map[9]).toBe('r2')
    expect(map[10]).toBe('r3')
    expect(map[1]).toBe('r4')
  })

  it('uses every league roster exactly once', () => {
    const map = buildSeatMap(base)!
    const seated = Object.values(map)
    expect(seated).toHaveLength(10)
    expect(new Set(seated).size).toBe(10)
    expect([...seated].sort()).toEqual([...Object.values(realOrder)].sort())
  })

  it('refuses to seat when the mock and the league are different sizes', () => {
    // Approximate seating gives a confident, specific, wrong read.
    expect(buildSeatMap({ ...base, mockTeams: 12 })).toBeNull()
  })

  it('refuses to seat without an anchor in either draft', () => {
    expect(buildSeatMap({ ...base, mySlotInMock: 0 })).toBeNull()
    expect(buildSeatMap({ ...base, mySlotInLeague: 0 })).toBeNull()
  })

  it('refuses to seat when the real order is incomplete', () => {
    const { 5: _dropped, ...missingOne } = realOrder
    expect(buildSeatMap({ ...base, realSlotToRosterId: missingOne })).toBeNull()
  })

  it('refuses to seat an empty league', () => {
    expect(buildSeatMap({ ...base, mockTeams: 0, leagueTeams: 0, realSlotToRosterId: {} })).toBeNull()
  })
})

describe('shuffledSeating', () => {
  const rosters = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6']

  it('seats every roster exactly once', () => {
    const map = shuffledSeating(rosters, 42)
    expect(Object.keys(map)).toHaveLength(6)
    expect([...Object.values(map)].sort()).toEqual([...rosters].sort())
  })

  it('numbers seats from 1', () => {
    const map = shuffledSeating(rosters, 42)
    expect(map[1]).toBeDefined()
    expect(map[0]).toBeUndefined()
  })

  it('is identical for the same seed', () => {
    // A room that re-seats itself on refresh is not a room you can practise in.
    expect(shuffledSeating(rosters, 42)).toEqual(shuffledSeating(rosters, 42))
  })

  it('differs across seeds', () => {
    const a = shuffledSeating(rosters, 1)
    const b = shuffledSeating(rosters, 2)
    expect(a).not.toEqual(b)
  })

  it('handles an empty list', () => {
    expect(shuffledSeating([], 1)).toEqual({})
  })
})

describe('isCompleteSeatMap', () => {
  const full: Record<number, string> = { 1: 'r1', 2: 'r2', 3: 'r3', 4: 'r4' }

  it('accepts a map that seats every slot in the ring', () => {
    expect(isCompleteSeatMap(full, 4)).toBe(true)
  })

  it('rejects a key whose value is undefined', () => {
    // The failure this exists for: `Object.keys(map).length` counts this map as
    // 4 seats, so a key-count guard passes it through. Slot 3 then reads back
    // `undefined` and the consumer falls through to whatever it has — in a
    // practice room, the MOCK's roster id, which collides with an unrelated
    // LEAGUE roster id and puts a real person's history on someone else's seat.
    const holed = { ...full, 3: undefined } as unknown as Record<number, string>
    expect(Object.keys(holed)).toHaveLength(4)
    expect(isCompleteSeatMap(holed, 4)).toBe(false)
  })

  it('rejects an empty-string seat', () => {
    expect(isCompleteSeatMap({ ...full, 2: '' }, 4)).toBe(false)
  })

  it('rejects a map missing a slot', () => {
    const { 4: _dropped, ...short } = full
    expect(isCompleteSeatMap(short, 4)).toBe(false)
  })

  it('rejects a map that is 1-indexed off the ring', () => {
    // Right count, wrong slots: seat 4 is empty and seat 0 is nobody's turn.
    expect(isCompleteSeatMap({ 0: 'r1', 1: 'r2', 2: 'r3', 3: 'r4' }, 4)).toBe(false)
  })

  it('rejects a null or empty map, and a ring of no teams', () => {
    expect(isCompleteSeatMap(null, 4)).toBe(false)
    expect(isCompleteSeatMap({}, 4)).toBe(false)
    // {} is truthy, so "seats nobody" must never pass as "seats everybody".
    expect(isCompleteSeatMap({}, 0)).toBe(false)
    expect(isCompleteSeatMap(full, 0)).toBe(false)
  })
})
