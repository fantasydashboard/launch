import { describe, it, expect } from 'vitest'
import { isGiveable } from '../giveable'

// You're hitting-rich (surplus H, SB, OPS) and pitching-poor (holes ERA, IP, OBA).
const surplus = ['H', 'SB', 'OPS']
const holes = ['ERA', 'IP', 'OBA']

describe('isGiveable', () => {
  it('protects an ace whose value is in your hole categories', () => {
    // Chris Sale: strong pitching (your holes), nothing in your hitting surplus.
    const ace = { ERA: 2.4, IP: 2.0, OBA: 1.8, H: 0, SB: 0, OPS: 0 }
    expect(isGiveable(ace, surplus, holes)).toBe(false)
  })

  it('lets you deal a surplus hitter (value sits in categories you dominate)', () => {
    const hitter = { H: 2.1, SB: 1.6, OPS: 1.4, ERA: 0, IP: 0, OBA: 0 }
    expect(isGiveable(hitter, surplus, holes)).toBe(true)
  })

  it('treats a contribute-nothing depth player as giveable', () => {
    expect(isGiveable({ H: 0.1, ERA: 0.1 }, surplus, holes)).toBe(true) // 0.1 >= 0.1
  })

  it('ignores negative (weak) contributions, weighing only positive strength', () => {
    // Weak in a hole (negative z) shouldn't make a surplus hitter un-giveable.
    const hitter = { H: 1.5, OPS: 1.0, ERA: -2.0 }
    expect(isGiveable(hitter, surplus, holes)).toBe(true)
  })
})
