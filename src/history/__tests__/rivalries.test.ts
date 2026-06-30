import { describe, it, expect } from 'vitest'
import { buildRivalries } from '../rivalries'
import type { HistorySeason, HistoryTeam, HistoryWeek } from '../types'

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

// Helper: a week from a list of [winnerKey, loserKey] (or [a,b,'T'] for a tie).
function week(w: number, games: [string, string, ('T' | undefined)?][]): HistoryWeek {
  const results: Record<string, 'W' | 'L' | 'T'> = {}
  const matchups: [string, string][] = []
  for (const [x, y, tie] of games) {
    matchups.push([x, y])
    if (tie === 'T') {
      results[x] = 'T'
      results[y] = 'T'
    } else {
      results[x] = 'W'
      results[y] = 'L'
    }
  }
  return { week: w, results, matchups }
}

describe('buildRivalries', () => {
  it('hides (empty) when no week carries matchups', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [team({ teamKey: 'ME' }), team({ teamKey: 'A' })],
        weeks: [{ week: 1, results: { ME: 'W', A: 'L' } }], // no matchups field
      },
    ]
    const res = buildRivalries(seasons, 'ME')
    expect(res.mine).toEqual([])
    expect(res.fiercest).toBeNull()
  })

  it('tallies my H2H record vs each opponent across seasons with edge', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2023,
        teams: [team({ teamKey: 'ME', teamName: 'Me' }), team({ teamKey: 'A', teamName: 'Aces' }), team({ teamKey: 'B', teamName: 'Bears' })],
        weeks: [
          week(1, [['ME', 'A']]), // I beat A
          week(2, [['A', 'ME']]), // A beat me
          week(3, [['ME', 'B']]), // I beat B
        ],
      },
      {
        season: 2024,
        teams: [team({ teamKey: 'ME', teamName: 'Me' }), team({ teamKey: 'A', teamName: 'Aces' }), team({ teamKey: 'B', teamName: 'Bears' })],
        weeks: [
          week(1, [['ME', 'A']]), // I beat A again
          week(2, [['B', 'ME']]), // B beat me
        ],
      },
    ]
    const res = buildRivalries(seasons, 'ME')
    const byOpp = Object.fromEntries(res.mine.map((r) => [r.oppKey, r]))
    // vs A: 2-1
    expect(byOpp.A.wins).toBe(2)
    expect(byOpp.A.losses).toBe(1)
    expect(byOpp.A.games).toBe(3)
    expect(byOpp.A.edge).toBe('up')
    expect(byOpp.A.oppName).toBe('Aces')
    // vs B: 1-1
    expect(byOpp.B.wins).toBe(1)
    expect(byOpp.B.losses).toBe(1)
    expect(byOpp.B.edge).toBe('even')
    // sorted by games desc → A (3) before B (2)
    expect(res.mine[0].oppKey).toBe('A')
  })

  it('counts ties and reports down edge', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [team({ teamKey: 'ME' }), team({ teamKey: 'A' })],
        weeks: [
          week(1, [['A', 'ME']]),
          week(2, [['A', 'ME']]),
          week(3, [['ME', 'A', 'T']]),
        ],
      },
    ]
    const res = buildRivalries(seasons, 'ME')
    const a = res.mine.find((r) => r.oppKey === 'A')!
    expect(a.wins).toBe(0)
    expect(a.losses).toBe(2)
    expect(a.ties).toBe(1)
    expect(a.edge).toBe('down')
  })

  it('picks fiercest as most games, tiebreak smallest split', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [team({ teamKey: 'ME' }), team({ teamKey: 'A' }), team({ teamKey: 'B' }), team({ teamKey: 'C' })],
        weeks: [
          // A vs B: 4 games, 2-2 (split 0) — fiercest
          week(1, [['A', 'B'], ['ME', 'C']]),
          week(2, [['B', 'A'], ['ME', 'C']]),
          week(3, [['A', 'B'], ['ME', 'C']]),
          week(4, [['B', 'A'], ['ME', 'C']]),
          // ME vs C also 4 games but 4-0 (split 4) — loses tiebreak
        ],
      },
    ]
    const res = buildRivalries(seasons, 'ME')
    expect(res.fiercest).not.toBeNull()
    expect(res.fiercest!.games).toBe(4)
    const keys = [res.fiercest!.aKey, res.fiercest!.bKey].sort()
    expect(keys).toEqual(['A', 'B'])
  })

  it('returns empty mine when myTeamKey is unknown but still computes fiercest', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [team({ teamKey: 'A' }), team({ teamKey: 'B' })],
        weeks: [week(1, [['A', 'B']]), week(2, [['B', 'A']])],
      },
    ]
    const res = buildRivalries(seasons, '')
    expect(res.mine).toEqual([])
    expect(res.fiercest!.games).toBe(2)
  })
})
