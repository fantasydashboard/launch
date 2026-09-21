import { describe, it, expect } from 'vitest'
import { picksByTeamFromOrder } from '../picksByTeam'

/**
 * The mock-draft path, which is the only way to exercise the column ledger without a live
 * draft — and therefore the way this gets tested before draft night.
 */
describe('picksByTeamFromOrder', () => {
  const order = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

  /*
   * THE ONE THAT MATTERS. In a snake the second round runs backwards, so pick 5 in a
   * four-team draft belongs to seat 4 and not seat 1. Getting this wrong files real players
   * onto the wrong rosters and the ledger reports a standing for a team nobody manages.
   */
  it('reverses the even rounds of a snake', () => {
    const out = picksByTeamFromOrder(order, 4, 'snake')
    expect(out['1']).toEqual(['a', 'h'])
    expect(out['2']).toEqual(['b', 'g'])
    expect(out['3']).toEqual(['c', 'f'])
    expect(out['4']).toEqual(['d', 'e'])
  })

  it('keeps a linear draft in order every round', () => {
    const out = picksByTeamFromOrder(order, 4, 'linear')
    expect(out['1']).toEqual(['a', 'e'])
    expect(out['4']).toEqual(['d', 'h'])
  })

  it('gives every seat an entry, so an undrafted team is empty rather than absent', () => {
    const out = picksByTeamFromOrder(['a'], 4, 'snake')
    expect(Object.keys(out).sort()).toEqual(['1', '2', '3', '4'])
    expect(out['3']).toEqual([])
  })

  /* A gap in the order is an unmade pick. Seating it would shift every later pick one place
     and quietly reassign the whole back half of the draft. */
  it('skips a hole in the order without shifting anyone', () => {
    const out = picksByTeamFromOrder(['a', null, 'c', 'd'], 4, 'snake')
    expect(out['1']).toEqual(['a'])
    expect(out['2']).toEqual([])
    expect(out['3']).toEqual(['c'])
    expect(out['4']).toEqual(['d'])
  })

  it('handles a partial round', () => {
    const out = picksByTeamFromOrder(['a', 'b'], 4, 'snake')
    expect(out['1']).toEqual(['a'])
    expect(out['2']).toEqual(['b'])
    expect(out['4']).toEqual([])
  })

  it('handles more rounds than one', () => {
    const long = Array.from({ length: 30 }, (_, i) => `p${i}`)
    const out = picksByTeamFromOrder(long, 10, 'snake')
    expect(Object.values(out).reduce((s, l) => s + l.length, 0)).toBe(30)
    expect(out['1']).toEqual(['p0', 'p19', 'p20'])   // the turn: back-to-back at the wrap
  })

  it('returns nothing rather than guessing when the league size is unknown', () => {
    expect(picksByTeamFromOrder(order, 0, 'snake')).toEqual({})
  })

  it('survives an empty order', () => {
    expect(picksByTeamFromOrder([], 4, 'snake')).toEqual({ 1: [], 2: [], 3: [], 4: [] })
  })
})
