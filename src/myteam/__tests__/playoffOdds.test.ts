import { describe, it, expect } from 'vitest'
import { playoffOdds, oddsShift, pct, WEEKLY_SD } from '../playoffOdds'

const team = (k: string, wins: number, mean: number) =>
  ({ teamKey: k, wins, losses: 0, ties: 0, weeklyMean: mean })

/* Ten teams, six spots — the ordinary football league. Means spread the way a real one does. */
const league = Array.from({ length: 10 }, (_, i) => team(`t${i}`, 3, 130 - i * 4))
const base = { teams: league, weeksLeft: 9, playoffSpots: 6, sims: 3000 }

describe('playoffOdds', () => {
  it('gives every team odds between nothing and certainty', () => {
    const o = playoffOdds(base)
    expect(Object.keys(o)).toHaveLength(10)
    for (const v of Object.values(o)) expect(v).toBeGreaterThanOrEqual(0)
    for (const v of Object.values(o)) expect(v).toBeLessThanOrEqual(1)
  })

  it('sums to the number of spots, because that many teams make it every run', () => {
    const total = Object.values(playoffOdds(base)).reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(6, 1)
  })

  it('ranks a stronger roster above a weaker one', () => {
    const o = playoffOdds(base)
    expect(o.t0).toBeGreaterThan(o.t9)
  })

  it('lets a good record carry a weak roster, which a power ranking cannot', () => {
    /*
     * The reason this file exists. The best roster at 1-6 and a middling one at 6-1 are
     * opposite decisions, and a verdict about strength alone calls them the same way round.
     */
    const teams = [
      team('strongButBuried', 1, 140),
      team('weakButAhead', 6, 110),
      ...Array.from({ length: 8 }, (_, i) => team(`t${i}`, 3, 120)),
    ]
    const o = playoffOdds({ teams, weeksLeft: 6, playoffSpots: 4, sims: 3000 })
    expect(o.weakButAhead).toBeGreaterThan(o.strongButBuried)
  })

  it('is deterministic — odds that shuffle on every render read as instability', () => {
    expect(playoffOdds(base)).toEqual(playoffOdds(base))
  })

  it('stops simulating when the season is over and reports the table', () => {
    const teams = Array.from({ length: 6 }, (_, i) => team(`t${i}`, 10 - i, 120))
    const o = playoffOdds({ teams, weeksLeft: 0, playoffSpots: 3, sims: 500 })
    expect(o.t0).toBe(1)
    expect(o.t2).toBe(1)
    expect(o.t3).toBe(0)
    expect(o.t5).toBe(0)
  })

  it('hands nobody a phantom win in an odd-sized league', () => {
    // Nine teams means one sits out each week; it must not be handed half a win for that.
    const teams = Array.from({ length: 9 }, (_, i) => team(`t${i}`, 2, 120))
    const total = Object.values(playoffOdds({ teams, weeksLeft: 5, playoffSpots: 4, sims: 800 }))
      .reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(4, 1)
  })

  it('survives an empty league rather than dividing by nothing', () => {
    expect(playoffOdds({ teams: [], weeksLeft: 5, playoffSpots: 4 })).toEqual({})
  })
})

describe('oddsShift', () => {
  const stronger = league.map((t) => (t.teamKey === 't5' ? { ...t, weeklyMean: t.weeklyMean + 18 } : t))

  it('reports a real gain when the trade makes you better', () => {
    const s = oddsShift(base, stronger, 't5')
    expect(s.after).toBeGreaterThan(s.before)
  })

  it('reports NO change when the trade changes nothing', () => {
    /*
     * The failure this guards. Two independent runs of a few thousand sims differ by about a
     * point from noise alone — comparable to the effect being measured — so a shared seed is
     * what stops the panel announcing a shift on a deal that moved no player.
     */
    const s = oddsShift(base, league, 't5')
    expect(s.after).toBe(s.before)
  })

  it('gives a delta that survives the spread being wrong, which the level does not', () => {
    /*
     * WEEKLY_SD is a judgement, and this is the test that says how much it is allowed to
     * matter. Move it 20% either way: the absolute odds move, and the trade's delta barely
     * does — which is why the panel shows the change and why the change is the product.
     */
    const at = (sd: number) => {
      const s = oddsShift({ ...base, weeklySd: sd }, stronger, 't5')
      return s.after - s.before
    }
    expect(Math.abs(at(WEEKLY_SD * 1.2) - at(WEEKLY_SD * 0.8))).toBeLessThan(0.05)
  })

  it('but the spread is not inert — it moves the LEVEL for a team with something to lose', () => {
    /*
     * Measured rather than assumed, after an earlier version of this test asserted the level
     * was sensitive at mid-table and found it moves barely half a point there. Variance costs
     * the teams with a cushion and pays the ones chasing, so the top of the table is where it
     * shows: widen the weekly spread and the best roster's seat gets less safe.
     */
    const top = (sd: number) => playoffOdds({ ...base, weeklySd: sd }).t0
    expect(top(WEEKLY_SD * 0.6)).toBeGreaterThan(top(WEEKLY_SD * 1.6))
  })
})

describe('pct', () => {
  it('rounds to whole points, because the tenth is not ours to give', () => {
    expect(pct(0.9612)).toBe(96)
    expect(pct(0.9649)).toBe(96)
    expect(pct(0)).toBe(0)
    expect(pct(1)).toBe(100)
  })
})
