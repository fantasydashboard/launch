import { describe, it, expect } from 'vitest'
import { yahooHockeyCategories } from '../yahooHockeyWeights'

const key = (cs: { key: string }[]) => cs.map((c) => c.key)

describe('yahooHockeyCategories', () => {
  /* The shape the Fantasy API actually returns, per useFullSeasonCategoryData. */
  it('reads the columns out of the wrapper Yahoo sends them in', () => {
    const { categories } = yahooHockeyCategories({
      stats: [
        { stat: { stat_id: 1, display_name: 'G' } },
        { stat: { stat_id: 2, display_name: 'A' } },
        { stat: { stat_id: 4, display_name: '+/-' } },
        { stat: { stat_id: 14, display_name: 'SOG' } },
      ],
    })
    expect(key(categories)).toEqual(['G', 'A', 'PLUSMINUS', 'SOG'])
  })

  it('reads a bare array of bare entries just as well', () => {
    const { categories } = yahooHockeyCategories([
      { stat_id: 1, display_name: 'G' },
      { stat_id: 31, display_name: 'Hits' },
    ])
    expect(key(categories)).toEqual(['G', 'HITS'])
  })

  /*
   * DISPLAY-ONLY STATS ARE NOT CATEGORIES. Yahoo lists games played, and in baseball H/AB and
   * innings, with is_only_display_stat set — they appear on a matchup page and decide nothing.
   * Counting one as a column would standardise the board on a stat nobody competes in, and
   * both other readers of this payload filter it. It arrives as a string in some responses and
   * a number in others.
   */
  it('leaves out the stats Yahoo marks display-only', () => {
    const { categories } = yahooHockeyCategories([
      { stat: { stat_id: 0, display_name: 'GP', is_only_display_stat: '1' } },
      { stat: { stat_id: 1, display_name: 'G' } },
      { stat: { stat_id: 29, display_name: 'GS', is_only_display_stat: 1 } },
    ])
    expect(key(categories)).toEqual(['G'])
  })

  /*
   * Direction comes from hockey's own table, not from players/direction.ts, whose set is
   * ERA/WHIP/L/CS — baseball's columns, and it would call goals-against a good thing.
   */
  it('knows which hockey columns are won by the lower number', () => {
    const { categories } = yahooHockeyCategories([
      { stat: { stat_id: 22, display_name: 'GA' } },
      { stat: { stat_id: 26, display_name: 'GAA' } },
      { stat: { stat_id: 20, display_name: 'L' } },
      { stat: { stat_id: 1, display_name: 'G' } },
      { stat: { stat_id: 27, display_name: 'SV%' } },
    ])
    const reverse = Object.fromEntries(categories.map((c) => [c.key, c.reverse]))
    expect(reverse).toEqual({ GA: true, GAA: true, L: true, G: false, SVPCT: false })
  })

  it('matches on abbr when the display name is one we do not carry', () => {
    const { categories } = yahooHockeyCategories([
      { stat: { stat_id: 14, abbr: 'SOG', display_name: 'Shots on Goal Total' } },
    ])
    expect(key(categories)).toEqual(['SOG'])
  })

  /*
   * Named rather than swallowed. Faceoffs are the standing example: Yahoo scores them and no
   * projection here carries one, so a board that quietly drops the column ranks on nine of the
   * league's ten and looks exactly like a board that is right.
   */
  it('reports the columns it cannot name instead of dropping them silently', () => {
    const { categories, unmatched } = yahooHockeyCategories([
      { stat: { stat_id: 1, display_name: 'G' } },
      { stat: { stat_id: 60, display_name: 'Faceoffs Won' } },
    ])
    expect(key(categories)).toEqual(['G'])
    expect(unmatched).toEqual(['Faceoffs Won'])
  })

  it('keeps one entry per column when Yahoo lists a stat twice', () => {
    const { categories } = yahooHockeyCategories([
      { stat: { stat_id: 1, display_name: 'G' } },
      { stat: { stat_id: 1, display_name: 'Goals' } },
    ])
    expect(key(categories)).toEqual(['G'])
  })

  it('carries the league own stat id, so a surface can key on it', () => {
    const { categories } = yahooHockeyCategories([{ stat: { stat_id: 14, display_name: 'SOG' } }])
    expect(categories[0].statId).toBe(14)
  })

  it('returns nothing for a payload it cannot read, rather than inventing columns', () => {
    for (const bad of [null, undefined, {}, [], 'nope', { stats: 'nope' }]) {
      expect(yahooHockeyCategories(bad).categories).toEqual([])
    }
  })
})
