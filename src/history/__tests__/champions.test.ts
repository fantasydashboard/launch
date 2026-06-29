import { describe, it, expect } from 'vitest'
import { buildChampions } from '../champions'
import type { HistorySeason, HistoryTeam } from '../types'

function team(p: Partial<HistoryTeam> & { teamKey: string }): HistoryTeam {
  return {
    teamName: p.teamKey,
    wins: 0,
    losses: 0,
    ties: 0,
    pointsFor: 0,
    rank: 0,
    madePlayoffs: false,
    champion: false,
    ...p,
  }
}

describe('buildChampions', () => {
  const seasons: HistorySeason[] = [
    {
      season: 2024,
      teams: [
        // Champion by FLAG even though not rank 1 (a lower seed won the bracket).
        team({ teamKey: 'A', teamName: 'Alpha', rank: 3, pointsFor: 1500, champion: true }),
        team({ teamKey: 'B', teamName: 'Bravo', rank: 1, pointsFor: 1700 }), // regular leader (most pointsFor)
        team({ teamKey: 'D', teamName: 'Delta', rank: 2, pointsFor: 1300 }), // runner-up (rank 2)
        team({ teamKey: 'C', teamName: 'Charlie', rank: 4, pointsFor: 1200 }),
      ],
    },
    {
      season: 2023,
      teams: [
        // No flag → champion falls back to rank 1.
        team({ teamKey: 'C', teamName: 'Charlie', rank: 1, pointsFor: 1600 }),
        team({ teamKey: 'A', teamName: 'Alpha', rank: 2, pointsFor: 1400 }),
      ],
    },
  ]

  it('returns one row per season, newest first', () => {
    const rows = buildChampions(seasons)
    expect(rows.map((r) => r.season)).toEqual([2024, 2023])
  })

  it('picks champion by flag, then by rank-1 fallback', () => {
    const rows = buildChampions(seasons)
    expect(rows[0].championName).toBe('Alpha') // flag wins over rank
    expect(rows[1].championName).toBe('Charlie') // fallback to rank 1
  })

  it('reports runner-up (rank 2) and the regular leader when it differs from champion', () => {
    const rows = buildChampions(seasons)
    expect(rows[0].runnerUpName).toBe('Delta') // rank 2
    expect(rows[0].regularLeaderName).toBe('Bravo') // most pointsFor, ≠ champion
  })

  it('omits regular leader when it IS the champion', () => {
    const single: HistorySeason[] = [
      {
        season: 2022,
        teams: [
          team({ teamKey: 'X', teamName: 'X', rank: 1, pointsFor: 2000, champion: true }),
          team({ teamKey: 'Y', teamName: 'Y', rank: 2, pointsFor: 1000 }),
        ],
      },
    ]
    const rows = buildChampions(single)
    expect(rows[0].championName).toBe('X')
    expect(rows[0].regularLeaderName).toBeUndefined()
  })

  it('handles a single season', () => {
    const rows = buildChampions([seasons[1]])
    expect(rows).toHaveLength(1)
    expect(rows[0].championName).toBe('Charlie')
  })
})
