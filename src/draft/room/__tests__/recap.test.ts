import { describe, it, expect } from 'vitest'
import { buildRecap, gradeForRank, type RecapPick } from '../recap'

const slots = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, BN: 3 }

let pickNo = 0
const p = (
  teamKey: string,
  position: string,
  projected: number,
  over: Partial<RecapPick> = {},
): RecapPick => ({
  playerKey: `${teamKey}-${position}-${++pickNo}`,
  name: `${teamKey} ${position} ${pickNo}`,
  position,
  overallPick: pickNo,
  teamKey,
  projected,
  adp: null,
  ...over,
})

/** A full seven-slot roster at a given quality level. */
const roster = (teamKey: string, base: number): RecapPick[] => [
  p(teamKey, 'QB', base), p(teamKey, 'RB', base), p(teamKey, 'RB', base),
  p(teamKey, 'WR', base), p(teamKey, 'WR', base), p(teamKey, 'TE', base),
  p(teamKey, 'RB', base),
]

describe('buildRecap', () => {
  it('ranks rosters by their best starting lineup', () => {
    const recap = buildRecap({
      picks: [...roster('a', 100), ...roster('b', 200), ...roster('c', 150)],
      slots,
      myTeamKey: 'c',
    })
    expect(recap.teams.map((t) => t.teamKey)).toEqual(['b', 'c', 'a'])
    expect(recap.me!.rank).toBe(2)
    expect(recap.behindLeader).toBe(350) // 7 starters x the 50-point gap apiece
  })

  it('starts the best players, not the first ones drafted', () => {
    // A better back taken late still starts; slot order follows quality.
    const picks = [
      p('a', 'QB', 300), p('a', 'RB', 10), p('a', 'RB', 20),
      p('a', 'WR', 100), p('a', 'WR', 90), p('a', 'TE', 80),
      p('a', 'RB', 250), // the best back, taken last
    ]
    const recap = buildRecap({ picks, slots, myTeamKey: 'a' })
    const rbs = recap.me!.rows.filter((r) => r.slot === 'RB').map((r) => r.player!.playerKey)
    expect(rbs).toContain(picks[6].playerKey)
    // The 10-point back is the one who gets pushed to the flex, not a starter slot.
    expect(rbs).not.toContain(picks[1].playerKey)
    // And nothing is lost: 7 players, 7 slots, empty bench.
    expect(recap.me!.bench).toHaveLength(0)
  })

  it('scores an unfinished roster as it stands and says how short it is', () => {
    const recap = buildRecap({
      picks: [p('a', 'QB', 300), p('a', 'RB', 200)],
      slots,
      myTeamKey: 'a',
    })
    expect(recap.me!.startingPoints).toBe(500)
    expect(recap.me!.holes).toBe(5)
  })

  it('names the picks that beat the market, and the ones that did not', () => {
    const recap = buildRecap({
      picks: [
        p('a', 'RB', 200, { name: 'Bargain', overallPick: 40, adp: 12 }),
        p('a', 'WR', 180, { name: 'Reach', overallPick: 20, adp: 55 }),
        p('a', 'TE', 150, { name: 'Fair', overallPick: 30, adp: 31 }),
      ],
      slots,
      myTeamKey: 'a',
    })
    expect(recap.values.map((v) => v.pick.name)).toEqual(['Bargain'])
    expect(recap.values[0].delta).toBe(28)
    expect(recap.reaches.map((v) => v.pick.name)).toEqual(['Reach'])
    // A pick within a few slots of ADP is not a story.
    expect([...recap.values, ...recap.reaches].map((n) => n.pick.name)).not.toContain('Fair')
  })

  it('ignores picks the market never priced', () => {
    const recap = buildRecap({
      picks: [p('a', 'RB', 200, { overallPick: 90, adp: null })],
      slots,
      myTeamKey: 'a',
    })
    expect(recap.values).toEqual([])
    expect(recap.reaches).toEqual([])
  })

  it('measures each position against the rest of the room', () => {
    const recap = buildRecap({
      picks: [
        // Two teams: mine gets 300 from the quarterback slot, theirs 100.
        p('a', 'QB', 300), p('b', 'QB', 100),
      ],
      slots: { QB: 1 },
      myTeamKey: 'a',
    })
    expect(recap.positionEdge.QB).toBe(100) // 300 vs a 200 average
  })

  it('returns something sane when my team is not in the draft', () => {
    const recap = buildRecap({ picks: roster('a', 100), slots, myTeamKey: null })
    expect(recap.me).toBeNull()
    expect(recap.grade).toBe('—')
    expect(recap.behindLeader).toBe(0)
  })

  it('survives an empty draft', () => {
    const recap = buildRecap({ picks: [], slots, myTeamKey: 'a' })
    expect(recap.teams).toEqual([])
    expect(recap.me).toBeNull()
  })
})

describe('gradeForRank', () => {
  it('rewards the top of the room and marks down the bottom', () => {
    expect(gradeForRank(1, 12)).toBe('A+')
    expect(gradeForRank(12, 12)).toBe('D')
  })

  it('spreads the middle instead of bunching it', () => {
    const grades = [3, 5, 7, 9].map((r) => gradeForRank(r, 12))
    expect(new Set(grades).size).toBeGreaterThan(1)
  })

  it('does not fail on a one-team draft', () => {
    expect(gradeForRank(1, 1)).toBe('A')
  })
})
