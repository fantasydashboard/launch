import { describe, it, expect } from 'vitest'
import { leagueRankTone, leagueRankBar, leagueRankLabel, leagueRankWidth } from '../leagueRankTone'

const GREEN = ['text-[#7ee787]', 'text-[#3fb950]']
const BAD = ['text-[#d29922]', 'text-[#f85149]']

describe('where a starter ranks against the league', () => {
  /*
   * The bug: this panel was coloured by a scale built for a startable-pool fraction, whose
   * amber and red bands only trigger above 1. rank/teams never exceeds 1, so those two bands
   * were unreachable and the scale collapsed to green/green/grey — sixth of ten read green,
   * and last of ten looked the same as seventh.
   */
  it('does not call the sixth of ten teams good', () => {
    expect(GREEN).not.toContain(leagueRankTone(6, 10))
    expect(BAD).not.toContain(leagueRankTone(6, 10))   // nor bad — it is the middle
  })

  it('has a colour for being bad, which the old scale never reached', () => {
    expect(BAD).toContain(leagueRankTone(8, 10))
    expect(BAD).toContain(leagueRankTone(10, 10))
    // And last is visibly worse than merely below-average.
    expect(leagueRankTone(10, 10)).not.toBe(leagueRankTone(7, 10))
  })

  it('still calls the top of the league good', () => {
    expect(leagueRankTone(1, 10)).toBe('text-[#7ee787]')
    expect(GREEN).toContain(leagueRankTone(3, 10))
  })

  it('uses every band, so the colour carries information', () => {
    const tones = new Set(Array.from({ length: 10 }, (_, i) => leagueRankTone(i + 1, 10)))
    expect(tones.size).toBe(5)
  })

  /* Fifths of the league, not fixed rank numbers: sixth is mid-table in a twelve-team league
     and below the middle in a ten-team one, and the colour has to know the difference. */
  it('scales with league size rather than counting places', () => {
    // 6 of 20 is the top third of the league; 6 of 10 is the middle of it.
    expect(leagueRankTone(6, 20)).not.toBe(leagueRankTone(6, 10))
    // 6 of 12 and 6 of 10 are both mid-table, and correctly read the same.
    expect(leagueRankTone(6, 12)).toBe(leagueRankTone(6, 10))
    expect(GREEN).toContain(leagueRankTone(4, 20))
    expect(BAD).toContain(leagueRankTone(4, 5))
  })

  it('pairs the bar with the text', () => {
    expect(leagueRankBar(1, 10)).toContain('7ee787')
    expect(leagueRankBar(10, 10)).toContain('f85149')
  })

  it('says what the colour means, so it is checkable rather than decorative', () => {
    expect(leagueRankLabel(6, 10)).toBe('6 of 10 — middle of the league')
    expect(leagueRankLabel(10, 10)).toContain('weakest')
  })

  it('is safe on an unknown league size', () => {
    expect(leagueRankTone(1, 0)).toBe('text-dark-textMuted/60')
    expect(leagueRankBar(1, 1)).toBe('bg-dark-textMuted/40')
    expect(leagueRankLabel(1, 0)).toBe('')
    expect(leagueRankWidth(1, 1)).toBe(100)
  })

  it('draws the bar full at first and shortest at last', () => {
    expect(leagueRankWidth(1, 10)).toBe(100)
    expect(leagueRankWidth(10, 10)).toBe(10)
  })
})
