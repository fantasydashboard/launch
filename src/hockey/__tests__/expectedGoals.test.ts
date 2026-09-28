import { describe, it, expect } from 'vitest'
import { blendExpectedGoals, XG_WEIGHT } from '../expectedGoals'

const row = (over: Partial<any> = {}) => ({
  playerId: 1, gamesPlayed: 80, goals: 40, assists: 30, points: 70, ...over,
})

describe('blendExpectedGoals', () => {
  it('moves a lucky finisher toward his expected goals', () => {
    const out = blendExpectedGoals([row()], new Map([[1, { xGoals: 30, gamesPlayed: 80 }]]), 0.5)
    expect(out[0].goals).toBe(35)
  })

  it('moves an unlucky finisher up by the same rule', () => {
    const out = blendExpectedGoals([row({ goals: 20 })], new Map([[1, { xGoals: 30, gamesPlayed: 80 }]]), 0.5)
    expect(out[0].goals).toBe(25)
  })

  it('carries the change into points, because a goal is a point', () => {
    const out = blendExpectedGoals([row()], new Map([[1, { xGoals: 30, gamesPlayed: 80 }]]), 0.5)
    expect(out[0].points).toBe(65)
    expect(out[0].assists).toBe(30)
  })

  it('leaves a player MoneyPuck does not have alone', () => {
    const out = blendExpectedGoals([row()], new Map(), 0.5)
    expect(out[0].goals).toBe(40)
    expect(out[0].points).toBe(70)
  })

  it('is the identity at weight zero', () => {
    const out = blendExpectedGoals([row()], new Map([[1, { xGoals: 10, gamesPlayed: 80 }]]), 0)
    expect(out[0].goals).toBe(40)
  })

  /*
   * The two feeds count games independently, and a mismatch is the difference between a total
   * and a rate. Taking MoneyPuck's total against the NHL's games would credit a man who
   * appeared in 40 games on one feed with the expected goals of 80 on the other.
   */
  it('scales expected goals to the games the row actually reports', () => {
    const out = blendExpectedGoals([row({ gamesPlayed: 80 })], new Map([[1, { xGoals: 20, gamesPlayed: 40 }]]), 1)
    expect(out[0].goals).toBe(40)
  })

  it('ignores a MoneyPuck row with no games rather than dividing by zero', () => {
    const out = blendExpectedGoals([row()], new Map([[1, { xGoals: 30, gamesPlayed: 0 }]]), 0.5)
    expect(out[0].goals).toBe(40)
  })

  it('leaves a row with no games alone', () => {
    const out = blendExpectedGoals([row({ gamesPlayed: 0, goals: 0, points: 0 })],
      new Map([[1, { xGoals: 30, gamesPlayed: 80 }]]), 0.5)
    expect(out[0].goals).toBe(0)
  })

  it('returns new objects, never mutating a shared season row', () => {
    const rows = [row()]
    blendExpectedGoals(rows, new Map([[1, { xGoals: 30, gamesPlayed: 80 }]]), 0.5)
    expect(rows[0].goals).toBe(40)
  })

  it('never invents a negative goal total', () => {
    const out = blendExpectedGoals([row({ goals: 0, points: 30 })],
      new Map([[1, { xGoals: -5, gamesPlayed: 80 }]]), 1)
    expect(out[0].goals).toBe(0)
  })

  /*
   * The shipped weight is zero, and this test is here so that nobody raises it without reading
   * why. Measured through the real pipeline the blend is worth +0.001; the layers we already
   * ship remove the same noise. See the file header, and re-run scripts/hockey-xg-sweep.ts
   * before touching it.
   */
  it('is switched off, because it was measured and did not help', () => {
    expect(XG_WEIGHT).toBe(0)
  })

  /* Called with no weight it must change nothing at all — this is what makes the module safe to
     keep in the tree while wired to nothing. */
  it('does nothing when called at the shipped default', () => {
    const rows = [row()]
    const out = blendExpectedGoals(rows, new Map([[1, { xGoals: 10, gamesPlayed: 80 }]]))
    expect(out).toBe(rows)
  })
})
