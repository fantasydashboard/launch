import { describe, it, expect } from 'vitest'
import { pickOwners, draftPosition, fillRoster, positionsStillNeeded } from '../hockeyDraftPlan'

describe('who owns each pick', () => {
  it('snakes, reversing every other round', () => {
    expect(pickOwners(4, 3)).toEqual([0, 1, 2, 3, 3, 2, 1, 0, 0, 1, 2, 3])
  })

  it('runs straight through when the league is linear', () => {
    expect(pickOwners(4, 2, 'linear')).toEqual([0, 1, 2, 3, 0, 1, 2, 3])
  })

  /* The turn is the reason this is computed rather than eyeballed: slot 0 picks 1st and 8th
     in a four-team snake, back to back. */
  it('gives the wrap slot two picks in a row', () => {
    const owners = pickOwners(4, 2)
    expect(owners[3]).toBe(3)
    expect(owners[4]).toBe(3)
  })

  it('returns nothing for a league with no teams or no rounds', () => {
    expect(pickOwners(0, 5)).toEqual([])
    expect(pickOwners(10, 0)).toEqual([])
  })
})

describe('where the draft stands', () => {
  const TEAMS = 10
  const ROUNDS = 22
  const at = (taken: number, slot: number | null = 8) =>
    draftPosition(taken, TEAMS, slot, ROUNDS)

  it('starts on pick one, round one', () => {
    const d = at(0)
    expect(d.pick).toBe(1)
    expect(d.round).toBe(1)
    expect(d.onTheClockSlot).toBe(0)
  })

  /*
   * THE NUMBER A DRAFTER PLANS AGAINST. Slot 8 (the ninth pick) is eight picks away at the
   * start — which is how far down their own list they should be willing to look.
   */
  it('counts the picks before your turn', () => {
    expect(at(0).picksUntilMine).toBe(8)
    expect(at(8).picksUntilMine).toBe(0)     // you are on the clock
    expect(at(8).onTheClockSlot).toBe(8)
  })

  it('knows your next two picks, which is what a turn is planned around', () => {
    const d = at(0)
    expect(d.myNextPick).toBe(9)
    expect(d.myFollowingPick).toBe(12)       // snake wrap: 9th and 12th overall
  })

  it('advances the round as the picks go', () => {
    expect(at(9).round).toBe(1)
    expect(at(10).round).toBe(2)
    expect(at(20).round).toBe(3)
  })

  it('lists every pick you own', () => {
    expect(at(0).myPicks.slice(0, 4)).toEqual([9, 12, 29, 32])
  })

  it('says nothing rather than something when you have not set a slot', () => {
    const d = at(5, null)
    expect(d.picksUntilMine).toBeNull()
    expect(d.myPicks).toEqual([])
    expect(d.onTheClockSlot).toBe(5)         // the clock still works
  })

  it('knows when the draft is finished', () => {
    const d = at(TEAMS * ROUNDS)
    expect(d.complete).toBe(true)
    expect(d.onTheClockSlot).toBeNull()
    expect(d.picksUntilMine).toBeNull()
  })
})

describe('laying a roster into its slots', () => {
  const SLOTS = { F: 9, D: 5, G: 2, UTIL: 1 }
  const p = (playerKey: string, position: string) => ({ playerKey, position })
  const open = (r: ReturnType<typeof fillRoster>, slot: string) =>
    r.slots.find((s) => s.slot === slot)!.open

  it('seats players in slots that accept them', () => {
    const r = fillRoster([p('a', 'C'), p('b', 'D'), p('c', 'G')], SLOTS)
    expect(open(r, 'F')).toBe(8)
    expect(open(r, 'D')).toBe(4)
    expect(open(r, 'G')).toBe(1)
  })

  /*
   * THE WHOLE DIFFICULTY, IN ONE TEST. A centre fits F, C and UTIL. Seated in UTIL first, a
   * later forward-only opening goes unfilled and the roster reports a need the drafter does
   * not have. Narrowest eligible slot first.
   */
  it('fills the narrow slot before the shared one', () => {
    const r = fillRoster([p('a', 'C')], { C: 1, UTIL: 1 })
    expect(open(r, 'C')).toBe(0)
    expect(open(r, 'UTIL')).toBe(1)
  })

  it('uses utility once the strict slots are full', () => {
    const r = fillRoster([p('a', 'D'), p('b', 'D')], { D: 1, UTIL: 1 })
    expect(open(r, 'D')).toBe(0)
    expect(open(r, 'UTIL')).toBe(0)
  })

  /* A roster carries more players than it starts. Bench is an answer, not an error. */
  it('benches anyone who fits nowhere', () => {
    const r = fillRoster([p('a', 'G'), p('b', 'G'), p('c', 'G')], { G: 2 })
    expect(r.bench).toEqual(['c'])
  })

  it('never seats a goalie in a skater slot', () => {
    const r = fillRoster([p('g', 'G')], { F: 2, D: 2, UTIL: 1 })
    expect(r.bench).toEqual(['g'])
  })
})

describe('what the roster still needs', () => {
  const SLOTS = { F: 2, D: 1, G: 1 }
  const p = (playerKey: string, position: string) => ({ playerKey, position })

  it('names every position that can fill an open slot', () => {
    expect(positionsStillNeeded([], SLOTS).sort()).toEqual(['C', 'D', 'G', 'LW', 'RW'])
  })

  it('drops a position once its slot is full', () => {
    expect(positionsStillNeeded([p('g', 'G')], SLOTS)).not.toContain('G')
  })

  /*
   * Says nothing when there is nothing to say. Every starting slot full means best-available
   * is correct again, and a "need" list at that point would be noise dressed as guidance.
   */
  it('is empty once every starting slot is filled', () => {
    const full = [p('a', 'C'), p('b', 'LW'), p('c', 'D'), p('d', 'G')]
    expect(positionsStillNeeded(full, SLOTS)).toEqual([])
  })
})
