import { describe, it, expect } from 'vitest'
import { splitWideRankings, splitCsvLine, parseRankings } from '../customRankings'

/* The shape an analyst publishes: every position side by side, each restarting at rank 1,
   shorter blocks padded with blanks to the length of the longest. */
const WIDE = [
  '"QB Rank","QB Player","QB Team","QB Total","QB Tier","RB Rank","RB Player","RB Team","RB Total","RB Tier","DEF Rank","DEF Team","DEF Spread","DEF Tier","FLEX Rank","FLEX Player","FLEX Team","FLEX Pos"',
  '"1","Josh Allen","BUF","29.50","1","1","Jahmyr Gibbs","DET","25.00","1","1","Philadelphia Eagles","-7.00","1","1","Jahmyr Gibbs","DET","RB"',
  '"2","Lamar Jackson","BAL","27.50","1","2","Bijan Robinson","ATL","20.50","1","2","Tampa Bay Buccaneers","-8.50","1","2","Bijan Robinson","ATL","RB"',
  '"3","Jalen Hurts","PHI","23.25","2","3","Christian McCaffrey","SF","29.50","2","","","","","3","Christian McCaffrey","SF","RB"',
  '"","","","","","4","Derrick Henry","BAL","27.50","2","","","","","4","Derrick Henry","BAL","RB"',
].join('\n')

describe('splitCsvLine', () => {
  it('keeps blank cells, because a header-indexed parse addresses columns by position', () => {
    expect(splitCsvLine('"1","","Josh Allen"')).toEqual(['1', '', 'Josh Allen'])
  })
  it('honours a quoted comma', () => {
    expect(splitCsvLine('"1","Smith, Jr.","BUF"')).toEqual(['1', 'Smith, Jr.', 'BUF'])
  })
})

describe('splitWideRankings', () => {
  const w = splitWideRankings(WIDE)!

  it('finds one list per position instead of reading the first block and discarding the rest', () => {
    expect(w.parts.map((p) => p.position).sort()).toEqual(['DEF', 'QB', 'RB'])
  })

  /*
   * The failure this exists to prevent. Fed to the ordinary parser, a wide sheet returns
   * confident nonsense rather than nothing: it reads the QB block alone and stamps those
   * players with whatever landed in the position column.
   */
  it('keeps every quarterback a quarterback', () => {
    const qb = parseRankings(w.parts.find((p) => p.position === 'QB')!.text)
    expect(qb.map((r) => r.name)).toEqual(['Josh Allen', 'Lamar Jackson', 'Jalen Hurts'])
    expect(qb.map((r) => r.tier)).toEqual([1, 1, 2])
  })

  it('carries each block\'s own tiers, which is the column the whole upload is for', () => {
    const rb = parseRankings(w.parts.find((p) => p.position === 'RB')!.text)
    expect(rb.map((r) => r.tier)).toEqual([1, 1, 2, 2])
  })

  it('stops a short block at its last real row rather than at the padding', () => {
    // QB has three names; the sheet is four rows long because RB is longer.
    expect(parseRankings(w.parts.find((p) => p.position === 'QB')!.text)).toHaveLength(3)
  })

  it('names a defence by its team, and still reads its tier', () => {
    const def = parseRankings(w.parts.find((p) => p.position === 'DEF')!.text)
    expect(def[0].name).toBe('Philadelphia Eagles')
    // No per-player team column here, so the blank between name and tier must not shift it.
    expect(def.map((r) => r.tier)).toEqual([1, 1])
  })

  /* Every FLEX player already appears in his own block; a second rank would let the copy
     outrank the real one. */
  it('skips FLEX knowingly rather than silently', () => {
    expect(w.parts.find((p) => p.position === 'FLEX')).toBeUndefined()
    expect(w.skipped).toContain('FLEX')
  })

  it('returns null for an ordinary one-position file, so the normal path still runs', () => {
    expect(splitWideRankings('Rank,Player,Team,Tier\n1,Josh Allen,BUF,1\n2,Lamar Jackson,BAL,1')).toBeNull()
  })

  it('returns null for junk rather than an empty result that looks like a bad file', () => {
    expect(splitWideRankings('')).toBeNull()
    expect(splitWideRankings('hello')).toBeNull()
  })
})
