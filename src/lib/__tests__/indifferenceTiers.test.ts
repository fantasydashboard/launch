import { describe, it, expect } from 'vitest'
import { indifferenceTiers, indifferenceThreshold, INDIFFERENT_PTS_PER_WEEK } from '../indifferenceTiers'

/**
 * A tier answers one question: which of these players are the same player?
 *
 * So the rule is stated in the unit the answer is wanted in — points per week — and not in
 * cuts, budgets or list positions. Every value below is a season-remaining VOR total, divided
 * by `weeksLeft` to get the per-week figure the threshold is measured against. Ten weeks left
 * throughout, so a threshold of 1.0/wk is a span of 10 points.
 */
const WL = 10
const rows = (...values: number[]) => values.map((value, i) => ({ playerKey: 'p' + i, value }))
const tiersOf = (t: Record<string, number>, n: number) =>
  Array.from({ length: n }, (_, i) => t['p' + i])

describe('indifferenceTiers', () => {
  it('keeps players within the threshold of the tier leader in one tier', () => {
    const t = indifferenceTiers(rows(100, 95, 92), WL, 1)
    expect(tiersOf(t, 3)).toEqual([1, 1, 1])
  })

  it('starts a new tier at the first player more than the threshold below the leader', () => {
    const t = indifferenceTiers(rows(100, 95, 88), WL, 1)
    expect(tiersOf(t, 3)).toEqual([1, 1, 2])
  })

  /**
   * The reason the rule measures from the LEADER rather than the previous row.
   *
   * Five players each three points below the last are adjacent-gap-identical — no gap rule
   * will ever cut here — yet the fifth is a full 1.2 points per week worse than the first,
   * which is exactly the thing a tier is supposed to tell you. Measuring against the leader
   * makes the drift accumulate until it has to break.
   */
  it('breaks on cumulative drift, so a slow slide still ends the tier', () => {
    const t = indifferenceTiers(rows(100, 97, 94, 91, 88), WL, 1)
    expect(tiersOf(t, 5)).toEqual([1, 1, 1, 1, 2])
  })

  it('measures the next tier from its own leader, not the one above it', () => {
    // Breaks at 88, which then leads: 85 and 80 are within 10 of it, 77 is not.
    const t = indifferenceTiers(rows(100, 88, 85, 80, 77), WL, 1)
    expect(tiersOf(t, 5)).toEqual([1, 2, 2, 2, 3])
  })

  it('reads the threshold per week, so more weeks left means coarser tiers', () => {
    // A 24-point spread: three tiers across ten remaining weeks, one across thirty.
    const spread = rows(100, 88, 76)
    expect(tiersOf(indifferenceTiers(spread, 10, 1), 3)).toEqual([1, 2, 3])
    expect(tiersOf(indifferenceTiers(spread, 30, 1), 3)).toEqual([1, 1, 1])
  })

  it('sorts by value, so input order cannot change the answer', () => {
    const t = indifferenceTiers(rows(88, 100, 95), WL, 1)
    expect(t.p1).toBe(1) // 100
    expect(t.p2).toBe(1) // 95
    expect(t.p0).toBe(2) // 88
  })

  it('puts equal values in the same tier', () => {
    const t = indifferenceTiers(rows(100, 100, 100), WL, 1)
    expect(tiersOf(t, 3)).toEqual([1, 1, 1])
  })

  /**
   * The failure the old fixed-budget rule could not avoid: a deep column has hundreds of
   * near-identical players in its tail, and any rule that must spend N cuts will spend them
   * there. This one spends nothing it has not earned — a tail that drifts by 0.05/wk stays in
   * tiers twenty players deep, which is the honest answer. Those twenty ARE interchangeable.
   */
  it('does not fragment a long, slowly decaying tail', () => {
    const tail = rows(...Array.from({ length: 120 }, (_, i) => 100 - i * 0.5))
    const t = indifferenceTiers(tail, WL, 1)
    const sizes = new Map<number, number>()
    for (const tier of Object.values(t)) sizes.set(tier, (sizes.get(tier) ?? 0) + 1)
    expect(Math.max(...sizes.values())).toBeGreaterThanOrEqual(20)
    expect(sizes.size).toBeLessThan(10)
  })

  it('numbers tiers consecutively from one, descending by value', () => {
    const t = indifferenceTiers(rows(100, 80, 60, 40), WL, 1)
    expect(tiersOf(t, 4)).toEqual([1, 2, 3, 4])
  })

  it('returns a single tier for a single player', () => {
    expect(indifferenceTiers(rows(42), WL, 1)).toEqual({ p0: 1 })
  })

  it('returns nothing for an empty list', () => {
    expect(indifferenceTiers([], WL, 1)).toEqual({})
  })

  /** A board is never worth zero weeks; dividing by it would make every player his own tier. */
  it('treats a non-positive week count as one week', () => {
    const t = indifferenceTiers(rows(100, 99.5), 0, 1)
    expect(tiersOf(t, 2)).toEqual([1, 1])
  })

  it('defaults to the shipped threshold', () => {
    expect(INDIFFERENT_PTS_PER_WEEK).toBe(1)
    const t = indifferenceTiers(rows(100, 95, 88), WL)
    expect(tiersOf(t, 3)).toEqual([1, 1, 2])
  })
})

describe('indifferenceThreshold', () => {
  it('reproduces football\'s hand-validated constant from the startable pool alone', () => {
    /*
     * THE EVIDENCE FOR 0.4. Football's threshold was set by eye against a trusted analyst's
     * board, in a unit no other sport shares. If the ratio is a real property of how fantasy
     * value is distributed, deriving it from a football pool must give football's answer back.
     *
     * Week-4 board: the startable pool (the seats a 10-team league fills) had a standard
     * deviation of 35.4 VOR, and one point a week over fourteen remaining weeks is 14 points.
     */
    const sd = 35.4
    const pool = [sd, -sd]               // a two-point pool has exactly this standard deviation
    expect(indifferenceThreshold(pool, 2)).toBeCloseTo(14.0, 0)
  })

  it('does not move when the reader changes how many rows are shown', () => {
    /*
     * The failure this replaces: scaling by the spread of the visible rows made a tier mean
     * something different at 50 rows than at 200. The pool is a property of the league.
     */
    const board = Array.from({ length: 300 }, (_, i) => 100 - i)
    expect(indifferenceThreshold(board.slice(0, 60), 40)).toBeCloseTo(
      indifferenceThreshold(board, 40), 10)
  })

  it('ignores players below the startable pool', () => {
    const starters = [50, 40, 30, 20]
    const withTail = [...starters, -500, -600, -700]
    expect(indifferenceThreshold(withTail, 4)).toBeCloseTo(indifferenceThreshold(starters, 4), 10)
  })

  it('takes the pool from the TOP of the board however the values arrive', () => {
    expect(indifferenceThreshold([1, 90, 30, 100, 2], 2)).toBeCloseTo(
      indifferenceThreshold([100, 90], 2), 10)
  })

  it('scales with the unit, which is the whole point', () => {
    const pts = [40, 30, 20, 10]
    const z = pts.map((v) => v / 10)
    expect(indifferenceThreshold(z, 4) * 10).toBeCloseTo(indifferenceThreshold(pts, 4), 10)
  })

  it('returns nothing to measure against for an empty or single-player board', () => {
    expect(indifferenceThreshold([], 10)).toBe(0)
    expect(indifferenceThreshold([42], 10)).toBe(0)
  })

  it('survives a pool of identical players', () => {
    expect(indifferenceThreshold([5, 5, 5, 5], 4)).toBe(0)
  })

  it('drives tiers in a unit that is not points at all', () => {
    // A hockey category column, in standard deviations. Two clear groups, one gap.
    const zs = [9.0, 8.7, 8.4, 4.0, 3.8, 3.5]
    const t = indifferenceTiers(
      zs.map((v, i) => ({ playerKey: 'p' + i, value: v })),
      1,
      indifferenceThreshold(zs, 6),
    )
    expect([t.p0, t.p1, t.p2]).toEqual([1, 1, 1])
    expect([t.p3, t.p4, t.p5]).toEqual([2, 2, 2])
  })
})
