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

  /*
   * Both shared normalisers are baseball-keyed and there is no football statId map, so a
   * football league on these platforms cannot be read at all. It must say so rather than
   * returning baseball weights under a label claiming they are the league's.
   */
  it('reports ESPN football as unread rather than guessing', () => {
    const r = resolveFootballScoring({
      platform: 'espn',
      espnScoringItems: [
        { statId: 3, points: 0.04 }, { statId: 4, points: 4 },
        { statId: 5, points: 0.1 }, { statId: 7, points: 6 },
      ],
    })
    expect(r.source).toBe('default')
    expect(r.weights).toEqual(defaultWeights('football'))
    /* The tell: nothing from the baseball map survived into a football weight map. */
    expect(r.weights).not.toHaveProperty('HR')
    expect(r.weights).not.toHaveProperty('2B')
  })

  /*
   * Three mapped categories, deliberately. With fewer, `weightsAreUsable` rejects the map on
   * count alone and the test would pass against the old implementation too — proving nothing.
   * Three is enough to clear that guard, so the only thing that can still produce `default`
   * here is the platform being refused outright, which is the behaviour under test.
   */
  it('reports Yahoo football as unread rather than guessing', () => {
    const r = resolveFootballScoring({
      platform: 'yahoo',
      yahooStatCategories: [
        { stat: { stat_id: 12, display_name: 'HR', position_type: 'B' } },
        { stat: { stat_id: 13, display_name: 'RBI', position_type: 'B' } },
        { stat: { stat_id: 7, display_name: 'R', position_type: 'B' } },
      ],
      yahooStatModifiers: { '12': 4, '13': 1, '7': 1 },
    })
    expect(r.source).toBe('default')
    expect(r.weights).toEqual(defaultWeights('football'))
    /* The tell: nothing from the baseball map survived into a football weight map. */
    expect(r.weights).not.toHaveProperty('HR')
    expect(r.weights).not.toHaveProperty('RBI')
  })

  /* Non-null but too thin to trust. The point is that it degrades to a LABELLED default rather
     than calling two stats a league's scoring — a board built from two weights would be
     confidently wrong, which is the failure this whole resolver exists to make visible. */
  it('reports a too-thin Sleeper blob as unread rather than trusting it', () => {
    const r = resolveFootballScoring({ platform: 'sleeper', sleeperScoringSettings: { rec: 1 } })
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
