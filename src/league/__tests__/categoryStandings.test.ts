import { describe, it, expect } from 'vitest'
import { buildCategoryStandings } from '../categoryStandings'

const t = (id: string, cats: Record<string, number>) => ({
  teamId: id, cats: Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, { value: v }])),
})
/* Four teams, one counting category and one where lower wins — the pairing that catches the
   bug this file exists to prevent. */
const totals = [
  t('A', { HR: 100, ERA: 4.50 }),
  t('B', { HR: 80,  ERA: 3.00 }),
  t('C', { HR: 120, ERA: 3.80 }),
  t('D', { HR: 90,  ERA: 5.10 }),
]
const specs = [
  { statId: 'HR', lowerIsBetter: false, side: 'hit' },
  { statId: 'ERA', lowerIsBetter: true, side: 'pit' },
]

describe('buildCategoryStandings', () => {
  it('ranks a counting category with the biggest number first', () => {
    const s = buildCategoryStandings(totals, specs, 'A')
    const hr = s.columns.find((c) => c.statId === 'HR')!
    expect(hr.rows.map((r) => r.teamKey)).toEqual(['C', 'A', 'D', 'B'])
  })

  it('turns a lower-is-better category the right way up', () => {
    /*
     * The failure this guards: ERA and WHIP read backwards, and a league leader prints last.
     * Handled where the category is defined rather than at each call site, because a caller
     * forgets this exactly once.
     */
    const s = buildCategoryStandings(totals, specs, 'A')
    const era = s.columns.find((c) => c.statId === 'ERA')!
    expect(era.rows[0].teamKey).toBe('B')     // 3.00 is the best ERA
    expect(era.rows[3].teamKey).toBe('D')     // 5.10 the worst
  })

  it('reports where the viewing team sits in each column', () => {
    const s = buildCategoryStandings(totals, specs, 'A')
    expect(s.columns.find((c) => c.statId === 'HR')!.myRank).toBe(2)
    expect(s.columns.find((c) => c.statId === 'ERA')!.myRank).toBe(3)
  })

  it('gives the gap in the category\'s own units, which is what makes a rank actionable', () => {
    /* Being 2nd is a different problem 20 home runs back than 2 back, and the rank cannot say. */
    const s = buildCategoryStandings(totals, specs, 'A')
    const hr = s.columns.find((c) => c.statId === 'HR')!
    expect(hr.gapToNext).toBe(20)   // C has 120, A has 100
    expect(hr.gapToPrev).toBe(10)   // D has 90
  })

  it('leaves no gap to chase at the top of a column', () => {
    const s = buildCategoryStandings(totals, specs, 'C')
    expect(s.columns.find((c) => c.statId === 'HR')!.gapToNext).toBeNull()
  })

  it('shares a rank on a tie and then skips, as a standings table does', () => {
    const tied = [t('A', { HR: 100 }), t('B', { HR: 100 }), t('C', { HR: 50 })]
    const s = buildCategoryStandings(tied, [{ statId: 'HR', lowerIsBetter: false }], 'C')
    expect(s.columns[0].rows.map((r) => r.rank)).toEqual([1, 1, 3])
  })

  it('names the columns you are winning and losing', () => {
    const s = buildCategoryStandings(totals, specs, 'B')
    expect(s.strong).toContain('ERA')   // best ERA in the league
    expect(s.weak).toContain('HR')      // last in home runs
  })

  it('treats a preseason league as an empty board, not an error', () => {
    expect(buildCategoryStandings([], specs, 'A').columns).toEqual([])
    expect(buildCategoryStandings(totals, [], 'A').columns).toEqual([])
  })

  it('survives a team missing a category rather than ranking it as a leader', () => {
    const partial = [...totals, { teamId: 'E', cats: {} }]
    const s = buildCategoryStandings(partial, specs, 'E')
    const hr = s.columns.find((c) => c.statId === 'HR')!
    expect(hr.rows[hr.rows.length - 1].teamKey).toBe('E')   // nothing counts as nothing
  })
})

describe('gaps when teams are level', () => {
  const t = (id: string, v: number) => ({ teamId: id, cats: { HR: { value: v } } })
  const spec = [{ statId: 'HR', lowerIsBetter: false }]

  it('reports no gap at all when the whole column is tied', () => {
    /*
     * Found on a real league in its first week, where every team's projected total was zero.
     * The column printed "1st" beside ".000 behind 0th" — tied teams share a rank but sit at
     * different array positions, so comparing against the row above compared you to somebody
     * level with you, and ord(1 - 1) printed "0th".
     */
    const s = buildCategoryStandings([t('A', 0), t('B', 0), t('C', 0)], spec, 'B')
    const hr = s.columns[0]
    expect(hr.myRank).toBe(1)
    expect(hr.gapToNext).toBeNull()
    expect(hr.gapToPrev).toBeNull()
  })

  it('skips past a team level with you to the one actually ahead', () => {
    // A and B tie on 100, C has 60. B's gap down is to C, not to A.
    const s = buildCategoryStandings([t('A', 100), t('B', 100), t('C', 60)], spec, 'B')
    expect(s.columns[0].gapToNext).toBeNull()      // nobody ranks above a shared 1st
    expect(s.columns[0].gapToPrev).toBe(40)
  })

  it('still measures a genuine gap upward', () => {
    const s = buildCategoryStandings([t('A', 100), t('B', 70), t('C', 70)], spec, 'B')
    expect(s.columns[0].gapToNext).toBe(30)
    expect(s.columns[0].gapToPrev).toBeNull()      // C is level, and there is nobody below
  })
})

describe('a category a team has no entry in', () => {
  const spec = [{ statId: 'ERA', lowerIsBetter: true }]
  it('does NOT crown the team we know nothing about', () => {
    /*
     * The bug a read of trades/standings.ts turned up. Treating a missing value as zero is
     * harmless where bigger wins and catastrophic where smaller does: an empty ERA becomes the
     * best ERA in the league. Missing sorts last, both directions.
     */
    const rows = [
      { teamId: 'A', cats: { ERA: { value: 3.2 } } },
      { teamId: 'B', cats: {} },
      { teamId: 'C', cats: { ERA: { value: 4.8 } } },
    ]
    const s = buildCategoryStandings(rows as never, spec, 'B')
    expect(s.columns[0].rows[0].teamKey).toBe('A')
    expect(s.columns[0].rows[2].teamKey).toBe('B')
    expect(s.columns[0].myRank).toBe(3)
  })

  it('treats a ratio with no volume behind it as no entry, not as a perfect score', () => {
    const rows = [
      { teamId: 'A', cats: { ERA: { value: 3.9, num: 39, den: 100 } } },
      { teamId: 'B', cats: { ERA: { value: 0, num: 0, den: 0 } } },
    ]
    const s = buildCategoryStandings(rows as never, [{ statId: 'ERA', lowerIsBetter: true, isRatio: true }], 'B')
    expect(s.columns[0].rows[0].teamKey).toBe('A')
    expect(s.columns[0].myRank).toBe(2)
  })
})
