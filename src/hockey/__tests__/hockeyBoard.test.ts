import { describe, it, expect } from 'vitest'
import { buildHockeyBoard } from '../hockeyBoard'
import type { HockeyLeagueRules } from '../hockeyLeague'
import type { HockeyProjection } from '../hockeyValue'

const RULES: HockeyLeagueRules = {
  leagueId: 'x', season: 2027, name: 'test', teams: 8, scoringType: 'H2H_POINTS',
  weights: { G: 2, A: 1, SOG: 0.1, W: 4, SHO: 3, SV: 0.2, GA: -2 },
  slots: { F: 9, D: 5, G: 2, UTIL: 1 },
  unnamedScoredStatIds: [9, 31, 32],
}

/* Deep enough that replacement levels are real: 120 forwards, 90 defencemen, 40 goalies. */
function pool(): Record<string, HockeyProjection> {
  const out: Record<string, HockeyProjection> = {}
  for (let i = 0; i < 120; i++) {
    out[`f${i}`] = { playerKey: `f${i}`, position: 'C', stats: { G: 50 - i * 0.3, A: 60 - i * 0.4, SOG: 300, GP: 82 } }
  }
  for (let i = 0; i < 90; i++) {
    out[`d${i}`] = { playerKey: `d${i}`, position: 'D', stats: { G: 20 - i * 0.15, A: 45 - i * 0.35, SOG: 200, GP: 82 } }
  }
  for (let i = 0; i < 40; i++) {
    out[`g${i}`] = { playerKey: `g${i}`, position: 'G', stats: { W: 35 - i * 0.5, SHO: 5, SV: 1600 - i * 15, GA: 150 + i, GS: 60 } }
  }
  return out
}
const names = Object.fromEntries(Object.keys(pool()).map((k) => [k, k.toUpperCase()]))
const build = (over: Partial<Parameters<typeof buildHockeyBoard>[0]> = {}) =>
  buildHockeyBoard({ projections: pool(), rules: RULES, namesByKey: names, ...over })

describe('a hockey draft board', () => {
  const { rows, replacement, unnamedScoredStatIds } = build()

  it('ranks by value over replacement rather than by raw points', () => {
    for (let i = 1; i < 30; i++) expect(rows[i - 1].value).toBeGreaterThanOrEqual(rows[i].value)
    // The ordering quantity and the player's own points are deliberately different numbers,
    // so a points column stays meaningful when a ranking list re-seats the order.
    expect(rows[0].value).not.toBe(rows[0].projected)
  })

  /*
   * The whole reason replacement matters in hockey. A defenceman competes for a much cheaper
   * seat than a forward, so he can rank above forwards who outscore him — and a board sorted
   * by points would quietly tell you to take the forward.
   */
  it('lets a defenceman outrank forwards who score more than he does', () => {
    expect(replacement.D).toBeLessThan(replacement.F)
    const bestD = rows.find((r) => r.position === 'D')!
    const below = rows.slice(rows.indexOf(bestD) + 1)
    const outscoredHim = below.filter((r) => r.position === 'C' && (r.projected ?? 0) > (bestD.projected ?? 0))
    expect(outscoredHim.length).toBeGreaterThan(0)
  })

  it('prices goalies against goalies and nobody else', () => {
    expect(replacement.G).toBeGreaterThan(0)
    expect(replacement.G).not.toBe(replacement.F)
    expect(rows.some((r) => r.position === 'G')).toBe(true)
  })

  /*
   * The football board had exactly this bug: players nobody had a number for reached the
   * board, then floated upward on any term that rewards uncertainty, and became
   * recommendations. No projection is no opinion.
   */
  it('drops a player with no projection instead of valuing him at zero', () => {
    const out = build({
      projections: { ...pool(), ghost: { playerKey: 'ghost', position: 'C', stats: {} } },
      namesByKey: { ...names, ghost: 'Ghost' },
    })
    expect(out.rows.find((r) => r.playerKey === 'ghost')).toBeUndefined()
  })

  it('removes drafted players', () => {
    const taken = rows[0].playerKey
    const out = build({ drafted: new Set([taken]) })
    expect(out.rows.find((r) => r.playerKey === taken)).toBeUndefined()
    expect(out.rows).toHaveLength(rows.length - 1)
  })

  /* The gap has to reach whoever reads the board, not stop at the rules object. */
  it('carries the unnameable scored stats through to the result', () => {
    expect(unnamedScoredStatIds).toEqual([9, 31, 32])
  })

  it('names and positions every row it returns', () => {
    for (const r of rows.slice(0, 20)) {
      expect(r.name).toBeTruthy()
      expect(['C', 'LW', 'RW', 'D', 'G']).toContain(r.position)
    }
  })

  /* An in-season board prices what is LEFT, not what the whole year was worth. */
  it('scales to the games that remain', () => {
    const before = rows.find((r) => r.playerKey === 'f0')!
    const after = build({ gamesPlayed: { f0: 41 } }).rows.find((r) => r.playerKey === 'f0')!
    expect(after.projected!).toBeLessThan(before.projected!)
    expect(after.projected!).toBeCloseTo(before.projected! / 2, 4)
  })
})
