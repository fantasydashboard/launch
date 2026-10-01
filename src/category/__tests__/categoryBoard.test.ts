import { describe, it, expect } from 'vitest'
import { buildCategoryState, scoreLine, type CatInput } from '../categoryBoard'

const cat = (over: Partial<CatInput>): CatInput => ({
  key: 'G', label: 'Goals', mine: 10, theirs: 10, sigma: 2, lowerIsBetter: false, isRatio: false,
  ...over,
})

describe('buildCategoryState', () => {
  const days = 3

  it('reports each column with a verdict a manager can act on', () => {
    const s = buildCategoryState({
      cats: [
        cat({ key: 'G', mine: 10, theirs: 10 }),
        cat({ key: 'A', mine: 40, theirs: 10 }),
        cat({ key: 'PIM', mine: 5, theirs: 60 }),
      ],
      days, format: 'each',
    })
    expect(s.map((c) => c.status)).toEqual(['live', 'safe', 'gone'])
  })

  /*
   * The point of the whole model: a column you cannot win and a column you have banked both
   * stop being worth anything, so the board stops recommending players for them.
   */
  it('prices a live column far above a settled one', () => {
    const s = buildCategoryState({
      cats: [
        cat({ key: 'G', mine: 10, theirs: 10 }),
        cat({ key: 'A', mine: 40, theirs: 10 }),
      ],
      days, format: 'each',
    })
    const live = s.find((c) => c.key === 'G')!
    const banked = s.find((c) => c.key === 'A')!
    expect(live.unitValue).toBeGreaterThan(banked.unitValue * 100)
  })

  it('marks ratio columns rather than pricing them as counting stats', () => {
    const s = buildCategoryState({
      cats: [cat({ key: 'SVPCT', isRatio: true, lowerIsBetter: false })],
      days, format: 'each',
    })
    expect(s[0].isRatio).toBe(true)
    /* Not scored here — a ratio needs its numerator and denominator. See the module header. */
    expect(s[0].unitValue).toBe(0)
  })

  it('still reports a win chance and a verdict for a ratio column', () => {
    const s = buildCategoryState({
      cats: [cat({ key: 'GAA', mine: 2.1, theirs: 3.4, sigma: 0.3, lowerIsBetter: true, isRatio: true })],
      days, format: 'each',
    })
    expect(s[0].winPct).toBeGreaterThan(0.5)
    expect(s[0].status).toBe('safe')
  })

  /*
   * THE FORMAT CHANGES THE ANSWER, not just the presentation. With one column level and the
   * rest banked, an each-category league still pays full price for every column; a
   * most-categories league has already won the week and pays for nothing.
   */
  it('keeps paying for every column in an each-category league', () => {
    const cats = [
      cat({ key: 'A', mine: 99, theirs: 10 }), cat({ key: 'PTS', mine: 99, theirs: 10 }),
      cat({ key: 'SOG', mine: 99, theirs: 10 }), cat({ key: 'G', mine: 10, theirs: 10 }),
    ]
    const each = buildCategoryState({ cats, days, format: 'each' })
    const most = buildCategoryState({ cats, days, format: 'most' })
    const liveEach = each.find((c) => c.key === 'G')!
    const liveMost = most.find((c) => c.key === 'G')!
    expect(liveEach.unitValue).toBeGreaterThan(liveMost.unitValue)
  })

  it('handles an empty category list', () => {
    expect(buildCategoryState({ cats: [], days, format: 'each' })).toEqual([])
  })
})

describe('scoreLine — what a player is worth tonight', () => {
  const days = 3
  const state = buildCategoryState({
    cats: [
      cat({ key: 'G', mine: 10, theirs: 10 }),          // level: valuable
      cat({ key: 'A', mine: 40, theirs: 10 }),          // banked: worthless
      cat({ key: 'PIM', mine: 5, theirs: 60 }),         // gone: worthless
    ],
    days, format: 'each',
  })

  it('pays for the column still in play and ignores the settled ones', () => {
    const grinder = scoreLine({ G: 0, A: 2, PIM: 6 }, state)
    const sniper = scoreLine({ G: 1, A: 0, PIM: 0 }, state)
    expect(sniper.score).toBeGreaterThan(grinder.score)
  })

  it('names the columns a player actually moves', () => {
    const out = scoreLine({ G: 1, A: 2, PIM: 6 }, state)
    expect(out.helps).toEqual(['G'])
  })

  it('scores an empty line at nothing, without NaN', () => {
    expect(scoreLine({}, state).score).toBe(0)
    expect(scoreLine({ G: NaN } as any, state).score).toBe(0)
  })

  it('ignores a category the league does not score', () => {
    expect(scoreLine({ BLK: 9 }, state).score).toBe(0)
  })
})
