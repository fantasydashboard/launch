import { describe, it, expect } from 'vitest'
import { analyzeTrade } from '../analyzeTrade'
import type { TradeEngine } from '../engine'
import type { CatStanding } from '../landscape'

// Minimal engine fixture. need: hump 0..1. You need R (hole), dominate SV.
function engine(opts: {
  statIds: string[]
  myNeed: Record<string, number>
  theirNeed: Record<string, number>
  strengths: Record<string, Record<string, number>>
  values: Record<string, number>
}): TradeEngine {
  const stand = (need: Record<string, number>): Map<string, CatStanding> => {
    const m = new Map<string, CatStanding>()
    for (const c of opts.statIds) m.set(c, { rank: 1, surplus: 0, need: need[c] ?? 0 })
    return m
  }
  return {
    pool: [],
    cats: [],
    statIds: opts.statIds,
    byTeam: new Map(),
    landscape: new Map([
      ['me', stand(opts.myNeed)],
      ['them', stand(opts.theirNeed)],
    ]),
    valueByKey: new Map(Object.entries(opts.values)),
    strengthByKey: new Map(Object.entries(opts.strengths)),
    timingByKey: new Map(),
  }
}

const label = (s: string) => s

describe('analyzeTrade', () => {
  it('win-win: give your surplus, get your hole — both improve', () => {
    const e = engine({
      statIds: ['R', 'SV'],
      myNeed: { R: 0.8, SV: 0 }, // you need R, dominate SV
      theirNeed: { R: 0, SV: 0.8 }, // they need SV
      strengths: { G: { SV: 2 }, T: { R: 2 } },
      values: { G: 60, T: 60 },
    })
    const a = analyzeTrade(e, { myKey: 'me', partnerKey: 'them', giveKeys: ['G'], getKeys: ['T'], labelOf: label })!
    expect(a.klass).toBe('winWin')
    expect(a.accept).toBe('likely')
    expect(a.helps).toContain('R') // you net R
    expect(a.pitch).toContain('SV') // your give fills their SV
    expect(a.costs).not.toContain('SV') // SV is dead value (raw need 0), not a cost
  })

  it('bad for you: give your hole-helper for a dominated-category player', () => {
    const e = engine({
      statIds: ['R', 'SV'],
      myNeed: { R: 0.8, SV: 0 },
      theirNeed: { R: 0, SV: 0.8 },
      strengths: { G: { SV: 2 }, T: { R: 2 } },
      values: { G: 60, T: 60 },
    })
    const a = analyzeTrade(e, { myKey: 'me', partnerKey: 'them', giveKeys: ['T'], getKeys: ['G'], labelOf: label })!
    expect(a.klass).toBe('badForYou')
    expect(a.headline.toLowerCase()).toContain('pass')
  })

  it('fleece: great for you, they lose a category they need', () => {
    const e = engine({
      statIds: ['R'],
      myNeed: { R: 0.8 },
      theirNeed: { R: 0.8 }, // both contested in R
      strengths: { Junk: { R: 0 }, Stud: { R: 3 } },
      values: { Junk: 30, Stud: 80 },
    })
    const a = analyzeTrade(e, { myKey: 'me', partnerKey: 'them', giveKeys: ['Junk'], getKeys: ['Stud'], labelOf: label })!
    expect(a.klass).toBe('fleece')
    expect(a.accept).toBe('unlikely')
  })

  it('flags overpay as a warning', () => {
    const e = engine({
      statIds: ['R', 'SV'],
      myNeed: { R: 0.8, SV: 0 },
      theirNeed: { R: 0, SV: 0.8 },
      strengths: { G: { SV: 2 }, T: { R: 2 } },
      values: { G: 90, T: 60 }, // you give 90 for 60 -> overpay 30
    })
    const a = analyzeTrade(e, { myKey: 'me', partnerKey: 'them', giveKeys: ['G'], getKeys: ['T'], labelOf: label })!
    expect(a.valueGap).toBe(-30)
    expect(a.warnings.some((w) => w.includes('30'))).toBe(true)
  })

  it('returns null for an empty side', () => {
    const e = engine({ statIds: ['R'], myNeed: { R: 0.8 }, theirNeed: { R: 0.2 }, strengths: {}, values: {} })
    expect(analyzeTrade(e, { myKey: 'me', partnerKey: 'them', giveKeys: [], getKeys: ['X'], labelOf: label })).toBeNull()
  })
})
