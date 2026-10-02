import { describe, it, expect, vi } from 'vitest'
import { blendSkaterRates, blendGoalieProjections, applyBaseline, type Baseline } from '../baselineBlend'

const rate = (playerId: number, perGame: Record<string, number>) => ({
  playerId, name: `P${playerId}`, position: 'C', team: 'COL', gamesPlayed: 80,
  perGame, ppSecondsPerGame: 180, confidence: 0.9,
})
const base: Baseline = {
  fetchedAt: '2026-10-02T00:00:00Z',
  skaters: [{ playerId: 1, name: 'P1', perGame: { goals: 0.6, assists: 0.8, plusMinus: 0.2, penaltyMinutes: 0.4,
                                                   ppPoints: 0.3, shots: 4, hits: 1, blockedShots: 0.5 } }],
  goalies: [{ playerId: 9, name: 'G9', savePct: 0.920, winsPerStart: 0.6, shutoutsPerStart: 0.1 }],
}

describe('blendSkaterRates', () => {
  const ours = rate(1, { goals: 0.4, assists: 0.6, points: 1.0, plusMinus: 0, penaltyMinutes: 0.2,
                         ppPoints: 0.3, ppGoals: 0.1, shots: 3, hits: 2, blockedShots: 0.5, shGoals: 0.01, shPoints: 0.02 })
  it('averages each covered category 50/50', () => {
    const { rates, matched } = blendSkaterRates([ours], base)
    const g = rates[0].perGame
    expect(matched).toBe(1)
    expect(g.goals).toBeCloseTo(0.5); expect(g.assists).toBeCloseTo(0.7); expect(g.shots).toBeCloseTo(3.5)
    expect(g.hits).toBeCloseTo(1.5); expect(g.penaltyMinutes).toBeCloseTo(0.3)
  })
  it('keeps points = goals + assists, ppGoals on our ratio, short-handed ours', () => {
    const g = blendSkaterRates([ours], base).rates[0].perGame
    expect(g.points).toBeCloseTo(1.2)
    expect(g.ppGoals).toBeCloseTo(0.3 * (0.1 / 0.3))
    expect(g.shGoals).toBe(0.01); expect(g.shPoints).toBe(0.02)
  })
  it('uses 1/3 for ppGoals when our ppPoints is 0', () => {
    const z = rate(1, { goals: 0.4, assists: 0.6, points: 1, ppPoints: 0, ppGoals: 0, shots: 3 })
    const g = blendSkaterRates([z], base).rates[0].perGame
    expect(g.ppPoints).toBeCloseTo(0.15)
    expect(g.ppGoals).toBeCloseTo(0.05)
  })
  it('leaves unmatched players and keeps games played', () => {
    const other = rate(2, { goals: 0.4 })
    const r = blendSkaterRates([ours, other], base).rates
    expect(r[1]).toEqual(other)
    expect(r[0].gamesPlayed).toBe(80)
  })
  it('does not mutate the input', () => {
    const before = JSON.stringify(ours)
    blendSkaterRates([ours], base)
    expect(JSON.stringify(ours)).toBe(before)
  })
})

describe('blendGoalieProjections', () => {
  const g = { playerId: 9, name: 'G9', team: 'TB', starts: 60, wins: 30, saves: 1600, goalsAgainst: 160,
              shutouts: 3, savePct: 0.909, shotsAgainst: 1760 }
  it('blends quality, keeps starts and shots, stays internally consistent', () => {
    const { goalies, matched } = blendGoalieProjections([g], base)
    const b = goalies[0]
    expect(matched).toBe(1)
    expect(b.starts).toBe(60); expect(b.shotsAgainst).toBe(1760)
    expect(b.savePct).toBeCloseTo((0.909 + 0.92) / 2)
    expect(b.wins).toBeCloseTo(60 * ((30 / 60 + 0.6) / 2))
    expect(b.shutouts).toBeCloseTo(60 * ((3 / 60 + 0.1) / 2))
    expect(b.saves + b.goalsAgainst).toBeCloseTo(1760)
  })
  it('leaves a goalie with 0 starts unchanged', () => {
    const z = { ...g, starts: 0, wins: 0, shutouts: 0 }
    expect(blendGoalieProjections([z], base).goalies[0]).toEqual(z)
  })
})

describe('ppGoals share clamp', () => {
  it('never lets ppGoals exceed ppPoints', () => {
    const odd = rate(1, { goals: 0.4, assists: 0.6, ppPoints: 0.1, ppGoals: 0.5 })
    const g = blendSkaterRates([odd], base).rates[0].perGame
    expect(g.ppGoals).toBeLessThanOrEqual(g.ppPoints)
  })
})

describe('applyBaseline', () => {
  const ours = [rate(1, { goals: 0.4, assists: 0.6, ppPoints: 0.3, ppGoals: 0.1 })] as any
  const goalies = [{ playerId: 9, starts: 60, wins: 30, shutouts: 3, shotsAgainst: 1500, savePct: 0.91, saves: 1365, goalsAgainst: 135 }] as any
  it('returns our numbers and no baseline field with no baseline', () => {
    const out = applyBaseline(ours, goalies, null)
    expect(out.rates).toBe(ours); expect(out.goalieProjections).toBe(goalies); expect(out.baseline).toBeUndefined()
  })
  it('blends and reports matches', () => {
    const out = applyBaseline(ours, goalies, base)
    expect(out.rates[0].perGame.goals).toBeCloseTo(0.5)
    expect(out.baseline).toEqual({ fetchedAt: base.fetchedAt, skatersMatched: 1, goaliesMatched: 1 })
  })
  it('keeps our numbers untouched when the blend throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = { fetchedAt: 't', skaters: [null], goalies: [] } as any
    const out = applyBaseline(ours, goalies, bad)
    expect(out.rates).toBe(ours); expect(out.goalieProjections).toBe(goalies); expect(out.baseline).toBeUndefined()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
