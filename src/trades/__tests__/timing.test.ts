import { describe, it, expect } from 'vitest'
import { computeTiming } from '../timing'

describe('computeTiming', () => {
  it('flags an overperformer (perceived ≫ ros) as SELL HIGH', () => {
    const t = computeTiming(85, 60, null, false)
    expect(t.dir).toBe('sell')
    expect(t.score).toBeGreaterThan(0)
    expect(t.luckConfirmed).toBe(false)
  })

  it('flags an underperformer (perceived ≪ ros) as BUY LOW', () => {
    const t = computeTiming(45, 75, null, false)
    expect(t.dir).toBe('buy')
  })

  it('stays neutral when perceived ≈ ros and no luck', () => {
    expect(computeTiming(70, 68, null, false).dir).toBeNull()
  })

  it('lets lucky xStats CONFIRM a sell-high (and marks it confirmed)', () => {
    const t = computeTiming(82, 62, 'over', true)
    expect(t.dir).toBe('sell')
    expect(t.luckConfirmed).toBe(true)
  })

  it('lets xStats INDEPENDENTLY trigger a signal when value divergence is small', () => {
    // At-projection by value, but strongly lucky per xStats -> still a sell-high.
    const t = computeTiming(70, 69, 'over', true)
    expect(t.dir).toBe('sell')
    expect(t.luckConfirmed).toBe(true)
  })

  it('does not mark luckConfirmed when luck opposes the value divergence', () => {
    // Big overperformer by value, but xStats say unlucky -> sell by value, not confirmed.
    const t = computeTiming(88, 55, 'under', false)
    expect(t.dir).toBe('sell') // value divergence (33) dominates the small unlucky push
    expect(t.luckConfirmed).toBe(false)
  })
})
