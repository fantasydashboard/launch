import { describe, it, expect } from 'vitest'
import { buildRosterCompare } from '../rosterCompare'
import type { PointsPoolPlayer } from '../pointsTeam'
import type { FGProjection } from '@/services/projectionService'

const p = (key: string, team: string, pos: string): PointsPoolPlayer => ({
  playerKey: key, name: key, position: pos, teamKey: team, eligiblePositions: [pos], proTeam: 'NYJ',
})
// Football: 2 RB slots, 1 TE. I'm deep at RB, they're deep at TE.
const slots = { RB: 2, TE: 1 }
const pool = [
  p('myRB1', 'me', 'RB'), p('myRB2', 'me', 'RB'), p('myRB3', 'me', 'RB'), p('myTE1', 'me', 'TE'),
  p('thRB1', 'them', 'RB'), p('thTE1', 'them', 'TE'), p('thTE2', 'them', 'TE'),
]
const vorByKey = {
  myRB1: { vorRos: 90 }, myRB2: { vorRos: 60 }, myRB3: { vorRos: 40 }, myTE1: { vorRos: 5 },
  thRB1: { vorRos: 50 }, thTE1: { vorRos: 70 }, thTE2: { vorRos: 30 },
}
const fg: Record<string, FGProjection | null> = {}

describe('buildRosterCompare', () => {
  const cmp = buildRosterCompare({
    pool, valueByKey: {}, fgByKey: fg, myTeamKey: 'me', theirTeamKey: 'them',
    slots, sport: 'football', vorByKey,
  })!

  it('pairs both rosters position by position', () => {
    expect(cmp).not.toBeNull()
    const rb = cmp.positions.find((x) => x.position === 'RB')!
    expect(rb.mine.map((b) => b.playerKey)).toEqual(['myRB1', 'myRB2', 'myRB3'])
    expect(rb.theirs.map((b) => b.playerKey)).toEqual(['thRB1'])
  })

  it('marks as starters only as many bodies as the league starts there', () => {
    const rb = cmp.positions.find((x) => x.position === 'RB')!
    // 2 RB slots: my third back is depth, which is exactly what makes him tradeable.
    expect(rb.mine.filter((b) => b.starter).map((b) => b.playerKey)).toEqual(['myRB1', 'myRB2'])
    expect(rb.mine.find((b) => b.playerKey === 'myRB3')!.starter).toBe(false)
  })

  it('scores the edge on starters, not on the single best body', () => {
    const rb = cmp.positions.find((x) => x.position === 'RB')!
    expect(rb.myStarterValue).toBe(150) // 90 + 60
    expect(rb.theirStarterValue).toBe(50)
    expect(rb.edge).toBe(100)
  })

  it('names which side of each lopsided position you are on', () => {
    expect(cmp.youSell).toContain('RB')
    expect(cmp.youBuy).toContain('TE')
  })

  it('ignores gaps too small to be worth a conversation', () => {
    // Depth 1 at RB: my best is 90, theirs is 85, so the edge is 5 — real but not worth a call.
    const even = { ...vorByKey, thRB1: { vorRos: 85 } }
    const c = buildRosterCompare({
      pool, valueByKey: {}, fgByKey: fg, myTeamKey: 'me', theirTeamKey: 'them',
      slots: { RB: 1, TE: 1 }, sport: 'football', vorByKey: even,
    })!
    expect(c.youSell).not.toContain('RB')
    expect(c.youBuy).not.toContain('RB')
  })

  it('returns null without both teams', () => {
    expect(buildRosterCompare({
      pool, valueByKey: {}, fgByKey: fg, myTeamKey: 'me', theirTeamKey: '', slots, sport: 'football', vorByKey,
    })).toBeNull()
  })
})
