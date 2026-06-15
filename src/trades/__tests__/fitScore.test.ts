import { describe, it, expect } from 'vitest'
import { computeFit, fitBand, FIT_WEIGHTS_POSITION, type FitDeal } from '../fitScore'

const base: FitDeal = {
  getStr: {}, giveStr: {}, myNeed: {}, theirNeed: {}, statIds: ['R', 'SV'],
  myPosNeed: 0, theirPosNeed: 0, getVal: 50, giveVal: 50,
}

describe('computeFit', () => {
  it('a deal that fills your hole and helps a needed category scores high for you', () => {
    const f = computeFit({
      ...base,
      getStr: { R: 2 }, giveStr: {}, myNeed: { R: 0.8, SV: 0 },
      myPosNeed: 0.5, theirPosNeed: 0.5,
    }, FIT_WEIGHTS_POSITION)
    expect(f.you).toBeGreaterThan(0.6)
  })

  it('shipping the bigger name to pad a non-need lands below half for you, high for them', () => {
    // You give value (90) for less (74), netting a category you do NOT need; they need it.
    const f = computeFit({
      ...base,
      getStr: { R: 0 }, giveStr: { SV: 2 }, // you ship SV strength
      myNeed: { R: 0.8, SV: 0 }, // you need R, not SV
      theirNeed: { SV: 0.8, R: 0 }, // they need SV (your give)
      getVal: 74, giveVal: 90,
    }, FIT_WEIGHTS_POSITION)
    expect(f.you).toBeLessThan(0.5)
    expect(f.them).toBeGreaterThan(f.you)
  })

  it('an even, category-neutral, hole-less deal sits near the neutral band', () => {
    const f = computeFit(base, FIT_WEIGHTS_POSITION)
    expect(fitBand(f.you)).toBe(2)
    expect(fitBand(f.them)).toBe(2)
  })
})
