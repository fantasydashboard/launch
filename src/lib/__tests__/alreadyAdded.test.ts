import { describe, it, expect } from 'vitest'
import { isAlreadyAdded } from '../alreadyAdded'

describe('isAlreadyAdded', () => {
  const saved = [
    { platform: 'yahoo', league_id: '453.l.1', league_name: 'Wood Roasters' },
    { platform: 'sleeper', league_id: '99887766', league_name: 'Dynasty Champs' },
  ]

  it('recognises a Yahoo league already saved', () => {
    expect(isAlreadyAdded({ league_key: '453.l.1', name: 'Wood Roasters' }, saved, 'yahoo')).toBe(true)
  })

  /*
   * THE CASE THE ID CHECK GETS WRONG. Yahoo issues a new league key every season and
   * saveYahooLeague matches on NAME, rolling the saved row forward. Keyed on the id, this
   * season's "Wood Roasters" looks unadded — the picker offers it, and accepting silently
   * updates the row the user already had.
   */
  it('recognises a Yahoo league whose key changed with the new season', () => {
    expect(isAlreadyAdded({ league_key: '465.l.99', name: 'Wood Roasters' }, saved, 'yahoo')).toBe(true)
  })

  it('does not claim an unsaved Yahoo league', () => {
    expect(isAlreadyAdded({ league_key: '453.l.2', name: 'Some Other League' }, saved, 'yahoo')).toBe(false)
  })

  it('matches everything else by id, which is stable there', () => {
    expect(isAlreadyAdded({ league_id: '99887766', name: 'Renamed By Owner' }, saved, 'sleeper')).toBe(true)
    expect(isAlreadyAdded({ league_id: '11111111', name: 'Dynasty Champs' }, saved, 'sleeper')).toBe(false)
  })

  it('does not match a Yahoo name against another platform', () => {
    expect(isAlreadyAdded({ name: 'Dynasty Champs' }, saved, 'yahoo')).toBe(false)
  })

  it('ignores surrounding whitespace on a name', () => {
    expect(isAlreadyAdded({ name: '  Wood Roasters ' }, saved, 'yahoo')).toBe(true)
  })

  it('says no rather than throwing when the candidate has nothing to match on', () => {
    expect(isAlreadyAdded({}, saved, 'yahoo')).toBe(false)
    expect(isAlreadyAdded({}, saved, 'sleeper')).toBe(false)
    expect(isAlreadyAdded({ name: 'Wood Roasters' }, [], 'yahoo')).toBe(false)
  })
})
