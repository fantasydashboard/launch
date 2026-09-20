import { describe, it, expect } from 'vitest'
import { buildCategoryLedger, positionQuota, columnsWon } from '../categoryLedger'
import type { HockeyProjection } from '../hockeyValue'
import type { HockeyCategory } from '../hockeyCategoryValue'

const CATS: HockeyCategory[] = [
  { key: 'G', statId: 13, reverse: false },
  { key: 'HITS', statId: 31, reverse: false },
  { key: 'GAA', statId: 10, reverse: true },
]

/** A pool deep enough that replacement level is drawn from real bodies, not from one outlier. */
function pool(): Record<string, HockeyProjection> {
  const out: Record<string, HockeyProjection> = {}
  const add = (key: string, position: string, stats: Record<string, number>) => {
    out[key] = { playerKey: key, position, stats } as HockeyProjection
  }
  /* Skaters, descending. TOI is carried because GAA is volume-weighted over it. */
  for (let i = 0; i < 40; i++) {
    add(`c${i}`, 'C', { G: 40 - i, HITS: 60 + i })
    add(`d${i}`, 'D', { G: 12 - i / 4, HITS: 150 + i })
  }
  for (let i = 0; i < 12; i++) {
    add(`g${i}`, 'G', { GAA: 2.2 + i * 0.12, TOI: 180000 - i * 6000 })
  }
  return out
}

const SLOTS = { C: 2, D: 2, G: 1 }

describe('the category ledger', () => {
  it('ranks me in every column the league is decided in', () => {
    const l = buildCategoryLedger({
      projections: pool(), categories: CATS, myTeamId: 'me', rosterSize: 5, slots: SLOTS,
      picksByTeam: { me: ['c0'], a: ['c5'], b: ['c9'] },
    })
    expect(l.map((c) => c.key)).toEqual(['G', 'HITS', 'GAA'])
    for (const c of l) {
      expect(c.rank).toBeGreaterThanOrEqual(1)
      expect(c.rank).toBeLessThanOrEqual(3)
      expect(c.of).toBe(3)
    }
  })

  /*
   * THE WHOLE TRICK. In round one a team owns one player, and comparing one-player totals is
   * not a standing — it reports who drafted the higher-volume winger. Every roster is topped
   * up to full with replacement bodies so the figure means "where this ends up if nobody
   * improves", which is the only baseline a drafter can act against.
   */
  it('projects a FINISHED roster, so one pick already produces a real standing', () => {
    const one = buildCategoryLedger({
      projections: pool(), categories: CATS, myTeamId: 'me', rosterSize: 5, slots: SLOTS,
      picksByTeam: { me: ['c0'], a: ['c30'], b: ['c31'] },
    })
    const goals = one.find((c) => c.key === 'G')!
    /* My one elite centre is not the whole total — the other four seats are filled too. */
    expect(goals.mine).toBeGreaterThan(40)
    expect(goals.rank).toBe(1)
  })

  it('wins a reverse column with the SMALLEST number', () => {
    const l = buildCategoryLedger({
      projections: pool(), categories: CATS, myTeamId: 'me', rosterSize: 5, slots: SLOTS,
      picksByTeam: { me: ['g0'], a: ['g8'], b: ['g11'] },   // g0 has the best (lowest) GAA
    })
    const gaa = l.find((c) => c.key === 'GAA')!
    expect(gaa.rank).toBe(1)
    expect(gaa.winPct).toBe(1)
  })

  /*
   * A team's save percentage is its saves over its shots, not the mean of its goalies' rates.
   * Averaging hands the column to whoever rostered the smallest sample.
   */
  it('blends a rate column by volume rather than averaging it', () => {
    const p = pool()
    p.tiny = { playerKey: 'tiny', position: 'G', stats: { GAA: 1.0, TOI: 1200 } } as HockeyProjection
    p.bulk = { playerKey: 'bulk', position: 'G', stats: { GAA: 3.0, TOI: 300000 } } as HockeyProjection
    const l = buildCategoryLedger({
      projections: p, categories: CATS, myTeamId: 'me', rosterSize: 5, slots: { C: 2, D: 2, G: 2 },
      picksByTeam: { me: ['tiny', 'bulk'], a: ['g4', 'g5'], b: ['g6', 'g7'] },
    })
    const gaa = l.find((c) => c.key === 'GAA')!
    /* A straight average would be 2.0 and would look excellent. Weighted by minutes it sits
       close to the bulk goalie, which is what the team actually gives up. */
    expect(gaa.mine).toBeGreaterThan(2.8)
  })

  /* ABSENT IS NOT ZERO: a skater has no GAA and must not be entered at 0.00, which would
     read as the best goaltending in the league. */
  it('leaves a player out of a column he has no projection for', () => {
    const l = buildCategoryLedger({
      projections: pool(), categories: CATS, myTeamId: 'me', rosterSize: 5, slots: SLOTS,
      picksByTeam: { me: ['c0', 'c1'], a: ['g0'], b: ['g1'] },
    })
    const gaa = l.find((c) => c.key === 'GAA')!
    expect(gaa.mine).toBeGreaterThan(0)
  })

  it('reports a punted column as punted rather than as a loss', () => {
    const l = buildCategoryLedger({
      projections: pool(), categories: CATS, myTeamId: 'me', rosterSize: 5, slots: SLOTS,
      picksByTeam: { me: ['c39'], a: ['c0'], b: ['c1'] },
      punted: new Set(['HITS']),
    })
    expect(l.find((c) => c.key === 'HITS')!.status).toBe('punted')
  })

  it('counts the columns projecting to a win', () => {
    const l = buildCategoryLedger({
      projections: pool(), categories: CATS, myTeamId: 'me', rosterSize: 5, slots: SLOTS,
      picksByTeam: { me: ['c0', 'd0', 'g0'], a: ['c38'], b: ['c39'] },
    })
    expect(columnsWon(l)).toBeGreaterThan(0)
  })

  it('survives a league with no categories and no teams', () => {
    expect(buildCategoryLedger({
      projections: {}, categories: [], myTeamId: 'me', rosterSize: 5, slots: SLOTS,
      picksByTeam: {},
    })).toEqual([])
  })
})

describe('positionQuota', () => {
  it('counts the named starting slots', () => {
    const q = positionQuota({ C: 2, LW: 2, RW: 2, D: 4, G: 2 }, 12)
    expect(q.C).toBe(2)
    expect(q.D).toBe(4)
    expect(q.G).toBe(2)
  })

  /*
   * Bench and utility seats go to SKATERS. Handing them to goalies would invent goaltending
   * nobody rosters and flatten every team's rate columns into each other.
   */
  it('gives the spare seats to skaters, never to goalies', () => {
    const q = positionQuota({ C: 2, LW: 2, RW: 2, D: 4, G: 2 }, 17)
    expect(q.G).toBe(2)
    expect(q.C + q.LW + q.RW + q.D).toBeCloseTo(15)
  })

  it('ignores bench and IR rows in the template', () => {
    const q = positionQuota({ C: 2, D: 2, G: 1, BE: 4, IR: 2, UTIL: 1 }, 5)
    expect(q.G).toBe(1)
    expect(Object.keys(q).sort()).toEqual(['C', 'D', 'G'])
  })
})
