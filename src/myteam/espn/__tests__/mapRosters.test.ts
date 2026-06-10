import { describe, it, expect } from 'vitest'
import { espnHeadshotUrl, mapRostersToPool, mapRosterToPlayers } from '../mapRosters'

const player = (id: number, stats: Record<string, number>) => ({
  playerId: id,
  fullName: `Player ${id}`,
  proTeam: 'NYY',
  position: 'OF',
  injuryStatus: '',
  actualPoints: id,
  percentOwned: 50,
  stats,
})

const teams = [
  { id: 1, name: 'A', roster: [player(10, { '20': 30 }), player(11, { '20': 12 })] },
  { id: 2, name: 'B', roster: [player(20, { '20': 5 })] },
]

describe('mapRosters', () => {
  it('espnHeadshotUrl uses the sport-specific path', () => {
    expect(espnHeadshotUrl(123, 'baseball')).toBe(
      'https://a.espncdn.com/i/headshots/mlb/players/full/123.png',
    )
    expect(espnHeadshotUrl(123, 'hockey')).toBe(
      'https://a.espncdn.com/i/headshots/nhl/players/full/123.png',
    )
  })

  it('mapRostersToPool flattens all teams to {playerKey, stats}', () => {
    const pool = mapRostersToPool(teams)
    expect(pool).toHaveLength(3)
    expect(pool).toContainEqual({ playerKey: '10', stats: { '20': 30 } })
    expect(pool).toContainEqual({ playerKey: '20', stats: { '20': 5 } })
  })

  it('mapRosterToPlayers maps one team to RosterPlayer rows with headshots', () => {
    const rows = mapRosterToPlayers(teams[0], 'baseball')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      playerKey: '10',
      name: 'Player 10',
      position: 'OF',
      team: 'NYY',
      headshot: 'https://a.espncdn.com/i/headshots/mlb/players/full/10.png',
      totalPoints: 10,
      stats: { '20': 30 },
    })
  })

  it('handles a team with no roster', () => {
    expect(mapRostersToPool([{ id: 9, name: 'X' }])).toHaveLength(0)
    expect(mapRosterToPlayers({ id: 9, name: 'X' }, 'baseball')).toHaveLength(0)
  })
})
