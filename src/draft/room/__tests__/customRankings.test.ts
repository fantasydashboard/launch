import { describe, it, expect } from 'vitest'
import { normalizeName, parseRankings, matchRankings, applyRankingOrder, compareRankings } from '../customRankings'

describe('normalizeName', () => {
  it('ignores case, punctuation and apostrophes', () => {
    expect(normalizeName("Ja'Marr Chase")).toBe('jamarr chase')
    expect(normalizeName('JA MARR CHASE')).toBe('ja marr chase')
    expect(normalizeName('A.J. Brown')).toBe('aj brown')
  })

  it('drops generational suffixes so sources agree', () => {
    expect(normalizeName('Marvin Harrison Jr.')).toBe(normalizeName('Marvin Harrison'))
    expect(normalizeName('Odell Beckham Jr')).toBe('odell beckham')
  })

  it('normalizes the spellings of a team defense', () => {
    expect(normalizeName('Ravens D/ST')).toBe(normalizeName('Ravens DST'))
    expect(normalizeName('Ravens Defense')).toBe(normalizeName('Ravens DEF'))
  })
})

describe('parseRankings', () => {
  it('parses a numbered list', () => {
    const r = parseRankings(`1. Ja'Marr Chase\n2. Bijan Robinson\n3. Justin Jefferson`)
    expect(r.map((x) => x.name)).toEqual(["Ja'Marr Chase", 'Bijan Robinson', 'Justin Jefferson'])
    expect(r.map((x) => x.rank)).toEqual([1, 2, 3])
  })

  it('parses CSV with position and team', () => {
    const r = parseRankings(`1,Ja'Marr Chase,WR,CIN\n2,Bijan Robinson,RB,ATL`)
    expect(r[0]).toMatchObject({ rank: 1, name: "Ja'Marr Chase", position: 'WR', team: 'CIN' })
    expect(r[1]).toMatchObject({ rank: 2, position: 'RB', team: 'ATL' })
  })

  it('parses a plain list with no numbers, ranking by order', () => {
    const r = parseRankings(`Ja'Marr Chase\nBijan Robinson`)
    expect(r.map((x) => x.rank)).toEqual([1, 2])
  })

  it('pulls trailing position and team out of a single-column line', () => {
    const r = parseRankings(`1 Bijan Robinson RB ATL`)
    expect(r[0]).toMatchObject({ name: 'Bijan Robinson', position: 'RB', team: 'ATL' })
  })

  it('skips a header row and blank lines', () => {
    const r = parseRankings(`Rank,Player,Pos\n\n1,Bijan Robinson,RB\n`)
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe('Bijan Robinson')
  })

  it('renumbers densely when the source has gaps', () => {
    const r = parseRankings(`5. A Player\n9. B Player`)
    expect(r.map((x) => x.rank)).toEqual([1, 2])
  })

  it('handles empty input', () => {
    expect(parseRankings('')).toEqual([])
    expect(parseRankings(null as any)).toEqual([])
  })

  it('normalizes D/ST entries to a DEF position', () => {
    const r = parseRankings(`1,Ravens,D/ST,BAL`)
    expect(r[0].position).toBe('DEF')
  })
})

describe('matchRankings', () => {
  const players = [
    { playerKey: 'p1', name: "Ja'Marr Chase", position: 'WR' },
    { playerKey: 'p2', name: 'Marvin Harrison Jr.', position: 'WR' },
    { playerKey: 'p3', name: 'Josh Allen', position: 'QB' },
    { playerKey: 'p4', name: 'Josh Allen', position: 'DEF' }, // real: two players share this name
  ]

  it('matches across punctuation and suffix differences', () => {
    const r = matchRankings(parseRankings(`1. Jamarr Chase\n2. Marvin Harrison`), players)
    expect(r.rankByKey.p1).toBe(1)
    expect(r.rankByKey.p2).toBe(2)
    expect(r.unmatched).toHaveLength(0)
  })

  it('uses the analyst position to disambiguate a shared name', () => {
    const r = matchRankings(parseRankings(`1,Josh Allen,QB`), players)
    expect(r.rankByKey.p3).toBe(1)
    expect(r.rankByKey.p4).toBeUndefined()
  })

  it('reports names it cannot tie to a player rather than guessing', () => {
    const r = matchRankings(parseRankings(`1. Nobody Here`), players)
    expect(r.matched).toBe(0)
    expect(r.unmatched.map((u) => u.name)).toEqual(['Nobody Here'])
  })

  it('never assigns one player to two ranks', () => {
    const r = matchRankings(parseRankings(`1. Jamarr Chase\n2. Ja'Marr Chase`), players)
    expect(Object.values(r.rankByKey)).toEqual([1])
    expect(r.unmatched).toHaveLength(1)
  })
})

describe('applyRankingOrder', () => {
  const players = [
    { playerKey: 'a', value: 300 },
    { playerKey: 'b', value: 250 },
    { playerKey: 'c', value: 200 },
  ]

  it('keeps our value curve and re-maps who sits where on it', () => {
    // Analyst says c is best, then a, then b.
    const v = applyRankingOrder(players, { c: 1, a: 2, b: 3 })
    expect(v.c).toBe(300)
    expect(v.a).toBe(250)
    expect(v.b).toBe(200)
  })

  it('preserves the ordering the analyst gave', () => {
    const v = applyRankingOrder(players, { b: 1, c: 2, a: 3 })
    expect(v.b).toBeGreaterThan(v.c)
    expect(v.c).toBeGreaterThan(v.a)
  })

  it('keeps unranked players below everyone the analyst ranked', () => {
    const v = applyRankingOrder(players, { a: 1, b: 2 })
    expect(v.c).toBeLessThanOrEqual(v.b)
  })

  it('leaves values untouched when nothing is ranked', () => {
    const v = applyRankingOrder(players, {})
    expect(v.a).toBe(300)
    expect(v.b).toBe(250)
  })

  it('handles an empty pool', () => {
    expect(applyRankingOrder([], { a: 1 })).toEqual({})
  })
})

describe('compareRankings', () => {
  const board = [
    { playerKey: 'a', name: 'A', position: 'RB', value: 300, adp: 1 },
    { playerKey: 'b', name: 'B', position: 'WR', value: 250, adp: 2 },
    { playerKey: 'c', name: 'C', position: 'TE', value: 200, adp: 3 },
    { playerKey: 'd', name: 'D', position: 'QB', value: 150, adp: 4 },
  ]

  it('reports identical orderings as perfect agreement', () => {
    const c = compareRankings(board, { a: 1, b: 2, c: 3, d: 4 })
    expect(c.meanAbsDelta).toBe(0)
    expect(c.spearman).toBeCloseTo(1)
    expect(c.diffs.every((d) => d.delta === 0)).toBe(true)
  })

  it('surfaces the biggest disagreements first', () => {
    // They love D (our 4th, their 1st) and hate A (our 1st, their 4th).
    const c = compareRankings(board, { d: 1, b: 2, c: 3, a: 4 })
    expect(Math.abs(c.diffs[0].delta)).toBe(3)
    expect(['a', 'd']).toContain(c.diffs[0].playerKey)
  })

  it('signs the delta so positive means the analyst is higher on him', () => {
    const c = compareRankings(board, { d: 1, a: 2, b: 3, c: 4 })
    const d = c.diffs.find((x) => x.playerKey === 'd')!
    expect(d.ourRank).toBe(4)
    expect(d.theirRank).toBe(1)
    expect(d.delta).toBe(3)
  })

  it('detects a fully reversed ordering', () => {
    const c = compareRankings(board, { a: 4, b: 3, c: 2, d: 1 })
    expect(c.spearman).toBeCloseTo(-1)
  })

  it('only compares players present in both lists', () => {
    const c = compareRankings(board, { a: 1, b: 2 })
    expect(c.matched).toBe(2)
    expect(c.diffs.map((d) => d.playerKey).sort()).toEqual(['a', 'b'])
  })

  it('carries unmatched analyst entries through for reporting', () => {
    const c = compareRankings(board, { a: 1 }, [{ rank: 2, name: 'Ghost' }])
    expect(c.unmatched.map((u) => u.name)).toEqual(['Ghost'])
  })

  it('handles empty input without dividing by zero', () => {
    const c = compareRankings([], {})
    expect(c.matched).toBe(0)
    expect(c.meanAbsDelta).toBe(0)
    expect(c.spearman).toBe(0)
  })
})
