import { describe, it, expect } from 'vitest'
import { isLowerBetter } from '@/players/direction'

describe('isLowerBetter', () => {
  it('is true for ERA, WHIP, L by canonical id (case-insensitive)', () => {
    expect(isLowerBetter('ERA')).toBe(true)
    expect(isLowerBetter('whip')).toBe(true)
    expect(isLowerBetter('L')).toBe(true)
  })
  it('is true for Yahoo MLB numeric stat_ids for ratio categories', () => {
    expect(isLowerBetter('26')).toBe(true)
    expect(isLowerBetter('27')).toBe(true)
  })
  it('is false for counting/positive cats', () => {
    expect(isLowerBetter('HR')).toBe(false)
    expect(isLowerBetter('SV')).toBe(false)
    expect(isLowerBetter('AVG')).toBe(false)
    expect(isLowerBetter('BB')).toBe(false)
  })
})
