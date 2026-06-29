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

  it("ranks by net categories won when basis='cats'", () => {
    const catData: WeekOutcomes[] = [
      { week: 1, results: { A: 'W', B: 'L', C: 'W' }, catWins: { A: 6, B: 2, C: 8 }, catLosses: { A: 4, B: 8, C: 2 }, catTies: { A: 0, B: 0, C: 0 } },
      { week: 2, results: { A: 'W', B: 'L', C: 'L' }, catWins: { A: 7, B: 3, C: 5 }, catLosses: { A: 3, B: 7, C: 5 }, catTies: { A: 0, B: 0, C: 0 } },
      { week: 3, results: { A: 'W', B: 'L', C: 'W' }, catWins: { A: 5, B: 1, C: 9 }, catLosses: { A: 5, B: 9, C: 1 }, catTies: { A: 0, B: 0, C: 0 } },
    ]
    const hc = buildHotCold(catData, meta, 3, 'cats')
    expect(hc.basis).toBe('cats')
    // C nets +14 (22-8), A nets +6 (18-12), B nets -18 (6-24).
    expect(hc.hottest!.teamKey).toBe('C')
    expect(hc.hottest!.catWins).toBe(22)
    expect(hc.hottest!.catLosses).toBe(8)
    expect(hc.coldest!.teamKey).toBe('B')
  })

  it("falls back to record when basis='cats' but no category data is present", () => {
    const hc = buildHotCold(outcomes, meta, 3, 'cats')
    expect(hc.basis).toBe('record')
    expect(hc.hottest!.teamKey).toBe('A')
  })
})
