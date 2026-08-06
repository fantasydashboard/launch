import { describe, it, expect } from 'vitest'
import { adpVariantFor, adpByKey } from '../adp'

describe('adpVariantFor', () => {
  it('reads PPR from scoring settings', () => {
    expect(adpVariantFor({ rec: 1 }, { QB: 1, RB: 2 })).toBe('ppr')
  })

  it('reads half-PPR', () => {
    expect(adpVariantFor({ rec: 0.5 }, { QB: 1 })).toBe('half_ppr')
  })

  it('falls back to standard when receptions score nothing', () => {
    expect(adpVariantFor({ rec: 0 }, { QB: 1 })).toBe('std')
    expect(adpVariantFor({}, { QB: 1 })).toBe('std')
  })

  it('a SUPER_FLEX slot means a two-QB market regardless of reception scoring', () => {
    expect(adpVariantFor({ rec: 1 }, { QB: 1, SUPER_FLEX: 1 })).toBe('2qb')
    expect(adpVariantFor({ rec: 0 }, { SUPER_FLEX: 1 })).toBe('2qb')
  })

  it('dynasty leagues use the dynasty family', () => {
    expect(adpVariantFor({ rec: 1 }, { QB: 1 }, 2)).toBe('dynasty_ppr')
    expect(adpVariantFor({ rec: 0.5 }, { QB: 1 }, 2)).toBe('dynasty_half_ppr')
    expect(adpVariantFor({}, { QB: 1 }, 2)).toBe('dynasty_std')
    expect(adpVariantFor({ rec: 1 }, { SUPER_FLEX: 1 }, 2)).toBe('dynasty_2qb')
  })

  it('redraft and keeper league types are not dynasty', () => {
    expect(adpVariantFor({ rec: 1 }, { QB: 1 }, 0)).toBe('ppr')
    expect(adpVariantFor({ rec: 1 }, { QB: 1 }, 1)).toBe('ppr')
  })
})

describe('adpByKey', () => {
  // Sleeper's projections payload is an ARRAY of records, each with player_id + stats.
  const raw = [
    { player_id: '111', stats: { adp_ppr: 1.6, adp_std: 2.1 } },
    { player_id: '222', stats: { adp_ppr: 12.4, adp_std: 9.8 } },
    { player_id: '333', stats: { adp_std: 40.2 } }, // no ppr value
    { player_id: '444', stats: {} },
    { player_id: '555' },
  ]

  it('maps player_id to the requested variant', () => {
    expect(adpByKey(raw, 'ppr')).toEqual({ '111': 1.6, '222': 12.4 })
  })

  it('reads a different variant independently', () => {
    expect(adpByKey(raw, 'std')).toEqual({ '111': 2.1, '222': 9.8, '333': 40.2 })
  })

  it('skips non-finite values rather than emitting NaN', () => {
    const dirty = [
      { player_id: 'a', stats: { adp_ppr: Number.NaN } },
      { player_id: 'b', stats: { adp_ppr: 'x' as unknown as number } },
      { player_id: 'c', stats: { adp_ppr: 5 } },
    ]
    expect(adpByKey(dirty, 'ppr')).toEqual({ c: 5 })
  })

  it('tolerates null and empty input', () => {
    expect(adpByKey(null as any, 'ppr')).toEqual({})
    expect(adpByKey([], 'ppr')).toEqual({})
  })
})

describe('adpByKey — cached map shape', () => {
  // sleeperService.getSeasonProjections returns playerId -> stats, and copies the
  // stats object wholesale, so adp_* fields survive into the cache.
  const map = {
    '111': { adp_ppr: 1.6, pts_ppr: 320 },
    '222': { adp_ppr: 12.4 },
    '333': { pts_ppr: 100 },
  }

  it('reads the map shape the service caches', () => {
    expect(adpByKey(map, 'ppr')).toEqual({ '111': 1.6, '222': 12.4 })
  })

  it('returns empty for a variant nothing carries', () => {
    expect(adpByKey(map, 'dynasty_2qb')).toEqual({})
  })
})
