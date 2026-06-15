import { describe, it, expect } from 'vitest'
import { buildOpportunities, type RawDeal, type OppContext } from '../opportunities'
import { FIT_WEIGHTS_POSITION } from '../fitScore'
import type { Landscape } from '../landscape'
import type { PositionalLandscape } from '../positionalLandscape'

const side = (k: string, pos: string, value: number, eligible = [pos]) =>
  ({ playerKey: k, name: k, pos, value, eligible })

const catLandscape: Landscape = new Map([
  ['me', new Map([['R', { rank: 9, surplus: 0, need: 0.8 }], ['SV', { rank: 1, surplus: 1, need: 0 }]])],
  ['them', new Map([['R', { rank: 1, surplus: 1, need: 0 }], ['SV', { rank: 9, surplus: 0, need: 0.8 }]])],
])
const posLandscape: PositionalLandscape = new Map([
  ['me', new Map([['3B', { slots: 1, startableCount: 0, depthRank: 0, surplus: 0, surplusBodies: 0, need: 0.5 }]])],
  ['them', new Map()],
])

const ctx = (over: Partial<OppContext> = {}): OppContext => ({
  myKey: 'me',
  statIds: ['R', 'SV'],
  strengthByKey: new Map([['stud', { R: 2 }], ['mine', { SV: 1 }]]),
  valueByKey: new Map([['stud', 80], ['mine', 70]]),
  catLandscape,
  posLandscape,
  myThin: ['3B'],
  weights: FIT_WEIGHTS_POSITION,
  hurtThreshold: 0.15,
  labelOf: (s) => s,
  ...over,
})

describe('buildOpportunities', () => {
  it('dedupes the same deal from two generators into one with unioned intents', () => {
    const raws: RawDeal[] = [
      { partnerKey: 'them', partner: 'Them', get: [side('stud', '3B', 80)], give: [side('mine', 'OF', 70)], intents: ['winWin'] },
      { partnerKey: 'them', partner: 'Them', get: [side('stud', '3B', 80)], give: [side('mine', 'OF', 70)], intents: ['consolidate'] },
    ]
    const out = buildOpportunities(raws, ctx())
    expect(out).toHaveLength(1)
    expect(out[0].intents.slice().sort()).toEqual(['consolidate', 'winWin'])
  })

  it('surfaces fillsPos for you when a GET covers your thin slot', () => {
    const raws: RawDeal[] = [{ partnerKey: 'them', partner: 'Them', get: [side('stud', '3B', 80)], give: [side('mine', 'OF', 70)], intents: ['winWin'] }]
    const out = buildOpportunities(raws, ctx())
    expect(out[0].you.fillsPos).toBe('3B')
    expect(out[0].you.fillsCats).toContain('R') // get has R strength, you need R
  })

  it('thresholds hurts — a dead-value give does not register as a cost', () => {
    // you give 'mine' (SV strength) but you DON'T need SV (need 0) -> dead value, not a hurt.
    const raws: RawDeal[] = [{ partnerKey: 'them', partner: 'Them', get: [side('stud', '3B', 80)], give: [side('mine', 'OF', 70)], intents: ['winWin'] }]
    const out = buildOpportunities(raws, ctx())
    expect(out[0].you.hurtsCats).toEqual([])
  })
})
