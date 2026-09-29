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

/*
 * THE SEAM, TESTED. Every silent failure in this area has been two shapes meeting with nothing
 * checking the join: a reader that produces plausible output and an engine that consumes
 * nothing of it, failing as absence rather than error. yahooHockeyCategories emits the
 * HockeyCategory shape ESPN's reader emits, and the only proof of that is running the engine
 * on its output.
 */
describe('a Yahoo category league, end to end', () => {
  /* Yahoo's default NHL head-to-head set, as manualRules already documents it. */
  const YAHOO_SETTINGS = {
    stats: [
      { stat: { stat_id: 0, abbr: 'GP', display_name: 'Games Played', is_only_display_stat: '1' } },
      { stat: { stat_id: 1, abbr: 'G', display_name: 'Goals' } },
      { stat: { stat_id: 2, abbr: 'A', display_name: 'Assists' } },
      { stat: { stat_id: 4, abbr: '+/-', display_name: 'Plus/Minus' } },
      { stat: { stat_id: 5, abbr: 'PIM', display_name: 'Penalty Minutes' } },
      { stat: { stat_id: 8, abbr: 'PPP', display_name: 'Powerplay Points' } },
      { stat: { stat_id: 14, abbr: 'SOG', display_name: 'Shots on Goal' } },
      { stat: { stat_id: 31, abbr: 'HIT', display_name: 'Hits' } },
      { stat: { stat_id: 32, abbr: 'BLK', display_name: 'Blocks' } },
      { stat: { stat_id: 19, abbr: 'W', display_name: 'Wins' } },
      { stat: { stat_id: 22, abbr: 'GAA', display_name: 'Goals Against Average' } },
      { stat: { stat_id: 25, abbr: 'SV%', display_name: 'Save Percentage' } },
      { stat: { stat_id: 26, abbr: 'SHO', display_name: 'Shutouts' } },
      { stat: { stat_id: 34, abbr: 'FW', display_name: 'Faceoffs Won' } },
    ],
  }

  it('reads exactly the set the app already calls Yahoo default', async () => {
    const { YAHOO_DEFAULT_CATEGORIES } = await import('../manualRules')
    const { categories } = yahooHockeyCategories(YAHOO_SETTINGS)
    expect(categories.map((c) => c.key)).toEqual(YAHOO_DEFAULT_CATEGORIES)
  })

  it('produces values the daily category engine can actually price', async () => {
    const { hockeyDailyCategoryValue } = await import('@/today/hockeyDailyCategory')
    const { categories } = yahooHockeyCategories(YAHOO_SETTINGS)
    const skater = (k: string, g: number, a: number, sog: number) => [k, {
      playerKey: k, position: 'C', stats: { GP: 82, G: g, A: a, PLUSMINUS: 5, PIM: 20, PPP: 20, SOG: sog, HITS: 50, BLK: 30 },
    }] as const
    const goalie = (k: string, w: number, sv: number) => [k, {
      playerKey: k, position: 'G',
      /* TOI and SA are the volumes GAA and SV% are earned over — 57 of 58 real goalies carry
         TOI and all 58 carry SA, so both columns are live rather than silently empty. */
      stats: { GP: 60, W: w, GAA: 2.5, SVPCT: sv, SHO: 4, TOI: 60 * 3600, SA: 1700 },
    }] as const
    const projections = Object.fromEntries([
      skater('a', 50, 60, 300), skater('b', 30, 40, 220), skater('c', 10, 15, 90),
      goalie('g1', 35, 0.92), goalie('g2', 20, 0.905),
    ]) as any

    const values = hockeyDailyCategoryValue({ projections, categories })
    expect(Object.keys(values).sort()).toEqual(['a', 'b', 'c', 'g1', 'g2'])
    /* Not merely present — actually differentiated. A column list the engine cannot read
       returns a value for everyone and the same one, which is the bug this test exists for. */
    const perGame = (k: string) => values[k].total / values[k].games
    expect(perGame('a')).toBeGreaterThan(perGame('b'))
    expect(perGame('b')).toBeGreaterThan(perGame('c'))
    expect(perGame('g1')).toBeGreaterThan(perGame('g2'))
    expect(values.g1.side).toBe('pit')
    expect(values.a.side).toBe('hit')
  })

  /* The column we cannot price must not quietly become a column worth nothing to everybody. */
  it('leaves faceoffs out and says so, rather than scoring them zero', () => {
    const { categories, unmatched } = yahooHockeyCategories(YAHOO_SETTINGS)
    expect(categories.some((c) => c.key === 'FW')).toBe(false)
    expect(unmatched).toEqual(['Faceoffs Won'])
  })
})
