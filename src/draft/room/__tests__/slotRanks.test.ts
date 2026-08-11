import { describe, it, expect } from 'vitest'
import { buildSlotRanks, rankIfAdded, rankTone, type SlotRankTeam } from '../slotRanks'

const slots = { QB: 1, RB: 2, WR: 2, BN: 2 }

const p = (key: string, position: string, points: number) => ({
  playerKey: key, name: key, position, points,
})

/** Three teams, mine in the middle at running back. */
const teams: SlotRankTeam[] = [
  { teamKey: 'a', players: [p('a-qb', 'QB', 300), p('a-rb1', 'RB', 250), p('a-rb2', 'RB', 100), p('a-wr1', 'WR', 200), p('a-wr2', 'WR', 150)] },
  { teamKey: 'me', players: [p('m-qb', 'QB', 280), p('m-rb1', 'RB', 200), p('m-rb2', 'RB', 180), p('m-wr1', 'WR', 120), p('m-wr2', 'WR', 110)] },
  { teamKey: 'c', players: [p('c-qb', 'QB', 260), p('c-rb1', 'RB', 150), p('c-rb2', 'RB', 140), p('c-wr1', 'WR', 240), p('c-wr2', 'WR', 220)] },
]

describe('buildSlotRanks', () => {
  it('ranks my starter at each slot against the same slot elsewhere', () => {
    const ranks = buildSlotRanks({ slots, teams, myTeamKey: 'me' })
    const at = (label: string) => ranks.find((r) => r.label === label)!
    expect(at('RB1').rank).toBe(2) // 250, 200, 150
    expect(at('RB2').rank).toBe(1) // 180 beats 140 and 100
    expect(at('WR1').rank).toBe(3) // 240, 200, 120
  })

  it('compares slot to slot, not against every player at the position', () => {
    // My RB2 (180) is better than two teams' RB2s even though four backs in the
    // league outscore him. Sunday is slot against slot.
    const ranks = buildSlotRanks({ slots, teams, myTeamKey: 'me' })
    expect(ranks.find((r) => r.label === 'RB2')!.rank).toBe(1)
  })

  it('does not count teams that have nobody in that slot', () => {
    const sparse: SlotRankTeam[] = [
      { teamKey: 'me', players: [p('m-qb', 'QB', 280)] },
      { teamKey: 'b', players: [] },
    ]
    const qb = buildSlotRanks({ slots, teams: sparse, myTeamKey: 'me' })
      .find((r) => r.label === 'QB')!
    // An empty roster is absent from the comparison, not last in it.
    expect(qb.of).toBe(1)
    expect(qb.rank).toBe(1)
  })

  it('leaves my empty slots unranked rather than guessing', () => {
    const mineIsThin: SlotRankTeam[] = [
      { teamKey: 'me', players: [p('m-rb1', 'RB', 200)] },
      { teamKey: 'b', players: [p('b-qb', 'QB', 300), p('b-rb1', 'RB', 150)] },
    ]
    const ranks = buildSlotRanks({ slots, teams: mineIsThin, myTeamKey: 'me' })
    expect(ranks.find((r) => r.label === 'QB')!.rank).toBeNull()
    expect(ranks.find((r) => r.label === 'RB1')!.rank).toBe(1)
  })

  it('reports the best points in the room at each slot', () => {
    const ranks = buildSlotRanks({ slots, teams, myTeamKey: 'me' })
    expect(ranks.find((r) => r.label === 'RB1')!.bestPoints).toBe(250)
  })

  it('returns nothing when there is no draft yet', () => {
    expect(buildSlotRanks({ slots, teams: [], myTeamKey: 'me' })).toEqual([])
  })
})

describe('rankIfAdded', () => {
  it('says where a player under consideration would put me', () => {
    const ranks = buildSlotRanks({ slots, teams, myTeamKey: 'me' })
    // A 260-point receiver would be the best WR1 in the league.
    expect(rankIfAdded(ranks, 'WR1', 260, teams, slots, 'me')).toEqual({ rank: 1, of: 3 })
    // A 130-point one would be last.
    expect(rankIfAdded(ranks, 'WR1', 130, teams, slots, 'me')).toEqual({ rank: 3, of: 3 })
  })

  it('ignores my own current occupant — he is the one being replaced', () => {
    const ranks = buildSlotRanks({ slots, teams, myTeamKey: 'me' })
    const r = rankIfAdded(ranks, 'RB1', 300, teams, slots, 'me')
    expect(r).toEqual({ rank: 1, of: 3 })
  })

  it('returns null for a slot that does not exist', () => {
    const ranks = buildSlotRanks({ slots, teams, myTeamKey: 'me' })
    expect(rankIfAdded(ranks, 'TE9', 100, teams, slots, 'me')).toBeNull()
  })
})

describe('rankTone', () => {
  it('says nothing until enough of the league is comparable', () => {
    // Pick 3.09 of a 10-team draft: "2nd of 2" is Justin Jefferson against the
    // one other team that has a WR2 yet. Red would be a lie told confidently.
    expect(rankTone(2, 2, 10)).toBe('hidden')
    expect(rankTone(1, 1, 10)).toBe('hidden')
    expect(rankTone(3, 3, 10)).toBe('hidden')
  })

  it('colours once half the league has somebody in that slot', () => {
    expect(rankTone(1, 8, 10)).toBe('good')
    expect(rankTone(8, 8, 10)).toBe('bad')
    expect(rankTone(4, 8, 10)).toBe('neutral')
  })

  it('splits into thirds, leaving the middle uncoloured', () => {
    const tones = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => rankTone(r, 10, 10))
    expect(tones.filter((t) => t === 'good')).toHaveLength(3)
    expect(tones.filter((t) => t === 'bad')).toHaveLength(3)
    expect(tones.filter((t) => t === 'neutral')).toHaveLength(4)
    // Whatever the size of the room, the two ends stay the same width.
    for (const of of [4, 5, 7, 8, 12]) {
      const t = Array.from({ length: of }, (_, i) => rankTone(i + 1, of, of))
      expect(t.filter((x) => x === 'good').length).toBe(t.filter((x) => x === 'bad').length)
    }
  })

  it('scales the gate to a small league', () => {
    // A 4-team draft only needs 3 comparable teams, not 5.
    expect(rankTone(1, 3, 4)).toBe('good')
    expect(rankTone(1, 2, 4)).toBe('hidden')
  })

  it('hides an empty slot', () => {
    expect(rankTone(null, 9, 10)).toBe('hidden')
  })
})
