import { describe, it, expect } from 'vitest'
import { parseEligible, playerFitsSlot, canFillSlots, expendableKeys, type EligPlayer } from '../dropEligibility'

describe('parseEligible', () => {
  it('splits comma/slash position strings, upper-cased', () => {
    expect(parseEligible('1B,OF')).toEqual(['1B', 'OF'])
    expect(parseEligible('sp/rp')).toEqual(['SP', 'RP'])
  })
})

describe('playerFitsSlot', () => {
  it('matches specific positions and flex/compound slots', () => {
    expect(playerFitsSlot(['C'], 'C')).toBe(true)
    expect(playerFitsSlot(['3B'], 'C')).toBe(false)
    expect(playerFitsSlot(['OF'], 'UTIL')).toBe(true) // any hitter fills Util
    expect(playerFitsSlot(['SP'], 'P')).toBe(true)
    expect(playerFitsSlot(['SS'], 'MI')).toBe(true)
    expect(playerFitsSlot(['LF'], 'OF')).toBe(true)
    expect(playerFitsSlot(['SP'], 'UTIL')).toBe(false) // pitcher can't fill a hitter flex
  })
})

const slots = { C: 1, '1B': 1, OF: 1, UTIL: 1 } // 4 starting hitter slots

describe('expendableKeys', () => {
  it('keeps your only catcher (not droppable), frees a second catcher', () => {
    const roster: EligPlayer[] = [
      { playerKey: 'c1', eligiblePositions: ['C'] },
      { playerKey: 'c2', eligiblePositions: ['C'] }, // surplus catcher
      { playerKey: 'firstbase', eligiblePositions: ['1B'] },
      { playerKey: 'of1', eligiblePositions: ['OF'] },
      { playerKey: 'of2', eligiblePositions: ['OF'] }, // surplus OF (fills UTIL or OF)
    ]
    const exp = expendableKeys(roster, slots)
    // With two catchers and one C slot, a catcher IS droppable (you can pick an OF for a C).
    expect(exp.has('c1') || exp.has('c2')).toBe(true)
    // The 1B is the only one who can fill the 1B slot -> NOT droppable.
    expect(exp.has('firstbase')).toBe(false)
  })

  it('a single catcher is essential (never expendable)', () => {
    const roster: EligPlayer[] = [
      { playerKey: 'c1', eligiblePositions: ['C'] },
      { playerKey: 'firstbase', eligiblePositions: ['1B'] },
      { playerKey: 'of1', eligiblePositions: ['OF'] },
      { playerKey: 'util', eligiblePositions: ['2B'] }, // fills UTIL
    ]
    const exp = expendableKeys(roster, slots)
    expect(exp.has('c1')).toBe(false)
  })

  it('a surplus player is droppable when another body can cover the slot', () => {
    const roster: EligPlayer[] = [
      { playerKey: 'c1', eligiblePositions: ['C'] },
      { playerKey: 'firstbase', eligiblePositions: ['1B'] },
      { playerKey: 'of1', eligiblePositions: ['OF'] },
      { playerKey: 'of2', eligiblePositions: ['OF'] }, // covers UTIL
      { playerKey: 'flex', eligiblePositions: ['2B', 'OF'] }, // surplus, 5 bodies for 4 slots
    ]
    const exp = expendableKeys(roster, slots)
    expect(exp.has('flex')).toBe(true)
  })

  it('canFillSlots is true when every slot has a distinct eligible player', () => {
    const roster: EligPlayer[] = [
      { playerKey: 'c1', eligiblePositions: ['C'] },
      { playerKey: 'b1', eligiblePositions: ['1B'] },
      { playerKey: 'o1', eligiblePositions: ['OF'] },
      { playerKey: 'u1', eligiblePositions: ['SS'] },
    ]
    expect(canFillSlots(roster, ['C', '1B', 'OF', 'UTIL'])).toBe(true)
    expect(canFillSlots(roster.slice(0, 3), ['C', '1B', 'OF', 'UTIL'])).toBe(false) // no 4th for UTIL... actually SS removed
  })
})
