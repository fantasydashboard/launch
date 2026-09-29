import { describe, it, expect } from 'vitest'
import { tierCliffs, assignTiers } from '../tierCliffs'

type Row = { name: string; projected: number; value: number; tier: number }
const row = (name: string, projected: number, tier: number, value = projected): Row =>
  ({ name, projected, value, tier })

const tierOf = (r: Row) => r.tier
const read = (r: Row) => ({ name: r.name, projected: r.projected })

describe('tierCliffs', () => {
  const rows: Row[] = [
    row('Gibbs', 337.9, 1),
    row('Bijan', 334.7, 1),
    row('Chase', 302.3, 2),
    row('Nacua', 298.9, 2),
  ]

  it('marks the boundary between consecutive tiers', () => {
    const cliffs = tierCliffs(rows, tierOf, read)
    expect(cliffs).toHaveLength(1)
    expect(cliffs[0].afterIndex).toBe(1)
    expect(cliffs[0].aboveName).toBe('Bijan')
    expect(cliffs[0].abovePoints).toBe(334.7)
    expect(cliffs[0].belowPoints).toBe(302.3)
    expect(cliffs[0].drop).toBeCloseTo(32.4, 5)
  })

  it('measures the drop in projected points, never in the ranking scale', () => {
    // With an analyst list active, `value` is re-seated into that list's order.
    // A drop measured there cannot be checked against the points column beside
    // it — the defect that once printed "next tier drops 26 pts" above rows
    // reading 242 and 227.
    const remapped: Row[] = [
      row('Above', 242, 1, 268),
      row('Below', 227, 2, 242),
    ]
    expect(tierCliffs(remapped, tierOf, read)[0].drop).toBeCloseTo(15, 5)
  })

  it('finds every boundary in a longer list', () => {
    const long = [...rows, row('Smith', 260, 3), row('Jones', 255, 3)]
    expect(tierCliffs(long, tierOf, read).map((c) => c.afterIndex)).toEqual([1, 3])
  })

  it('reports nothing when only one tier is visible', () => {
    expect(tierCliffs([row('a', 300, 1), row('b', 290, 1)], tierOf, read)).toEqual([])
  })

  it('skips rows with no tier rather than inventing a boundary around them', () => {
    // A player the active ranking list does not cover has no tier at all.
    const withGap: Row[] = [
      row('a', 300, 1),
      { name: 'unranked', projected: 280, value: 280, tier: undefined as unknown as number },
      row('c', 200, 2),
    ]
    const cliffs = tierCliffs(withGap, tierOf, read)
    expect(cliffs).toHaveLength(1)
    expect(cliffs[0].aboveName).toBe('a')
    expect(cliffs[0].drop).toBeCloseTo(100, 5)
  })

  it('points beforeIndex at the first tiered row below a multi-row gap, not the gap itself', () => {
    // "show drafted" can splice several untiered rows back between two tiers.
    // The view keys off beforeIndex to place the cliff banner, and it must land
    // on the first row of the tier below — the same row the tier header fires
    // on — not on any of the untiered rows sitting in between.
    const withWideGap: Row[] = [
      row('a', 300, 1),
      { name: 'gone-1', projected: 280, value: 280, tier: undefined as unknown as number },
      { name: 'gone-2', projected: 270, value: 270, tier: undefined as unknown as number },
      { name: 'gone-3', projected: 260, value: 260, tier: undefined as unknown as number },
      row('c', 200, 2),
    ]
    const cliffs = tierCliffs(withWideGap, tierOf, read)
    expect(cliffs).toHaveLength(1)
    expect(cliffs[0].afterIndex).toBe(0)
    expect(cliffs[0].beforeIndex).toBe(4)
    expect(withWideGap[cliffs[0].beforeIndex].name).toBe('c')
  })

  it('reports a rise as a zero drop rather than a negative one', () => {
    // The list is ordered by someone else's opinion, so the next tier can
    // out-project the one above it. "Drops -8 pts" is not a sentence.
    const inverted = [row('a', 200, 1), row('b', 208, 2)]
    expect(tierCliffs(inverted, tierOf, read)[0].drop).toBe(0)
  })

  it('handles an empty list', () => {
    expect(tierCliffs([], tierOf, read)).toEqual([])
  })
})

/*
 * A TIER LINE IS A CLAIM THAT THERE IS A CLIFF.
 *
 * assignTiers cuts at the N largest gaps and accepted any gap above zero, so a flat board got
 * tier lines anyway — the hockey category page drew four of them captioned "-0.0", because the
 * caption rounds to one decimal and the gaps were a hundredth of a point. A divider whose own
 * evidence rounds to nothing tells a reader there is a meaningful drop between 0.65 and 0.64.
 *
 * minGap is the smallest drop worth drawing a line for. Default zero keeps every existing
 * caller unchanged.
 */
describe('assignTiers minGap', () => {
  const flat = [
    { playerKey: 'a', value: 0.66 }, { playerKey: 'b', value: 0.65 },
    { playerKey: 'c', value: 0.64 }, { playerKey: 'd', value: 0.63 },
    { playerKey: 'e', value: 0.62 }, { playerKey: 'f', value: 0.61 },
  ]

  it('still tiers a flat board when no minimum is asked for', () => {
    const t = assignTiers(flat)
    expect(new Set(Object.values(t)).size).toBeGreaterThan(1)
  })

  it('draws no line on a board with no drop worth showing', () => {
    const t = assignTiers(flat, 0.05)
    expect(new Set(Object.values(t)).size).toBe(1)
  })

  it('still cuts where there is a real cliff', () => {
    const t = assignTiers([
      { playerKey: 'a', value: 5.0 }, { playerKey: 'b', value: 4.9 },
      { playerKey: 'c', value: 3.0 }, { playerKey: 'd', value: 2.9 },
    ], 0.05)
    expect(t['a']).toBe(1)
    expect(t['b']).toBe(1)
    expect(t['c']).toBe(2)
    expect(t['d']).toBe(2)
  })

  it('cuts only at gaps that clear the bar, not the largest N regardless', () => {
    /* One real cliff and several rounding-level gaps: exactly two tiers, not four. */
    const t = assignTiers([
      { playerKey: 'a', value: 9.00 }, { playerKey: 'b', value: 8.99 },
      { playerKey: 'c', value: 8.98 }, { playerKey: 'd', value: 5.00 },
      { playerKey: 'e', value: 4.99 }, { playerKey: 'f', value: 4.98 },
    ], 0.05)
    expect(new Set(Object.values(t)).size).toBe(2)
  })
})
