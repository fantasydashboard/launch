import { describe, it, expect } from 'vitest'
import { buildOpportunities, type RawDeal, type OppContext } from '../opportunities'
import { FIT_WEIGHTS_POSITION } from '../fitScore'
import { aggregateTeamCatTotals } from '../standings'
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
  cats: [],
  teamCatTotals: [],
  projByKey: new Map(),
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

describe('buildOpportunities standings impact', () => {
  it('populates standings (ECW delta + ladder + partner read) and leads the headline with cats/week', () => {
    const cats = [
      { statId: 'HR', lowerIsBetter: false, side: 'hit' as const, isRatio: false },
      { statId: 'SB', lowerIsBetter: false, side: 'hit' as const, isRatio: false },
    ]
    const statsById = new Map<string, Record<string, number>>([
      ['mine', { HR: 5, SB: 25 }],     // my give: speed
      ['theirs', { HR: 30, SB: 2 }],   // their give: power
      ['x', { HR: 15, SB: 15 }],
    ])
    const projByKey = statsById
    const teamCatTotals = aggregateTeamCatTotals([
      { teamId: 'me', players: [{ playerKey: 'mine', stats: statsById.get('mine')! }] },
      { teamId: 'them', players: [{ playerKey: 'theirs', stats: statsById.get('theirs')! }] },
      { teamId: 'x', players: [{ playerKey: 'x', stats: statsById.get('x')! }] },
    ], cats)
    const teamByKey = new Map([['mine', 'me'], ['theirs', 'them'], ['x', 'x']])

    const raw = {
      partnerKey: 'them', partner: 'Them',
      get: [{ playerKey: 'theirs', name: 'Power Bat', pos: '1B', value: 80, eligible: ['1B'] }],
      give: [{ playerKey: 'mine', name: 'Speed Guy', pos: 'OF', value: 60, eligible: ['OF'] }],
      intents: ['winWin' as const],
    }
    const testCtx = ctx({
      myKey: 'me', statIds: ['HR', 'SB'],
      strengthByKey: new Map(), valueByKey: new Map(),
      catLandscape: new Map(), posLandscape: new Map(),
      myThin: [], weights: { pos: 0.25, cat: 0.5, val: 0.25 },
      hurtThreshold: 0.15, labelOf: (s: string) => s,
      cats, teamCatTotals, projByKey,
    })
    const [opp] = buildOpportunities([raw], testCtx as any)
    expect(opp.standings).toBeDefined()
    expect(opp.standings.ladder.map((m) => m.statId).sort()).toEqual(['HR', 'SB'])
    expect(['fair', 'reach', 'steal']).toContain(opp.standings.partnerRead)
    expect(opp.headline).toMatch(/cats\/week/)
    expect(opp.standings.ecwYouAfter).toBeCloseTo(1.0, 5)
    expect(opp.standings.deltaYou).toBeCloseTo(0.0, 5)
    expect(opp.standings.partnerRead).toBe('fair')
    // headline/meter/ladder all derive from one computation — pin that they agree.
    expect(opp.standings.ecwYouAfter).toBeCloseTo(opp.standings.ecwYouBefore + opp.standings.deltaYou, 5)
    const hr = opp.standings.ladder.find((m) => m.statId === 'HR')!
    const sb = opp.standings.ladder.find((m) => m.statId === 'SB')!
    expect(hr.beatsMore).toBe(2)  // HR 3rd -> 1st after getting the power bat
    expect(sb.beatsMore).toBe(-2) // SB 1st -> 3rd after giving the speed guy
  })
})
