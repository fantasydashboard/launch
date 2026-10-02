import { describe, it, expect } from 'vitest'
import { medianLine, standoutColumns } from '../standout'
import { buildCategoryState } from '../categoryBoard'

const live = (keys: string[]) => buildCategoryState({
  cats: keys.map((key) => ({
    key, label: key, mine: 100, theirs: 100, sigma: 6, lowerIsBetter: false, isRatio: false,
  })),
  days: 3,
  format: 'each',
})

describe('medianLine', () => {
  it('takes the middle value of an odd pool', () => {
    expect(medianLine([{ SOG: 1 }, { SOG: 9 }, { SOG: 3 }], ['SOG']).SOG).toBe(3)
  })

  it('averages the two middles of an even pool', () => {
    expect(medianLine([{ SOG: 1 }, { SOG: 3 }, { SOG: 5 }, { SOG: 9 }], ['SOG']).SOG).toBe(4)
  })

  /* The reason it is a median: one outlier must not move the yardstick. */
  it('is not dragged by a single extreme line', () => {
    const pool = [{ PIM: 0 }, { PIM: 0 }, { PIM: 0 }, { PIM: 0 }, { PIM: 60 }]
    expect(medianLine(pool, ['PIM']).PIM).toBe(0)
  })

  it('reports zero for a column nobody has', () => {
    expect(medianLine([{ SOG: 3 }], ['HIT']).HIT).toBe(0)
  })

  it('ignores values that are not numbers', () => {
    expect(medianLine([{ SOG: 2 }, { SOG: NaN as number }, { SOG: 4 }], ['SOG']).SOG).toBe(3)
  })
})

describe('standoutColumns', () => {
  /*
   * THE REGRESSION. Every skater takes shots, so shots were named on every row of the board and
   * explained nothing. Against a pool where three shots is typical, taking three is not a shots
   * play and taking six is.
   */
  it('stays quiet about a column where the player is merely typical', () => {
    const state = live(['SOG', 'HIT'])
    const baseline = { SOG: 3, HIT: 1 }
    expect(standoutColumns({ SOG: 3, HIT: 1 }, state, baseline)).toEqual([])
  })

  it('names the column where he beats a typical start', () => {
    const state = live(['SOG', 'HIT'])
    const baseline = { SOG: 3, HIT: 1 }
    expect(standoutColumns({ SOG: 6, HIT: 1 }, state, baseline)).toEqual(['SOG'])
  })

  it('orders by how much the surplus is worth, not how large it is', () => {
    /* HIT is the tighter column here, so a unit of it is worth more — a smaller surplus in it
       outranks a larger one in a column the week barely turns on. */
    const state = buildCategoryState({
      cats: [
        { key: 'SOG', label: 'SOG', mine: 100, theirs: 100, sigma: 40, lowerIsBetter: false, isRatio: false },
        { key: 'HIT', label: 'HIT', mine: 20, theirs: 20, sigma: 2, lowerIsBetter: false, isRatio: false },
      ],
      days: 3,
      format: 'each',
    })
    expect(standoutColumns({ SOG: 8, HIT: 3 }, state, { SOG: 3, HIT: 1 })[0]).toBe('HIT')
  })

  /* A player who is below the pool everywhere is not distinctively anything, and naming his
     biggest column would say otherwise. The ranking still carries him at his real total. */
  it('says nothing about a player who beats the pool nowhere', () => {
    const state = live(['SOG', 'HIT'])
    expect(standoutColumns({ SOG: 1, HIT: 0 }, state, { SOG: 3, HIT: 1 })).toEqual([])
  })

  /* Being distinctive in a column that cannot change the week buys nothing — the same rule the
     score uses. */
  it('ignores a column that is already settled', () => {
    const state = buildCategoryState({
      cats: [
        { key: 'G', label: 'G', mine: 40, theirs: 5, sigma: 1, lowerIsBetter: false, isRatio: false },
        { key: 'SOG', label: 'SOG', mine: 100, theirs: 100, sigma: 6, lowerIsBetter: false, isRatio: false },
      ],
      days: 3,
      format: 'each',
    })
    expect(standoutColumns({ G: 99, SOG: 9 }, state, { G: 1, SOG: 3 })).toEqual(['SOG'])
  })

  /* With no yardstick it degrades to the absolute reading rather than returning nothing. */
  it('falls back to the raw line when there is no baseline', () => {
    const state = live(['SOG'])
    expect(standoutColumns({ SOG: 3 }, state, {})).toEqual(['SOG'])
  })
})

describe('a difference has to be a difference', () => {
  /*
   * Among three interchangeable skaters one is necessarily a hair above the median. Labelling
   * him for it puts the noise straight back, which is what this module exists to remove.
   */
  it('ignores a surplus too small to notice', () => {
    const state = live(['SOG'])
    expect(standoutColumns({ SOG: 3.05 }, state, { SOG: 3 })).toEqual([])
  })

  it('names a surplus large enough to act on', () => {
    const state = live(['SOG'])
    expect(standoutColumns({ SOG: 4 }, state, { SOG: 3 })).toEqual(['SOG'])
  })

  /* With a typical line of zero there is no proportion to take, and any production at all is
     genuinely distinctive — nobody else on the board produces any. */
  it('names any production in a column nobody else fills', () => {
    const state = live(['SHO'])
    expect(standoutColumns({ SHO: 0.08 }, state, { SHO: 0 })).toEqual(['SHO'])
  })
})

describe('signed columns', () => {
  /*
   * Plus/minus is routinely negative across a pool. Scaling the materiality test by the SIGNED
   * median made the threshold negative, which every positive surplus clears — so an ordinary
   * skater one goal above a slightly-negative median was labelled a plus/minus play.
   */
  it('does not treat every surplus as material when the typical line is negative', () => {
    const state = live(['PLUSMINUS'])
    expect(standoutColumns({ PLUSMINUS: -0.9 }, state, { PLUSMINUS: -1 })).toEqual([])
  })

  it('still names a real edge over a negative typical line', () => {
    const state = live(['PLUSMINUS'])
    expect(standoutColumns({ PLUSMINUS: 0.5 }, state, { PLUSMINUS: -1 })).toEqual(['PLUSMINUS'])
  })
})
