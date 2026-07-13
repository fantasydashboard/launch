import { describe, it, expect } from 'vitest'
import { buildSeasonOutlook, type OutlookTeamMeta } from '@/myteam/seasonOutlook'
import type { TeamStanding } from '@/myteam/pointsTeam'
import type { ScheduleWeek } from '@/league/playoffOdds'

// Deterministic RNG so the Monte-Carlo sim is reproducible in tests.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A 4-team league. team_a is 12-0 with the strongest roster; team_d is 0-12 and weak.
function fixture() {
  const teamMeta: Record<string, OutlookTeamMeta> = {
    team_a: { wins: 12, losses: 0, ties: 0, pointsFor: 1200 },
    team_b: { wins: 8, losses: 4, ties: 0, pointsFor: 1000 },
    team_c: { wins: 4, losses: 8, ties: 0, pointsFor: 800 },
    team_d: { wins: 0, losses: 12, ties: 0, pointsFor: 600 },
  }
  const standings: TeamStanding[] = [
    { teamKey: 'team_a', startingPoints: 500, rank: 1 },
    { teamKey: 'team_b', startingPoints: 450, rank: 2 },
    { teamKey: 'team_c', startingPoints: 400, rank: 3 },
    { teamKey: 'team_d', startingPoints: 350, rank: 4 },
  ]
  const schedule: ScheduleWeek[] = [
    { week: 13, matchups: [['team_a', 'team_b'], ['team_c', 'team_d']] },
    { week: 14, matchups: [['team_a', 'team_c'], ['team_b', 'team_d']] },
  ]
  return { teamMeta, standings, schedule }
}

describe('buildSeasonOutlook', () => {
  it('12-0 team reads as 1st / clinched, not a low points rank', () => {
    const { teamMeta, standings, schedule } = fixture()
    const o = buildSeasonOutlook({
      myTeamKey: 'team_a', teamMeta, standings, talentRank: 1,
      schedule, weeksLeft: 2, playoffSpots: 2, sims: 400, rng: mulberry32(42),
    })
    expect(o.ready).toBe(true)
    expect(o.recordRank).toBe(1)
    expect(o.standingState).toBe('clinched')
    expect(o.projSeed).toBe(1)
    expect(o.record).toEqual({ wins: 12, losses: 0, ties: 0 })
  })

  it('record rank uses win% with pointsFor tiebreak', () => {
    const { teamMeta, standings, schedule } = fixture()
    const o = buildSeasonOutlook({
      myTeamKey: 'team_c', teamMeta, standings, talentRank: 3,
      schedule, weeksLeft: 2, playoffSpots: 2, sims: 200, rng: mulberry32(7),
    })
    expect(o.recordRank).toBe(3)
  })

  it('no schedule -> not ready, seed/odds null, luck still computed from ranks', () => {
    const { teamMeta, standings } = fixture()
    const o = buildSeasonOutlook({
      myTeamKey: 'team_a', teamMeta, standings, talentRank: 4,
      schedule: [], weeksLeft: 0, playoffSpots: 0,
    })
    expect(o.ready).toBe(false)
    expect(o.projSeed).toBeNull()
    expect(o.playoffPct).toBeNull()
    expect(o.standingState).toBe('unknown')
    expect(o.luck.stance).toBe('sell-high')
  })
})
