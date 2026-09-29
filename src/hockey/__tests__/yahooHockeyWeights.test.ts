import { describe, it, expect } from 'vitest'
import { yahooHockeyWeights } from '../yahooHockeyWeights'

const cat = (id: number, display: string) => ({ stat: { stat_id: id, display_name: display } })

describe('yahooHockeyWeights', () => {
  it('maps Yahoo skater columns onto the keys the projections use', () => {
    const { weights } = yahooHockeyWeights(
      [cat(1, 'G'), cat(2, 'A'), cat(8, 'PIM'), cat(14, 'SOG')],
      { 1: 3, 2: 2, 8: 0.5, 14: 0.3 },
    )
    expect(weights).toEqual({ G: 3, A: 2, PIM: 0.5, SOG: 0.3 })
  })

  it('maps goalie columns too', () => {
    const { weights } = yahooHockeyWeights(
      [cat(19, 'W'), cat(22, 'GA'), cat(23, 'SV'), cat(25, 'SHO')],
      { 19: 4, 22: -1, 23: 0.2, 25: 3 },
    )
    expect(weights).toEqual({ W: 4, GA: -1, SV: 0.2, SHO: 3 })
  })

  /* Yahoo writes some columns long and some short depending on the league's age. */
  it('accepts the long spellings', () => {
    const { weights } = yahooHockeyWeights(
      [cat(1, 'Goals'), cat(2, 'Assists'), cat(31, 'Hits'), cat(32, 'Blocks')],
      { 1: 3, 2: 2, 31: 0.3, 32: 0.5 },
    )
    expect(weights).toEqual({ G: 3, A: 2, HITS: 0.3, BLK: 0.5 })
  })

  it('maps plus-minus however it is punctuated', () => {
    for (const name of ['+/-', 'Plus/Minus', 'PLUSMINUS']) {
      const { weights } = yahooHockeyWeights([cat(4, name)], { 4: 0.5 })
      expect(weights).toEqual({ PLUSMINUS: 0.5 })
    }
  })

  /*
   * A ZERO WEIGHT IS NOT A SCORED COLUMN. Yahoo lists every stat it could score and zeroes the
   * ones this league does not, so keeping them would turn "not scored" into "worth nothing",
   * which reads the same downstream but means something different when counting a league's
   * columns.
   */
  it('drops columns the league scores at zero', () => {
    const { weights } = yahooHockeyWeights([cat(1, 'G'), cat(31, 'HIT')], { 1: 3, 31: 0 })
    expect(weights).toEqual({ G: 3 })
  })

  /*
   * REPORTED, NOT SWALLOWED. A stat we cannot name is a column this league scores and we do
   * not — the board is then quietly ranked on rules nobody plays by. The caller gets the list
   * so the gap is visible rather than inferred from a board that looks fine.
   */
  it('reports columns it could not name rather than dropping them silently', () => {
    const { weights, unmatched } = yahooHockeyWeights(
      [cat(1, 'G'), cat(60, 'Faceoffs Won')], { 1: 3, 60: 0.1 },
    )
    expect(weights).toEqual({ G: 3 })
    expect(unmatched).toEqual(['Faceoffs Won'])
  })

  it('survives missing or malformed settings', () => {
    expect(yahooHockeyWeights(undefined, undefined).weights).toEqual({})
    expect(yahooHockeyWeights([], {}).weights).toEqual({})
    expect(yahooHockeyWeights([cat(1, 'G')], undefined).weights).toEqual({})
    expect(yahooHockeyWeights(undefined, { 1: 3 }).weights).toEqual({})
  })

  it('ignores a modifier whose stat the league never declared', () => {
    const { weights } = yahooHockeyWeights([cat(1, 'G')], { 1: 3, 99: 5 })
    expect(weights).toEqual({ G: 3 })
  })

  it('reads a string weight, which Yahoo sends for some leagues', () => {
    const { weights } = yahooHockeyWeights([cat(1, 'G')], { 1: '3.5' } as any)
    expect(weights).toEqual({ G: 3.5 })
  })
})

/*
 * Yahoo does not send one shape. The flat map is what normalizeYahooWeights assumes; the API
 * more often wraps the modifiers in `{ stats: [...] }`. Getting this wrong fails silently —
 * an empty weight map looks exactly like a league that published no scoring.
 */
describe('yahooHockeyWeights modifier shapes', () => {
  const cats = [{ stat: { stat_id: 1, display_name: 'G' } }, { stat: { stat_id: 2, display_name: 'A' } }]
  const expected = { G: 3, A: 2 }

  it('accepts a flat statId map', () =>
    expect(yahooHockeyWeights(cats, { 1: 3, 2: 2 }).weights).toEqual(expected))

  it('accepts the { stats: [...] } wrapper the Fantasy API returns', () =>
    expect(yahooHockeyWeights(cats, {
      stats: [{ stat: { stat_id: 1, value: 3 } }, { stat: { stat_id: 2, value: 2 } }],
    }).weights).toEqual(expected))

  it('accepts a bare array of modifiers', () =>
    expect(yahooHockeyWeights(cats, [
      { stat: { stat_id: 1, value: '3' } }, { stat: { stat_id: 2, value: '2' } },
    ]).weights).toEqual(expected))

  it('yields nothing for a shape it does not recognise, rather than guessing', () =>
    expect(yahooHockeyWeights(cats, 'nonsense').weights).toEqual({}))
})

/*
 * THE SAME WRAPPER, ON THE OTHER SIDE.
 *
 * The modifiers were taught to accept Yahoo's `{ stats: [...] }` wrapper and the CATEGORIES
 * were not — so `statCategories.length` read undefined on the real response and the function
 * bailed with an empty map before looking at anything. Handling one side of a symmetric API
 * and not the other is its own bug, and it presents identically to a league with no scoring.
 */
describe('yahooHockeyWeights category shapes', () => {
  const mods = { 1: 3, 2: 2 }
  const expected = { G: 3, A: 2 }
  const stats = [
    { stat: { stat_id: 1, display_name: 'G' } },
    { stat: { stat_id: 2, display_name: 'A' } },
  ]

  it('accepts a bare array of categories', () =>
    expect(yahooHockeyWeights(stats, mods).weights).toEqual(expected))

  it('accepts the { stats: [...] } wrapper the Fantasy API returns', () =>
    expect(yahooHockeyWeights({ stats } as any, mods).weights).toEqual(expected))

  it('handles both sides wrapped at once, which is the real response', () =>
    expect(yahooHockeyWeights({ stats } as any, {
      stats: [{ stat: { stat_id: 1, value: '3' } }, { stat: { stat_id: 2, value: '2' } }],
    }).weights).toEqual(expected))

  it('yields nothing for a category shape it does not recognise', () =>
    expect(yahooHockeyWeights('nonsense' as any, mods).weights).toEqual({}))
})
