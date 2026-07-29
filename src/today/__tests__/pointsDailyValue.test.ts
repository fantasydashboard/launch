import { describe, it, expect } from 'vitest'
import { pointsDailyValue } from '@/today/pointsDailyValue'
import type { PlayerValue } from '@/myteam/playerValue'

// PlayerValue fixtures (post-refactor: pointsDailyValue consumes a valueOf resolver, not a raw
// FGProjection + weights). total/games chosen to reproduce the prior per-game expectations.
const batV: PlayerValue = { total: 300, games: 150, perStat: {}, side: 'hit', weeklyCap: 6.5 }
const armV: PlayerValue = { total: 295, games: 32, perStat: {}, side: 'pit', weeklyCap: 1.3 }

// Resolver: a real-team match returns the canned value; a bare 'FA'/blank team or an unmatched
// name resolves to null (mirrors the shared resolver's no-team/no-match guard).
const valueOf = (p: { name?: string; team?: string }): PlayerValue | null =>
  p.team && p.team.toUpperCase() !== 'FA'
    ? p.name === 'Bat Man'
      ? batV
      : p.name === 'Arm Man'
        ? armV
        : null
    : null

describe('pointsDailyValue', () => {
  it("returns a hitter's projected per-game points (total / games)", () => {
    // total 300 / games 150 -> 2.0/game
    expect(pointsDailyValue('Bat Man', 'NYY', 'OF', valueOf)).toBeCloseTo(300 / 150, 5)
  })

  it("returns a pitcher's per-appearance points", () => {
    // total 295 / games 32 -> ~9.219
    expect(pointsDailyValue('Arm Man', 'LAD', 'SP', valueOf)).toBeCloseTo(295 / 32, 5)
  })

  it('returns 0 for a free agent with no real team', () => {
    expect(pointsDailyValue('Bat Man', 'FA', 'OF', valueOf)).toBe(0)
    expect(pointsDailyValue('Bat Man', '', 'OF', valueOf)).toBe(0)
    expect(pointsDailyValue('Bat Man', undefined, 'OF', valueOf)).toBe(0)
  })

  it('returns 0 when the resolver finds no projection', () => {
    expect(pointsDailyValue('Ghost', 'NYY', 'OF', valueOf)).toBe(0)
  })
})
