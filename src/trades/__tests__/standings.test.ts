import { describe, it, expect } from 'vitest'
import type { CatSpec } from '@/myteam/value'
import type { AggPlayer } from '@/trades/aggregate'
import { aggregateTeamCatTotals, rankInCategory, expectedCatsWon, ecwByTeam, addDropDelta } from '../standings'

// 3 teams, 2 cats: HR (counting, higher better), ERA (ratio, lower better, vol = IP).
const CATS: CatSpec[] = [
  { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'ERA', lowerIsBetter: true, side: 'pit', isRatio: true, volumeStatId: 'IP' },
]
const team = (teamId: string, players: AggPlayer[]) => ({ teamId, players })
const p = (playerKey: string, stats: Record<string, number>): AggPlayer => ({ playerKey, stats })

const PBT = [
  team('A', [p('a1', { HR: 30, ERA: 3.0, IP: 100 })]),                 // HR 30, ERA 3.00
  team('B', [p('b1', { HR: 10, ERA: 4.0, IP: 100 })]),                 // HR 10, ERA 4.00
  team('C', [p('c1', { HR: 10, ERA: 2.0, IP: 50 }), p('c2', { HR: 5, ERA: 5.0, IP: 50 })]), // HR 15, ERA 3.50
]

describe('aggregateTeamCatTotals', () => {
  it('sums counting cats and volume-weights ratio cats, retaining num/den', () => {
    const totals = aggregateTeamCatTotals(PBT, CATS)
    const c = totals.find((t) => t.teamId === 'C')!
    expect(c.cats.HR.value).toBe(15)
    expect(c.cats.ERA.value).toBeCloseTo(3.5, 5) // (2*50 + 5*50)/100
    expect(c.cats.ERA.num).toBeCloseTo(350, 5)
    expect(c.cats.ERA.den).toBe(100)
  })
})

describe('rankInCategory', () => {
  it('ranks higher-is-better desc and lower-is-better asc (1 = best)', () => {
    const totals = aggregateTeamCatTotals(PBT, CATS)
    const hr = rankInCategory(totals, CATS[0])
    expect(hr.get('A')).toBe(1); expect(hr.get('C')).toBe(2); expect(hr.get('B')).toBe(3)
    const era = rankInCategory(totals, CATS[1])
    expect(era.get('A')).toBe(1); expect(era.get('C')).toBe(2); expect(era.get('B')).toBe(3)
  })
  it('gives tied teams the average rank', () => {
    const tied = [team('X', [p('x', { HR: 10 })]), team('Y', [p('y', { HR: 10 })]), team('Z', [p('z', { HR: 5 })])]
    const hr = rankInCategory(aggregateTeamCatTotals(tied, [CATS[0]]), CATS[0])
    expect(hr.get('X')).toBe(1.5); expect(hr.get('Y')).toBe(1.5); expect(hr.get('Z')).toBe(3)
  })
  it('ranks a zero-denominator ratio team last', () => {
    const t = [team('X', [p('x', { ERA: 2, IP: 100 })]), team('Y', [p('y', { ERA: 0, IP: 0 })])]
    const era = rankInCategory(aggregateTeamCatTotals(t, [CATS[1]]), CATS[1])
    expect(era.get('X')).toBe(1); expect(era.get('Y')).toBe(2)
  })
})

describe('expectedCatsWon', () => {
  it('sums (N-rank)/(N-1) across cats', () => {
    const totals = aggregateTeamCatTotals(PBT, CATS)
    // A is 1st in both: (3-1)/(3-1) * 2 = 2.0
    expect(expectedCatsWon('A', totals, CATS)).toBeCloseTo(2.0, 5)
    // B is 3rd in both: (3-3)/2 * 2 = 0
    expect(expectedCatsWon('B', totals, CATS)).toBeCloseTo(0, 5)
    // C is 2nd in both: (3-2)/2 * 2 = 1.0
    expect(expectedCatsWon('C', totals, CATS)).toBeCloseTo(1.0, 5)
  })
})

describe('ecwByTeam', () => {
  it('maps every team to its ECW (matching expectedCatsWon)', () => {
    const totals = aggregateTeamCatTotals(PBT, CATS)
    const got = ecwByTeam(totals, CATS)
    expect(got.map((r) => r.teamId).sort()).toEqual(['A', 'B', 'C'])
    const byId = Object.fromEntries(got.map((r) => [r.teamId, r.strength]))
    // Same numbers expectedCatsWon yields per team: A=2.0 (1st in both), B=0, C=1.0.
    expect(byId.A).toBeCloseTo(expectedCatsWon('A', totals, CATS), 10)
    expect(byId.A).toBeCloseTo(2.0, 5)
    expect(byId.B).toBeCloseTo(0, 5)
    expect(byId.C).toBeCloseTo(1.0, 5)
  })
  it('returns an empty list for no teams', () => {
    expect(ecwByTeam([], CATS)).toEqual([])
  })
})

import { tradeStandingsDelta, classifyPartnerRead } from '../standings'

describe('tradeStandingsDelta', () => {
  // A (HR 30 / ERA 3.0,100IP) trades its HR bat for B's arm. Stats by player:
  const statsById = new Map<string, Record<string, number>>([
    ['a1', { HR: 30, ERA: 3.0, IP: 100 }],
    ['b1', { HR: 20, ERA: 4.0, IP: 100 }],
    ['c1', { HR: 10, ERA: 2.0, IP: 50 }],
    ['c2', { HR: 5, ERA: 5.0, IP: 50 }],
  ])
  const totals = aggregateTeamCatTotals([
    team('A', [p('a1', statsById.get('a1')!)]),
    team('B', [p('b1', statsById.get('b1')!)]),
    team('C', [p('c1', statsById.get('c1')!), p('c2', statsById.get('c2')!)]),
  ], CATS)

  it('re-ranks both teams after the swap and returns ECW deltas + a ladder for me', () => {
    // A gives a1 (its only player) and gets c1 from C. After: A has c1 (HR10/ERA2.0,50IP), C has a1+c2.
    const d = tradeStandingsDelta(totals, statsById, CATS, 'A', 'C', ['a1'], ['c1'])
    expect(typeof d.you).toBe('number')
    expect(d.them).toBeCloseTo(1.0, 5) // partner C: HR 3rd->1st, ERA holds 2nd → ECW 0.5 -> 1.5
    // A's HR collapses 30 -> 10 (now last), so A's ECW should drop: delta negative.
    expect(d.you).toBeLessThan(0)
    // ladder covers every scored cat with before/after ranks for team A.
    expect(d.ladder.map((m) => m.statId).sort()).toEqual(['ERA', 'HR'])
    const hr = d.ladder.find((m) => m.statId === 'HR')!
    expect(hr.rankBefore).toBe(1)
    expect(hr.rankAfter).toBeGreaterThan(1)
    expect(hr.beatsMore).toBe(-2) // HR was 1st (rank 1), now last (rank 3): 1 - 3
  })
})

describe('classifyPartnerRead', () => {
  it('buckets the partner ECW delta into fair / reach / steal', () => {
    expect(classifyPartnerRead(0.5)).toBe('fair')   // they gain
    expect(classifyPartnerRead(-0.1)).toBe('fair')  // within eps
    expect(classifyPartnerRead(-0.4)).toBe('reach') // between eps and big
    expect(classifyPartnerRead(-1.2)).toBe('steal') // beyond big
  })
})

describe('addDropDelta', () => {
  const cats: CatSpec[] = [
    { statId: 'SB', lowerIsBetter: false, side: 'hit', isRatio: false },
    { statId: 'AVG', lowerIsBetter: false, side: 'hit', isRatio: true, volumeStatId: 'AB' },
  ]
  const totals = aggregateTeamCatTotals(
    [
      { teamId: 'T1', players: [{ playerKey: 'mine-weak', stats: { SB: 1, AVG: 0.250, AB: 400 } }] },
      { teamId: 'T2', players: [{ playerKey: 'b', stats: { SB: 20, AVG: 0.260, AB: 400 } }] },
      { teamId: 'T3', players: [{ playerKey: 'c', stats: { SB: 30, AVG: 0.270, AB: 400 } }] },
    ],
    cats,
  )

  it('a strong add (drop the weak link) improves ECW and flags the fixed category', () => {
    const d = addDropDelta(totals, cats, 'T1', { SB: 40, AVG: 0.300, AB: 400 }, { SB: 1, AVG: 0.250, AB: 400 })
    expect(d.deltaEcw).toBeGreaterThan(0)
    expect(d.fixes).toContain('SB')
    expect(d.ecwAfter).toBeGreaterThan(d.ecwBefore)
  })

  it('a pure add (no drop) is supported', () => {
    const d = addDropDelta(totals, cats, 'T1', { SB: 40, AVG: 0.300, AB: 400 }, null)
    expect(d.deltaEcw).toBeGreaterThan(0)
  })

  it('a worthless add does not improve ECW', () => {
    const d = addDropDelta(totals, cats, 'T1', { SB: 0, AVG: 0.200, AB: 100 }, { SB: 1, AVG: 0.250, AB: 400 })
    expect(d.deltaEcw).toBeLessThanOrEqual(0)
    expect(d.fixes).toEqual([])
  })

  it('returns a zero delta when the team id is unknown', () => {
    const d = addDropDelta(totals, cats, 'NOPE', { SB: 40, AB: 400, AVG: 0.3 }, null)
    expect(d.deltaEcw).toBe(0)
  })

  it('keeps an already-winning, unchanged category in holds', () => {
    // 3 teams; T1 already leads SB by a lot. A neutral SB add does not change T1's #1 rank.
    const t = aggregateTeamCatTotals(
      [
        { teamId: 'T1', players: [{ playerKey: 'mine', stats: { SB: 50, AVG: 0.25, AB: 400 } }] },
        { teamId: 'T2', players: [{ playerKey: 'b', stats: { SB: 10, AVG: 0.26, AB: 400 } }] },
        { teamId: 'T3', players: [{ playerKey: 'c', stats: { SB: 5, AVG: 0.27, AB: 400 } }] },
      ],
      cats,
    )
    const d = addDropDelta(t, cats, 'T1', { SB: 1, AVG: 0.25, AB: 100 }, null)
    expect(d.fixes).not.toContain('SB')
    expect(d.holds).toContain('SB')
  })
})
