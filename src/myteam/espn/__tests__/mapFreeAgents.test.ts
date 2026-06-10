import { describe, it, expect } from 'vitest'
import { mapEspnFreeAgents } from '../mapFreeAgents'

const fa = [
  { playerId: 30, fullName: 'Mickey Moniak', proTeam: 'COL', position: 'OF', injuryStatus: '', percentOwned: 12, stats: { '20': 12 } },
  { playerId: 31, fullName: 'Jakob Junis', proTeam: 'MIL', position: 'SP', injuryStatus: 'DTD', percentOwned: 3, stats: { '47': 0.79 } },
]

describe('mapEspnFreeAgents', () => {
  it('maps EspnPlayer free agents to AvailablePlayer rows', () => {
    const out = mapEspnFreeAgents(fa, 'baseball')
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({
      playerKey: '30',
      name: 'Mickey Moniak',
      position: 'OF',
      team: 'COL',
      percentOwned: 12,
      stats: { '20': 12 },
    })
    expect(out[0].headshot).toBe('https://a.espncdn.com/i/headshots/mlb/players/full/30.png')
    expect(out[1].status).toBe('DTD')
  })

  it('handles an empty list', () => {
    expect(mapEspnFreeAgents([], 'baseball')).toHaveLength(0)
  })
})
