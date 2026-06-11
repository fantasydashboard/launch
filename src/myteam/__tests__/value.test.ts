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

  it('does not penalize a starter for reliever-only counting cats (SV/HLD)', () => {
    const pitchCats: CatSpec[] = [
      { statId: 'W', lowerIsBetter: false, side: 'pit', isRatio: false },
      { statId: 'SV', lowerIsBetter: false, side: 'pit', isRatio: false },
      { statId: 'K', lowerIsBetter: false, side: 'pit', isRatio: false },
    ]
    const pool: ValuePoolPlayer[] = [
      { playerKey: 'starter', position: 'SP', stats: { W: 12, SV: 0, K: 180 } },
      { playerKey: 'closer', position: 'RP', stats: { W: 3, SV: 30, K: 70 } },
      { playerKey: 'setup', position: 'RP', stats: { W: 4, SV: 15, K: 65 } },
    ]
    const res = computeRosterValue(pool, ['starter'], pitchCats)
    const starter = res.find((r) => r.playerKey === 'starter')!
    // 0 SV => the starter does not participate in SV, so it stays neutral and is
    // excluded from the value sum (no penalty for a category they cannot accrue).
    const svContrib = starter.contribs.find((c) => c.statId === 'SV')!
    expect(svContrib.tier).toBe('neutral')
    // Value reflects only W + K, where the starter leads -> clearly positive.
    expect(starter.valueScore).toBeGreaterThan(0)
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

  it('a single NaN stat does not collapse a category (poisoned mean/std)', () => {
    // Regression: Yahoo returns "-" -> parseFloat NaN for a pitcher with no
    // decisions. One NaN used to poison mean/std for the whole category, zeroing
    // every z and flattening all roleValues to 50.
    const pitchCats: CatSpec[] = [
      { statId: 'W', lowerIsBetter: false, side: 'pit', isRatio: false },
    ]
    const pool: ValuePoolPlayer[] = [
      { playerKey: 'ace', position: 'SP', stats: { W: 12 } },
      { playerKey: 'mid', position: 'SP', stats: { W: 6 } },
      { playerKey: 'bad', position: 'SP', stats: { W: 2 } },
      // A rostered pitcher whose W came back non-numeric (NaN).
      { playerKey: 'nodecision', position: 'RP', stats: { W: NaN } },
    ]
    const res = computeRosterValue(pool, ['ace', 'bad'], pitchCats)
    const ace = res.find((r) => r.playerKey === 'ace')!
    const bad = res.find((r) => r.playerKey === 'bad')!
    // The NaN player is dropped from the distribution; the rest still spread.
    expect(ace.valueScore).toBeGreaterThan(bad.valueScore)
    expect(ace.roleValue).toBeGreaterThan(bad.roleValue)
    expect(ace.roleValue).not.toBe(50)
  })

  it('roleValue is a within-role percentile, fair across roles with different cat counts', () => {
    // 4 hitters touch 5 cats; 4 pitchers touch only ERA (1 cat). Each role's best
    // should get a high roleValue even though pitchers' raw valueScore is smaller.
    const pool: ValuePoolPlayer[] = [
      hitter('h1', 40, 30, 100, 100, 0.320), // best hitter
      hitter('h2', 20, 15, 80, 80, 0.270),
      hitter('h3', 12, 8, 60, 60, 0.255),
      hitter('h4', 5, 2, 45, 45, 0.240),     // worst hitter
      { playerKey: 'p1', position: 'SP', stats: { ERA: 2.0, IP: 180 } }, // best pitcher
      { playerKey: 'p2', position: 'SP', stats: { ERA: 3.2, IP: 170 } },
      { playerKey: 'p3', position: 'SP', stats: { ERA: 4.0, IP: 150 } },
      { playerKey: 'p4', position: 'SP', stats: { ERA: 5.2, IP: 120 } }, // worst pitcher
    ]
    const res = computeRosterValue(pool, ['h1', 'p1', 'h4', 'p4'], cats)
    const byKey = Object.fromEntries(res.map((r) => [r.playerKey, r]))
    expect(byKey.h1.role).toBe('hitter')
    expect(byKey.p1.role).toBe('pitcher')
    // best of each role ranks high within role; worst of each ranks low
    expect(byKey.h1.roleValue).toBeGreaterThan(byKey.h4.roleValue)
    expect(byKey.p1.roleValue).toBeGreaterThan(byKey.p4.roleValue)
    // the best pitcher is NOT buried under hitters: top-of-role is comparably high
    expect(byKey.p1.roleValue).toBeGreaterThanOrEqual(75)
    expect(byKey.h1.roleValue).toBeGreaterThanOrEqual(75)
  })
})
