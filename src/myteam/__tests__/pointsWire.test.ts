import { describe, it, expect } from 'vitest'
import { buildPointsWire } from '../pointsWire'
import type { AvailablePlayer } from '@/players/types'
import type { FGProjection } from '@/services/projectionService'
import type { WeekSchedule } from '@/services/mlbSchedule'

const weights = { HR: 4, R: 1, RBI: 1, K: 1, IP: 3, SV: 5 }

function fa(p: Partial<AvailablePlayer>): AvailablePlayer {
  return { playerKey: p.name!, name: p.name!, position: 'OF', team: 'NYY', percentOwned: 5, stats: {}, ...p }
}

const FG: Record<string, FGProjection> = {
  BigBat: { mlbam_id: 1, player_name: 'BigBat', team: 'NYY', position: 'OF', player_type: 'batter', hr: 30, r: 90, rbi: 90, g: 150 },
  SmallBat: { mlbam_id: 2, player_name: 'SmallBat', team: 'LAD', position: 'OF', player_type: 'batter', hr: 8, r: 40, rbi: 40, g: 150 },
  TwoStartSP: { mlbam_id: 3, player_name: 'TwoStartSP', team: 'BOS', position: 'SP', player_type: 'pitcher', ip: 180, so: 200, gp: 30, gs: 30 },
  Closer: { mlbam_id: 4, player_name: 'Closer', team: 'SD', position: 'RP', player_type: 'pitcher', ip: 60, so: 80, sv: 30, gp: 60 },
}
const matchFG = (p: { full_name?: string }) => FG[p.full_name ?? ''] ?? null

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
    const w = buildPointsWire(agents, matchFG, weights, schedule)
    expect(w.topHitters[0].player.name).toBe('BigBat')
    expect(w.topPitchers.map((r) => r.player.name)).toContain('TwoStartSP')
  })

  it('surfaces two-start arms and full-slate bats for streaming', () => {
    const w = buildPointsWire(agents, matchFG, weights, schedule)
    expect(w.twoStart.map((r) => r.player.name)).toEqual(['TwoStartSP'])
    expect(w.hotBats[0].player.name).toBe('BigBat') // NYY plays 6 this week
  })

  it('chips a specialist (closer shows SV) and excludes IL players', () => {
    const w = buildPointsWire(agents, matchFG, weights, schedule)
    const closer = w.topPitchers.find((r) => r.player.name === 'Closer')
    expect(closer?.chips).toContain('SV')
    const names = [...w.topHitters, ...w.topPitchers].map((r) => r.player.name)
    expect(names).not.toContain('HurtGuy')
  })
})
