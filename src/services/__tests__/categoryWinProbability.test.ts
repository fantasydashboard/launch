import { describe, it, expect } from 'vitest'
import { calcOverallWinProb, calcCatWinProb, clampWinProb, bucketCategory, catWinProbClosed, overallWinProbClosed } from '../categoryWinProbability'

describe('categoryWinProbability', () => {
  it('catWinProbClosed: deterministic, direction-aware, ~0.5 when tied', () => {
    expect(catWinProbClosed(10, 10, '12', 4, 'yahoo')).toBeCloseTo(0.5, 6)
    const ahead = catWinProbClosed(20, 10, '12', 4, 'yahoo')
    expect(ahead).toBeGreaterThan(0.5)
    expect(catWinProbClosed(20, 10, '12', 4, 'yahoo')).toBe(ahead) // deterministic
    expect(catWinProbClosed(2.5, 4.0, '26', 4, 'yahoo')).toBeGreaterThan(0.5) // inverse (ERA)
  })

  it('overallWinProbClosed: deterministic and monotonic in your stats', () => {
    const opp = { '12': 10, '60': 30 }
    const a = overallWinProbClosed({ '12': 10, '60': 30 }, opp, ['12', '60'], 4, 'yahoo')
    const b = overallWinProbClosed({ '12': 16, '60': 40 }, opp, ['12', '60'], 4, 'yahoo')
    expect(a).toBeCloseTo(overallWinProbClosed({ '12': 10, '60': 30 }, opp, ['12', '60'], 4, 'yahoo'), 9)
    expect(b).toBeGreaterThan(a)
  })

  it('bucketCategory thresholds', () => {
    expect(bucketCategory(85)).toBe('safe')
    expect(bucketCategory(70)).toBe('safe')
    expect(bucketCategory(50)).toBe('tossup')
    expect(bucketCategory(30)).toBe('loss')
    expect(bucketCategory(12)).toBe('loss')
  })
  it('clampWinProb keeps active matchups off 0/100 but allows it when completed', () => {
    expect(clampWinProb(0, false)).toBe(0.1)
    expect(clampWinProb(100, false)).toBe(99.9)
    expect(clampWinProb(0, true)).toBe(0)
  })
  it('days=0 is deterministic: current leader wins the category', () => {
    expect(calcCatWinProb(10, 4, '4', 0, 'espn')).toEqual({ team1: 100, team2: 0 })
    expect(calcCatWinProb(4, 10, '4', 0, 'espn')).toEqual({ team1: 0, team2: 100 })
    // inverse stat (lower better): ESPN '18' is inverse
    expect(calcCatWinProb(3.0, 4.5, '18', 0, 'espn')).toEqual({ team1: 100, team2: 0 })
  })
  it('a large multi-category lead yields a high overall win prob', () => {
    const t1 = { '2': 60, '3': 20, '4': 60 }
    const t2 = { '2': 20, '3': 5, '4': 20 }
    const res = calcOverallWinProb(t1, t2, ['2', '3', '4'], 1, 'espn')
    expect(res.team1).toBeGreaterThan(80)
  })
  it('identical stats are roughly a coin flip', () => {
    const t = { '2': 30, '3': 10, '4': 30 }
    const res = calcOverallWinProb({ ...t }, { ...t }, ['2', '3', '4'], 3, 'espn')
    expect(res.team1).toBeGreaterThan(35)
    expect(res.team1).toBeLessThan(65)
  })
})
