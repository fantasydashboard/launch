import { describe, it, expect } from 'vitest'
import { isYahooIL, isEspnIL } from '../injury'

describe('isYahooIL', () => {
  it('flags IL variants, NA and DL as reserve', () => {
    expect(isYahooIL('IL10')).toBe(true)
    expect(isYahooIL('IL60')).toBe(true)
    expect(isYahooIL('IL')).toBe(true)
    expect(isYahooIL('NA')).toBe(true)
    expect(isYahooIL('DL')).toBe(true)
  })
  it('does NOT flag day-to-day, out, or healthy players (they hold an active slot)', () => {
    expect(isYahooIL('DTD')).toBe(false)
    expect(isYahooIL('O')).toBe(false)
    expect(isYahooIL('')).toBe(false)
    expect(isYahooIL(undefined)).toBe(false)
  })
})

describe('isEspnIL', () => {
  it('flags IL / IL+ / NA lineup slots', () => {
    expect(isEspnIL('IL')).toBe(true)
    expect(isEspnIL('IL+')).toBe(true)
    expect(isEspnIL('NA')).toBe(true)
  })
  it('does NOT flag bench or active slots', () => {
    expect(isEspnIL('BE')).toBe(false)
    expect(isEspnIL('Bench')).toBe(false)
    expect(isEspnIL('1B')).toBe(false)
    expect(isEspnIL('')).toBe(false)
    expect(isEspnIL(null)).toBe(false)
  })
})
