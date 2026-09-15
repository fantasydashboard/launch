import { describe, it, expect } from 'vitest'
import { mergePoint, projectedSegment, type TrendPoint, weekStart, withinWeek } from '../winProbTrend'

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

/*
 * A fantasy week runs Tuesday to Monday — waivers clear Tuesday morning, the last game is
 * Monday night. The trend was keyed only by league and week number, so captures taken before
 * that Tuesday survived into the new week and the chart drew ten days: the previous weekend's
 * tail, then Tue through Mon, which reads as a fortnight-long matchup.
 */
describe('the fantasy week window', () => {
  it('opens on the Tuesday on or before any given day', () => {
    // 2026-09-15 is a Tuesday.
    expect(weekStart(new Date('2026-09-15T12:00:00'))).toBe('2026-09-15')
    expect(weekStart(new Date('2026-09-16T12:00:00'))).toBe('2026-09-15') // Wed
    expect(weekStart(new Date('2026-09-20T12:00:00'))).toBe('2026-09-15') // Sun
    expect(weekStart(new Date('2026-09-21T12:00:00'))).toBe('2026-09-15') // Mon, last day
    expect(weekStart(new Date('2026-09-22T12:00:00'))).toBe('2026-09-22') // Tue, new week
  })

  it('drops captures belonging to the previous week', () => {
    const pts = [
      { date: '2026-09-12', my: 55, opp: 45 },  // Sat — last week
      { date: '2026-09-13', my: 57, opp: 43 },  // Sun — last week
      { date: '2026-09-14', my: 60, opp: 40 },  // Mon — last week's final day
      { date: '2026-09-15', my: 52, opp: 48 },  // Tue — this week opens
      { date: '2026-09-16', my: 58, opp: 42 },
    ]
    expect(withinWeek(pts, weekStart(new Date('2026-09-16T12:00:00'))).map((p) => p.date))
      .toEqual(['2026-09-15', '2026-09-16'])
  })

  it('keeps a full Tuesday-to-Monday run intact', () => {
    const week = ['2026-09-15','2026-09-16','2026-09-17','2026-09-18','2026-09-19','2026-09-20','2026-09-21']
      .map((date) => ({ date, my: 50, opp: 50 }))
    const kept = withinWeek(week, weekStart(new Date('2026-09-21T12:00:00')))
    expect(kept).toHaveLength(7)
  })
})
