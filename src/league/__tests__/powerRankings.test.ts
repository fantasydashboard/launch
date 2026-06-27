import { describe, it, expect } from 'vitest'
import { buildPowerRankings, type PowerTeamInput } from '../powerRankings'

function team(key: string, strength: number, wins: number, losses: number): PowerTeamInput {
  return { teamKey: key, teamName: key, strength, wins, losses }
}

describe('buildPowerRankings', () => {
  // 5 teams. Lucky: weak roster (strength 5th) but best record. Sleeper: strong
  // roster (strength 1st) but worst record.
  const teams = [
    team('Sleeper', 100, 2, 8), // strongest roster, worst record → unlucky
    team('Solid', 80, 6, 4),
    team('Mid', 60, 5, 5),
    team('OK', 40, 4, 6),
    team('Lucky', 20, 8, 2), // weakest roster, best record → lucky
  ]

  it('ranks by roster strength, not record', () => {
    const pr = buildPowerRankings(teams)
    expect(pr.rows[0].teamKey).toBe('Sleeper') // strongest roster ranks #1 despite 2-8
    expect(pr.rows[0].strengthRank).toBe(1)
    expect(pr.rows[4].teamKey).toBe('Lucky') // weakest roster ranks last despite 8-2
  })

  it('flags the pretender (good record, weak roster) and the sleeper', () => {
    const pr = buildPowerRankings(teams)
    const lucky = pr.rows.find((r) => r.teamKey === 'Lucky')!
    expect(lucky.luck).toBe('pretender')
    expect(lucky.luckDelta).toBeGreaterThan(0) // record better than talent
    expect(lucky.blurb).toMatch(/sell high/i)

    const sleeper = pr.rows.find((r) => r.teamKey === 'Sleeper')!
    expect(sleeper.luck).toBe('sleeper')
    expect(sleeper.blurb).toMatch(/buy low/i)

    expect(pr.pretenders.map((r) => r.teamKey)).toContain('Lucky')
    expect(pr.sleepers.map((r) => r.teamKey)).toContain('Sleeper')
  })

  it('assigns strength tiers', () => {
    const pr = buildPowerRankings(teams)
    expect(pr.rows.find((r) => r.teamKey === 'Sleeper')!.tier).toBe('Contender')
    expect(pr.rows.find((r) => r.teamKey === 'Lucky')!.tier).toBe('Rebuilder')
  })
})
