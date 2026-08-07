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

describe('parseRankings — how rankings actually arrive', () => {
  const HEADER = 'Overall\tPlayer\tPosition\tPos Rank\tTier'

  it('reads a tab-separated spreadsheet paste', () => {
    const r = parseRankings(`${HEADER}\n1\tJahmyr Gibbs\tRB\t1\t1\n2\tBijan Robinson\tRB\t2\t1`)
    expect(r).toHaveLength(2)
    expect(r[0]).toMatchObject({ rank: 1, name: 'Jahmyr Gibbs', position: 'RB' })
    expect(r[1]).toMatchObject({ rank: 2, name: 'Bijan Robinson' })
  })

  it('reads a column-aligned paste where the tabs became spaces', () => {
    const r = parseRankings(
      'Overall Player  Position   Pos Rank   Tier\n1   Jahmyr Gibbs   RB  1   1\n2   Bijan Robinson  RB  2   1',
    )
    expect(r[0]).toMatchObject({ rank: 1, name: 'Jahmyr Gibbs', position: 'RB' })
    expect(r[1].name).toBe('Bijan Robinson')
  })

  it('skips a header that does not start with the word rank', () => {
    // "Overall,..." used to parse as a player and shift every rank by one.
    const r = parseRankings(`Overall,Player,Position,Pos Rank,Tier\n1,Jahmyr Gibbs,RB,1,1`)
    expect(r).toHaveLength(1)
    expect(r[0].name).toBe('Jahmyr Gibbs')
    expect(r[0].rank).toBe(1)
  })

  it('ignores trailing positional rank, tier and auction columns', () => {
    const r = parseRankings(`1,Jahmyr Gibbs,RB,1,1,$65`)
    expect(r[0]).toMatchObject({ name: 'Jahmyr Gibbs', position: 'RB' })
  })

  it('keeps single spaces inside names', () => {
    const r = parseRankings(`1\tMarvin Harrison Jr.\tWR\t5\t2`)
    expect(r[0].name).toBe('Marvin Harrison Jr.')
  })

  it('still handles a plain numbered list', () => {
    const r = parseRankings(`1. Ja'Marr Chase\n2. Bijan Robinson`)
    expect(r.map((x) => x.name)).toEqual(["Ja'Marr Chase", 'Bijan Robinson'])
  })
})

describe('applyRankingOrder — partial and positional lists', () => {
  const pool = Array.from({ length: 200 }, (_, i) => ({ playerKey: `p${i}`, value: 300 - i }))

  it('never collapses unranked players onto one value', () => {
    // "My top 40 RBs" — ranked players scattered through our curve.
    const rankByKey: Record<string, number> = {}
    for (let i = 0; i < 40; i++) rankByKey[`p${20 + i * 4}`] = i + 1
    const v = applyRankingOrder(pool, rankByKey)

    const unrankedVals = pool
      .filter((p) => rankByKey[p.playerKey] === undefined)
      .map((p) => v[p.playerKey])
    expect(new Set(unrankedVals).size).toBe(unrankedVals.length)
  })

  it('leaves players the analyst did not rank exactly as we had them', () => {
    const v = applyRankingOrder(pool, { p5: 1, p9: 2 })
    expect(v.p0).toBe(300)
    expect(v.p100).toBe(200)
    expect(v.p199).toBe(101)
  })

  it('permutes the ranked group within the slots it already held', () => {
    // We had p5=295, p9=291. Analyst prefers p9.
    const v = applyRankingOrder(pool, { p9: 1, p5: 2 })
    expect(v.p9).toBe(295)
    expect(v.p5).toBe(291)
  })

  it('a full overall list still re-maps the whole curve', () => {
    const three = [
      { playerKey: 'a', value: 300 },
      { playerKey: 'b', value: 250 },
      { playerKey: 'c', value: 200 },
    ]
    const v = applyRankingOrder(three, { c: 1, a: 2, b: 3 })
    expect([v.c, v.a, v.b]).toEqual([300, 250, 200])
  })
})

describe('matchRankings — ambiguity is surfaced, not guessed', () => {
  const players = [
    { playerKey: 'qb', name: 'Josh Allen', position: 'QB' },
    { playerKey: 'lb', name: 'Josh Allen', position: 'LB' },
    { playerKey: 'solo', name: 'Bijan Robinson', position: 'RB' },
  ]

  it('flags a shared name with no position rather than picking one', () => {
    const r = matchRankings(parseRankings('1. Josh Allen'), players)
    expect(r.matched).toBe(0)
    expect(r.ambiguous).toHaveLength(1)
    expect(r.ambiguous[0].candidates.map((c) => c.playerKey).sort()).toEqual(['lb', 'qb'])
  })

  it('resolves when the position narrows it to exactly one', () => {
    const r = matchRankings(parseRankings('1,Josh Allen,QB'), players)
    expect(r.rankByKey.qb).toBe(1)
    expect(r.ambiguous).toHaveLength(0)
  })

  it('still flags when the position does not narrow it', () => {
    const dupes = [
      { playerKey: 'a', name: 'Mike Williams', position: 'WR' },
      { playerKey: 'b', name: 'Mike Williams', position: 'WR' },
    ]
    const r = matchRankings(parseRankings('1,Mike Williams,WR'), dupes)
    expect(r.matched).toBe(0)
    expect(r.ambiguous[0].candidates).toHaveLength(2)
  })

  it('an unambiguous name is unaffected', () => {
    const r = matchRankings(parseRankings('1. Bijan Robinson'), players)
    expect(r.rankByKey.solo).toBe(1)
    expect(r.ambiguous).toHaveLength(0)
    expect(r.unmatched).toHaveLength(0)
  })
})

describe('compareRankings — respects the order it is given', () => {
  // Deliberately NOT in value order: this is the caller's ranking, and a QB with
  // huge raw points sits low because replacement at QB is high.
  const ordered = [
    { playerKey: 'rb', name: 'RB One', position: 'RB', value: 250, adp: 5 },
    { playerKey: 'wr', name: 'WR One', position: 'WR', value: 240, adp: 8 },
    { playerKey: 'qb', name: 'QB One', position: 'QB', value: 400, adp: 90 },
  ]

  it('uses array position as our rank rather than re-sorting by points', () => {
    const c = compareRankings(ordered, { rb: 1, wr: 2, qb: 3 })
    const qb = c.diffs.find((d) => d.playerKey === 'qb')!
    expect(qb.ourRank).toBe(3)
    expect(qb.delta).toBe(0)
  })

  it('does not manufacture a disagreement from raw projected points', () => {
    // Sorting by value would rank the QB 1st and report a two-spot gap.
    const c = compareRankings(ordered, { rb: 1, wr: 2, qb: 3 })
    expect(c.meanAbsDelta).toBe(0)
    expect(c.spearman).toBeCloseTo(1)
  })
})
