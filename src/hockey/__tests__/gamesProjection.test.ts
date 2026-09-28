import { describe, it, expect } from 'vitest'
import {
  projectGames, GAMES_PERSISTENCE, GAMES_INTERCEPT, EXPECTED_GAMES_MEAN, FULL_SEASON,
} from '../gamesProjection'

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length
const sd = (a: number[]) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length) }
const one = (g: number) => projectGames([{ feedGames: g, historyGames: g }])[0]

describe('projectGames', () => {
  /*
   * THE BUG THAT TOOK TWO ATTEMPTS. The first version clamped before scaling and piled the
   * board onto 82. The second shifted every pool onto a constant measured on the top 450, which
   * added 18.6 games to a 940-man pool and piled the board onto 82 again, from the opposite
   * direction. The shared cause is an answer that depends on the pool. This is that test.
   */
  it('gives a player the same answer whatever else is in the pool', () => {
    const alone = projectGames([{ feedGames: 80, historyGames: 80 }])[0]
    const amongRegulars = projectGames([
      { feedGames: 80, historyGames: 80 },
      ...Array(50).fill({ feedGames: 78, historyGames: 78 }),
    ])[0]
    const amongCallups = projectGames([
      { feedGames: 80, historyGames: 80 },
      ...Array(500).fill({ feedGames: 9, historyGames: 9 }),
    ])[0]
    expect(amongRegulars).toBeCloseTo(alone, 6)
    expect(amongCallups).toBeCloseTo(alone, 6)
  })

  /* The measured mapping, at the ends and the middle of the fit. */
  it('reproduces the measured mapping from games played to games next season', () => {
    expect(one(82)).toBeCloseTo(GAMES_INTERCEPT + 82 * GAMES_PERSISTENCE, 4)
    /* The empirical figure for an 82-game season is 72.2; the fit puts it at 70.2. */
    expect(one(82)).toBeGreaterThan(68)
    expect(one(82)).toBeLessThan(72)
    expect(one(10)).toBeGreaterThan(14)
    expect(one(10)).toBeLessThan(19)
  })

  /*
   * NOBODY IS EXPECTED TO PLAY A FULL SEASON. A fifth of the men who played all 82 did not do
   * it again, and those who missed time missed a lot of it — so the expectation for the most
   * durable season on record is about 71, and a column where anyone is certain of 82 is a best
   * case wearing a projection's clothes.
   */
  it('never expects a full season, even from an iron man in a pool of iron men', () => {
    const out = projectGames(Array(200).fill({ feedGames: 82, historyGames: 82 }))
    expect(out.filter((g) => g >= FULL_SEASON).length).toBe(0)
    expect(Math.max(...out)).toBeLessThan(74)
  })

  it('narrows the spread by the measured slope', () => {
    const raw = [82, 80, 75, 70, 60, 50, 40, 30]
    const out = projectGames(raw.map((g) => ({ feedGames: g, historyGames: g })))
    expect(sd(out)).toBeCloseTo(sd(raw) * GAMES_PERSISTENCE, 4)
  })

  it('is monotonic — the durable always ahead of the fragile', () => {
    const raw = [82, 75, 66, 55, 40, 20]
    const out = projectGames(raw.map((g) => ({ feedGames: g, historyGames: g })))
    for (let i = 1; i < out.length; i++) expect(out[i]).toBeLessThan(out[i - 1])
  })

  /* The feed knows this year's role; the record knows his durability. Using one alone throws
     away the other, and an earlier version did exactly that. */
  it('uses both the feed and the record when it has them', () => {
    const both = projectGames([{ feedGames: 82, historyGames: 40 }])[0]
    const feedOnly = projectGames([{ feedGames: 82 }])[0]
    expect(both).toBeLessThan(feedOnly)
  })

  it('gives a player it knows nothing about the centre of those it does', () => {
    const out = projectGames([{}, { feedGames: 60, historyGames: 60 }, { feedGames: 40, historyGames: 40 }])
    expect(out[0]).toBeCloseTo(GAMES_INTERCEPT + 50 * GAMES_PERSISTENCE, 4)
  })

  it('uses the documented fallback when it knows nothing about anybody', () => {
    expect(projectGames([{}, {}])[0]).toBeCloseTo(GAMES_INTERCEPT + EXPECTED_GAMES_MEAN * GAMES_PERSISTENCE, 4)
  })

  it('never projects a negative or an impossible season', () => {
    const out = projectGames([{ feedGames: 200, historyGames: 200 }, { feedGames: 1, historyGames: 1 }])
    expect(Math.max(...out)).toBeLessThanOrEqual(FULL_SEASON)
    expect(Math.min(...out)).toBeGreaterThan(0)
  })

  it('survives an empty pool', () => {
    expect(projectGames([])).toEqual([])
  })
})
