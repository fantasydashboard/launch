import { describe, it, expect } from 'vitest'
import { buildHotCold } from '../hotCold'
import type { WeekOutcomes } from '../powerTrajectory'

const meta = [
  { teamKey: 'A', teamName: 'A', isMe: true },
  { teamKey: 'B', teamName: 'B', isMe: false },
  { teamKey: 'C', teamName: 'C', isMe: false },
]
const outcomes: WeekOutcomes[] = [
  { week: 1, results: { A: 'W', B: 'L', C: 'W' } },
  { week: 2, results: { A: 'W', B: 'L', C: 'L' } },
  { week: 3, results: { A: 'W', B: 'L', C: 'W' } },
  { week: 4, results: { A: 'L', B: 'W', C: 'W' } },
]

describe('buildHotCold', () => {
  it('ranks hottest/coldest over the last N weeks', () => {
    // weeks 2, 3, 4:
    //   A = W, W, L → 2-1 (pct 0.667)
    //   B = L, L, W → 1-2 (pct 0.333)
    //   C = L, W, W → 2-1 (pct 0.667)
    // Tiebreak hottest: same pct & wins → teamKey 'A' < 'C', so hottest = 'A'
    // Coldest: B (1-2)
    const hc = buildHotCold(outcomes, meta, 3) // weeks 2,3,4
    expect(hc.weeks).toBe(3)
    expect(hc.hottest!.teamKey).toBe('A') // 2-1, wins tiebreak over C by teamKey 'A'<'C'
    expect(hc.coldest!.teamKey).toBe('B') // 1-2
  })

  it('returns nulls when there are no weeks', () => {
    const hc = buildHotCold([], meta, 3)
    expect(hc.hottest).toBeNull()
    expect(hc.coldest).toBeNull()
  })

  it("ranks by points scored when basis='points'", () => {
    const scored: WeekOutcomes[] = [
      { week: 1, results: { A: 'W', B: 'L', C: 'W' }, points: { A: 50, B: 40, C: 90 } },
      { week: 2, results: { A: 'W', B: 'L', C: 'L' }, points: { A: 60, B: 30, C: 95 } },
      { week: 3, results: { A: 'W', B: 'L', C: 'W' }, points: { A: 55, B: 35, C: 100 } },
    ]
    const hc = buildHotCold(scored, meta, 3, 'points')
    expect(hc.basis).toBe('points')
    // C scores the most (285) despite a worse record than A; B scores the least (105).
    expect(hc.hottest!.teamKey).toBe('C')
    expect(hc.hottest!.points).toBe(285)
    expect(hc.coldest!.teamKey).toBe('B')
  })

  it("falls back to record when basis='points' but no points are present", () => {
    const hc = buildHotCold(outcomes, meta, 3, 'points')
    expect(hc.basis).toBe('record') // no points data → record basis
    expect(hc.hottest!.teamKey).toBe('A')
  })
})
