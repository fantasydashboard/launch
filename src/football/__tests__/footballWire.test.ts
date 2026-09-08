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
    confidence: 'high', opportunity: '', ...extra,
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
  { playerKey: 'fa_ghost', name: 'Ghost FA', position: 'WR', team: 'CHI', percentOwned: 0, status: '', stats: {} },
]

const vorByKey: Record<string, PlayerVor> = {
  qb1: vor('qb1', 'QB', 150), rb1: vor('rb1', 'RB', 120), rb2: vor('rb2', 'RB', 80),
  rb3: vor('rb3', 'RB', 10), opp_wr: vor('opp_wr', 'WR', 60),
  fa_rb: vor('fa_rb', 'RB', 95, { vorWeek: 12, streamWeeks: 3, streamOf: 4 }),
  fa_qb: vor('fa_qb', 'QB', 40, { vorWeek: 2, streamWeeks: 1, streamOf: 4 }),
}

describe('buildFootballWire', () => {
  const wire = buildFootballWire({ freeAgents, vorByKey, pool, slots, myTeamKey: 'me' })

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

  it('drops FAs with no VOR entry from best-available and the board', () => {
    expect(wire.bestAvailable.find((r) => r.player.name === 'Ghost FA')).toBeUndefined()
    expect((wire.board['WR'] ?? []).find((r) => r.name === 'Ghost FA')).toBeUndefined()
  })
})

/*
 * One board across every position.
 *
 * The per-position pills answered "who is the best receiver available", one column at a time,
 * and left the reader holding four of them in their head to compare across. The question a
 * waiver claim actually poses is "of everything on this wire, what should I want" — and value
 * over replacement is already the cross-position number, since it measures points above the
 * last startable body at a player's OWN position. The overall order was computable all along.
 */
describe('the overall board', () => {
  const build = () => buildFootballWire({
    pool: [
      { playerKey: 'qb1', name: 'My QB', position: 'QB', teamKey: 'me', proTeam: 'BUF' },
      { playerKey: 'rb1', name: 'My RB', position: 'RB', teamKey: 'me', proTeam: 'DET' },
      { playerKey: 'rb2', name: 'Their RB', position: 'RB', teamKey: 'them', proTeam: 'DET' },
    ] as PointsPoolPlayer[],
    vorByKey: {
      qb1: vor('qb1', 'QB', 40),
      rb1: vor('rb1', 'RB', 90),
      rb2: vor('rb2', 'RB', 60),
      'fa:Free RB': vor('fa:Free RB', 'RB', 20),
      'fa:Free QB': vor('fa:Free QB', 'QB', 70),
    },
    freeAgents: [
      { name: 'Free RB', position: 'RB', team: 'CHI' },
      { name: 'Free QB', position: 'QB', team: 'GB' },
    ] as AvailablePlayer[],
    myTeamKey: 'me',
    slots,
    byeTeams: new Set<string>(),
  })

  it('ranks every position together, best first', () => {
    const all = build().board.ALL
    expect(all.map((r) => r.name)).toEqual(['My RB', 'Free QB', 'Their RB', 'My QB', 'Free RB'])
  })

  it('carries each row position, which the per-position boards never had to', () => {
    const all = build().board.ALL
    expect(all.find((r) => r.name === 'Free QB')?.position).toBe('QB')
  })

  it('keeps the per-position boards intact beside it', () => {
    const w = build()
    expect(w.board.QB.map((r) => r.name)).toEqual(['Free QB', 'My QB'])
    expect(w.board.RB.map((r) => r.name)).toEqual(['My RB', 'Their RB', 'Free RB'])
  })

  it('tiers the overall board on its own, not by inheritance', () => {
    const all = build().board.ALL
    // Shared row objects carry tier state from the positional pass; the overall board must
    // re-derive it, or a cliff among receivers shows up as a cliff among everybody.
    const breaks = all.filter((r) => r.tierBreak).map((r) => r.tier)
    expect(breaks).toEqual([...new Set(breaks)])
    expect([...breaks].sort((a, b) => a - b)).toEqual(breaks)
  })
})
