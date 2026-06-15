import { describe, it, expect } from 'vitest'
import type { CatSpec } from '@/myteam/value'
import type { AggPlayer } from '@/trades/aggregate'
import { aggregateTeamCatTotals, rankInCategory, expectedCatsWon } from '../standings'

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
