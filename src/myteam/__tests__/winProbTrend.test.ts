import { describe, it, expect } from 'vitest'
import { mergePoint, projectedSegment, type TrendPoint } from '../winProbTrend'

describe('mergePoint', () => {
  it('appends a new day and keeps the list sorted', () => {
    const start: TrendPoint[] = [{ date: '2026-06-15', my: 60, opp: 30 }]
    const out = mergePoint(start, { date: '2026-06-16', my: 67, opp: 25 })
    expect(out.map((p) => p.date)).toEqual(['2026-06-15', '2026-06-16'])
  })
  it('replaces the same-day reading with the latest (no duplicate days)', () => {
    const start: TrendPoint[] = [{ date: '2026-06-16', my: 50, opp: 40 }]
    const out = mergePoint(start, { date: '2026-06-16', my: 67, opp: 25 })
    expect(out).toEqual([{ date: '2026-06-16', my: 67, opp: 25 }])
  })
  it('inserts an out-of-order day in sorted position', () => {
    const start: TrendPoint[] = [{ date: '2026-06-16', my: 67, opp: 25 }]
    const out = mergePoint(start, { date: '2026-06-14', my: 55, opp: 35 })
    expect(out.map((p) => p.date)).toEqual(['2026-06-14', '2026-06-16'])
  })
})

describe('projectedSegment', () => {
  const latest: TrendPoint = { date: '2026-06-16', my: 67, opp: 25 }
  it('holds today’s win% flat from the latest reading to week end', () => {
    expect(projectedSegment(latest, '2026-06-21')).toEqual([
      { date: '2026-06-16', my: 67, opp: 25 },
      { date: '2026-06-21', my: 67, opp: 25 },
    ])
  })
  it('returns nothing with no data', () => {
    expect(projectedSegment(null, '2026-06-21')).toEqual([])
  })
  it('returns nothing once the week is over (end on/before the latest reading)', () => {
    expect(projectedSegment(latest, '2026-06-16')).toEqual([])
    expect(projectedSegment(latest, '2026-06-15')).toEqual([])
  })
})
