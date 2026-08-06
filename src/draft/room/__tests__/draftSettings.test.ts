import { describe, it, expect } from 'vitest'
import { slotsFromDraftSettings, scoringFromDraftMetadata } from '../draftSettings'

describe('slotsFromDraftSettings', () => {
  it('maps Sleeper slot fields to engine positions', () => {
    const s = slotsFromDraftSettings({
      slots_qb: 1, slots_rb: 2, slots_wr: 2, slots_te: 1,
      slots_flex: 1, slots_k: 1, slots_def: 1, slots_bn: 6,
    })
    expect(s).toEqual({ QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1, BN: 6 })
  })

  it('recognises superflex', () => {
    const s = slotsFromDraftSettings({ slots_qb: 1, slots_super_flex: 1 })
    expect(s!.SUPER_FLEX).toBe(1)
  })

  it('folds the several flex spellings into one FLEX count', () => {
    const s = slotsFromDraftSettings({ slots_flex: 1, slots_wr_rb: 1, slots_rec_flex: 1 })
    expect(s!.FLEX).toBe(3)
  })

  it('ignores zero and non-numeric fields', () => {
    const s = slotsFromDraftSettings({ slots_qb: 1, slots_rb: 0, slots_te: 'x', rounds: 15 })
    expect(s).toEqual({ QB: 1 })
  })

  it('returns null when there is nothing usable, so the caller can fall back', () => {
    expect(slotsFromDraftSettings({ rounds: 15, teams: 12 })).toBeNull()
    expect(slotsFromDraftSettings({})).toBeNull()
    expect(slotsFromDraftSettings(null)).toBeNull()
  })
})

describe('scoringFromDraftMetadata', () => {
  it('reads the three common scoring types', () => {
    expect(scoringFromDraftMetadata({ scoring_type: 'ppr' })).toEqual({ rec: 1 })
    expect(scoringFromDraftMetadata({ scoring_type: 'half_ppr' })).toEqual({ rec: 0.5 })
    expect(scoringFromDraftMetadata({ scoring_type: 'std' })).toEqual({ rec: 0 })
  })

  it('half wins over ppr when both appear in the string', () => {
    expect(scoringFromDraftMetadata({ scoring_type: 'HALF_PPR' })).toEqual({ rec: 0.5 })
  })

  it('returns null for missing or unrecognised scoring so the league value stands', () => {
    expect(scoringFromDraftMetadata({})).toBeNull()
    expect(scoringFromDraftMetadata(null)).toBeNull()
    expect(scoringFromDraftMetadata({ scoring_type: 'dynasty_weirdness' })).toBeNull()
  })
})
