import { describe, it, expect } from 'vitest'
import { parkFactor } from '../parkFactors'

describe('parkFactor', () => {
  it('Coors (COL) boosts hitters, suppresses pitching', () => {
    const f = parkFactor('COL')
    expect(f.hit).toBeGreaterThan(1)
    expect(f.pit).toBeLessThan(1)
  })
  it('a pitcher-friendly park (SEA) suppresses hitters', () => {
    expect(parkFactor('SEA').hit).toBeLessThan(1)
  })
  it('unknown/empty team is neutral', () => {
    expect(parkFactor('ZZZ')).toEqual({ hit: 1, pit: 1 })
    expect(parkFactor('')).toEqual({ hit: 1, pit: 1 })
  })
  it('accepts an abbr variant (OAK == ATH)', () => {
    expect(parkFactor('OAK')).toEqual(parkFactor('ATH'))
  })
})
