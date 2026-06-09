import { describe, it, expect } from 'vitest'
import { isLowerBetter } from '@/players/direction'

describe('isLowerBetter', () => {
  it('is true for ERA, WHIP, L by canonical id (case-insensitive)', () => {
    expect(isLowerBetter('ERA')).toBe(true)
    expect(isLowerBetter('whip')).toBe(true)
    expect(isLowerBetter('L')).toBe(true)
  })
  it('is false for counting/positive cats', () => {
    expect(isLowerBetter('HR')).toBe(false)
    expect(isLowerBetter('SV')).toBe(false)
    expect(isLowerBetter('AVG')).toBe(false)
  })
})
