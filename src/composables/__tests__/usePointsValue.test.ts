import { describe, it, expect } from 'vitest'
import { poolToProjPlayers, footballNamePosIndex, bridgePoolValues } from '@/composables/usePointsValue'
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

describe('bridgePoolValues', () => {
  /*
   * TWO ID SPACES MEETING, WHICH IS THIS CODEBASE'S RECURRING BUG.
   *
   * The hockey projections are keyed by ESPN player id. A Yahoo roster arrives with Yahoo
   * player keys. Every consumer that did `valueByKey[player.playerKey]` therefore missed for
   * every rostered player in every Yahoo league — and the miss is not an error, it is a zero.
   *
   * On the Trades page that produced a full board of 0s: every player worth nothing, every
   * bar full, everyone "1st" at his position, and the page concluding "no swap right now
   * raises both lineups" — a confident finding computed from no data. The Today board had the
   * same seam and grew `valueFor` to bridge it; this is that rule, once, for every caller.
   */
  const val = (total: number) => ({ total, games: 1 }) as any

  it('uses the direct key when the id spaces agree, as they do on ESPN', () => {
    const out = bridgePoolValues(
      [{ playerKey: '3124', name: 'Evgeni Malkin' } as any],
      { '3124': val(200) },
      () => null,
    )
    expect(out['3124'].total).toBe(200)
  })

  it('falls back to the name when the key misses, which is every Yahoo player', () => {
    const out = bridgePoolValues(
      [{ playerKey: '453.p.3737', name: 'Evgeni Malkin' } as any],
      { '3124': val(200) },
      (p) => (p.name === 'Evgeni Malkin' ? val(200) : null),
    )
    /* Keyed by the POOL's key, because that is what every consumer looks up by. */
    expect(out['453.p.3737'].total).toBe(200)
  })

  it('omits a player it cannot price rather than pricing him at zero', () => {
    const out = bridgePoolValues(
      [{ playerKey: 'y1', name: 'Nobody At All' } as any], {}, () => null,
    )
    expect(out.y1).toBeUndefined()
    expect(Object.keys(out)).toHaveLength(0)
  })

  it('carries nothing for players outside the pool', () => {
    const out = bridgePoolValues([], { '3124': val(200) }, () => null)
    expect(Object.keys(out)).toHaveLength(0)
  })

  it('passes position and team through, which is how two Elias Petterssons stay apart', () => {
    const seen: any[] = []
    bridgePoolValues(
      [{ playerKey: 'y1', name: 'Elias Pettersson', position: 'D', team: 'VAN' } as any],
      {}, (p) => { seen.push(p); return null },
    )
    expect(seen[0]).toEqual({ name: 'Elias Pettersson', position: 'D', team: 'VAN' })
  })
})
