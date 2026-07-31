import { describe, it, expect } from 'vitest'
import { computeReplacementLevels, type RepPlayer } from '../footballReplacement'

// Build N players at a position with descending points from `top` step `step`.
function pos(position: string, n: number, top: number, step: number): RepPlayer[] {
  return Array.from({ length: n }, (_, i) => ({ playerKey: `${position}${i}`, position, points: top - i * step }))
}

describe('computeReplacementLevels', () => {
  it('dedicated slots only: replacement = the (teams*slots)-th best, i.e. first off the list', () => {
    // 2 teams, 1 QB slot each → 2 QBs startable → replacement = the 3rd QB (index 2).
    const players = pos('QB', 5, 300, 10) // 300,290,280,270,260
    const levels = computeReplacementLevels(players, { QB: 1 }, 2)
    expect(levels.QB).toBe(280) // index 2
  })

  it('flex allocation deepens the flex-eligible positions', () => {
    // 1 team, RB:1, WR:1, FLEX:1. Base startable: RB 1, WR 1. One flex opening (RB/WR/TE).
    // RBs: 100,90,80 ; WRs: 95,50,40. Leftovers beyond base: RB 90,80 ; WR 50,40.
    // Best leftover = RB 90 → fills the flex as RB. startable RB=2, WR=1.
    // replacement RB = index 2 = 80 ; replacement WR = index 1 = 50.
    const players = [...pos('RB', 3, 100, 10), ...pos('WR', 3, 95, 45)]
    const levels = computeReplacementLevels(players, { RB: 1, WR: 1, FLEX: 1 }, 1)
    expect(levels.RB).toBe(80)
    expect(levels.WR).toBe(50)
  })

  it('SUPER_FLEX pulls QBs into the flex pool (deeper QB replacement)', () => {
    // 1 team, QB:1, RB:1, SUPER_FLEX:1 (QB/RB/WR/TE).
    // QBs: 400,380,360 ; RBs: 200,190. Leftovers: QB 380,360 ; RB 190.
    // Best leftover = QB 380 → fills SUPER_FLEX as QB. startable QB=2.
    // replacement QB = index 2 = 360.
    const players = [...pos('QB', 3, 400, 20), ...pos('RB', 2, 200, 10)]
    const levels = computeReplacementLevels(players, { QB: 1, RB: 1, SUPER_FLEX: 1 }, 1)
    expect(levels.QB).toBe(360)
  })

  it('a plain FLEX never pulls a QB in (QB stays shallow)', () => {
    // FLEX eligibility is RB/WR/TE only, so the QB leftover can't fill it.
    const players = [...pos('QB', 3, 400, 20), ...pos('RB', 4, 200, 10)]
    const levels = computeReplacementLevels(players, { QB: 1, RB: 1, FLEX: 1 }, 1)
    expect(levels.QB).toBe(380) // QB startable stays 1 → index 1
  })

  it('K and DEF use base slots only', () => {
    const players = [...pos('K', 4, 120, 10), ...pos('DEF', 4, 100, 8)]
    const levels = computeReplacementLevels(players, { K: 1, DEF: 1 }, 2)
    expect(levels.K).toBe(100) // 2 teams * 1 → index 2
    expect(levels.DEF).toBe(84) // 100,92,84 → index 2
  })

  it('short pool: startable exceeds available → falls back to the worst available', () => {
    const players = pos('TE', 2, 90, 10) // only 2 TEs, need index 4
    const levels = computeReplacementLevels(players, { TE: 1 }, 5)
    expect(levels.TE).toBe(80) // worst available (last)
  })

  it('empty pool → 0', () => {
    expect(computeReplacementLevels([], { QB: 1 }, 10).QB).toBe(0)
  })
})
