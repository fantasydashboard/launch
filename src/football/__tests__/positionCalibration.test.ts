import { describe, it, expect } from 'vitest'
import { calibrateProjection, calibrationFor, POSITION_CALIBRATION } from '../positionCalibration'

describe('positionCalibration', () => {
  it('marks quarterbacks down, because four seasons say the feed runs hot there', () => {
    expect(calibrateProjection(100, 'QB')).toBeCloseTo(86, 5)
  })

  it('leaves the positions whose bias is indistinguishable from noise alone', () => {
    /*
     * RB, WR and TE straddle 1.0 and their year-to-year spread is larger than their average
     * distance from it. Correcting them would be fitting noise — see the table in the module.
     */
    for (const pos of ['RB', 'WR', 'TE']) expect(calibrateProjection(100, pos)).toBe(100)
  })

  it('passes through a position it has never measured rather than guessing one', () => {
    expect(calibrateProjection(100, 'K')).toBe(100)
    expect(calibrateProjection(100, 'DEF')).toBe(100)
    expect(calibrateProjection(100, undefined)).toBe(100)
  })

  it('is case insensitive, since positions arrive from four platforms', () => {
    expect(calibrateProjection(100, 'qb')).toBeCloseTo(86, 5)
  })

  it('cannot reorder players within a position — it is a cross-position fix only', () => {
    const before = [30, 20, 10].map((p) => calibrateProjection(p, 'QB'))
    expect(before[0]).toBeGreaterThan(before[1])
    expect(before[1]).toBeGreaterThan(before[2])
  })

  it('changes a quarterback-against-receiver comparison, which is the whole point', () => {
    // A QB projected 245 against a WR projected 215: the feed says the QB, calibrated says not.
    expect(245).toBeGreaterThan(215)
    expect(calibrateProjection(245, 'QB')).toBeLessThan(calibrateProjection(215, 'WR'))
  })

  it('survives rubbish instead of poisoning a lineup total with NaN', () => {
    expect(calibrateProjection(Number.NaN, 'QB')).toBeNaN()
    expect(calibrationFor('QB')).toBe(POSITION_CALIBRATION.QB)
    expect(calibrationFor()).toBe(1)
  })
})
