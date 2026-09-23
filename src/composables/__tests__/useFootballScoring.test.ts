import { describe, it, expect } from 'vitest'
import { scoringLabel } from '../useFootballScoring'

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
