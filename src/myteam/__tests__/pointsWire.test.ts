import { describe, it, expect } from 'vitest'
import { buildPointsWire } from '../pointsWire'
import type { PlayerValue } from '@/myteam/playerValue'
import type { AvailablePlayer } from '@/players/types'
import type { WeekSchedule } from '@/services/mlbSchedule'

function fa(p: Partial<AvailablePlayer>): AvailablePlayer {
  return { playerKey: p.name!, name: p.name!, position: 'OF', team: 'NYY', percentOwned: 5, stats: {}, ...p }
}

// PlayerValue fixtures (post-refactor: the Wire consumes a PlayerValue resolver, not a raw
// FGProjection + weights). total/side chosen to preserve the pre-value ranking + chip assertions.
const VALUES: Record<string, PlayerValue> = {
  BigBat: { total: 300, games: 150, perStat: {}, side: 'hit', weeklyCap: 6.5 },
  SmallBat: { total: 120, games: 150, perStat: {}, side: 'hit', weeklyCap: 6.5 },
  TwoStartSP: { total: 740, games: 30, perStat: {}, side: 'pit', weeklyCap: 1.3 },
  Closer: { total: 230, games: 60, perStat: { SV: 150 }, side: 'pit', weeklyCap: 3.5 },
}
// valueOf resolves only players with a real team (mirrors the FG no-team/no-match guard):
// a bare 'FA' team → null, an unmatched name → null.
const valueOf = (p: { name?: string; team?: string }): PlayerValue | null =>
  p.team && p.team.toUpperCase() !== 'FA' ? VALUES[p.name ?? ''] ?? null : null

const schedule: WeekSchedule = {
  gamesByTeam: { NYY: 6, LAD: 2, BOS: 5, SD: 5 },
  startsByPitcher: { twostartsp: [{ pitcherName: 'TwoStartSP', teamAbbr: 'BOS', opponentAbbr: 'NYY', date: '' }, { pitcherName: 'TwoStartSP', teamAbbr: 'BOS', opponentAbbr: 'TB', date: '' }] },
}

describe('buildPointsWire', () => {
  const agents = [
    fa({ name: 'BigBat', position: 'OF', team: 'NYY' }),
    fa({ name: 'SmallBat', position: 'OF', team: 'LAD' }),
    fa({ name: 'TwoStartSP', position: 'SP', team: 'BOS' }),
    fa({ name: 'Closer', position: 'RP', team: 'SD' }),
    fa({ name: 'HurtGuy', position: 'OF', team: 'NYY', status: 'IL10' }),
  ]

  it('ranks available bats and arms by projected points', () => {
    const w = buildPointsWire(agents, valueOf, schedule)
    expect(w.topHitters[0].player.name).toBe('BigBat')
    expect(w.topPitchers.map((r) => r.player.name)).toContain('TwoStartSP')
  })

  it('surfaces two-start arms and full-slate bats for streaming', () => {
    const w = buildPointsWire(agents, valueOf, schedule)
    expect(w.twoStart.map((r) => r.player.name)).toEqual(['TwoStartSP'])
    expect(w.hotBats[0].player.name).toBe('BigBat') // NYY plays 6 this week
  })

  it('pairs the best add with your weakest droppable body as a points upgrade', () => {
    const roster = [
      { name: 'WeakBat', position: 'OF', points: 50, side: 'hit' as const },
      { name: 'GoodBat', position: 'OF', points: 250, side: 'hit' as const },
      // An IL body projects lowest but frees only an IL slot — must NOT be the drop.
      { name: 'HurtIL', position: 'OF', points: 5, side: 'hit' as const, onIL: true },
    ]
    const w = buildPointsWire(agents, valueOf, schedule, roster)
    expect(w.swaps.length).toBeGreaterThan(0)
    const top = w.swaps[0]
    expect(top.add.player.name).toBe('BigBat') // best available hitter
    expect(top.dropName).toBe('WeakBat') // weakest HEALTHY hitter (not the IL body)
    expect(top.upgrade).toBe(top.add.points - 50)
  })

  it('chips a specialist (closer shows SV) and excludes IL players', () => {
    const w = buildPointsWire(agents, valueOf, schedule)
    const closer = w.topPitchers.find((r) => r.player.name === 'Closer')
    expect(closer?.chips).toContain('SV')
    const names = [...w.topHitters, ...w.topPitchers].map((r) => r.player.name)
    expect(names).not.toContain('HurtGuy')
  })
})
