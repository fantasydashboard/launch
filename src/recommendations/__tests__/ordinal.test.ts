import { describe, it, expect } from 'vitest'
import { ordinal, rankLabel } from '@/recommendations/ordinal'

describe('ordinal', () => {
  it('handles common cases', () => {
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(2)).toBe('2nd')
    expect(ordinal(3)).toBe('3rd')
    expect(ordinal(4)).toBe('4th')
    expect(ordinal(11)).toBe('11th')
    expect(ordinal(12)).toBe('12th')
    expect(ordinal(13)).toBe('13th')
    expect(ordinal(21)).toBe('21st')
  })
})

describe('rankLabel', () => {
  it('passes integers straight through to ordinal', () => {
    expect(rankLabel(1)).toBe('1st')
    expect(rankLabel(6)).toBe('6th')
  })

  it('renders a fractional (tied) rank as "T-Nth", not "4.5th"', () => {
    expect(rankLabel(4.5)).toBe('T-4th')
    expect(rankLabel(6.5)).toBe('T-6th')
    expect(rankLabel(1.5)).toBe('T-1st')
  })
})
