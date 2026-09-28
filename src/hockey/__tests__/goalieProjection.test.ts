import { describe, it, expect } from 'vitest'
import { projectGoalies, TEAM_STARTS, SAVE_PCT_PERSISTENCE } from '../goalieProjection'

const g = (playerId: number, teamAbbrevs: string, gamesStarted: number, over: any = {}) => ({
  playerId, goalieFullName: 'G' + playerId, teamAbbrevs, gamesStarted,
  shotsAgainst: gamesStarted * 28, saves: gamesStarted * 28 * 0.900,
  goalsAgainst: gamesStarted * 28 * 0.100, wins: gamesStarted * 0.5,
  shutouts: gamesStarted * 0.04, ...over,
})

describe('projectGoalies', () => {
  /*
   * THE CONSTRAINT THAT MATTERS. A team plays 82 games and someone starts each one — measured
   * at exactly 82.0 per team across all 32 clubs. Two goalies who each project as a starter
   * cannot both be right, and letting them say so is how a backup reaches a draft board.
   */
  it('shares exactly a season of starts among each team', () => {
    const out = projectGoalies([[g(1, 'TOR', 55), g(2, 'TOR', 27), g(3, 'BOS', 60), g(4, 'BOS', 22)]], [1])
    const tor = out.filter((r) => r.team === 'TOR').reduce((s, r) => s + r.starts, 0)
    const bos = out.filter((r) => r.team === 'BOS').reduce((s, r) => s + r.starts, 0)
    expect(tor).toBeCloseTo(TEAM_STARTS, 6)
    expect(bos).toBeCloseTo(TEAM_STARTS, 6)
  })

  it('keeps the starter ahead of his backup', () => {
    const out = projectGoalies([[g(1, 'TOR', 58), g(2, 'TOR', 24)]], [1])
    const starter = out.find((r) => r.playerId === 1)!
    const backup = out.find((r) => r.playerId === 2)!
    expect(starter.starts).toBeGreaterThan(backup.starts)
  })

  /*
   * Save percentage is regressed HARD but not flat. Weighted by shots and without a survivor
   * filter it persists at 0.15-0.24 season to season, and the constant sits above that because
   * what it regresses is a three-year blend. A .930 goalie stays ahead of an .870 one — by much
   * less than sixty points.
   */
  it('regresses save percentage hard toward the league mean', () => {
    const hot = g(1, 'TOR', 50, { saves: 50 * 28 * 0.930, goalsAgainst: 50 * 28 * 0.070 })
    const cold = g(2, 'BOS', 50, { saves: 50 * 28 * 0.870, goalsAgainst: 50 * 28 * 0.130 })
    const out = projectGoalies([[hot, cold]], [1])
    const a = out.find((r) => r.playerId === 1)!, b = out.find((r) => r.playerId === 2)!
    const gap = a.savePct - b.savePct
    expect(gap).toBeGreaterThan(0)                              // ordered
    expect(gap).toBeCloseTo(0.060 * SAVE_PCT_PERSISTENCE, 6)    // and shrunk by exactly the constant
    expect(gap).toBeLessThan(0.060)                             // from a sixty-point gap
  })

  it('derives saves and goals against from starts and shots faced', () => {
    const out = projectGoalies([[g(1, 'TOR', 50), g(2, 'TOR', 32)]], [1])
    for (const r of out) {
      expect(r.saves + r.goalsAgainst).toBeCloseTo(r.shotsAgainst, 6)
      expect(r.savePct).toBeCloseTo(r.saves / r.shotsAgainst, 6)
    }
  })

  /* A published depth chart beats anything history can infer, and must rescale what starts
     produced rather than leaving saves and wins describing a workload he no longer has. */
  it('lets an expected-starts override win, and carries it through', () => {
    const base = projectGoalies([[g(1, 'TOR', 50), g(2, 'TOR', 32)]], [1])
    const over = projectGoalies([[g(1, 'TOR', 50), g(2, 'TOR', 32)]], [1], new Map([[1, 20]]))
    const b = base.find((r) => r.playerId === 1)!, o = over.find((r) => r.playerId === 1)!
    expect(o.starts).toBeCloseTo(20, 6)
    expect(o.saves / o.starts).toBeCloseTo(b.saves / b.starts, 6)
    expect(o.wins).toBeLessThan(b.wins)
  })

  it('leaves a goalie with no team out of the team scaling rather than corrupting one', () => {
    const out = projectGoalies([[g(1, 'TOR', 55), g(2, 'TOR', 27), { ...g(3, '', 40) }]], [1])
    const tor = out.filter((r) => r.team === 'TOR').reduce((s, r) => s + r.starts, 0)
    expect(tor).toBeCloseTo(TEAM_STARTS, 6)
    expect(out.find((r) => r.playerId === 3)!.starts).toBeGreaterThan(0)
  })

  it('weights recent seasons more', () => {
    const rising = [[g(1, 'TOR', 60), g(2, 'TOR', 22)], [g(1, 'TOR', 20), g(2, 'TOR', 62)]]
    const out = projectGoalies(rising, [6, 3])
    expect(out.find((r) => r.playerId === 1)!.starts)
      .toBeGreaterThan(out.find((r) => r.playerId === 2)!.starts)
  })

  it('survives nothing', () => {
    expect(projectGoalies([])).toEqual([])
    expect(projectGoalies([[]])).toEqual([])
  })
})
