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

describe('championship odds', () => {
  const league: OddsTeam[] = Array.from({ length: 8 }, (_, i) => ({
    teamKey: `t${i}`, strength: 130 - i * 6, wins: 0, losses: 0, ties: 0, pointsFor: 1000 - i * 10,
  }))
  /* A plain round robin: everybody plays somebody every week, nobody twice in a week. */
  const schedule: ScheduleWeek[] = Array.from({ length: 7 }, (_, w) => {
    const ids = league.map((t) => t.teamKey)
    const fixed = ids[0]
    const rot = ids.slice(1)
    for (let r = 0; r < w; r++) rot.unshift(rot.pop() as string)
    const order = [fixed, ...rot]
    const matchups: [string, string][] = []
    for (let i = 0; i < order.length / 2; i++) matchups.push([order[i], order[order.length - 1 - i]])
    return { week: w + 1, matchups }
  })
  const run = (spots: number) =>
    simulatePlayoffOdds(league, schedule, { playoffSpots: spots, sims: 1500, rng: mulberry(9) }).results

  /* A fixed stream, so a title share cannot wobble between runs of the suite. */
  function mulberry(seed: number) {
    let a = seed >>> 0
    return () => {
      a = (a + 0x6d2b79f5) >>> 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  it('hands out exactly one title per simulated season', () => {
    expect(run(4).reduce((a, b) => a + b.titlePct, 0)).toBeCloseTo(1, 1)
  })

  it('never gives a title to a team that cannot reach the bracket', () => {
    for (const row of run(4)) expect(row.titlePct).toBeLessThanOrEqual(row.playoffPct + 1e-9)
  })

  it('separates reaching the bracket from winning it, which is the point', () => {
    /*
     * The last seed in makes the playoffs far more often than it wins them, so a page showing
     * only playoff odds tells a bubble team and a juggernaut nearly the same story.
     */
    const best = [...run(4)].sort((a, b) => b.playoffPct - a.playoffPct)[0]
    expect(best.playoffPct).toBeGreaterThan(best.titlePct)
  })

  it('favours the stronger roster', () => {
    const by = Object.fromEntries(run(4).map((x) => [x.teamKey, x.titlePct]))
    expect(by.t0).toBeGreaterThan(by.t3)
  })

  it('still adds to one when the field is not a power of two', () => {
    // 6 into an 8-slot bracket: the top two sit out the first round.
    expect(run(6).reduce((a, b) => a + b.titlePct, 0)).toBeCloseTo(1, 1)
    expect(run(3).reduce((a, b) => a + b.titlePct, 0)).toBeCloseTo(1, 1)
  })

  it('gives the whole title to the only qualifier in a one-spot league', () => {
    const r = run(1)
    expect(r.reduce((a, b) => a + b.titlePct, 0)).toBeCloseTo(1, 1)
    const top = [...r].sort((a, b) => b.titlePct - a.titlePct)[0]
    expect(top.titlePct).toBeCloseTo(top.playoffPct, 2)
  })
})
