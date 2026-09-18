import { describe, it, expect } from 'vitest'
import { parseDraftDetail, draftClock, teamNamesFromEspn } from '../hockeyDraftSync'

/* A four-team snake, two rounds, shaped exactly like ESPN's payload. */
const pick = (overall: number, round: number, roundPick: number, teamId: number, playerId = -1) =>
  ({ overallPickNumber: overall, roundId: round, roundPickNumber: roundPick, teamId, playerId, keeper: false })

const SNAKE = [
  pick(1, 1, 1, 1), pick(2, 1, 2, 2), pick(3, 1, 3, 3), pick(4, 1, 4, 4),
  pick(5, 2, 1, 4), pick(6, 2, 2, 3), pick(7, 2, 3, 2), pick(8, 2, 4, 1),
]
const payload = (picks: any[], inProgress = true) => ({ draftDetail: { inProgress, drafted: false, picks } })

describe('reading the draft feed', () => {
  it('holds the whole draft order before anybody has picked', () => {
    const s = parseDraftDetail(payload(SNAKE))
    expect(s.picks).toHaveLength(8)
    expect(s.drafted.size).toBe(0)
    expect(s.complete).toBe(false)
  })

  /*
   * THE ONE TRAP IN THIS PAYLOAD. An unmade pick is not absent — it is present, carrying
   * playerId -1. Read without the check, every unmade pick marks player "-1" as drafted, and
   * the board looks completely normal while removing nobody.
   */
  it('does not treat the unmade-pick sentinel as a player', () => {
    const s = parseDraftDetail(payload(SNAKE))
    expect(s.drafted.has('-1')).toBe(false)
    expect(s.picks[0].playerKey).toBeNull()
  })

  it('collects the players actually taken', () => {
    const s = parseDraftDetail(payload([pick(1, 1, 1, 1, 3899), pick(2, 1, 2, 2, 4233), ...SNAKE.slice(2)]))
    expect([...s.drafted].sort()).toEqual(['3899', '4233'])
  })

  it('knows when the draft is finished', () => {
    const done = SNAKE.map((p, i) => ({ ...p, playerId: 100 + i }))
    expect(parseDraftDetail(payload(done, false)).complete).toBe(true)
  })

  it('sorts by overall pick however ESPN ordered them', () => {
    const s = parseDraftDetail(payload([...SNAKE].reverse()))
    expect(s.picks.map((p) => p.overall)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('survives a payload with no draft in it', () => {
    expect(parseDraftDetail({}).picks).toEqual([])
    expect(parseDraftDetail(null).drafted.size).toBe(0)
  })
})

describe('where a team stands', () => {
  const afterThree = parseDraftDetail(payload([
    pick(1, 1, 1, 1, 101), pick(2, 1, 2, 2, 102), pick(3, 1, 3, 3, 103), ...SNAKE.slice(3),
  ]))

  it('says who is on the clock', () => {
    expect(draftClock(afterThree, 1).onTheClockTeamId).toBe(4)
    expect(draftClock(afterThree, 1).nextOverall).toBe(4)
  })

  /*
   * The number a drafter actually uses: how many players can come off the board before their
   * turn, and therefore how far down their own list they should be willing to look. A snake
   * swings it between one and fifteen, which is why it is computed rather than eyeballed.
   */
  it('counts the picks before your turn', () => {
    // Team 1 picks 1st and 8th. Three are gone, so picks 4-7 come before theirs: four of them.
    expect(draftClock(afterThree, 1).picksUntilMine).toBe(4)
    // Team 4 is on the clock right now.
    expect(draftClock(afterThree, 4).picksUntilMine).toBe(0)
  })

  it('shows your next two picks, which is what you plan around', () => {
    const c = draftClock(parseDraftDetail(payload(SNAKE)), 4)
    expect(c.myNextOverall).toBe(4)
    expect(c.myFollowingOverall).toBe(5)   // the snake turn
  })

  it('lists what you have already taken', () => {
    expect(draftClock(afterThree, 1).myPicks.map((p) => p.playerKey)).toEqual(['101'])
  })

  /* Every field is null rather than a fallback when the answer is unknown: a wrong pick
     countdown is acted on immediately. */
  it('answers nothing rather than something for a team with no picks left', () => {
    const done = parseDraftDetail(payload(SNAKE.map((p, i) => ({ ...p, playerId: 100 + i })), false))
    const c = draftClock(done, 1)
    expect(c.picksUntilMine).toBeNull()
    expect(c.myNextOverall).toBeNull()
    expect(c.onTheClockTeamId).toBeNull()
  })

  it('answers nothing for a team id nobody owns', () => {
    expect(draftClock(afterThree, 99).picksUntilMine).toBeNull()
    expect(draftClock(afterThree, null).myPicks).toEqual([])
  })

  it('answers nothing for a draft with no picks', () => {
    expect(draftClock(parseDraftDetail({}), 1).onTheClockTeamId).toBeNull()
  })

  /* Keeper rounds arrive already filled. Counting along the outstanding picks rather than
     subtracting pick numbers is what keeps the wait honest when they do. */
  it('does not count keeper picks that are already made', () => {
    const withKeepers = parseDraftDetail(payload([
      { ...pick(1, 1, 1, 1, 101), keeper: true },
      { ...pick(2, 1, 2, 2, 102), keeper: true },
      { ...pick(3, 1, 3, 3, 103), keeper: true },
      ...SNAKE.slice(3),
    ]))
    expect(draftClock(withKeepers, 1).picksUntilMine).toBe(4)
    expect(withKeepers.picks[0].keeper).toBe(true)
  })
})

describe('team names', () => {
  it('reads them from the team view', () => {
    expect(teamNamesFromEspn({ teams: [{ id: 1, name: 'Gummies' }, { id: 2, name: 'Sharks' }] }))
      .toEqual({ 1: 'Gummies', 2: 'Sharks' })
  })

  it('falls back to a label rather than an empty chip', () => {
    expect(teamNamesFromEspn({ teams: [{ id: 3 }] })[3]).toBe('Team 3')
  })

  it('survives a payload with no teams', () => {
    expect(teamNamesFromEspn({})).toEqual({})
  })
})
