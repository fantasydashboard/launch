import { describe, it, expect } from 'vitest'
import { startableRankTone, startableRankBar, startableRankLabel } from '../startableRankTone'
import { leagueRankTone } from '../leagueRankTone'

describe('startableRankTone', () => {
  /*
   * THE BAND THAT MATTERS. This scale's whole reason for existing is that "outside the
   * startable pool" is a thing it can say and leagueRankTone cannot — so the two bands above
   * 1 must be reachable, and the boundary at exactly the pool size must still read as a
   * starter rather than a hole.
   */
  it('reaches every band, and puts the last starter inside the pool', () => {
    const tones = [0.1, 0.5, 0.9, 1.2, 2.0].map(startableRankTone)
    expect(new Set(tones).size).toBe(5)
    expect(startableRankTone(1)).toBe(startableRankTone(0.9))
    expect(startableRankTone(1.01)).not.toBe(startableRankTone(1))
  })

  it('is monotonic — a worse rank is never a better colour', () => {
    const order = [0.1, 0.5, 0.9, 1.2, 2.0].map(startableRankTone)
    for (let i = 1; i < order.length; i++) expect(order[i]).not.toBe(order[i - 1])
  })

  /*
   * The two scales must not be confusable. leagueRankTone takes rank/teams, which can never
   * exceed 1; feeding it a startable fraction of 1.4 silently reads as "bottom fifth" instead
   * of "outside the pool", which is the substitution that shipped once already.
   */
  it('is a different scale from the league-rank one, at the same input', () => {
    expect(startableRankTone(0.5)).not.toBe(leagueRankTone(5, 10))
  })

  it('styles an unknown as absent rather than bad', () => {
    for (const bad of [null, 0, -1, NaN, Infinity]) {
      expect(startableRankTone(bad as number)).toContain('Muted')
      expect(startableRankBar(bad as number)).toContain('Muted')
    }
  })

  it('says what the colour means, with the denominator in it', () => {
    expect(startableRankLabel(3, 48, 'D')).toContain('48 D start')
    expect(startableRankLabel(3, 48, 'D')).toContain('best starts')
    /* 60th of 48 seats is a reach, not a disaster — the red band starts at half again the
       pool, so it is reserved for a man who is nowhere near a lineup. */
    expect(startableRankLabel(60, 48, 'D')).toContain('you are reaching')
    expect(startableRankLabel(90, 48, 'D')).toContain('well outside')
    expect(startableRankLabel(3, null, 'D')).toBe('')
  })
})
