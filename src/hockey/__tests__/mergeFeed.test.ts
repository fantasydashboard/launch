import { describe, it, expect } from 'vitest'
import { mergeFeed } from '../mergeFeed'

/*
 * THE FOUR CALL SITES THAT DISAGREED.
 *
 * mergeHockeyProjections takes the feed's parts as separate, optional arguments, each
 * documented as a graceful degradation — "losing this costs accuracy, never a board". Two of
 * the four callers took that invitation without meaning to: useHockeyRankings and
 * useHockeyBoard passed historyGames and goalieProjections, useHockeyValue and useHockeyWire
 * passed neither. So the Today page and The Wire priced the same players, in the same league,
 * differently from the rankings and draft boards.
 *
 * Every caller wants the same thing — merge the whole feed — so there is now one function that
 * does it and no argument list to under-fill.
 */
const feed = (over: Record<string, unknown> = {}) => ({
  espn: [], rates: [], season: '2027', started: true, agesKnown: 0, goalies: [],
  historyGames: new Map<number, number>(), goalieProjections: [], ...over,
}) as any

describe('mergeFeed', () => {
  it('hands every part of the feed to the merge, not just the two easy ones', () => {
    const history = new Map([[8485391, 12]])
    const goalies = [{ playerId: 1, name: 'A Goalie', starts: 40, wins: 22, saves: 1000,
                       goalsAgainst: 90, shutouts: 3, savePct: 0.917, shotsAgainst: 1090 }]
    const seen: any[] = []
    mergeFeed(feed({ historyGames: history, goalieProjections: goalies }), undefined,
      (input) => { seen.push(input); return { projections: {} } as any })
    expect(seen[0].historyGames).toBe(history)
    expect(seen[0].goalieProjections).toBe(goalies)
    expect(seen[0].espn).toBeDefined()
    expect(seen[0].rates).toBeDefined()
  })

  /* The rankings board narrows `missing` to the columns its league scores; nothing else does. */
  it('passes the league keys through when a caller has them', () => {
    const seen: any[] = []
    mergeFeed(feed(), ['G', 'A'], (input) => { seen.push(input); return { projections: {} } as any })
    expect(seen[0].leagueKeys).toEqual(['G', 'A'])
  })

  it('leaves league keys out when a caller has none, rather than inventing an empty list', () => {
    const seen: any[] = []
    mergeFeed(feed(), undefined, (input) => { seen.push(input); return { projections: {} } as any })
    expect(seen[0].leagueKeys).toBeUndefined()
  })

  it('survives the empty feed the composables hold before anything loads', () => {
    expect(() => mergeFeed(feed())).not.toThrow()
  })
})
