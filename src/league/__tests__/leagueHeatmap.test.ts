import { describe, it, expect } from 'vitest'
import { buildCategoryHeatmap } from '../leagueHeatmap'

const view = {
  teams: [
    { key: 'A', label: 'A', name: 'A', isMe: true },
    { key: 'B', label: 'B', name: 'B', isMe: false },
    { key: 'C', label: 'C', name: 'C', isMe: false },
  ],
  categoryRows: [
    { key: 'HR', label: 'HR', ranks: [1, 2, 3] }, // A best in HR
    { key: 'ERA', label: 'ERA', ranks: [3, 1, 2] }, // A worst in ERA
  ],
  positionRows: [],
  numTeams: 3,
}

describe('buildCategoryHeatmap', () => {
  it('transposes landscape into team rows of per-category cells', () => {
    const hm = buildCategoryHeatmap(view as any)
    expect(hm.categories.map((c) => c.key)).toEqual(['HR', 'ERA'])
    const a = hm.rows.find((r) => r.teamKey === 'A')!
    expect(a.isMe).toBe(true)
    expect(a.cells.map((c) => c.rank)).toEqual([1, 3])
  })

  it('colors rank 1 = 1.0 (best) and last = 0 (worst); null rank stays null', () => {
    const hm = buildCategoryHeatmap(view as any)
    const a = hm.rows.find((r) => r.teamKey === 'A')!
    expect(a.cells[0].pct).toBeCloseTo(1, 5)
    expect(a.cells[1].pct).toBeCloseTo(0, 5)

    const withNull = { ...view, categoryRows: [{ key: 'SV', label: 'SV', ranks: [1, null, 2] }] }
    const hm2 = buildCategoryHeatmap(withNull as any)
    const b = hm2.rows.find((r) => r.teamKey === 'B')!
    expect(b.cells[0].rank).toBeNull()
    expect(b.cells[0].pct).toBeNull()
  })
})
