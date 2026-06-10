import { describe, it, expect } from 'vitest'
import { mapBreakdownToCategoryData } from '../mapStandings'

const breakdown = {
  categories: [
    { stat_id: '20', name: 'Home Runs', display_name: 'HR' },
    { stat_id: '47', name: 'ERA', display_name: 'ERA', is_negative: true },
  ],
  teamCategoryWins: new Map<string, Record<string, number>>([
    ['espn_1', { '20': 5, '47': 2 }],
    ['espn_2', { '20': 1, '47': 6 }],
  ]),
  teamCategoryLosses: new Map<string, Record<string, number>>([
    ['espn_1', { '20': 1, '47': 4 }],
    ['espn_2', { '20': 5, '47': 0 }],
  ]),
  teamCategoryTies: new Map(),
  teamTotalCategoryWins: new Map<string, number>([['espn_1', 7], ['espn_2', 7]]),
  teamTotalCategoryLosses: new Map<string, number>([['espn_1', 5], ['espn_2', 5]]),
  hasRealStatValues: true,
}

const teams = [
  { id: 1, name: 'Sluggers', logo: 'http://x/1.png' },
  { id: 2, name: 'Aces', logo: 'http://x/2.png' },
]

describe('mapBreakdownToCategoryData', () => {
  it('builds standings keyed by espn_<id> with names from teams', () => {
    const { standings } = mapBreakdownToCategoryData(breakdown, teams)
    expect(standings).toHaveLength(2)
    const s1 = standings.find((s) => s.team.teamId === 'espn_1')!
    expect(s1.team.name).toBe('Sluggers')
    expect(s1.team.avatar).toBe('http://x/1.png')
    expect(s1.perCategoryWins).toEqual({ '20': 5, '47': 2 })
    expect(s1.perCategoryLosses).toEqual({ '20': 1, '47': 4 })
  })

  it('builds CategoryDef[] with label/name from display_name/name', () => {
    const { categories } = mapBreakdownToCategoryData(breakdown, teams)
    const era = categories.find((c) => c.statId === '47')!
    expect(era.label).toBe('ERA')
    expect(era.name).toBe('ERA')
    expect(era.higherIsBetter).toBe(false) // is_negative -> lower is better
    const hr = categories.find((c) => c.statId === '20')!
    expect(hr.higherIsBetter).toBe(true)
  })

  it('builds direction-bearing cats[] straight from is_negative', () => {
    const { cats } = mapBreakdownToCategoryData(breakdown, teams)
    expect(cats).toContainEqual({ statId: '20', lowerIsBetter: false })
    expect(cats).toContainEqual({ statId: '47', lowerIsBetter: true })
  })

  it('returns empty arrays when breakdown has no categories', () => {
    const empty = { ...breakdown, categories: [], teamCategoryWins: new Map(), teamCategoryLosses: new Map() }
    const out = mapBreakdownToCategoryData(empty, teams)
    expect(out.standings).toHaveLength(2) // teams still listed
    expect(out.categories).toHaveLength(0)
    expect(out.cats).toHaveLength(0)
  })
})
