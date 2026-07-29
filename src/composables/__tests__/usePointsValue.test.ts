import { describe, it, expect } from 'vitest'
import { poolToProjPlayers, footballNamePosIndex } from '@/composables/usePointsValue'
import type { FootballProjection } from '@/football/buildFootballProjections'

describe('poolToProjPlayers', () => {
  it('maps pool → ProjPlayer {key,name,position}', () => {
    const out = poolToProjPlayers([
      { playerKey: 'k1', name: 'Josh Allen', position: 'QB', teamKey: 't' } as any,
    ])
    expect(out).toEqual([{ key: 'k1', name: 'Josh Allen', position: 'QB' }])
  })
})

describe('footballNamePosIndex', () => {
  it('indexes projections by normalized name+position for FA lookup', () => {
    const projByKey: Record<string, FootballProjection> = { k1: { stats: {}, points: 100 } }
    const pool = [{ playerKey: 'k1', name: 'Bijan Robinson', position: 'RB', teamKey: 't' } as any]
    const idx = footballNamePosIndex(projByKey, pool)
    expect(idx.get('bijan robinson|RB')?.points).toBe(100)
  })
})
