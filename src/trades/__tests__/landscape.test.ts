import { describe, it, expect } from 'vitest'
import { buildLandscape, type TeamTotals } from '../landscape'
import type { CatSpec } from '@/myteam/value'

const HR: CatSpec = { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false }
const ERA: CatSpec = { statId: 'ERA', lowerIsBetter: true, side: 'pit', isRatio: true }

// 6 teams evenly spaced in HR: 10,20,30,40,50,60.
const evenHR: TeamTotals[] = [
  { teamId: 'a', totals: { HR: 60 } },
  { teamId: 'b', totals: { HR: 50 } },
  { teamId: 'c', totals: { HR: 40 } },
  { teamId: 'd', totals: { HR: 30 } },
  { teamId: 'e', totals: { HR: 20 } },
  { teamId: 'f', totals: { HR: 10 } },
]

describe('buildLandscape — need is hump-shaped', () => {
  it('1st place has zero need (nothing above to gain)', () => {
    const { landscape } = buildLandscape(evenHR, [HR])
    expect(landscape.get('a')!.get('HR')!.rank).toBe(1)
    expect(landscape.get('a')!.get('HR')!.need).toBe(0)
  })

  it('a team hopelessly behind the one above has ~0 need', () => {
    // 'far' trails the pack by a huge margin in HR.
    const totals: TeamTotals[] = [
      { teamId: 'x', totals: { HR: 100 } },
      { teamId: 'y', totals: { HR: 98 } },
      { teamId: 'z', totals: { HR: 96 } },
      { teamId: 'far', totals: { HR: 10 } },
    ]
    const { landscape } = buildLandscape(totals, [HR])
    expect(landscape.get('far')!.get('HR')!.need).toBeLessThan(0.1)
  })

  it('a contesting team with a small gap above has high need', () => {
    // 'tight' is just behind the leader.
    const totals: TeamTotals[] = [
      { teamId: 'lead', totals: { HR: 51 } },
      { teamId: 'tight', totals: { HR: 50 } },
      { teamId: 'mid', totals: { HR: 30 } },
      { teamId: 'low', totals: { HR: 10 } },
    ]
    const { landscape } = buildLandscape(totals, [HR])
    expect(landscape.get('tight')!.get('HR')!.need).toBeGreaterThan(0.7)
  })
})

describe('buildLandscape — surplus is dead value', () => {
  it('a dominant team (big gap below) has high surplus', () => {
    const totals: TeamTotals[] = [
      { teamId: 'dom', totals: { HR: 100 } },
      { teamId: 'p1', totals: { HR: 30 } },
      { teamId: 'p2', totals: { HR: 28 } },
      { teamId: 'p3', totals: { HR: 26 } },
    ]
    const { landscape } = buildLandscape(totals, [HR])
    expect(landscape.get('dom')!.get('HR')!.surplus).toBeGreaterThan(0.7)
  })

  it('a last-place team has zero surplus (nothing below)', () => {
    const { landscape } = buildLandscape(evenHR, [HR])
    expect(landscape.get('f')!.get('HR')!.surplus).toBe(0)
  })
})

describe('buildLandscape — direction + scarcity', () => {
  it('respects lower-is-better (best ERA = rank 1)', () => {
    const totals: TeamTotals[] = [
      { teamId: 'good', totals: { ERA: 3.0 } },
      { teamId: 'mid', totals: { ERA: 4.0 } },
      { teamId: 'bad', totals: { ERA: 5.0 } },
    ]
    const { landscape } = buildLandscape(totals, [ERA])
    expect(landscape.get('good')!.get('ERA')!.rank).toBe(1)
    expect(landscape.get('bad')!.get('ERA')!.rank).toBe(3)
  })

  it('flags scarcity when demand outstrips supply', () => {
    // One dominant supplier, several bunched demanders just behind each other.
    const totals: TeamTotals[] = [
      { teamId: 'mono', totals: { HR: 200 } },
      { teamId: 'd1', totals: { HR: 52 } },
      { teamId: 'd2', totals: { HR: 50 } },
      { teamId: 'd3', totals: { HR: 48 } },
    ]
    const { scarcity } = buildLandscape(totals, [HR])
    const hr = scarcity.find((s) => s.statId === 'HR')!
    expect(hr.demanders).toBeGreaterThanOrEqual(hr.suppliers)
    expect(hr.scarcity).toBeGreaterThan(0)
  })
})
