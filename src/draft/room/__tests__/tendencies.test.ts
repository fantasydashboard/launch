import { describe, it, expect } from 'vitest'
import { buildTendencies, priorFor, defaultRoundBucket, type HistoricalPick } from '../tendencies'

// Manager 'rb-guy' always takes RBs early; 'wr-guy' always WRs.
function picks(teamKey: string, position: string, n: number, round = 1): HistoricalPick[] {
  return Array.from({ length: n }, () => ({ teamKey, position, round }))
}

describe('defaultRoundBucket', () => {
  it('groups rounds so samples are not split too thin', () => {
    expect(defaultRoundBucket(1)).toBe('early')
    expect(defaultRoundBucket(3)).toBe('early')
    expect(defaultRoundBucket(4)).toBe('mid')
    expect(defaultRoundBucket(8)).toBe('mid')
    expect(defaultRoundBucket(9)).toBe('late')
    expect(defaultRoundBucket(15)).toBe('late')
  })
})

describe('buildTendencies', () => {
  it('builds a league prior across all managers', () => {
    const t = buildTendencies([...picks('a', 'RB', 3), ...picks('b', 'WR', 1)])
    const league = t.league.early
    expect(league.sample).toBe(4)
    expect(league.byPosition.RB).toBeCloseTo(0.75)
    expect(league.byPosition.WR).toBeCloseTo(0.25)
  })

  it('probabilities sum to 1', () => {
    const t = buildTendencies([...picks('a', 'RB', 2), ...picks('a', 'TE', 1)])
    const sum = Object.values(t.byManager.a.early.byPosition).reduce((s, v) => s + v, 0)
    expect(sum).toBeCloseTo(1)
  })

  it('excludes keeper picks — a kept star is not a draft decision', () => {
    const t = buildTendencies([
      ...picks('a', 'RB', 2),
      { teamKey: 'a', position: 'QB', round: 1, keeper: true },
    ])
    expect(t.byManager.a.early.sample).toBe(2)
    expect(t.byManager.a.early.byPosition.QB ?? 0).toBe(0)
  })
})

describe('priorFor — shrinkage toward the league', () => {
  // League: heavily WR. Manager 'rb-guy': all RB.
  const many = buildTendencies([...picks('rb-guy', 'RB', 20), ...picks('others', 'WR', 20)])

  it('a manager with a large sample leans on their own history', () => {
    const p = priorFor(many, 'rb-guy', 'early')
    expect(p.byPosition.RB).toBeGreaterThan(0.8)
    expect(p.sample).toBe(20)
  })

  it('a manager with one observation leans mostly on the league', () => {
    const thin = buildTendencies([...picks('newbie', 'RB', 1), ...picks('others', 'WR', 20)])
    const p = priorFor(thin, 'newbie', 'early')
    // k = 4, so w = 1/5 — mostly league (which is WR-dominant).
    expect(p.byPosition.WR).toBeGreaterThan(p.byPosition.RB)
    expect(p.sample).toBe(1)
  })

  it('an unknown manager gets the league prior with a zero sample', () => {
    const p = priorFor(many, 'nobody', 'early')
    expect(p.sample).toBe(0)
    expect(p.byPosition.WR).toBeCloseTo(many.league.early.byPosition.WR)
  })

  it('an empty history yields a usable uniform-ish prior rather than throwing', () => {
    const none = buildTendencies([])
    const p = priorFor(none, 'anyone', 'early')
    expect(p.sample).toBe(0)
    const sum = Object.values(p.byPosition).reduce((s, v) => s + v, 0)
    expect(sum).toBeCloseTo(1)
  })

  it('a bucket the manager has no picks in falls back to the league', () => {
    const p = priorFor(many, 'rb-guy', 'late')
    expect(p.sample).toBe(0)
  })
})
