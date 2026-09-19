import { describe, it, expect } from 'vitest'
import { buildHockeyBoard } from '../hockeyBoard'
import type { HockeyLeagueRules } from '../hockeyLeague'
import type { HockeyProjection } from '../hockeyValue'

const RULES: HockeyLeagueRules = {
  leagueId: 'x', season: 2027, name: 'test', teams: 8, scoringType: 'H2H_POINTS',
  weights: { G: 2, A: 1, SOG: 0.1, W: 4, SHO: 3, SV: 0.2, GA: -2 },
  categories: [],
  slots: { F: 9, D: 5, G: 2, UTIL: 1 },
  rosterSize: 20,
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
    out[`g${i}`] = { playerKey: `g${i}`, position: 'G', stats: { W: 35 - i * 0.5, SHO: 5, SV: 1600 - i * 15, GA: 150 + i, DEC: 60 } }
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

describe('a category league gets a board too', () => {
  const CAT_RULES: HockeyLeagueRules = {
    ...RULES,
    scoringType: 'H2H_CATEGORY',
    weights: {},              // a category league publishes none, by design
    categories: [
      { key: 'G', statId: 13, reverse: false },
      { key: 'A', statId: 14, reverse: false },
      { key: 'SOG', statId: 29, reverse: false },
      { key: 'W', statId: 1, reverse: false },
      { key: 'SV', statId: 6, reverse: false },
      { key: 'GA', statId: 4, reverse: true },
    ],
  }
  const catBoard = () =>
    buildHockeyBoard({ projections: pool(), rules: CAT_RULES, namesByKey: names })

  /* The board used to refuse outright: no weights meant nothing could be priced, and a
     category league has no weights to publish. */
  it('builds where it used to refuse', () => {
    const b = catBoard()
    expect(b.rows.length).toBeGreaterThan(0)
    expect(b.mode).toBe('categories')
  })

  it('says which columns it ranked on', () => {
    expect(catBoard().categoryKeys).toEqual(['G', 'A', 'SOG', 'W', 'SV', 'GA'])
  })

  it('carries the per-column breakdown so a row can explain itself', () => {
    const b = catBoard()
    const top = b.rows[0]
    expect(Object.keys(b.perCategoryByKey[top.playerKey]).length).toBeGreaterThan(0)
  })

  /*
   * NO ZERO FLOOR IN CATEGORY MODE. Half a z-scored field is negative by construction, and
   * the points-league filter that drops anyone at or below nought would empty this board by
   * the middle rounds.
   */
  it('keeps the below-average half of the field on the board', () => {
    const b = catBoard()
    expect(b.rows.length).toBe(Object.keys(pool()).length)
    expect(b.rows.some((r) => (r.projected ?? 0) < 0)).toBe(true)
  })

  it('still ranks by value over replacement, not by raw z-score', () => {
    const b = catBoard()
    const byProjected = [...b.rows].sort((a, b2) => (b2.projected ?? 0) - (a.projected ?? 0))
    expect(b.rows.map((r) => r.playerKey)).not.toEqual(byProjected.map((r) => r.playerKey))
  })

  it('reports points mode for the points league', () => {
    expect(buildHockeyBoard({ projections: pool(), rules: RULES, namesByKey: names }).mode).toBe('points')
  })
})

describe('punting a category', () => {
  const CATS = [
    { key: 'G', statId: 13, reverse: false },
    { key: 'A', statId: 14, reverse: false },
    { key: 'SOG', statId: 29, reverse: false },
    { key: 'W', statId: 1, reverse: false },
    { key: 'SV', statId: 6, reverse: false },
    { key: 'GA', statId: 4, reverse: true },
  ]
  const CAT_RULES: HockeyLeagueRules = {
    ...RULES, scoringType: 'H2H_CATEGORY', weights: {}, categories: CATS,
  }
  const build = (punted?: Set<string>) =>
    buildHockeyBoard({ projections: pool(), rules: CAT_RULES, namesByKey: names, punted })

  it('prices only the columns still being contested', () => {
    expect(build().contestedKeys).toEqual(['G', 'A', 'SOG', 'W', 'SV', 'GA'])
    expect(build(new Set(['W', 'SV', 'GA'])).contestedKeys).toEqual(['G', 'A', 'SOG'])
  })

  it('still reports every column the league is decided in', () => {
    // The punt is this manager's; the league is unchanged, and the toggles need the full list.
    expect(build(new Set(['W'])).categoryKeys).toHaveLength(6)
  })

  /*
   * THE POINT. Concede every column a goalie contributes to and goalies stop being worth
   * anything to you — which is the correct answer, not a degenerate one. They stay ON the
   * board, because two goalie slots still have to be filled; they just stop competing for
   * picks against skaters who help you win something.
   */
  it('collapses a position whose every column is punted', () => {
    const normal = build()
    const punted = build(new Set(['W', 'SV', 'GA']))
    const bestGoalieNormal = normal.rows.findIndex((r) => r.position === 'G')
    const bestGoaliePunted = punted.rows.findIndex((r) => r.position === 'G')
    expect(bestGoaliePunted).toBeGreaterThan(bestGoalieNormal)
    expect(punted.rows.some((r) => r.position === 'G')).toBe(true)
  })

  it('re-prices the skaters too, not just the punted position', () => {
    const before = build().rows.find((r) => r.position === 'D')!
    const after = build(new Set(['SOG'])).rows.find((r) => r.playerKey === before.playerKey)!
    expect(after.projected).not.toBeCloseTo(before.projected!, 6)
  })

  /* Punting everything is an empty filter, not a strategy. It would price the league at
     nothing and hand back a board in arbitrary order, which still looks like a board. */
  it('refuses a punt of every column', () => {
    const all = new Set(CATS.map((c) => c.key))
    expect(build(all).contestedKeys).toEqual(build().contestedKeys)
  })

  it('ignores punts in a points league', () => {
    const b = buildHockeyBoard({
      projections: pool(), rules: RULES, namesByKey: names, punted: new Set(['G']),
    })
    expect(b.mode).toBe('points')
    expect(b.contestedKeys).toEqual([])
  })
})

describe('the market, and the injured', () => {
  const withMarket = () => {
    const proj = pool()
    /* Ranked exactly opposite to our board, so the disagreement is unmissable. */
    const keys = Object.keys(proj)
    keys.forEach((k, i) => {
      proj[k] = { ...proj[k], adp: keys.length - i }
    })
    proj.f0 = { ...proj.f0, injuryStatus: 'OUT' }
    proj.f1 = { ...proj.f1, injuryStatus: 'DAY_TO_DAY' }
    return buildHockeyBoard({ projections: proj, rules: RULES, namesByKey: names })
  }

  it('carries ADP onto the row', () => {
    expect(withMarket().rows[0].adp).toBeGreaterThan(0)
  })

  /*
   * FLAGGED, NEVER DISCOUNTED. ESPN's projection already accounts for the games a hurt player
   * is expected to miss — Makar 78 of 82, Bedard 64 — so a discount here would charge the
   * same injury twice. The flag travels; the number does not move.
   */
  it('flags an injury without touching the value', () => {
    const clean = buildHockeyBoard({ projections: pool(), rules: RULES, namesByKey: names })
    const flagged = withMarket()
    const row = flagged.rows.find((r) => r.playerKey === 'f0')!
    const same = clean.rows.find((r) => r.playerKey === 'f0')!
    expect(row.injuryStatus).toBe('OUT')
    expect(row.value).toBeCloseTo(same.value, 6)
    expect(row.projected).toBeCloseTo(same.projected!, 6)
  })

  it('says nothing about a player with no designation', () => {
    expect(withMarket().rows.find((r) => r.playerKey === 'f5')!.injuryStatus).toBeNull()
  })

  /* Our best player is the market's worst in this fixture, so he must read as value. */
  it('flags where we disagree with the room by a full round', () => {
    const top = withMarket().rows[0]
    expect(top.marketFlag).toBe('value')
    expect(top.marketRounds).toBeGreaterThan(1)
  })

  /*
   * A badge on every row carries as much information as a badge on none.
   *
   * The ADP here is taken from the board's OWN ordering, which is the only way to express
   * "the room agrees with us". Numbering the fixture in key order does not: pool() is built
   * position by position while the board interleaves them by value, so key order is a
   * genuinely different ranking and flagged almost every row.
   */
  it('stays silent when we and the room roughly agree', () => {
    const first = buildHockeyBoard({ projections: pool(), rules: RULES, namesByKey: names })
    const proj = pool()
    first.rows.forEach((r, i) => { proj[r.playerKey] = { ...proj[r.playerKey], adp: i + 1 } })
    const b = buildHockeyBoard({ projections: proj, rules: RULES, namesByKey: names })
    expect(b.rows.filter((r) => r.marketFlag).length).toBe(0)
  })

  it('reads no disagreement for a player the market never priced', () => {
    const b = buildHockeyBoard({ projections: pool(), rules: RULES, namesByKey: names })
    expect(b.rows[0].marketFlag).toBe('')
    expect(b.rows[0].adp).toBeNull()
  })
})
