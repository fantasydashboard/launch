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

  it('assigns DISTINCT drops across same-side adds (no repeated drop)', () => {
    const twoDrops = [
      { playerKey: 'weakHitter', side: 'hit' as const, effStats: { SB: 1 } },
      { playerKey: 'weakHitter2', side: 'hit' as const, effStats: { SB: 2 } },
    ]
    const out = rankUpgrades({
      freeAgents: [
        { playerKey: 'speedA', name: 'Speed A', position: 'OF', team: 'ARI', effStats: { SB: 40 }, side: 'hit' },
        { playerKey: 'speedB', name: 'Speed B', position: 'OF', team: 'SD', effStats: { SB: 35 }, side: 'hit' },
      ],
      leagueTotals, myTeamId: 'T1', cats, dropOptions: twoDrops, minDelta: 0.05,
    })
    expect(out).toHaveLength(2)
    const drops = out.map((u) => u.dropKey)
    expect(new Set(drops).size).toBe(2) // two adds -> two different drops
    expect(out[0].dropKey).toBe('weakHitter') // strongest add takes the weakest drop
  })

  it('only spreads distinct drops across diversifyKeys; repeats the weakest otherwise', () => {
    // weakHitter (a genuine weak link) + goodHitter (expendable but NOT a weak link).
    const drops = [
      { playerKey: 'weakHitter', side: 'hit' as const, effStats: { SB: 1 } },
      { playerKey: 'goodHitter', side: 'hit' as const, effStats: { SB: 5 } },
    ]
    const out = rankUpgrades({
      freeAgents: [
        { playerKey: 'speedA', name: 'Speed A', position: 'OF', team: 'ARI', effStats: { SB: 40 }, side: 'hit' },
        { playerKey: 'speedB', name: 'Speed B', position: 'OF', team: 'SD', effStats: { SB: 35 }, side: 'hit' },
      ],
      leagueTotals, myTeamId: 'T1', cats, dropOptions: drops,
      diversifyKeys: new Set(['weakHitter']), // only the weak link is diversifiable
      minDelta: 0.05,
    })
    expect(out).toHaveLength(2)
    // Both adds drop the weak link — the good player is never reached for variety.
    expect(out.every((u) => u.dropKey === 'weakHitter')).toBe(true)
  })

  it('uses a null drop when no same-side droppable exists', () => {
    const out = rankUpgrades({
      freeAgents: [{ playerKey: 'sp', name: 'Streamer', position: 'SP', team: 'LAD', effStats: { SB: 40 }, side: 'pit' }],
      leagueTotals, myTeamId: 'T1', cats, dropOptions, minDelta: 0.05,
    })
    expect(out[0]?.dropKey ?? null).toBeNull()
  })

  it('does not leak off-side cats into holds for a same-side add/drop (BUG 1)', () => {
    // Mixed hit/pit league: SB (hit) + W (pit). My team (T1) already leads W outright — that
    // pitching lead is totally unaffected by a hit-side add/drop, so it must never show up as
    // something this hit-side move "holds" (a hitter can't hold a pitching category).
    const mixedCats: CatSpec[] = [
      { statId: 'SB', lowerIsBetter: false, side: 'hit', isRatio: false },
      { statId: 'W', lowerIsBetter: false, side: 'pit', isRatio: false },
    ]
    const mixedTotals = aggregateTeamCatTotals(
      [
        { teamId: 'T1', players: [{ playerKey: 'weakHitter', stats: { SB: 1, W: 20 } }] },
        { teamId: 'T2', players: [{ playerKey: 'b', stats: { SB: 20, W: 10 } }] },
        { teamId: 'T3', players: [{ playerKey: 'c', stats: { SB: 30, W: 5 } }] },
      ],
      mixedCats,
    )
    const out = rankUpgrades({
      freeAgents: [{ playerKey: 'speedster', name: 'Speedster', position: 'OF', team: 'ARI', effStats: { SB: 40 }, side: 'hit' }],
      leagueTotals: mixedTotals,
      myTeamId: 'T1',
      cats: mixedCats,
      dropOptions: [{ playerKey: 'weakHitter', side: 'hit' as const, effStats: { SB: 1 } }],
      minDelta: 0.05,
    })
    expect(out[0].holds).not.toContain('W')
  })

  it('pairs a pitcher free agent with a pit-side drop', () => {
    const pcats = [{ statId: 'K', lowerIsBetter: false, side: 'pit' as const, isRatio: false }]
    const totals = aggregateTeamCatTotals(
      [
        { teamId: 'T1', players: [{ playerKey: 'weakSP', stats: { K: 50 } }] },
        { teamId: 'T2', players: [{ playerKey: 'b', stats: { K: 120 } }] },
        { teamId: 'T3', players: [{ playerKey: 'c', stats: { K: 200 } }] },
      ],
      pcats,
    )
    const out = rankUpgrades({
      freeAgents: [{ playerKey: 'ace', name: 'Ace', position: 'SP', team: 'LAD', effStats: { K: 220 }, side: 'pit' }],
      leagueTotals: totals,
      myTeamId: 'T1',
      cats: pcats,
      dropOptions: [{ playerKey: 'weakSP', side: 'pit', effStats: { K: 50 } }],
      minDelta: 0.05,
    })
    expect(out[0].dropKey).toBe('weakSP')
    expect(out[0].fixes).toContain('K')
  })
})
