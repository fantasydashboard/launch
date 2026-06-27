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
    expect(lucky.move).toBe('Sell-high') // imperative lives in `move`, not the blurb
    expect(lucky.blurb).toMatch(/regress|cool off|luck/i)

    const sleeper = pr.rows.find((r) => r.teamKey === 'Sleeper')!
    expect(sleeper.luck).toBe('sleeper')
    expect(sleeper.move).toBe('Buy-low')
    expect(sleeper.blurb).toMatch(/climb|rise|better/i)

    expect(pr.pretenders.map((r) => r.teamKey)).toContain('Lucky')
    expect(pr.sleepers.map((r) => r.teamKey)).toContain('Sleeper')
  })

  it('assigns strength tiers', () => {
    const pr = buildPowerRankings(teams)
    expect(pr.rows.find((r) => r.teamKey === 'Sleeper')!.tier).toBe('Contender')
    expect(pr.rows.find((r) => r.teamKey === 'Lucky')!.tier).toBe('Rebuilder')
  })

  it('never sells an abandoned team as buy-low, even with strong talent', () => {
    const withGhost = [
      { teamKey: 'Ghost', teamName: 'Manager-less', strength: 100, wins: 2, losses: 8, managerless: true },
      team('B', 80, 6, 4),
      team('C', 60, 5, 5),
      team('D', 40, 4, 6),
      team('E', 20, 8, 2),
    ]
    const pr = buildPowerRankings(withGhost)
    const ghost = pr.rows.find((r) => r.teamKey === 'Ghost')!
    expect(ghost.strengthRank).toBe(1) // talent still ranks honestly
    expect(ghost.luck).toBe('legit') // but no buy-low verdict
    expect(ghost.managerless).toBe(true)
    expect(ghost.blurb).toMatch(/abandoned|no manager/i)
    expect(ghost.blurb).not.toMatch(/buy low|they'll climb/i)
    // Abandoned teams are excluded from the actionable buy-low shortlist.
    expect(pr.sleepers.map((r) => r.teamKey)).not.toContain('Ghost')
  })

  it('softens a bottom-tier sleeper so tier and luck never contradict', () => {
    // 8 teams: a thin (7th-talent) roster with the worst record is technically
    // "unlucky" but is a Rebuilder — it must not be sold as a climber.
    const eight = [
      team('T1', 100, 7, 1), team('T2', 90, 6, 2), team('T3', 80, 6, 2),
      team('T4', 70, 5, 3), team('T5', 60, 4, 4), team('T6', 50, 4, 4),
      { teamKey: 'Thin', teamName: 'Thin', strength: 40, wins: 0, losses: 8 }, // 7th talent, last record
      team('T8', 30, 5, 3),
    ]
    const pr = buildPowerRankings(eight)
    const thin = pr.rows.find((r) => r.teamKey === 'Thin')!
    expect(thin.tier).toBe('Rebuilder')
    if (thin.luck === 'sleeper') {
      expect(thin.blurb).not.toMatch(/they'll climb/i)
      expect(pr.sleepers.map((r) => r.teamKey)).not.toContain('Thin') // not a buy-low target
    }
  })
})
