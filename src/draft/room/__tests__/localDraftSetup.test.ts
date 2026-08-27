import { describe, it, expect } from 'vitest'
import { seatsFromPublished, seatIndexOf, localSetupError } from '../localDraftSetup'

describe('seatsFromPublished', () => {
  it('reads seats off the published order in slot order', () => {
    expect(seatsFromPublished(['1', '2', '3'], { 1: 'r1', 2: 'r2', 3: 'r3' })).toEqual(['r1', 'r2', 'r3'])
  })

  it('turns a genuine gap into an empty seat, not the string "undefined"', () => {
    // Slot 2 was never assigned a roster by Sleeper. `String(undefined)` would
    // read back as "undefined" — a truthy string that looks occupied but
    // isn't, and slips past a `!seat` hole check.
    const seats = seatsFromPublished(['1', '2', '3'], { 1: 'r1', 3: 'r3' })
    expect(seats).toEqual(['r1', '', 'r3'])
    expect(seats[1]).not.toBe('undefined')
  })
})

describe('seatIndexOf', () => {
  it('finds the 1-based seat holding a team', () => {
    expect(seatIndexOf(['r1', 'r2', 'r3'], 'r2')).toBe(2)
  })

  it('returns 0 when the team is not seated at all', () => {
    expect(seatIndexOf(['r1', 'r2', 'r3'], 'r9')).toBe(0)
  })

  it('tracks a seat through a reorder — the whole point of deriving instead of clicking', () => {
    // seats [A, B, C] with B as mine; move B up (moveSeat semantics: swap with
    // its neighbor) -> [B, A, C]. A manually-clicked marker frozen at index 2
    // would now silently read A as mine; the derived index follows B.
    const before = ['A', 'B', 'C']
    expect(seatIndexOf(before, 'B')).toBe(2)
    const after = ['B', 'A', 'C']
    expect(seatIndexOf(after, 'B')).toBe(1)
  })
})

describe('localSetupError', () => {
  const base = { seats: ['r1', 'r2', 'r3', 'r4'], rounds: 15, mySlot: 1 }

  it('accepts a valid setup', () => {
    expect(localSetupError(base)).toBe('')
  })

  it('refuses an empty seat list', () => {
    expect(localSetupError({ ...base, seats: [] })).toBe('This league has no teams loaded yet.')
  })

  it('refuses rounds below 1', () => {
    expect(localSetupError({ ...base, rounds: 0 })).toBe('Rounds must be a whole number from 1 to 30.')
  })

  it('refuses fractional rounds', () => {
    expect(localSetupError({ ...base, rounds: 3.5 })).toBe('Rounds must be a whole number from 1 to 30.')
  })

  it('refuses NaN rounds', () => {
    expect(localSetupError({ ...base, rounds: NaN })).toBe('Rounds must be a whole number from 1 to 30.')
  })

  it('refuses Infinity rounds — the JSON.parse("1e400") failure, reachable by typing "1e400"', () => {
    expect(localSetupError({ ...base, rounds: Number('1e400') })).toBe('Rounds must be a whole number from 1 to 30.')
  })

  it('refuses rounds above 30, matching the input\'s own max and storage\'s own ceiling', () => {
    expect(localSetupError({ ...base, rounds: 31 })).toBe('Rounds must be a whole number from 1 to 30.')
    expect(localSetupError({ ...base, rounds: 5000 })).toBe('Rounds must be a whole number from 1 to 30.')
  })

  it('accepts the boundary values 1 and 30', () => {
    expect(localSetupError({ ...base, rounds: 1 })).toBe('')
    expect(localSetupError({ ...base, rounds: 30 })).toBe('')
  })

  it('refuses a hole ahead of a duplicate — two empty seats are two holes, not one duplicate', () => {
    // ['', '', 'r3', 'r4']: new Set(...).size === 3 === seats.length - 1, the
    // same signature one real duplicate would produce. The hole message must
    // win here, since there is no duplicate ROSTER in this state at all.
    expect(localSetupError({ ...base, seats: ['', '', 'r3', 'r4'] })).toBe('Every seat needs a team.')
  })

  it('refuses a single empty seat', () => {
    expect(localSetupError({ ...base, seats: ['r1', '', 'r3', 'r4'] })).toBe('Every seat needs a team.')
  })

  it('refuses a genuine duplicate', () => {
    expect(localSetupError({ ...base, seats: ['r1', 'r2', 'r1', 'r4'] })).toBe('Two seats hold the same team.')
  })

  it('refuses mySlot of 0 — not found in the seat list', () => {
    expect(localSetupError({ ...base, mySlot: 0 })).toBe("Couldn't find your team in this league's seats.")
  })

  it('refuses mySlot past the end of the seat list', () => {
    expect(localSetupError({ ...base, mySlot: 5 })).toBe("Couldn't find your team in this league's seats.")
  })
})
