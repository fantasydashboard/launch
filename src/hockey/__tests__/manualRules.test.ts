import { describe, it, expect } from 'vitest'
import { rulesFromManual, CATEGORY_CHOICES, YAHOO_DEFAULT_CATEGORIES, type ManualLeagueInput } from '../manualRules'
import { rulesProblem, isCategoryLeague } from '../hockeyLeague'

const base: ManualLeagueInput = {
  name: 'My Yahoo League',
  season: 2027,
  teams: 12,
  kind: 'categories',
  categoryKeys: ['G', 'A', 'PLUSMINUS', 'PIM', 'PPP', 'SOG', 'HITS', 'BLK', 'W', 'GAA', 'SVPCT', 'SHO'],
  slots: { F: 9, D: 4, G: 2, UTIL: 1 },
  rosterSize: 20,
}

describe('rulesFromManual', () => {
  /*
   * The board reads ESPN's settings blob, which is the only reason it is an ESPN board at all:
   * projections are ours and picks are marked by hand. Stating the rules directly is what
   * lets it serve a Yahoo league — or a Sleeper one, or a private league that will not load.
   */
  it('produces rules the board will accept', () => {
    const rules = rulesFromManual(base)
    expect(rulesProblem(rules)).toBe('')
    expect(isCategoryLeague(rules.scoringType)).toBe(true)
    expect(rules.teams).toBe(12)
    expect(rules.slots).toEqual({ F: 9, D: 4, G: 2, UTIL: 1 })
    expect(rules.rosterSize).toBe(20)
  })

  it('turns chosen category keys into the columns the value engine reads', () => {
    const { categories } = rulesFromManual(base)
    expect(categories.map((c) => c.key)).toEqual(base.categoryKeys)
    // statId is carried so a surface can say where a column came from.
    expect(categories.find((c) => c.key === 'G')!.statId).toBe(13)
  })

  /* Goals against average and losses are won by the LOWER number. Getting this backwards
     ranks the worst goalies in the league first, and the board would look entirely normal. */
  it('marks the columns where a lower number wins', () => {
    const { categories } = rulesFromManual(base)
    expect(categories.find((c) => c.key === 'GAA')!.reverse).toBe(true)
    expect(categories.find((c) => c.key === 'W')!.reverse).toBe(false)
    expect(categories.find((c) => c.key === 'SVPCT')!.reverse).toBe(false)
  })

  it('refuses a category it cannot price rather than silently dropping it', () => {
    const rules = rulesFromManual({ ...base, categoryKeys: [...base.categoryKeys, 'FOW'] })
    expect(rules.categories.some((c) => c.key === 'FOW')).toBe(false)
    // The gap travels with the rules, the way an unreadable ESPN stat id does.
    expect(rules.unknownCategoryKeys).toEqual(['FOW'])
  })

  describe('points leagues', () => {
    const pts: ManualLeagueInput = {
      ...base, kind: 'points', categoryKeys: [], weights: { G: 3, A: 2, W: 4, SHO: 3 },
    }

    it('carries the weights and no categories', () => {
      const rules = rulesFromManual(pts)
      expect(rulesProblem(rules)).toBe('')
      expect(isCategoryLeague(rules.scoringType)).toBe(false)
      expect(rules.weights).toEqual({ G: 3, A: 2, W: 4, SHO: 3 })
      expect(rules.categories).toEqual([])
    })

    /* No default scoring, ever. hockeyLeague.ts refuses to invent weights for a league that
       published none, and a hand-entered league gets the same treatment: a board built on
       invented rules looks exactly like one built on real rules. */
    it('is rejected when no weights are given', () => {
      expect(rulesProblem(rulesFromManual({ ...pts, weights: {} }))).not.toBe('')
    })
  })

  describe('what it will not accept', () => {
    it('needs a team count, because every replacement level depends on it', () => {
      expect(rulesProblem(rulesFromManual({ ...base, teams: 0 }))).not.toBe('')
    })

    it('needs starting slots', () => {
      expect(rulesProblem(rulesFromManual({ ...base, slots: {} }))).not.toBe('')
    })

    it('needs at least one category in a category league', () => {
      expect(rulesProblem(rulesFromManual({ ...base, categoryKeys: [] }))).not.toBe('')
    })

    it('drops a slot count of zero rather than carrying an empty seat', () => {
      const rules = rulesFromManual({ ...base, slots: { F: 9, D: 4, G: 2, UTIL: 0 } })
      expect(rules.slots).toEqual({ F: 9, D: 4, G: 2 })
    })
  })

  it('offers only categories the value engine can actually price', () => {
    expect(CATEGORY_CHOICES.length).toBeGreaterThan(8)
    for (const c of CATEGORY_CHOICES) expect(typeof c.statId).toBe('number')
    // The Yahoo default set has to be choosable from what we offer.
    for (const k of YAHOO_DEFAULT_CATEGORIES) {
      expect(CATEGORY_CHOICES.some((c) => c.key === k)).toBe(true)
    }
  })
})
