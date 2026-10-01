import { describe, it, expect } from 'vitest'
import { categoryFormatOf } from '../categoryFormat'

/**
 * Both platforms publish which of the two category formats a league scores by, and
 * useIsCategoryLeague has been reading the string and collapsing it into one boolean.
 *
 * The distinction is not cosmetic. In an each-category league, taking back two columns in a
 * week you have already lost is two wins in the standings; in a most-categories league it is
 * worth nothing at all. Advice built on the wrong one is worse than no advice.
 */

describe('categoryFormatOf — Yahoo', () => {
  it('reads head as each category', () => {
    expect(categoryFormatOf('head')).toBe('each')
  })

  it('reads headone as most categories', () => {
    expect(categoryFormatOf('headone')).toBe('most')
  })
})

describe('categoryFormatOf — ESPN', () => {
  it('reads H2H_CATEGORY as each category', () => {
    expect(categoryFormatOf('H2H_CATEGORY')).toBe('each')
  })

  it('reads H2H_MOST_CATEGORIES as most categories', () => {
    expect(categoryFormatOf('H2H_MOST_CATEGORIES')).toBe('most')
  })
})

describe('categoryFormatOf — what it refuses to answer', () => {
  /*
   * Roto is a different game: you are racing the whole league, not an opponent, so neither
   * objective applies. useIsCategoryLeague already excludes it and this must too.
   */
  it('returns null for roto', () => {
    expect(categoryFormatOf('roto')).toBeNull()
  })

  it('returns null for a points league', () => {
    expect(categoryFormatOf('point')).toBeNull()
    expect(categoryFormatOf('H2H_POINTS')).toBeNull()
  })

  it('returns null rather than guessing on nothing', () => {
    expect(categoryFormatOf('')).toBeNull()
    expect(categoryFormatOf(null)).toBeNull()
    expect(categoryFormatOf(undefined)).toBeNull()
    expect(categoryFormatOf('something we have never seen')).toBeNull()
  })

  it('does not care about case or padding', () => {
    expect(categoryFormatOf('  HeadOne ')).toBe('most')
    expect(categoryFormatOf('h2h_category')).toBe('each')
  })

  /*
   * MOST-CATEGORIES IS THE ONE THAT MUST BE NAMED EXPLICITLY. An unrecognised string returning
   * 'each' would be the safer-looking default, and it is the wrong one: 'each' turns off the
   * clinch and gamble logic, so a most-categories league silently gets risk-neutral advice in a
   * week it can only win by gambling. Null means "we do not know", and the caller shows the
   * board without the posture rather than inventing one.
   */
  it('never falls back to a format for an unknown string', () => {
    expect(categoryFormatOf('headpoint')).toBeNull()
  })
})
