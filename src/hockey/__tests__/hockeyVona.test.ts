import { describe, it, expect } from 'vitest'
import { buildHockeyVona } from '../hockeyVona'
import { priorFromAdp } from '@/draft/room/adpPrior'

/* A board where forwards are deep and goalies are not — the situation VONA exists to catch. */
function board() {
  const rows: any[] = []
  for (let i = 0; i < 40; i++) {
    rows.push({ playerKey: `f${i}`, name: `F${i}`, position: 'C',
      value: 200 - i * 2, projected: 200 - i * 2, adp: i * 2 + 1 })
  }
  for (let i = 0; i < 6; i++) {
    rows.push({ playerKey: `g${i}`, name: `G${i}`, position: 'G',
      value: 160 - i * 40, projected: 160 - i * 40, adp: i * 14 + 2 })
  }
  return rows.sort((a, b) => b.value - a.value)
}
const run = (over: any = {}) =>
  buildHockeyVona({ rows: board(), upcomingSlots: [1, 2, 3, 4, 5, 6, 7, 8], teams: 10, runs: 400, seed: 7, ...over })

describe('what waiting costs', () => {
  it('gives every player a survival probability', () => {
    const r = run()
    expect(Object.keys(r.survival).length).toBe(46)
    for (const p of Object.values(r.survival)) {
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
  })

  /* The whole point: the best forward has another forward right behind him, the best goalie
     has a cliff. Value alone ranks the forward first; VONA does not. */
  it('prices the scarce position above the deep one', () => {
    const r = run()
    expect(r.vona.g0).toBeGreaterThan(r.vona.f0)
  })

  it('leaves the ordinary forward worth little to rush', () => {
    const r = run()
    expect(r.vona.f0).toBeLessThan(20)
  })

  /* A player the market takes early should be unlikely to last eight more picks; one it has
     no interest in should almost always be there. */
  it('has the early names survive less often than the late ones', () => {
    const r = run()
    expect(r.survival.f0).toBeLessThan(r.survival.f30)
  })

  /* Deterministic by seed: a recommendation that flickers between renders is worse than no
     recommendation. */
  it('returns the same answer twice', () => {
    expect(run().vona).toEqual(run().vona)
  })

  it('moves when the seed moves, so the seed is really doing something', () => {
    expect(run({ seed: 99 }).survival).not.toEqual(run({ seed: 1 }).survival)
  })

  /*
   * EMPTY RATHER THAN APPROXIMATE. A VONA computed without a simulation behind it is a number
   * with no meaning, and it would sit in the same column as one that has meaning.
   */
  it('answers nothing when there are no picks before yours', () => {
    expect(run({ upcomingSlots: [] }).picksSimulated).toBe(0)
    expect(run({ upcomingSlots: [] }).vona).toEqual({})
  })

  it('answers nothing when the market priced nobody', () => {
    const unpriced = board().map((r) => ({ ...r, adp: null }))
    expect(buildHockeyVona({ rows: unpriced, upcomingSlots: [1, 2], teams: 10 }).vona).toEqual({})
  })
})

describe('the prior, when there is no draft history', () => {
  /*
   * A flat spread over C, LW, RW, D and G has a simulated drafter taking a goalie one pick in
   * five. A real one takes two goalies in twenty-two rounds. The mix of the next names by ADP
   * is a MEASUREMENT of what the room is about to do, not an assumption about it.
   */
  it('reads the mix off the next names by ADP', () => {
    const p = priorFromAdp([
      { position: 'C', adp: 1 }, { position: 'C', adp: 2 },
      { position: 'D', adp: 3 }, { position: 'G', adp: 40 },
    ], 3)
    expect(p.byPosition.C).toBeCloseTo(2 / 3, 6)
    expect(p.byPosition.D).toBeCloseTo(1 / 3, 6)
    expect(p.byPosition.G).toBeUndefined()   // outside the window: not about to be taken
    expect(p.sample).toBe(3)
  })

  it('ignores players the market never priced', () => {
    const p = priorFromAdp([{ position: 'C', adp: 1 }, { position: 'G', adp: null }], 10)
    expect(p.counts).toEqual({ C: 1 })
  })

  /* An empty prior rather than a flat one: "no opinion" is the honest answer, and a flat
     spread is the invention this module exists to avoid. */
  it('returns nothing rather than a flat guess when nothing is priced', () => {
    const p = priorFromAdp([{ position: 'C', adp: null }], 5)
    expect(p.byPosition).toEqual({})
    expect(p.sample).toBe(0)
  })
})
