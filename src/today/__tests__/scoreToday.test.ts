import { describe, it, expect } from 'vitest'
import { scoreToday } from '../scoreToday'

describe('scoreToday', () => {
  it('multiplies base by park × sp factor', () => {
    const r = scoreToday(10, { parkFactor: 1.1, spFactor: 1.1 })
    expect(r.value).toBeCloseTo(10 * 1.1 * 1.1, 3)
  })
  it('clamps the combined multiplier to 0.7–1.3', () => {
    expect(scoreToday(10, { parkFactor: 1.5, spFactor: 1.5 }).value).toBeCloseTo(13, 3)
    expect(scoreToday(10, { parkFactor: 0.5, spFactor: 0.5 }).value).toBeCloseTo(7, 3)
  })
  it('missing factors default to 1.0 (base only)', () => {
    expect(scoreToday(10, {}).value).toBe(10)
  })
  it('buckets the multiplier into 0..6 blocks', () => {
    expect(scoreToday(10, { parkFactor: 1.3, spFactor: 1.0 }).bucket).toBe(6)
    expect(scoreToday(10, { parkFactor: 0.7, spFactor: 1.0 }).bucket).toBe(0)
    expect(scoreToday(10, {}).bucket).toBe(3)
  })
})
