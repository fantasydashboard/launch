import { describe, it, expect } from 'vitest'
import { buildSleeperPool, buildSleeperTeamNames, buildSleeperTeamMeta, buildSleeperFreeAgents, sleeperMyTeamKey } from '@/composables/useSleeperLeaguePool'

const players = {
  p1: { player_id: 'p1', full_name: 'Josh Allen', position: 'QB', fantasy_positions: ['QB'], team: 'BUF', injury_status: null, status: 'Active' },
  p2: { player_id: 'p2', full_name: 'Bijan Robinson', position: 'RB', fantasy_positions: ['RB'], team: 'ATL', injury_status: null, status: 'Active' },
  p3: { player_id: 'p3', full_name: 'CeeDee Lamb', position: 'WR', fantasy_positions: ['WR'], team: 'DAL', injury_status: 'Questionable', status: 'Active' },
  fa1: { player_id: 'fa1', full_name: 'Free Agent RB', position: 'RB', fantasy_positions: ['RB'], team: 'NYJ', injury_status: null, status: 'Active' },
  dst: { player_id: 'dst1', full_name: 'D/ST', position: 'DEF', fantasy_positions: ['DEF'], team: 'SF', injury_status: null, status: 'Active' },
} as any
const rosters = [
  { roster_id: 1, owner_id: 'u1', players: ['p1', 'p2'], starters: ['p1', 'p2'], settings: { wins: 3, losses: 1, ties: 0, fpts: 420, fpts_decimal: 5 } },
  { roster_id: 2, owner_id: 'u2', players: ['p3'], starters: ['p3'], settings: { wins: 2, losses: 2, ties: 0, fpts: 300, fpts_decimal: 0 } },
] as any
const users = [
  { user_id: 'u1', display_name: 'alice', metadata: { team_name: 'Alice Team' } },
  { user_id: 'u2', display_name: 'bob', metadata: {} },
] as any

describe('buildSleeperPool', () => {
  it('maps each roster player to a PointsPoolPlayer keyed by player_id, teamKey = roster_id', () => {
    const pool = buildSleeperPool(rosters, players)
    expect(pool).toHaveLength(3)
    const p1 = pool.find((p) => p.playerKey === 'p1')!
    expect(p1).toMatchObject({ playerKey: 'p1', name: 'Josh Allen', position: 'QB', teamKey: '1', proTeam: 'BUF' })
    expect(p1.eligiblePositions).toEqual(['QB'])
    const p3 = pool.find((p) => p.playerKey === 'p3')!
    expect(p3.teamKey).toBe('2')
    expect(p3.onIL).toBe(false)
  })
  it('skips roster player_ids missing from the players map', () => {
    const pool = buildSleeperPool([{ roster_id: 9, owner_id: 'x', players: ['ghost'], starters: [], settings: {} }] as any, players)
    expect(pool).toHaveLength(0)
  })
})

describe('sleeperMyTeamKey', () => {
  it('is the String(roster_id) whose owner_id === currentUserId', () => {
    expect(sleeperMyTeamKey(rosters, 'u2')).toBe('2')
    expect(sleeperMyTeamKey(rosters, 'nope')).toBe('')
    expect(sleeperMyTeamKey(rosters, null)).toBe('')
  })
})

describe('buildSleeperTeamNames / Meta', () => {
  it('names by roster_id via team_name → display_name fallback', () => {
    const names = buildSleeperTeamNames(rosters, users)
    expect(names['1']).toBe('Alice Team')
    expect(names['2']).toBe('bob')
  })
  it('meta carries wins/losses/ties/pointsFor (fpts + decimal)', () => {
    const meta = buildSleeperTeamMeta(rosters)
    expect(meta['1']).toEqual({ wins: 3, losses: 1, ties: 0, pointsFor: 420.05 })
    expect(meta['2'].pointsFor).toBe(300)
  })
})

describe('buildSleeperFreeAgents', () => {
  it('returns unrostered skill-position players with a team, as AvailablePlayer', () => {
    const fas = buildSleeperFreeAgents(rosters, players)
    const keys = fas.map((f) => f.playerKey)
    expect(keys).toContain('fa1')
    expect(keys).not.toContain('p1')
    expect(keys).not.toContain('dst1')
    const fa = fas.find((f) => f.playerKey === 'fa1')!
    expect(fa).toMatchObject({ playerKey: 'fa1', name: 'Free Agent RB', position: 'RB', team: 'NYJ' })
  })
})
