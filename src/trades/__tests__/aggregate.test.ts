import { describe, it, expect } from 'vitest'
import { aggregateTeamCats, playerStrengths } from '../aggregate'
import type { CatSpec } from '@/myteam/value'

const HR: CatSpec = { statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false }
const ERA: CatSpec = { statId: 'ERA', lowerIsBetter: true, side: 'pit', isRatio: true, volumeStatId: 'IP' }

describe('aggregateTeamCats', () => {
  it('sums counting categories', () => {
    const out = aggregateTeamCats(
      [{ teamId: 'a', players: [{ playerKey: '1', stats: { HR: 20 } }, { playerKey: '2', stats: { HR: 14 } }] }],
      [HR],
    )
    expect(out[0].totals.HR).toBe(34)
  })

  it('volume-weights ratio categories by innings', () => {
    // 200 IP at 3.00 + 50 IP at 6.00 -> (600+300)/250 = 3.60, not the naive avg 4.50.
    const out = aggregateTeamCats(
      [{ teamId: 'a', players: [{ playerKey: '1', stats: { ERA: 3.0, IP: 200 } }, { playerKey: '2', stats: { ERA: 6.0, IP: 50 } }] }],
      [ERA],
    )
    expect(out[0].totals.ERA).toBeCloseTo(3.6, 5)
  })
})

describe('playerStrengths', () => {
  it('direction-normalizes: a low ERA scores POSITIVE (better)', () => {
    const players = [
      { playerKey: 'ace', stats: { ERA: 2.5 } },
      { playerKey: 'mid', stats: { ERA: 4.0 } },
      { playerKey: 'bad', stats: { ERA: 5.5 } },
    ]
    const s = playerStrengths(players, [ERA])
    expect(s.get('ace')!.ERA).toBeGreaterThan(0) // good ERA -> positive strength
    expect(s.get('bad')!.ERA).toBeLessThan(0) // bad ERA -> negative
  })

  it('a higher HR total scores higher', () => {
    const players = [
      { playerKey: 'slug', stats: { HR: 40 } },
      { playerKey: 'avg', stats: { HR: 20 } },
      { playerKey: 'punch', stats: { HR: 5 } },
    ]
    const s = playerStrengths(players, [HR])
    expect(s.get('slug')!.HR).toBeGreaterThan(s.get('avg')!.HR)
    expect(s.get('avg')!.HR).toBeGreaterThan(s.get('punch')!.HR)
  })
})
