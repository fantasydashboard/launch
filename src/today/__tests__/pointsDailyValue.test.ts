import { describe, it, expect } from 'vitest'
import { pointsDailyValue } from '@/today/pointsDailyValue'
import type { FGProjection } from '@/services/projectionService'

const weights = { HR: 4, R: 1, RBI: 1, W: 5, K: 1 }

// FG fixtures mirror src/myteam/__tests__/pointsTeam.test.ts's bat()/arm() shape.
const batFG: FGProjection = { mlbam_id: 1, player_name: 'Bat Man', team: 'NYY', position: 'OF', player_type: 'batter', hr: 30, r: 90, rbi: 90, g: 150 } as unknown as FGProjection
const armFG: FGProjection = { mlbam_id: 2, player_name: 'Arm Man', team: 'LAD', position: 'SP', player_type: 'pitcher', w: 15, so: 220, ip: 200, er: 70, gp: 32, gs: 32 } as unknown as FGProjection

const matchFG = (p: { full_name?: string; mlb_team?: string }): FGProjection | null =>
  p.full_name === 'Bat Man' ? batFG : p.full_name === 'Arm Man' ? armFG : null

describe('pointsDailyValue', () => {
  it('returns a hitter\'s projected per-game points (total / games)', () => {
    // total = 30*4 + 90 + 90 = 300; games = 150 -> 2.0/game
    expect(pointsDailyValue('Bat Man', 'NYY', matchFG, weights)).toBeCloseTo(300 / 150, 5)
  })

  it('returns a pitcher\'s per-appearance points', () => {
    // total = 15*5 + 220 = 295; games = gp 32 -> ~9.219
    expect(pointsDailyValue('Arm Man', 'LAD', matchFG, weights)).toBeCloseTo(295 / 32, 5)
  })

  it('returns 0 for a free agent with no real team', () => {
    expect(pointsDailyValue('Bat Man', 'FA', matchFG, weights)).toBe(0)
    expect(pointsDailyValue('Bat Man', '', matchFG, weights)).toBe(0)
    expect(pointsDailyValue('Bat Man', undefined, matchFG, weights)).toBe(0)
  })

  it('returns 0 when no FanGraphs projection matches', () => {
    expect(pointsDailyValue('Ghost', 'NYY', matchFG, weights)).toBe(0)
  })
})
