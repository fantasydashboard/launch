import { describe, it, expect } from 'vitest'
import { buildLegendaryMoments } from '../legendaryMoments'
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

describe('buildLegendaryMoments', () => {
  it('detects the biggest week from points and labels it', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [team({ teamKey: 'A', teamName: 'Aces', wins: 1, losses: 1 }), team({ teamKey: 'B', wins: 1, losses: 1 })],
        weeks: [
          { week: 1, results: { A: 'W', B: 'L' }, points: { A: 142.5, B: 100 } },
          { week: 2, results: { A: 'L', B: 'W' }, points: { A: 90, B: 160.2 } },
        ],
      },
    ]
    const moments = buildLegendaryMoments(seasons)
    const top = moments.find((m) => m.kind === 'topWeek')!
    expect(top).toBeTruthy()
    expect(top.teamName).toBe('B')
    expect(top.value).toBe(160.2)
    expect(top.season).toBe(2024)
    expect(top.week).toBe(2)
  })

  it('omits topWeek for category leagues with no points', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [team({ teamKey: 'A', wins: 2 }), team({ teamKey: 'B', wins: 1, losses: 1 })],
        weeks: [
          { week: 1, results: { A: 'W', B: 'L' } },
          { week: 2, results: { A: 'W', B: 'L' } },
        ],
      },
    ]
    const moments = buildLegendaryMoments(seasons)
    expect(moments.find((m) => m.kind === 'topWeek')).toBeUndefined()
    // streak / season records still present
    expect(moments.find((m) => m.kind === 'winStreak')).toBeTruthy()
  })

  it('detects longest win and lose streaks across week ordering', () => {
    // A wins weeks 1,2,3 across two seasons in order; B loses 1,2,3,4.
    const seasons: HistorySeason[] = [
      {
        season: 2023,
        teams: [team({ teamKey: 'A', wins: 2 }), team({ teamKey: 'B', losses: 2 })],
        weeks: [
          { week: 1, results: { A: 'W', B: 'L' } },
          { week: 2, results: { A: 'W', B: 'L' } },
        ],
      },
      {
        season: 2024,
        teams: [team({ teamKey: 'A', wins: 1, losses: 1 }), team({ teamKey: 'B', losses: 2 })],
        weeks: [
          { week: 1, results: { A: 'W', B: 'L' } },
          { week: 2, results: { A: 'L', B: 'L' } },
        ],
      },
    ]
    const moments = buildLegendaryMoments(seasons)
    const win = moments.find((m) => m.kind === 'winStreak')!
    expect(win.teamName).toBe('A')
    expect(win.value).toBe(3) // 2023 w1,w2 + 2024 w1
    expect(win.season).toBe(2024) // streak ended in 2024
    const lose = moments.find((m) => m.kind === 'loseStreak')!
    expect(lose.teamName).toBe('B')
    expect(lose.value).toBe(4)
  })

  it('a tie breaks a streak', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [team({ teamKey: 'A', wins: 1, ties: 1 })],
        weeks: [
          { week: 1, results: { A: 'W' } },
          { week: 2, results: { A: 'T' } },
          { week: 3, results: { A: 'W' } },
        ],
      },
    ]
    const moments = buildLegendaryMoments(seasons)
    // No streak >= 2 → no winStreak moment.
    expect(moments.find((m) => m.kind === 'winStreak')).toBeUndefined()
  })

  it('finds best and worst season by winPct', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [
          team({ teamKey: 'A', teamName: 'Aces', wins: 16, losses: 4 }), // .800
          team({ teamKey: 'B', teamName: 'Bums', wins: 2, losses: 18 }), // .100
        ],
      },
    ]
    const moments = buildLegendaryMoments(seasons)
    const best = moments.find((m) => m.kind === 'bestSeason')!
    expect(best.teamName).toBe('Aces')
    expect(best.value).toBe('16-4')
    const worst = moments.find((m) => m.kind === 'worstSeason')!
    expect(worst.teamName).toBe('Bums')
    expect(worst.value).toBe('2-18')
  })

  it('returns empty for empty input', () => {
    expect(buildLegendaryMoments([])).toEqual([])
  })

  it('finds the closest game and biggest blowout from paired matchups', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [
          team({ teamKey: 'A', teamName: 'Aces', wins: 2 }),
          team({ teamKey: 'B', teamName: 'Bears', losses: 2 }),
          team({ teamKey: 'C', teamName: 'Cubs', wins: 1, losses: 1 }),
          team({ teamKey: 'D', teamName: 'Ducks', wins: 1, losses: 1 }),
        ],
        weeks: [
          {
            week: 1,
            results: { A: 'W', B: 'L', C: 'W', D: 'L' },
            points: { A: 100.5, B: 100.0, C: 150, D: 90 },
            matchups: [['A', 'B'], ['C', 'D']],
          },
        ],
      },
    ]
    const moments = buildLegendaryMoments(seasons, 'points')
    const close = moments.find((m) => m.kind === 'closestGame')!
    expect(close.teamName).toBe('Aces')
    expect(close.vsName).toBe('Bears')
    expect(close.value).toBe(0.5)
    expect(close.detail).toBe('100.5–100')
    expect(close.week).toBe(1)

    const blow = moments.find((m) => m.kind === 'biggestBlowout')!
    expect(blow.teamName).toBe('Cubs')
    expect(blow.vsName).toBe('Ducks')
    expect(blow.value).toBe(60)
    expect(blow.detail).toBe('150–90')
  })

  it('finds the highest-scoring season by summed weekly points', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [team({ teamKey: 'A', teamName: 'Aces', wins: 2 }), team({ teamKey: 'B', wins: 0, losses: 2 })],
        weeks: [
          { week: 1, results: { A: 'W', B: 'L' }, points: { A: 110, B: 90 } },
          { week: 2, results: { A: 'W', B: 'L' }, points: { A: 120, B: 95 } },
        ],
      },
    ]
    const moments = buildLegendaryMoments(seasons, 'points')
    const hi = moments.find((m) => m.kind === 'highScoringSeason')!
    expect(hi.teamName).toBe('Aces')
    expect(hi.value).toBe(230) // 110 + 120
    expect(hi.valueLabel).toBe('pts')
    expect(hi.season).toBe(2024)
  })

  it('finds the biggest sweep for category leagues from category-win counts', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [
          team({ teamKey: 'A', teamName: 'Aces', wins: 1, losses: 1 }),
          team({ teamKey: 'B', teamName: 'Bears', wins: 1, losses: 1 }),
        ],
        weeks: [
          {
            week: 1,
            results: { A: 'W', B: 'L' },
            points: { A: 6, B: 3 },
            matchups: [['A', 'B']],
          },
          {
            week: 2,
            results: { A: 'L', B: 'W' },
            points: { B: 9, A: 1 }, // bigger sweep
            matchups: [['A', 'B']],
          },
        ],
      },
    ]
    const moments = buildLegendaryMoments(seasons, 'category')
    const sweep = moments.find((m) => m.kind === 'biggestSweep')!
    expect(sweep.teamName).toBe('Bears')
    expect(sweep.vsName).toBe('Aces')
    expect(sweep.value).toBe(9)
    expect(sweep.detail).toBe('9–1')
    expect(sweep.week).toBe(2)
    // points-only moments must NOT appear for a category league
    expect(moments.find((m) => m.kind === 'topWeek')).toBeUndefined()
    expect(moments.find((m) => m.kind === 'closestGame')).toBeUndefined()
    expect(moments.find((m) => m.kind === 'biggestBlowout')).toBeUndefined()
    expect(moments.find((m) => m.kind === 'highScoringSeason')).toBeUndefined()
  })

  it('skips biggest sweep when category data is all-zero (e.g. ESPN cats)', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [team({ teamKey: 'A', wins: 1 }), team({ teamKey: 'B', losses: 1 })],
        weeks: [
          {
            week: 1,
            results: { A: 'W', B: 'L' },
            points: { A: 0, B: 0 },
            matchups: [['A', 'B']],
          },
        ],
      },
    ]
    const moments = buildLegendaryMoments(seasons, 'category')
    expect(moments.find((m) => m.kind === 'biggestSweep')).toBeUndefined()
  })

  it('omits points-based moments when scoring is category', () => {
    const seasons: HistorySeason[] = [
      {
        season: 2024,
        teams: [team({ teamKey: 'A', wins: 1 }), team({ teamKey: 'B', losses: 1 })],
        weeks: [
          {
            week: 1,
            results: { A: 'W', B: 'L' },
            points: { A: 142, B: 100 },
            matchups: [['A', 'B']],
          },
        ],
      },
    ]
    const moments = buildLegendaryMoments(seasons, 'category')
    expect(moments.find((m) => m.kind === 'topWeek')).toBeUndefined()
    expect(moments.find((m) => m.kind === 'closestGame')).toBeUndefined()
    expect(moments.find((m) => m.kind === 'biggestBlowout')).toBeUndefined()
    expect(moments.find((m) => m.kind === 'highScoringSeason')).toBeUndefined()
  })

  it('includes most playoff trips only when playoff data exists', () => {
    const withPlayoffs: HistorySeason[] = [
      {
        season: 2023,
        teams: [team({ teamKey: 'A', wins: 1, madePlayoffs: true }), team({ teamKey: 'B', losses: 1 })],
      },
      {
        season: 2024,
        teams: [team({ teamKey: 'A', wins: 1, madePlayoffs: true }), team({ teamKey: 'B', wins: 1, madePlayoffs: true })],
      },
    ]
    const m1 = buildLegendaryMoments(withPlayoffs, 'points')
    const trips = m1.find((m) => m.kind === 'mostPlayoffTrips')!
    expect(trips.teamName).toBe('A')
    expect(trips.value).toBe(2)
    expect(trips.valueLabel).toBe('playoffs')

    const noPlayoffs: HistorySeason[] = [
      {
        season: 2024,
        teams: [team({ teamKey: 'A', wins: 2 }), team({ teamKey: 'B', losses: 2 })],
      },
    ]
    const m2 = buildLegendaryMoments(noPlayoffs, 'points')
    expect(m2.find((m) => m.kind === 'mostPlayoffTrips')).toBeUndefined()
  })
})
