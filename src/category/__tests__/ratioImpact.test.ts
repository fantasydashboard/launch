import { describe, it, expect } from 'vitest'
import { ratioImpact } from '../ratioImpact'

/**
 * THE CALL EVERY COUNTING-STAT MODEL GETS WRONG.
 *
 * In a league with save percentage as a column, starting a goalie can LOSE you that column. He
 * brings saves, so every additive model scores him positive and says start him. If his expected
 * rate is below what you are already carrying, he drags the ratio down — and if the column was
 * close, that is the column.
 *
 * This is the only place in the product where a start can be worth a negative number, and it
 * recurs nightly.
 */

const base = {
  myRatio: 0.910, theirRatio: 0.905, myVolume: 400,
  sigma: 0.004, days: 3, lowerIsBetter: false,
}

describe('ratioImpact — save percentage', () => {
  it('helps when the man is better than what you already carry', () => {
    const r = ratioImpact({ ...base, contributorRate: 0.930, contributorVolume: 30 })
    expect(r.direction).toBe('helps')
    expect(r.deltaWinPct!).toBeGreaterThan(0)
    expect(r.newRatio!).toBeGreaterThan(base.myRatio)
  })

  /* The case the board has always got backwards. */
  it('HURTS when the man is worse than what you already carry', () => {
    const r = ratioImpact({ ...base, contributorRate: 0.870, contributorVolume: 30 })
    expect(r.direction).toBe('hurts')
    expect(r.deltaWinPct!).toBeLessThan(0)
    expect(r.newRatio!).toBeLessThan(base.myRatio)
  })

  it('moves the ratio further the more volume he takes on', () => {
    const light = ratioImpact({ ...base, contributorRate: 0.870, contributorVolume: 15 })
    const heavy = ratioImpact({ ...base, contributorRate: 0.870, contributorVolume: 45 })
    expect(heavy.newRatio!).toBeLessThan(light.newRatio!)
    expect(heavy.deltaWinPct!).toBeLessThan(light.deltaWinPct!)
  })

  it('is neutral when he is exactly what you are carrying', () => {
    const r = ratioImpact({ ...base, contributorRate: base.myRatio, contributorVolume: 30 })
    expect(r.direction).toBe('neutral')
    expect(r.deltaWinPct!).toBeCloseTo(0, 9)
  })
})

describe('ratioImpact — a column where lower wins, like GAA', () => {
  const gaa = { myRatio: 2.60, theirRatio: 2.90, myVolume: 20, sigma: 0.25, days: 3, lowerIsBetter: true }

  it('helps when he concedes less than you are carrying', () => {
    const r = ratioImpact({ ...gaa, contributorRate: 1.80, contributorVolume: 1 })
    expect(r.direction).toBe('helps')
    expect(r.deltaWinPct!).toBeGreaterThan(0)
  })

  it('hurts when he concedes more', () => {
    const r = ratioImpact({ ...gaa, contributorRate: 4.20, contributorVolume: 1 })
    expect(r.direction).toBe('hurts')
    expect(r.deltaWinPct!).toBeLessThan(0)
  })
})

describe('ratioImpact — what it does without the denominator', () => {
  /*
   * Yahoo and ESPN report the ratio because the league scores it; they do not always report the
   * volume underneath. The SIGN of the decision only needs his rate against yours, so that is
   * still answered — the magnitude is not, and saying so beats inventing one.
   */
  it('still names the direction when the volume is unknown', () => {
    const r = ratioImpact({ ...base, myVolume: null, contributorRate: 0.870, contributorVolume: 30 })
    expect(r.direction).toBe('hurts')
    expect(r.deltaWinPct).toBeNull()
    expect(r.newRatio).toBeNull()
  })

  it('refuses to guess when he brings no volume either', () => {
    const r = ratioImpact({ ...base, contributorRate: 0.870, contributorVolume: 0 })
    expect(r.direction).toBe('neutral')
    expect(r.deltaWinPct).toBe(0)
  })

  it('degrades to neutral on junk input rather than poisoning the board', () => {
    const r = ratioImpact({ ...base, contributorRate: NaN, contributorVolume: 30 })
    expect(r.direction).toBe('neutral')
    expect(r.deltaWinPct).toBe(0)
  })
})

describe('ratioImpact — the size of the mistake', () => {
  it('costs most when the column is close', () => {
    const close = ratioImpact({ ...base, myRatio: 0.9100, theirRatio: 0.9100, contributorRate: 0.860, contributorVolume: 35 })
    const settled = ratioImpact({ ...base, myRatio: 0.9100, theirRatio: 0.8000, contributorRate: 0.860, contributorVolume: 35 })
    expect(close.deltaWinPct!).toBeLessThan(settled.deltaWinPct!)
  })
})
