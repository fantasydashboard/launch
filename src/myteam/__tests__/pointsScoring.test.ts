import { describe, it, expect } from 'vitest'
import { normalizeYahooWeights, normalizeEspnWeights, weightsAreUsable, defaultWeights } from '../pointsScoring'

describe('defaultWeights(sport)', () => {
  it('defaults to baseball (HR present, no pass_td)', () => {
    const w = defaultWeights()
    expect(w.HR).toBeDefined()
    expect(w.pass_td).toBeUndefined()
  })
  it('football returns football config defaults (pass_td present)', () => {
    const w = defaultWeights('football')
    expect(w.pass_td).toBe(4)
    expect(w.rec).toBe(1)
    expect(w.HR).toBeUndefined()
  })
})

describe('normalizeYahooWeights', () => {
  // Yahoo splits batting/pitching homonyms via position_type, not the name.
  const cats = [
    { stat: { stat_id: 7, display_name: 'H', position_type: 'B' } }, // batter hits
    { stat: { stat_id: 12, display_name: 'HR', position_type: 'B' } },
    { stat: { stat_id: 42, display_name: 'K', position_type: 'B' } }, // batter strikeouts
    { stat: { stat_id: 28, display_name: 'W', position_type: 'P' } },
    { stat: { stat_id: 50, display_name: 'K', position_type: 'P' } }, // pitcher strikeouts
    { stat: { stat_id: 26, display_name: 'H', position_type: 'P' } }, // hits allowed
  ]

  it('maps by (name, side), keeping the K/H homonyms on the correct side', () => {
    const mods = { '7': 1, '12': 4, '42': -1, '28': 5, '50': 1, '26': -1 }
    const w = normalizeYahooWeights(cats, mods)
    expect(w.H).toBe(1) // batter hits
    expect(w.HR).toBe(4)
    expect(w.SO).toBe(-1) // batter K → SO
    expect(w.W).toBe(5)
    expect(w.K).toBe(1) // pitcher K → K
    expect(w.H_P).toBe(-1) // hits allowed → H_P
  })

  it('drops zero-weight (unscored) modifiers', () => {
    const w = normalizeYahooWeights(cats, { '12': 4, '7': 0 })
    expect(w.HR).toBe(4)
    expect(w.H).toBeUndefined()
  })
})

describe('normalizeEspnWeights', () => {
  it('maps real ESPN statIds to unified keys (verified vs a live league)', () => {
    const items = [
      { statId: 5, points: 5 }, // HR
      { statId: 21, points: 1 }, // RBI
      { statId: 23, points: 1 }, // SB
      { statId: 48, points: 1 }, // pitcher K
      { statId: 45, points: -2 }, // ER
      { statId: 37, points: -1 }, // hits allowed → H_P
      { statId: 9999, points: 5 }, // unknown → dropped
    ]
    const w = normalizeEspnWeights(items)
    expect(w.HR).toBe(5)
    expect(w.RBI).toBe(1)
    expect(w.SB).toBe(1)
    expect(w.K).toBe(1)
    expect(w.ER).toBe(-2)
    expect(w.H_P).toBe(-1)
    expect(w.HR).not.toBe(undefined)
    expect(Object.keys(w)).toHaveLength(6)
  })

  it('folds ESPN OUTS (statId 34) into a 3×/IP weight', () => {
    // 1 pt/out = 3 pt/inning; FG carries innings, not outs.
    const w = normalizeEspnWeights([{ statId: 34, points: 1 }])
    expect(w.IP).toBe(3)
  })
})

describe('weightsAreUsable', () => {
  it('needs at least a few mapped weights', () => {
    expect(weightsAreUsable({ HR: 4, R: 1, RBI: 1 })).toBe(true)
    expect(weightsAreUsable({ HR: 4 })).toBe(false)
  })
})
