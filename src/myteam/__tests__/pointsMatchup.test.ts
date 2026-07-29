import { describe, it, expect } from 'vitest'
import { buildPointsMatchup } from '../pointsMatchup'
import { buildBaseballValue } from '../playerValue'
import type { PointsPoolPlayer } from '../pointsTeam'
import type { FGProjection } from '@/services/projectionService'
import type { WeekSchedule } from '@/services/mlbSchedule'

const weights = { HR: 4, R: 1, RBI: 1, K: 1, IP: 3 }

function bat(key: string, team: string, proTeam: string): { p: PointsPoolPlayer; fg: FGProjection } {
  return {
    p: { playerKey: key, name: key, position: 'OF', teamKey: team, proTeam, eligiblePositions: ['OF'] },
    fg: { mlbam_id: 1, player_name: key, team: proTeam, position: 'OF', player_type: 'batter', hr: 20, r: 80, rbi: 80, g: 150 },
  }
}
function arm(key: string, team: string): { p: PointsPoolPlayer; fg: FGProjection } {
  return {
    p: { playerKey: key, name: key, position: 'SP', teamKey: team, proTeam: 'XXX', eligiblePositions: ['SP'] },
    fg: { mlbam_id: 2, player_name: key, team: 'XXX', position: 'SP', player_type: 'pitcher', w: 12, ip: 180, so: 200, gp: 30, gs: 30 },
  }
}

describe('buildPointsMatchup', () => {
  // My OF plays for NYY (4 games this week), opponent's for LAD (2 games).
  const rows = [bat('MyBat', 'A', 'NYY'), arm('MyArm', 'A'), bat('OppBat', 'B', 'LAD'), arm('OppArm', 'B')]
  const pool = rows.map((r) => r.p)
  const fg: Record<string, FGProjection | null> = {}
  rows.forEach((r) => (fg[r.p.playerKey] = r.fg))
  const slots = { OF: 1, SP: 1 }
  const schedule: WeekSchedule = {
    gamesByTeam: { NYY: 4, LAD: 2 },
    startsByPitcher: { myarm: [{ pitcherName: 'MyArm', teamAbbr: 'XXX', opponentAbbr: 'BOS', date: '' }, { pitcherName: 'MyArm', teamAbbr: 'XXX', opponentAbbr: 'TOR', date: '' }] },
  }
  const valueByKey = buildBaseballValue(fg, weights)

  it('counts hitter-games and the volume edge from the schedule', () => {
    const m = buildPointsMatchup(pool, valueByKey, 'A', 'B', slots, schedule)!
    expect(m.my.hitterGames).toBe(4)
    expect(m.opp.hitterGames).toBe(2)
    expect(m.gamesDiff).toBe(2)
    // My bat plays 4 games at 180/150 per game ≈ 4.8/g → ~19.2 weekly.
    expect(m.my.weeklyHitterPoints).toBeGreaterThan(m.opp.weeklyHitterPoints)
  })

  it('favors the side with more projected weekly points', () => {
    const m = buildPointsMatchup(pool, valueByKey, 'A', 'B', slots, schedule)!
    expect(m.my.totalWeekly).toBeGreaterThan(m.opp.totalWeekly) // more games + a two-start arm
    expect(m.myWinPct).toBeGreaterThan(50)
    expect(m.myWinPct).toBeLessThanOrEqual(100)
  })

  it('flags two-start pitchers from the probable-starter list', () => {
    const m = buildPointsMatchup(pool, valueByKey, 'A', 'B', slots, schedule)!
    expect(m.my.twoStartArms).toHaveLength(1)
    expect(m.my.twoStartArms[0].name).toBe('MyArm')
    expect(m.opp.twoStartArms).toHaveLength(0)
  })

  it('returns null without both rosters', () => {
    expect(buildPointsMatchup(pool, valueByKey, 'A', '', slots, schedule)).toBeNull()
  })
})
