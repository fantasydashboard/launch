import { describe, it, expect } from 'vitest'
import { computeRosterValue } from '../value'
import type { CatSpec, ValuePoolPlayer } from '../types'

const cats: CatSpec[] = [
  { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'SB', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'R', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'RBI', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'AVG', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'ERA', lowerIsBetter: true, side: 'pit', isRatio: true, volumeStatId: 'IP' },
]

function hitter(key: string, hr: number, sb: number, r: number, rbi: number, avg: number): ValuePoolPlayer {
  return { playerKey: key, position: 'OF', stats: { HR: hr, SB: sb, R: r, RBI: rbi, AVG: avg } }
}

describe('computeRosterValue', () => {
  it('rewards breadth: a good-everywhere player outranks a one-category specialist', () => {
    // pool: one balanced stud, one HR-only masher, plus filler to form a distribution
    const pool: ValuePoolPlayer[] = [
      hitter('balanced', 25, 25, 90, 90, 0.300),
      hitter('masher', 45, 1, 70, 80, 0.240),
      hitter('f1', 10, 8, 50, 50, 0.250),
      hitter('f2', 12, 5, 55, 52, 0.255),
      hitter('f3', 8, 10, 48, 45, 0.248),
    ]
    const res = computeRosterValue(pool, ['balanced', 'masher'], cats)
    const balanced = res.find((r) => r.playerKey === 'balanced')!
    const masher = res.find((r) => r.playerKey === 'masher')!
    expect(balanced.valueScore).toBeGreaterThan(masher.valueScore)
  })

  it('is role-fair: a pitcher only participates in pitching cats (not penalized for 0 HR)', () => {
    const pool: ValuePoolPlayer[] = [
      { playerKey: 'sp1', position: 'SP', stats: { ERA: 2.5, IP: 120 } },
      { playerKey: 'sp2', position: 'SP', stats: { ERA: 4.5, IP: 110 } },
      hitter('h1', 20, 10, 70, 70, 0.270),
    ]
    const res = computeRosterValue(pool, ['sp1'], cats)
    const sp1 = res.find((r) => r.playerKey === 'sp1')!
    // sp1 only has the ERA contrib among participated cats; HR/SB/etc are neutral (not participated)
    const eraContrib = sp1.contribs.find((c) => c.statId === 'ERA')!
    expect(eraContrib.tier).not.toBe('neutral')
    const hrContrib = sp1.contribs.find((c) => c.statId === 'HR')!
    expect(hrContrib.tier).toBe('neutral')
    expect(sp1.valueScore).toBeGreaterThan(0) // good ERA -> positive
  })

  it('volume-weights ratios: a tiny-sample great ERA does not dominate a workhorse', () => {
    const pool: ValuePoolPlayer[] = [
      { playerKey: 'tiny', position: 'RP', stats: { ERA: 0.0, IP: 2 } },
      { playerKey: 'horse', position: 'SP', stats: { ERA: 2.6, IP: 140 } },
      { playerKey: 'mid', position: 'SP', stats: { ERA: 3.8, IP: 120 } },
    ]
    const res = computeRosterValue(pool, ['tiny', 'horse'], cats)
    const tiny = res.find((r) => r.playerKey === 'tiny')!
    const horse = res.find((r) => r.playerKey === 'horse')!
    expect(horse.valueScore).toBeGreaterThan(tiny.valueScore)
  })
})
