import { describe, it, expect } from 'vitest'
import { matchupWinProb, simulatePlayoffOdds, buildLeverage, type OddsTeam, type ScheduleWeek } from '../playoffOdds'

describe('matchupWinProb', () => {
  it('is 0.5 for equal strength and trends to 1 as A dominates', () => {
    expect(matchupWinProb(100, 100, 30)).toBeCloseTo(0.5, 5)
    expect(matchupWinProb(200, 100, 30)).toBeGreaterThan(0.95)
    expect(matchupWinProb(100, 200, 30)).toBeLessThan(0.05)
  })
})

describe('simulatePlayoffOdds', () => {
  const teams: OddsTeam[] = [
    { teamKey: 'A', strength: 100, wins: 0, losses: 0, ties: 0, pointsFor: 0 },
    { teamKey: 'B', strength: 90, wins: 0, losses: 0, ties: 0, pointsFor: 0 },
    { teamKey: 'C', strength: 80, wins: 0, losses: 0, ties: 0, pointsFor: 0 },
    { teamKey: 'D', strength: 70, wins: 0, losses: 0, ties: 0, pointsFor: 0 },
  ]
  const schedule: ScheduleWeek[] = [
    { week: 1, matchups: [['A', 'D'], ['B', 'C']] },
    { week: 2, matchups: [['A', 'C'], ['B', 'D']] },
    { week: 3, matchups: [['A', 'B'], ['C', 'D']] },
  ]

  it('with rng=0.5 the stronger team always wins -> deterministic seeds', () => {
    // rng()=0.5 means A beats B iff winProb(A,B) > 0.5 iff strengthA > strengthB.
    const out = simulatePlayoffOdds(teams, schedule, { playoffSpots: 2, sims: 50, rng: () => 0.5 })
    const by = Object.fromEntries(out.results.map((r) => [r.teamKey, r]))
    expect(by.A.playoffPct).toBe(1) // A 3-0
    expect(by.B.playoffPct).toBe(1) // B 2-1
    expect(by.C.playoffPct).toBe(0) // C 1-2
    expect(by.D.playoffPct).toBe(0) // D 0-3
    expect(by.A.projWins).toBeCloseTo(3, 5)
    expect(by.D.projWins).toBeCloseTo(0, 5)
  })

  it('results are sorted by playoff odds desc', () => {
    const out = simulatePlayoffOdds(teams, schedule, { playoffSpots: 2, sims: 50, rng: () => 0.5 })
    expect(out.results[0].teamKey).toBe('A')
    expect(out.results[out.results.length - 1].playoffPct).toBeLessThanOrEqual(out.results[0].playoffPct)
  })

  it('force pins a team to win or lose its week regardless of strength', () => {
    // D is the weakest team; left to chance (rng=0.5) it loses every game.
    // Forcing D to win week 1 gives it a guaranteed win it would not otherwise get.
    const win = simulatePlayoffOdds(teams, schedule, {
      playoffSpots: 2,
      sims: 20,
      rng: () => 0.5,
      force: { teamKey: 'D', week: 1, win: true },
    })
    const lose = simulatePlayoffOdds(teams, schedule, {
      playoffSpots: 2,
      sims: 20,
      rng: () => 0.5,
      force: { teamKey: 'D', week: 1, win: false },
    })
    const dWin = win.results.find((r) => r.teamKey === 'D')!
    const dLose = lose.results.find((r) => r.teamKey === 'D')!
    expect(dWin.projWins).toBeCloseTo(1, 5) // the one forced win
    expect(dLose.projWins).toBeCloseTo(0, 5) // forced loss + two strength losses
    // A's opponent in week 1 is D; forcing D to win means A takes a loss it normally avoids.
    const aWin = win.results.find((r) => r.teamKey === 'A')!
    expect(aWin.projWins).toBeCloseTo(2, 5)
  })
})

describe('buildLeverage', () => {
  const teams: OddsTeam[] = [
    { teamKey: 'A', strength: 100, wins: 0, losses: 0, ties: 0, pointsFor: 0 },
    { teamKey: 'B', strength: 90, wins: 0, losses: 0, ties: 0, pointsFor: 0 },
    { teamKey: 'C', strength: 80, wins: 0, losses: 0, ties: 0, pointsFor: 0 },
    { teamKey: 'D', strength: 70, wins: 0, losses: 0, ties: 0, pointsFor: 0 },
  ]
  const schedule: ScheduleWeek[] = [
    { week: 1, matchups: [['A', 'D'], ['B', 'C']] },
    { week: 2, matchups: [['A', 'C'], ['B', 'D']] },
    { week: 3, matchups: [['A', 'B'], ['C', 'D']] },
  ]

  it('returns one entry per remaining game with oddsIfWin >= oddsIfLose, sorted by leverage desc', () => {
    const lev = buildLeverage(teams, schedule, { playoffSpots: 2, sims: 200 }, 'C')
    expect(lev).toHaveLength(3) // C plays in all three weeks
    expect(lev.map((g) => g.opponentKey).sort()).toEqual(['A', 'B', 'D'])
    for (const g of lev) {
      expect(g.oddsIfWin).toBeGreaterThanOrEqual(g.oddsIfLose)
      expect(g.leverage).toBeCloseTo(Math.abs(g.oddsIfWin - g.oddsIfLose), 10)
    }
    for (let i = 1; i < lev.length; i++) {
      expect(lev[i - 1].leverage).toBeGreaterThanOrEqual(lev[i].leverage)
    }
  })
})
