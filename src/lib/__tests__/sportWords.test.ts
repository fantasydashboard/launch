import { describe, it, expect } from 'vitest'
import { wordsFor } from '../sportWords'

describe('what each sport calls things', () => {
  /*
   * These surfaces were written when baseball was the only non-football sport, so its
   * vocabulary went in as literal text. A hockey league read all of it — "HITTERS",
   * "stream a bat", "two-start arms" — which is not cosmetic: a reader told to stream a bat
   * has been told the product does not know what sport they are playing, and stops trusting
   * the numbers printed beside it.
   */
  it('gives hockey its own words', () => {
    const w = wordsFor('hockey')
    expect(w.skaters).toBe('skaters')
    expect(w.goalies).toBe('goalies')
    expect(w.league).toBe('NHL')
  })

  it('leaves baseball exactly as it was', () => {
    const w = wordsFor('baseball')
    expect(w.skaters).toBe('hitters')
    expect(w.goalies).toBe('pitchers')
    expect(w.league).toBe('MLB')
  })

  /* The concepts translate because they are about VOLUME, not about baseball: the everyday
     body who accrues counting stats, and the scarce scheduled position you plan starts
     around. Hockey even keeps two-start goalies. */
  it('keeps the singular forms, which the copy reads as "stream a ___"', () => {
    expect(wordsFor('hockey').skater).toBe('skater')
    expect(wordsFor('hockey').goalie).toBe('goalie')
    expect(wordsFor('baseball').skater).toBe('bat')
    expect(wordsFor('baseball').goalie).toBe('arm')
  })

  /* "Bites at the apple" is plate appearances and nothing else — replaced, not translated. */
  it('drops the idiom that does not survive', () => {
    expect(wordsFor('baseball').volumeIdiom).toBe('bites at the apple')
    expect(wordsFor('hockey').volumeIdiom).not.toContain('apple')
  })

  /* Baseball for anything unrecognised, because that is where these strings came from —
     but football is present so it cannot fall through by accident. */
  it('falls back to baseball rather than to nothing', () => {
    expect(wordsFor(undefined).skaters).toBe('hitters')
    expect(wordsFor('quidditch').skaters).toBe('hitters')
    expect(wordsFor('football').league).toBe('NFL')
  })
})
