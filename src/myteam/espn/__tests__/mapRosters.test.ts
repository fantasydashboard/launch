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

  it('mapRostersToPool flattens all teams with name + teamKey (espn_<id>)', () => {
    const pool = mapRostersToPool(teams)
    expect(pool).toHaveLength(3)
    expect(pool).toContainEqual({ playerKey: '10', name: 'Player 10', position: 'OF', eligiblePositions: ['OF'], stats: { '20': 30 }, teamKey: 'espn_1', proTeam: 'NYY', onIL: false, status: '' })
    expect(pool).toContainEqual({ playerKey: '20', name: 'Player 20', position: 'OF', eligiblePositions: ['OF'], stats: { '20': 5 }, teamKey: 'espn_2', proTeam: 'NYY', onIL: false, status: '' })
  })

  it('mapRostersToPool flags players in an IL lineup slot as onIL', () => {
    const pool = mapRostersToPool([
      { id: 3, name: 'C', roster: [{ ...player(30, { '20': 8 }), lineupSlot: 'IL' }, { ...player(31, { '20': 9 }), lineupSlot: 'BE' }] },
    ])
    expect(pool.find((p) => p.playerKey === '30')?.onIL).toBe(true)
    expect(pool.find((p) => p.playerKey === '31')?.onIL).toBe(false)
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

describe('mapRostersToPool injury status', () => {
  it('carries injuryStatus onto the pooled player (blank when ACTIVE / missing)', () => {
    const teams = [
      {
        id: 7,
        name: 'T',
        roster: [
          { playerId: 1, fullName: 'Hurt Guy', proTeam: 'NYY', position: 'SP', stats: {}, injuryStatus: 'SIXTY_DAY_DL', lineupSlot: 'IL' },
          { playerId: 2, fullName: 'Fine Guy', proTeam: 'LAD', position: '2B', stats: {}, injuryStatus: 'ACTIVE', lineupSlot: '2B' },
          { playerId: 3, fullName: 'Nostatus', proTeam: 'BOS', position: 'OF', stats: {}, lineupSlot: 'OF' },
        ],
      },
    ]
    const pool = mapRostersToPool(teams as any, 'baseball')
    const byName = Object.fromEntries(pool.map((p) => [p.name, p]))
    expect(byName['Hurt Guy'].status).toBe('SIXTY_DAY_DL')
    expect(byName['Hurt Guy'].onIL).toBe(true) // lineupSlot 'IL'
    expect(byName['Fine Guy'].status).toBe('') // ACTIVE → blank
    expect(byName['Nostatus'].status).toBe('') // missing → blank
  })
})
