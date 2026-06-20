import { describe, it, expect } from 'vitest'
import { aggregateTeamCatTotals } from '@/trades/standings'
import { computeProductionGaps } from '../productionGaps'
import type { CatSpec } from '@/myteam/value'

const cats: CatSpec[] = [
  { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'SB', lowerIsBetter: false, side: 'hit', isRatio: false },
  { statId: 'ERA', lowerIsBetter: true, side: 'pit', isRatio: true, volumeStatId: 'IP' },
]

// 6 teams. T1 = most HR (rank 1), least SB (rank 6), best ERA (lowest, rank 1).
const totals = aggregateTeamCatTotals(
  [
    { teamId: 'T1', players: [{ playerKey: 'a', stats: { HR: 60, SB: 1, ERA: 3.0, IP: 100 } }] },
    { teamId: 'T2', players: [{ playerKey: 'b', stats: { HR: 50, SB: 5, ERA: 3.2, IP: 100 } }] },
    { teamId: 'T3', players: [{ playerKey: 'c', stats: { HR: 40, SB: 10, ERA: 3.4, IP: 100 } }] },
    { teamId: 'T4', players: [{ playerKey: 'd', stats: { HR: 30, SB: 15, ERA: 3.6, IP: 100 } }] },
    { teamId: 'T5', players: [{ playerKey: 'e', stats: { HR: 20, SB: 20, ERA: 3.8, IP: 100 } }] },
    { teamId: 'T6', players: [{ playerKey: 'f', stats: { HR: 10, SB: 30, ERA: 4.0, IP: 100 } }] },
  ],
  cats,
)

describe('computeProductionGaps', () => {
  it('ranks by production (direction-aware) and tiers by rank thirds', () => {
    const g = computeProductionGaps(totals, cats, 'T1')
    const byId = new Map(g.map((x) => [x.statId, x]))
    // T1: most HR -> rank 1 (strong/edge), least SB -> rank 6 (lost), best ERA -> rank 1 (strong).
    expect(byId.get('HR')).toMatchObject({ rank: 1, tier: 'strong' })
    expect(byId.get('ERA')).toMatchObject({ rank: 1, tier: 'strong' }) // lowerIsBetter honored
    expect(byId.get('SB')).toMatchObject({ rank: 6, tier: 'lost' })
  })

  it('flags a just-outside-the-top-third cat as winnable (battleground)', () => {
    // T3: HR rank 3 (just outside top third of 6 = rank<=2) -> winnable.
    const g = computeProductionGaps(totals, cats, 'T3')
    expect(g.find((x) => x.statId === 'HR')?.tier).toBe('winnable')
  })

  it('returns [] with no teams', () => {
    expect(computeProductionGaps([], cats, 'T1')).toEqual([])
  })
})
