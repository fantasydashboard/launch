import { describe, it, expect } from 'vitest'
import { buildRecommendation, type RecommendContext } from '../recommend'
import type { BoardRow } from '../board'

function row(over: Partial<BoardRow> = {}): BoardRow {
  return {
    playerKey: 'p1', name: 'Player One', position: 'RB', value: 300,
    vona: 18.4, upside: 3, score: 18.4, survival: 0.2, tier: 2, flag: '', adp: 10,
    ...over,
  }
}

const ctx = (over: Partial<RecommendContext> = {}): RecommendContext => ({
  nextPick: 33,
  upcoming: [],
  ...over,
})

describe('buildRecommendation', () => {
  it('picks the top row by score', () => {
    const rec = buildRecommendation([row({ playerKey: 'a', score: 10 }), row({ playerKey: 'b', score: 5 })], ctx())
    expect(rec!.pick.playerKey).toBe('a')
  })

  it('returns null on an empty board', () => {
    expect(buildRecommendation([], ctx())).toBeNull()
  })

  it('cites the VONA gap with the next pick number', () => {
    const rec = buildRecommendation([row({ vona: 18.4 })], ctx({ nextPick: 33 }))
    const r = rec!.reasons.find((x) => x.kind === 'vona')!
    expect(r.text).toContain('18.4')
    expect(r.text).toContain('33')
  })

  it('omits the VONA reason entirely when there is no edge to cite', () => {
    const rec = buildRecommendation([row({ vona: 0 })], ctx())
    expect(rec!.reasons.find((x) => x.kind === 'vona')).toBeUndefined()
  })

  it('cites an opponent tendency WITH its sample count', () => {
    const rec = buildRecommendation(
      [row({ position: 'RB' })],
      ctx({ upcoming: [{ teamKey: 't1', teamName: 'Mike', prior: { byPosition: { RB: 0.8 }, sample: 5, counts: { RB: 4, WR: 1 } } }] }),
    )
    const r = rec!.reasons.find((x) => x.kind === 'tendency')!
    expect(r.text).toContain('Mike')
    // The count must be what he actually did (4 of 5), never share x sample.
    expect(r.text).toContain('4 of his last 5 picks')
    expect(r.text).not.toContain('drafts')
  })

  it('never cites a tendency for a manager with no history', () => {
    const rec = buildRecommendation(
      [row()],
      ctx({ upcoming: [{ teamKey: 't1', teamName: 'Newbie', prior: { byPosition: { RB: 1 }, sample: 0, counts: {} } }] }),
    )
    expect(rec!.reasons.find((x) => x.kind === 'tendency')).toBeUndefined()
  })

  it('ignores a weak tendency rather than dressing it up', () => {
    const rec = buildRecommendation(
      [row()],
      ctx({ upcoming: [{ teamKey: 't1', teamName: 'Mike', prior: { byPosition: { RB: 0.2 }, sample: 5, counts: { RB: 1, WR: 4 } } }] }),
    )
    expect(rec!.reasons.find((x) => x.kind === 'tendency')).toBeUndefined()
  })

  it('calls out a tier cliff', () => {
    const rec = buildRecommendation([row({ tier: 2 })], ctx({ tierRemaining: 0, nextTierDrop: 22 }))
    const r = rec!.reasons.find((x) => x.kind === 'tier')!
    expect(r.text).toContain('Last RB in tier 2')
    expect(r.text).toContain('22')
  })

  it('omits the tier reason when the drop is unknown', () => {
    const rec = buildRecommendation([row()], ctx({ tierRemaining: 3 }))
    expect(rec!.reasons.find((x) => x.kind === 'tier')).toBeUndefined()
  })

  it('mentions survival only when it argues for acting now', () => {
    const urgent = buildRecommendation([row({ survival: 0.1 })], ctx())
    expect(urgent!.reasons.find((x) => x.kind === 'survival')!.text).toContain('90%')

    const safe = buildRecommendation([row({ survival: 0.95 })], ctx())
    expect(safe!.reasons.find((x) => x.kind === 'survival')).toBeUndefined()
  })

  it('every emitted reason carries a number', () => {
    const rec = buildRecommendation(
      [row({ vona: 18.4, survival: 0.2, tier: 2 })],
      ctx({
        upcoming: [{ teamKey: 't1', teamName: 'Mike', prior: { byPosition: { RB: 0.8 }, sample: 5, counts: { RB: 4, WR: 1 } } }],
        tierRemaining: 1,
        nextTierDrop: 22,
      }),
    )
    expect(rec!.reasons.length).toBeGreaterThan(0)
    for (const r of rec!.reasons) expect(r.text).toMatch(/\d/)
  })

  it('notes whether each alternate is likely to last', () => {
    const rec = buildRecommendation(
      [row({ playerKey: 'a', score: 20 }), row({ playerKey: 'b', score: 10, survival: 0.9 }), row({ playerKey: 'c', score: 5, survival: 0.2 })],
      ctx({ nextPick: 33 }),
    )
    expect(rec!.alternates).toHaveLength(2)
    expect(rec!.alternates[0].note).toContain('likely there at 33')
    expect(rec!.alternates[1].note).toContain('80%')
  })
})

describe('buildRecommendation — tendency counts are observed, not derived', () => {
  it('reports the raw count even when the shrunk share disagrees with it', () => {
    // Shrinkage pulls the share to 0.55, but he actually took RB 9 times in 10.
    const rec = buildRecommendation(
      [row({ position: 'RB' })],
      ctx({
        upcoming: [{ teamKey: 't1', teamName: 'Mike', prior: { byPosition: { RB: 0.55 }, sample: 10, counts: { RB: 9, WR: 1 } } }],
      }),
    )
    const r = rec!.reasons.find((x) => x.kind === 'tendency')!
    expect(r.text).toContain('9 of his last 10 picks')
    // 0.55 x 10 would have printed 6 — a number nobody observed.
    expect(r.text).not.toContain('6 of')
  })

  it('names the round range when given one', () => {
    const rec = buildRecommendation(
      [row({ position: 'RB' })],
      ctx({
        roundRange: 'rounds 1-3',
        upcoming: [{ teamKey: 't1', teamName: 'Mike', prior: { byPosition: { RB: 0.8 }, sample: 5, counts: { RB: 4 } } }],
      }),
    )
    expect(rec!.reasons.find((x) => x.kind === 'tendency')!.text).toContain('in rounds 1-3')
  })

  it('says nothing when the manager has no picks at that position', () => {
    const rec = buildRecommendation(
      [row({ position: 'RB' })],
      ctx({ upcoming: [{ teamKey: 't1', teamName: 'Mike', prior: { byPosition: { RB: 0.9 }, sample: 5, counts: { WR: 5 } } }] }),
    )
    expect(rec!.reasons.find((x) => x.kind === 'tendency')).toBeUndefined()
  })
})

describe('buildRecommendation — the edge is quoted in points', () => {
  const withPoints = (over: Partial<BoardRow>): BoardRow => row({ vona: 21.2, vonaPoints: 15.4, ...over })

  it('quotes the points figure, not the ranking-scale one', () => {
    const rec = buildRecommendation([withPoints({})], ctx({ nextPick: 54 }))
    const r = rec!.reasons.find((x) => x.kind === 'vona')!
    expect(r.text).toContain('15.4')
    expect(r.text).not.toContain('21.2')
  })

  it('makes no points claim our own projections do not support', () => {
    // The analyst ranks him well ahead; our points say otherwise. Ordering can
    // follow the analyst, but a "+X pts" line has to be ours to stand behind.
    const rec = buildRecommendation([withPoints({ vonaPoints: -3 })], ctx())
    expect(rec!.reasons.find((x) => x.kind === 'vona')).toBeUndefined()
    expect(rec!.pick.playerKey).toBe('p1')
  })
})

describe('buildRecommendation — no certainty the model cannot back', () => {
  it('never prints 100% gone', () => {
    const rec = buildRecommendation([row({ survival: 0 })], ctx())
    expect(rec!.reasons.find((x) => x.kind === 'survival')!.text).toContain('99%')
  })

  it('never prints 0% on an alternate', () => {
    const rec = buildRecommendation(
      [row({ playerKey: 'a', score: 20 }), row({ playerKey: 'b', score: 5, survival: 1 })],
      ctx({ nextPick: 33 }),
    )
    // A survival of 1 reads as "likely there", not as a guarantee.
    expect(rec!.alternates[0].note).not.toContain('100%')
  })
})
