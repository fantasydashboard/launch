import { describe, it, expect } from 'vitest'
import { normalizeMoves } from '../normalizeValue'
import type { ScoredPlay } from '../todayBoard'

function play(name: string, side: 'hit' | 'pit', value: number): ScoredPlay {
  return {
    kind: side === 'pit' ? 'stream' : 'add',
    playerKey: name,
    name,
    team: 'LAD',
    position: side === 'pit' ? 'SP' : 'OF',
    side,
    value,
    score: 0,
    bucket: 4,
    detail: '',
    oneDay: side === 'pit',
    helpsCats: [],
  }
}

describe('normalizeMoves', () => {
  it('maps each move to a 0-100 percentile within its OWN side, preserving order', () => {
    const out = normalizeMoves([
      play('ArmLow', 'pit', 5),
      play('ArmMid', 'pit', 10),
      play('ArmTop', 'pit', 20),
    ])
    const byKey = Object.fromEntries(out.map((p) => [p.playerKey, p.score]))
    expect(byKey.ArmLow).toBe(0)
    expect(byKey.ArmTop).toBe(100)
    expect(byKey.ArmMid).toBeGreaterThan(0)
    expect(byKey.ArmMid).toBeLessThan(100)
  })

  it('lets a top bat outrank a mid arm across types (the hero fix)', () => {
    const out = normalizeMoves([
      play('ArmTop', 'pit', 100),
      play('ArmMid', 'pit', 40),
      play('ArmLow', 'pit', 5),
      play('BatTop', 'hit', 3),
      play('BatLow', 'hit', 1),
    ])
    const byKey = Object.fromEntries(out.map((p) => [p.playerKey, p.score]))
    expect(byKey.BatTop).toBeGreaterThan(byKey.ArmMid) // top bat (100) beats mid arm (50)
  })

  it('single-element side pool → 100; ties share a percentile', () => {
    const out = normalizeMoves([
      play('OnlyArm', 'pit', 7),
      play('TieA', 'hit', 5),
      play('TieB', 'hit', 5),
      play('BatTop', 'hit', 9),
    ])
    const byKey = Object.fromEntries(out.map((p) => [p.playerKey, p.score]))
    expect(byKey.OnlyArm).toBe(100)
    expect(byKey.TieA).toBe(byKey.TieB)
  })
})
