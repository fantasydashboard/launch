import { describe, expect, it } from 'vitest'
import { buildAllPlay, formatAllPlay } from '../allPlay'
import type { WeekOutcomes } from '../powerTrajectory'

const wk = (week: number, points: Record<string, number>): WeekOutcomes =>
  ({ week, results: {}, points }) as WeekOutcomes

const KEYS = ['a', 'b', 'c', 'd']

describe('buildAllPlay', () => {
  it('scores every team against the whole league, not just its opponent', () => {
    // one week: a highest, d lowest
    const r = buildAllPlay([wk(1, { a: 120, b: 110, c: 100, d: 90 })], KEYS)
    expect(r.byTeam.get('a')).toMatchObject({ wins: 3, losses: 0, ties: 0 })
    expect(r.byTeam.get('b')).toMatchObject({ wins: 2, losses: 1 })
    expect(r.byTeam.get('c')).toMatchObject({ wins: 1, losses: 2 })
    expect(r.byTeam.get('d')).toMatchObject({ wins: 0, losses: 3 })
    expect(r.weeksCounted).toBe(1)
  })

  it('accumulates across weeks', () => {
    const r = buildAllPlay(
      [wk(1, { a: 120, b: 110, c: 100, d: 90 }), wk(2, { a: 80, b: 130, c: 120, d: 110 })],
      KEYS,
    )
    expect(r.byTeam.get('a')).toMatchObject({ wins: 3, losses: 3 })   // 3-0 then 0-3
    expect(r.byTeam.get('b')).toMatchObject({ wins: 5, losses: 1 })   // 2-1 then 3-0
    expect(r.weeksCounted).toBe(2)
  })

  it('is exactly the signal points-for is not: rewards beating the field, not raw total', () => {
    // 'a' posts a huge week then a dud; 'b' is merely above average both weeks.
    const r = buildAllPlay(
      [wk(1, { a: 200, b: 101, c: 100, d: 99 }), wk(2, { a: 50, b: 101, c: 100, d: 99 })],
      KEYS,
    )
    const totalA = 200 + 50, totalB = 101 + 101
    expect(totalA).toBeGreaterThan(totalB)              // points-for prefers a
    expect(r.byTeam.get('b')!.wins).toBeGreaterThan(r.byTeam.get('a')!.wins) // all-play prefers b
  })

  it('counts ties as half a win and reports them', () => {
    const r = buildAllPlay([wk(1, { a: 100, b: 100, c: 90, d: 80 })], KEYS)
    expect(r.byTeam.get('a')).toMatchObject({ wins: 2, losses: 0, ties: 1 })
    expect(r.byTeam.get('a')!.pct).toBeCloseTo((2 + 0.5) / 3, 6)
  })

  it('skips a week with no points rather than scoring everyone as zero', () => {
    // Week 2 has no points at all — a mid-flight or category week.
    const r = buildAllPlay([wk(1, { a: 120, b: 110, c: 100, d: 90 }), { week: 2, results: {} } as WeekOutcomes], KEYS)
    expect(r.weeksCounted).toBe(1)
    expect(r.byTeam.get('a')).toMatchObject({ wins: 3, losses: 0 })
  })

  it('leaves out a team with no score that week instead of treating it as a zero', () => {
    const r = buildAllPlay([wk(1, { a: 120, b: 110, c: 100 })], KEYS)   // d absent
    expect(r.byTeam.get('d')).toMatchObject({ wins: 0, losses: 0, ties: 0 })
    expect(r.byTeam.get('a')).toMatchObject({ wins: 2, losses: 0 })     // not 3
  })

  it('ties share the better rank, so a tie is never shown as separation', () => {
    const r = buildAllPlay([wk(1, { a: 100, b: 100, c: 90, d: 80 })], KEYS)
    expect(r.byTeam.get('a')!.rank).toBe(1)
    expect(r.byTeam.get('b')!.rank).toBe(1)
    expect(r.byTeam.get('c')!.rank).toBe(3)   // rank 2 is skipped, as it must be
  })

  it('before any games: every team present, all zeros, weeksCounted 0', () => {
    // Rows still exist so a caller can look any team up; weeksCounted is the gate that
    // says "do not print a verdict yet". That distinction is the whole 0-0 lesson.
    const r = buildAllPlay([], KEYS)
    expect(r.weeksCounted).toBe(0)
    expect(r.rows).toHaveLength(4)
    expect(r.rows.every((x) => x.wins === 0 && x.losses === 0 && x.pct === 0)).toBe(true)
    expect(r.byTeam.get('a')!.rank).toBe(1)   // everyone tied at 1st, which is honest
    expect(r.byTeam.get('d')!.rank).toBe(1)
    const r2 = buildAllPlay([{ week: 1, results: {} } as WeekOutcomes], KEYS)
    expect(r2.weeksCounted).toBe(0)
  })

  it('survives junk input rather than throwing on a live page', () => {
    expect(buildAllPlay(null as never, KEYS).weeksCounted).toBe(0)
    expect(buildAllPlay([], ['only-one']).rows).toEqual([])
    const r = buildAllPlay([wk(1, { a: Number.NaN, b: 100, c: 90, d: 80 })], KEYS)
    expect(r.byTeam.get('a')).toMatchObject({ wins: 0, losses: 0 })  // NaN is not a score
    expect(r.byTeam.get('b')).toMatchObject({ wins: 2, losses: 0 })
  })

  it('formats for display beside the real record', () => {
    expect(formatAllPlay({ wins: 26, losses: 10, ties: 0 })).toBe('26-10')
    expect(formatAllPlay({ wins: 26, losses: 9, ties: 1 })).toBe('26-9-1')
  })
})
