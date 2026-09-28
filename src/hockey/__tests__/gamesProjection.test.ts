import { describe, it, expect } from 'vitest'
import { projectGames, EXPECTED_GAMES_MEAN, GAMES_PERSISTENCE, FULL_SEASON } from '../gamesProjection'

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length
const sd = (a: number[]) => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length) }

describe('projectGames', () => {
  it('centres the pool where a draftable pool actually lands', () => {
    const rows = [82, 80, 75, 70, 60, 50].map((g) => ({ feedGames: g, historyGames: g }))
    expect(mean(projectGames(rows))).toBeCloseTo(EXPECTED_GAMES_MEAN, 4)
  })

  /* A projection is an expectation, not a best case. Games persist at ~0.5, so the column
     belongs at about half the spread of the season behind it. */
  it('narrows the spread by what games actually persist', () => {
    const raw = [82, 80, 75, 70, 60, 50, 40, 30]
    const out = projectGames(raw.map((g) => ({ feedGames: g, historyGames: g })))
    expect(sd(out)).toBeCloseTo(sd(raw) * GAMES_PERSISTENCE, 4)
  })

  /*
   * THE SPIKE THIS EXISTS TO REMOVE. Clamping a feed at 82 before anything else piles everyone
   * it projects at 82-or-more onto exactly 82 — a third of the board certain to play every
   * game. Scaling first means the ceiling is reached by almost nobody.
   */
  it('does not leave a pile of players at exactly a full season', () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({ feedGames: i < 30 ? 82 : 55, historyGames: i < 30 ? 80 : 55 }))
    const out = projectGames(rows)
    expect(out.filter((g) => g >= FULL_SEASON).length).toBe(0)
    expect(Math.max(...out)).toBeLessThan(FULL_SEASON)
  })

  it('keeps the durable ahead of the fragile', () => {
    const out = projectGames([{ feedGames: 82, historyGames: 80 }, { feedGames: 60, historyGames: 45 }])
    expect(out[0]).toBeGreaterThan(out[1])
  })

  /* The feed knows this year's role; the record knows his durability. Using one alone throws
     away the other, and an earlier version did exactly that. */
  it('uses both the feed and the record when it has them', () => {
    const both = projectGames([{ feedGames: 82, historyGames: 40 }, { feedGames: 60, historyGames: 60 }])
    const feedOnly = projectGames([{ feedGames: 82 }, { feedGames: 60 }])
    expect(both[0]).toBeLessThan(feedOnly[0])          // the record pulls the fragile man down
  })

  it('falls back to the pool centre when it knows nothing about a player', () => {
    const out = projectGames([{}, { feedGames: 70, historyGames: 70 }])
    expect(out[0]).toBeGreaterThan(0)
    expect(out[0]).toBeLessThanOrEqual(FULL_SEASON)
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
