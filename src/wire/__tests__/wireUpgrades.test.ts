import { describe, it, expect } from 'vitest'
import { aggregateTeamCatTotals } from '@/trades/standings'
import { rankUpgrades } from '../wireUpgrades'
import type { CatSpec } from '@/myteam/types'

const cats: CatSpec[] = [{ statId: 'SB', lowerIsBetter: false, side: 'hit', isRatio: false }]
const leagueTotals = aggregateTeamCatTotals(
  [
    { teamId: 'T1', players: [{ playerKey: 'weakHitter', stats: { SB: 1 } }] },
    { teamId: 'T2', players: [{ playerKey: 'b', stats: { SB: 20 } }] },
    { teamId: 'T3', players: [{ playerKey: 'c', stats: { SB: 30 } }] },
  ],
  cats,
)
const dropOptions = [{ playerKey: 'weakHitter', side: 'hit' as const, effStats: { SB: 1 } }]

describe('rankUpgrades', () => {
  it('ranks free agents by season ECW delta and pairs the same-side drop', () => {
    const out = rankUpgrades({
      freeAgents: [
        { playerKey: 'speedster', name: 'Speedster', position: 'OF', team: 'ARI', effStats: { SB: 40 }, side: 'hit' },
        { playerKey: 'scrub', name: 'Scrub', position: '1B', team: 'COL', effStats: { SB: 0 }, side: 'hit' },
      ],
      leagueTotals, myTeamId: 'T1', cats, dropOptions, minDelta: 0.05,
    })
    expect(out[0].player.name).toBe('Speedster')
    expect(out[0].dropKey).toBe('weakHitter')
    expect(out[0].fixes).toContain('SB')
    expect(out.find((u) => u.player.name === 'Scrub')).toBeUndefined() // below minDelta
  })

  it('uses a null drop when no same-side droppable exists', () => {
    const out = rankUpgrades({
      freeAgents: [{ playerKey: 'sp', name: 'Streamer', position: 'SP', team: 'LAD', effStats: { SB: 40 }, side: 'pit' }],
      leagueTotals, myTeamId: 'T1', cats, dropOptions, minDelta: 0.05,
    })
    expect(out[0]?.dropKey ?? null).toBeNull()
  })
})
