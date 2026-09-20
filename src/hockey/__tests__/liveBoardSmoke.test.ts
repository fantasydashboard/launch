import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { buildHockeyBoard } from '../hockeyBoard'
import type { HockeyProjection } from '../hockeyValue'

/**
 * A smoke test against a REAL ESPN projection pull, not a fixture.
 *
 * Every hockey test to date runs on hand-written projections, which means they prove the
 * arithmetic and nothing about the feed. This one runs the 454 players ESPN actually
 * published for 2026-27 through the real board, in both currencies, and asserts the things
 * that would be obviously wrong to a drafter rather than to a compiler.
 *
 * Skips itself when the pull is absent, so CI does not depend on a 34MB download.
 */
const FILE = '/private/tmp/claude-501/-Users-joshdaniel/c6037eeb-7afa-4879-8998-f95d9b3b1837/scratchpad/hockey_proj.json'

/* Keyed by playerKey, NOT an array — the board takes a Record, and handing it an array
   silently keys every player by his array INDEX, which produces a full-looking board whose
   names and positions all belong to the wrong men. */
const load = (): Record<string, HockeyProjection> =>
  Object.fromEntries(JSON.parse(readFileSync(FILE, 'utf8')).map((p: any) => [
    p.playerKey,
    { playerKey: p.playerKey, position: p.position, stats: p.stats, adp: p.adp ?? null },
  ]))

const d = existsSync(FILE) ? describe : describe.skip

d('the hockey board on a live ESPN pull', () => {
  const projections = load()
  const byKey = projections
  const namesByKey = Object.fromEntries(
    JSON.parse(readFileSync(FILE, 'utf8')).map((p: any) => [p.playerKey, p.name]),
  )
  const slots = { C: 2, LW: 2, RW: 2, D: 4, G: 2, UTIL: 1, BE: 4 }

  /* A standard 10-team category league: five skater columns and four goalie columns. */
  const CATS = [
    { key: 'G', statId: 13, reverse: false },
    { key: 'A', statId: 14, reverse: false },
    { key: 'PPP', statId: 38, reverse: false },
    { key: 'SOG', statId: 29, reverse: false },
    { key: 'HITS', statId: 31, reverse: false },
    { key: 'BLK', statId: 32, reverse: false },
    { key: 'W', statId: 1, reverse: false },
    { key: 'GAA', statId: 10, reverse: true },
    { key: 'SVPCT', statId: 11, reverse: false },
  ]
  const catRules = {
    leagueId: 'test', season: 2027, name: 'cat', teams: 10,
    scoringType: 'H2H_CATEGORY', weights: {}, categories: CATS,
    slots, rosterSize: 17, unnamedScoredStatIds: [],
  }
  const ptsRules = {
    ...catRules, scoringType: 'H2H_POINTS', categories: [],
    weights: { G: 3, A: 2, PPP: 1, SOG: 0.4, HITS: 0.3, BLK: 0.3, W: 3, SHO: 3, SV: 0.2 },
  }

  const top = (r: any, n = 12) =>
    r.rows.slice(0, n).map((x: any) => `${namesByKey[x.playerKey]} (${byKey[x.playerKey].position})`)

  it('builds a category board that is not empty and not in feed order', () => {
    const r = buildHockeyBoard({ projections, rules: catRules as any, namesByKey, gamesPlayed: {} })
    expect(r.rows.length).toBeGreaterThan(200)
    // eslint-disable-next-line no-console
    console.log('\nCATEGORY top 12:\n  ' + top(r).join('\n  '))
    /* The board must not be the order ESPN handed us. */
    expect(r.rows[0].playerKey).not.toBe(Object.keys(projections)[0])
    /* Names must RESOLVE. A row whose name equals its key is a lookup that missed, and it
       renders as a board of ID numbers rather than as an error. */
    expect(r.rows[0].name).not.toBe(r.rows[0].playerKey)
  })

  it('builds a points board', () => {
    const r = buildHockeyBoard({ projections, rules: ptsRules as any, namesByKey, gamesPlayed: {} })
    expect(r.rows.length).toBeGreaterThan(200)
    // eslint-disable-next-line no-console
    console.log('\nPOINTS top 12:\n  ' + top(r).join('\n  '))
  })

  /*
   * The two currencies must DISAGREE. If a category board and a points board return the same
   * order, one of them is not being computed — the exact failure that would be invisible on
   * screen, because both look like a ranked list of plausible hockey players.
   */
  it('ranks differently in the two currencies', () => {
    const cat = buildHockeyBoard({ projections, rules: catRules as any, namesByKey, gamesPlayed: {} })
    const pts = buildHockeyBoard({ projections, rules: ptsRules as any, namesByKey, gamesPlayed: {} })
    const a = cat.rows.slice(0, 25).map((r: any) => r.playerKey)
    const b = pts.rows.slice(0, 25).map((r: any) => r.playerKey)
    expect(a).not.toEqual(b)
  })

  /* Goalies sum fewer columns than skaters, so a naive build buries every one of them. */
  it('puts goalies on the category board', () => {
    const r = buildHockeyBoard({ projections, rules: catRules as any, namesByKey, gamesPlayed: {} })
    const first100 = r.rows.slice(0, 100).filter((x: any) => byKey[x.playerKey].position === 'G')
    // eslint-disable-next-line no-console
    console.log('\ngoalies in category top 100:', first100.length,
      '->', first100.slice(0, 5).map((x: any) => namesByKey[x.playerKey]).join(', '))
    expect(first100.length).toBeGreaterThan(3)
  })
})
