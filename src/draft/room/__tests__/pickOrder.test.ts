import { describe, it, expect } from 'vitest'
import { slotAtPick, nextPickFor, slotsBetween, type DraftShape } from '../pickOrder'

const snake12: DraftShape = { type: 'snake', teams: 12, rounds: 16 }
const linear12: DraftShape = { type: 'linear', teams: 12, rounds: 16 }

describe('slotAtPick — snake', () => {
  it('round 1 runs 1..12', () => {
    expect(slotAtPick(snake12, 1)).toBe(1)
    expect(slotAtPick(snake12, 7)).toBe(7)
    expect(slotAtPick(snake12, 12)).toBe(12)
  })

  it('round 2 reverses — the turn', () => {
    expect(slotAtPick(snake12, 13)).toBe(12)
    expect(slotAtPick(snake12, 14)).toBe(11)
    expect(slotAtPick(snake12, 24)).toBe(1)
  })

  it('round 3 runs forward again', () => {
    expect(slotAtPick(snake12, 25)).toBe(1)
    expect(slotAtPick(snake12, 36)).toBe(12)
  })

  it('holds across many rounds', () => {
    // Round 8 is even -> reversed. Pick 85 is the 1st pick of round 8.
    expect(slotAtPick(snake12, 85)).toBe(12)
    // Round 9 is odd -> forward. Pick 97 is the 1st pick of round 9.
    expect(slotAtPick(snake12, 97)).toBe(1)
  })
})

describe('slotAtPick — linear', () => {
  it('never reverses', () => {
    expect(slotAtPick(linear12, 12)).toBe(12)
    expect(slotAtPick(linear12, 13)).toBe(1)
    expect(slotAtPick(linear12, 25)).toBe(1)
  })
})

describe('nextPickFor', () => {
  it('finds my next pick in a snake', () => {
    // Slot 4: picks 4, 21 (round 2 reversed), 28, 45, ...
    expect(nextPickFor(snake12, 4, 4)).toBe(21)
    expect(nextPickFor(snake12, 4, 21)).toBe(28)
  })

  it('handles the turn — slot 12 picks back to back', () => {
    expect(nextPickFor(snake12, 12, 12)).toBe(13)
  })

  it('handles slot 1 across the wrap', () => {
    expect(nextPickFor(snake12, 1, 1)).toBe(24)
    expect(nextPickFor(snake12, 1, 24)).toBe(25)
  })

  it('linear spacing is always a full round', () => {
    expect(nextPickFor(linear12, 4, 4)).toBe(16)
  })

  it('returns null once the draft is exhausted', () => {
    const last = snake12.teams * snake12.rounds // 192
    expect(nextPickFor(snake12, slotAtPick(snake12, last), last)).toBeNull()
  })

  it('finds the first pick when asked from before the draft', () => {
    expect(nextPickFor(snake12, 4, 0)).toBe(4)
  })
})

describe('slotsBetween', () => {
  it('lists the slots picking strictly between two picks', () => {
    // Between my pick 4 and my next at 21: picks 5..20.
    const between = slotsBetween(snake12, 4, 21)
    expect(between).toHaveLength(16)
    expect(between[0]).toBe(5) // pick 5
    expect(between[7]).toBe(12) // pick 12, end of round 1
    expect(between[8]).toBe(12) // pick 13, round 2 reverses — slot 12 twice in a row
    expect(between[15]).toBe(5) // pick 20
  })

  it('is empty for back-to-back picks', () => {
    expect(slotsBetween(snake12, 12, 13)).toEqual([])
  })

  it('is empty when the range is inverted or equal', () => {
    expect(slotsBetween(snake12, 21, 4)).toEqual([])
    expect(slotsBetween(snake12, 4, 4)).toEqual([])
  })
})
