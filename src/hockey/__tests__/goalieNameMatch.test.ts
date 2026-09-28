import { describe, it, expect } from 'vitest'
import { goalieMatcher } from '../goalieNameMatch'

const g = (name: string, starts = 40) => ({ name, starts })

describe('goalieMatcher', () => {
  it('matches a goalie both feeds spell the same way', () => {
    const m = goalieMatcher([g('Connor Hellebuyck')])
    expect(m.find('Connor Hellebuyck')?.name).toBe('Connor Hellebuyck')
  })

  /*
   * THE ONE THAT MATTERED. ESPN says Sam, the NHL says Samuel. The miss did not drop him from
   * the board — it left him on ESPN's projection of 33 wins against our 17.9, which made a
   * tandem goalie the best goalie on it.
   */
  it('matches a shortened given name to the same surname', () => {
    const m = goalieMatcher([g('Samuel Montembeault', 36.5)])
    expect(m.find('Sam Montembeault')?.starts).toBe(36.5)
  })

  it('matches in the other direction too', () => {
    const m = goalieMatcher([g('Sam Montembeault', 36.5)])
    expect(m.find('Samuel Montembeault')?.starts).toBe(36.5)
  })

  /*
   * REFUSING IS THE POINT. Handing one goalie another's projected workload is worse than
   * leaving him on ESPN's number, because the board would state it just as confidently.
   */
  it('refuses a surname two goalies answer to', () => {
    const m = goalieMatcher([g('Mackenzie Blackwood'), g('Jordan Blackwood')])
    expect(m.find('M. Blackwood')).toBeUndefined()
    expect(m.ambiguousSurnames).toBe(1)
  })

  it('still matches an ambiguous surname on an exact full name', () => {
    const m = goalieMatcher([g('Mackenzie Blackwood', 50), g('Jordan Blackwood', 10)])
    expect(m.find('Mackenzie Blackwood')?.starts).toBe(50)
  })

  it('matches across diacritics and punctuation', () => {
    const m = goalieMatcher([g('Filip Gustavsson')])
    expect(m.find('Filip Gustavsson')?.name).toBe('Filip Gustavsson')
  })

  it('returns nothing for a goalie we have no projection for', () => {
    const m = goalieMatcher([g('Connor Hellebuyck')])
    expect(m.find('Some Rookie')).toBeUndefined()
  })

  it('ignores entries with no name rather than indexing undefined', () => {
    const m = goalieMatcher([{ name: undefined } as any, g('Juuse Saros')])
    expect(m.find('Juuse Saros')?.name).toBe('Juuse Saros')
    expect(m.find('')).toBeUndefined()
  })
})
