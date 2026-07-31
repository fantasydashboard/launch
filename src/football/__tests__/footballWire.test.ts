import { describe, it, expect } from 'vitest'
import { buildFootballWire, type WireVorRow } from '../footballWire'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { AvailablePlayer } from '@/players/types'
import type { PlayerVor } from '../footballVor'

function vor(key: string, position: string, vorRos: number, extra: Partial<PlayerVor> = {}): PlayerVor {
  return {
    playerKey: key, position, pointsRos: vorRos + 100, vorRos,
    pointsNextWeek: 0, vorWeek: extra.vorWeek ?? 0,
    streamWeeks: extra.streamWeeks ?? 0, streamOf: extra.streamOf ?? 0,
    confidence: 'high', ...extra,
  }
}

const slots = { QB: 1, RB: 2, FLEX: 1 }

// My roster: strong QB, two RBs, one flex RB.
const pool: PointsPoolPlayer[] = [
  { playerKey: 'qb1', name: 'My QB', position: 'QB', teamKey: 'me', proTeam: 'BUF' },
  { playerKey: 'rb1', name: 'My RB1', position: 'RB', teamKey: 'me', proTeam: 'KC' },
  { playerKey: 'rb2', name: 'My RB2', position: 'RB', teamKey: 'me', proTeam: 'SF' },
  { playerKey: 'rb3', name: 'My RB3', position: 'RB', teamKey: 'me', proTeam: 'DEN' },
  { playerKey: 'opp_wr', name: 'Opp WR', position: 'WR', teamKey: 'opp', proTeam: 'MIA' },
]

const freeAgents: AvailablePlayer[] = [
  { playerKey: 'fa_rb', name: 'Stud FA RB', position: 'RB', team: 'LAR', percentOwned: 0, status: '', stats: {} },
  { playerKey: 'fa_qb', name: 'Backup FA QB', position: 'QB', team: 'NYJ', percentOwned: 0, status: '', stats: {} },
]

const vorByKey: Record<string, PlayerVor> = {
  qb1: vor('qb1', 'QB', 150), rb1: vor('rb1', 'RB', 120), rb2: vor('rb2', 'RB', 80),
  rb3: vor('rb3', 'RB', 10), opp_wr: vor('opp_wr', 'WR', 60),
  fa_rb: vor('fa_rb', 'RB', 95, { vorWeek: 12, streamWeeks: 3, streamOf: 4 }),
  fa_qb: vor('fa_qb', 'QB', 40, { vorWeek: 2, streamWeeks: 1, streamOf: 4 }),
}

describe('buildFootballWire', () => {
  const wire = buildFootballWire({ freeAgents, vorByKey, pool, slots, myTeamKey: 'me', teamNames: { opp: 'Rivals' } })

  it('bestAvailable is free agents by ROS VOR desc', () => {
    expect(wire.bestAvailable.map((r) => r.player.name)).toEqual(['Stud FA RB', 'Backup FA QB'])
    expect(wire.bestAvailable[0].vorRos).toBe(95)
  })

  it('upgrades rank by lineup-marginal and name the displaced body; a backup QB is not an upgrade', () => {
    // fa_rb (points 195) cracks the flex over rb3 (points 110) → positive marginal.
    const rbUp = wire.upgrades.find((s) => s.add.player.name === 'Stud FA RB')
    expect(rbUp).toBeTruthy()
    expect(rbUp!.dropName).toBe('My RB3')
    expect(rbUp!.marginal).toBeGreaterThan(0)
    // fa_qb (points 140) can't beat qb1 (points 250) → no upgrade row.
    expect(wire.upgrades.find((s) => s.add.player.name === 'Backup FA QB')).toBeFalsy()
  })

  it('thisWeek is free agents by weekly VOR desc, carrying streamability', () => {
    expect(wire.thisWeek[0].player.name).toBe('Stud FA RB')
    expect(wire.thisWeek[0].streamWeeks).toBe(3)
    expect(wire.thisWeek[0].streamOf).toBe(4)
  })

  it('board groups every player by position, VOR-ranked, owned flagged', () => {
    const rbRow = wire.board['RB']
    expect(rbRow.map((r) => r.name)).toEqual(['My RB1', 'Stud FA RB', 'My RB2', 'My RB3'])
    expect(rbRow.find((r) => r.name === 'My RB1')!.owned).toBe(true)
    expect(rbRow.find((r) => r.name === 'Stud FA RB')!.owned).toBe(false)
  })
})
