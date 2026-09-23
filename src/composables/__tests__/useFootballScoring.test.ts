import { describe, it, expect } from 'vitest'
import { scoringLabel } from '../useFootballScoring'
import { resolveFootballScoring } from '@/football/footballScoring'

/*
 * The label exists because the fallback has to be legible on the page. A board built from the
 * league's own rules and a board built from our defaults look identical, and only one of them
 * is telling the reader about their league.
 */
describe('scoringLabel', () => {
  it('names the league as the source when the league answered', () => {
    expect(scoringLabel('sleeper')).toBe("your league's scoring")
    expect(scoringLabel('espn')).toBe("your league's scoring")
    expect(scoringLabel('yahoo')).toBe("your league's scoring")
  })

  it('says plainly when it is our default instead', () => {
    expect(scoringLabel('default')).toBe('standard scoring (full PPR)')
  })
})

/* The guard behind useFootballScoring's sport check: a non-football league must never come
   back tagged with a platform, because that tag is what scoringLabel turns into the words
   "your league's scoring". */
describe('a non-football league', () => {
  it('resolves to football defaults rather than its own sport\'s weights', () => {
    const r = resolveFootballScoring({
      platform: null,
      sleeperScoringSettings: { R: 1, HR: 4, RBI: 1, SB: 2 },
    })
    expect(r.source).toBe('default')
    expect(r.weights).not.toHaveProperty('HR')
  })
})
