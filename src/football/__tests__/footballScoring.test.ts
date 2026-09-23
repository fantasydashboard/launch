import { describe, it, expect } from 'vitest'
import { sleeperFootballWeights, resolveFootballScoring } from '../footballScoring'
import { defaultWeights } from '@/myteam/pointsScoring'

describe('sleeperFootballWeights', () => {
  /* Sleeper's scoring keys ARE our stat keys — necessarily, since the projections we score
     come from Sleeper keyed that way. So this is a pass-through, and the test's job is to
     prove it stays one. */
  it('passes Sleeper settings straight through', () => {
    const w = sleeperFootballWeights({ rec: 0.5, pass_td: 4, rush_yd: 0.1 })
    expect(w).toEqual({ rec: 0.5, pass_td: 4, rush_yd: 0.1 })
  })

  /* A league that scores nothing for receptions is the whole reason this exists: standard
     scoring. Zero is a REAL weight and must survive — dropping falsy values would silently
     restore the PPR default underneath it. */
  it('keeps an explicit zero, which is what standard scoring is', () => {
    const w = sleeperFootballWeights({ rec: 0, pass_td: 4 })
    expect(w).toEqual({ rec: 0, pass_td: 4 })
  })

  it('drops non-numeric values rather than scoring with them', () => {
    const w = sleeperFootballWeights({ rec: 1, junk: 'x', other: null })
    expect(w).toEqual({ rec: 1 })
  })

  it('returns null for a blob with nothing usable in it', () => {
    expect(sleeperFootballWeights({})).toBeNull()
    expect(sleeperFootballWeights(null)).toBeNull()
    expect(sleeperFootballWeights('nope')).toBeNull()
  })
})

describe('resolveFootballScoring', () => {
  it('reads a Sleeper league from its own settings', () => {
    const r = resolveFootballScoring({
      platform: 'sleeper',
      sleeperScoringSettings: { rec: 0.5, pass_td: 4, rush_yd: 0.1 },
    })
    expect(r.source).toBe('sleeper')
    expect(r.weights.rec).toBe(0.5)
  })

  it('reads an ESPN league through the ESPN normaliser', () => {
    // statIds 3, 4, 5, 7 — chosen because they ARE present in ESPN_POINTS_STAT
    // (src/myteam/pointsScoring.ts), unlike the brief's original 3/4/24/42 (24 and 42
    // aren't in that map at all). The point being proven is "four real mappings resolve
    // to at least three weights," not that these particular ids mean anything football-y —
    // normalizeEspnWeights is the shared, baseball-keyed normaliser this task was told to
    // reuse as-is.
    const r = resolveFootballScoring({
      platform: 'espn',
      espnScoringItems: [
        { statId: 3, points: 0.04 },
        { statId: 4, points: 4 },
        { statId: 5, points: 0.1 },
        { statId: 7, points: 0.1 },
      ],
    })
    expect(r.source).toBe('espn')
    expect(Object.keys(r.weights).length).toBeGreaterThanOrEqual(3)
  })

  /*
   * The guard that matters. ESPN reports bare statIds on an inconsistent enumeration, so a
   * normalisation can come back nearly empty — and a nearly-empty weight map scores almost
   * every stat at zero, which does not look like a failure. It looks like a league where
   * nobody scores points.
   */
  it('falls back to football defaults when a platform yields too little', () => {
    const r = resolveFootballScoring({ platform: 'espn', espnScoringItems: [{ statId: 3, points: 0.04 }] })
    expect(r.source).toBe('default')
    expect(r.weights).toEqual(defaultWeights('football'))
  })

  /* FOOTBALL defaults, not baseball. useLeagueScoring's fallback calls defaultWeights() with
     no argument, which returns BASEBALL weights — so a football league falling through scored
     touchdowns with a home-run table. */
  it('falls back to FOOTBALL defaults, never baseball', () => {
    const r = resolveFootballScoring({ platform: 'sleeper', sleeperScoringSettings: {} })
    expect(r.source).toBe('default')
    expect(r.weights).toEqual(defaultWeights('football'))
    expect(r.weights.pass_td).toBe(4)
    expect(r.weights).not.toHaveProperty('HR')
  })

  it('falls back for an unknown platform', () => {
    expect(resolveFootballScoring({ platform: 'fantrax' }).source).toBe('default')
    expect(resolveFootballScoring({}).source).toBe('default')
  })
})
