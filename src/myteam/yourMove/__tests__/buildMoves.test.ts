import { describe, it, expect } from 'vitest'
import { buildMoves, buildRankedMoves } from '../buildMoves'
import { pickCounterparty, type RosterSlotPlayer } from '../pairDrop'
import { projectRemainingWeek } from '../projectRemainingWeek'
import type { MoveCandidate, ScoredContext } from '../types'
import type { CatSpec } from '@/myteam/value'

const cats: CatSpec[] = [{ statId: 'HR', lowerIsBetter: false, side: 'hit', isRatio: false }]
const ctx: ScoredContext = {
  cats,
  categoryIds: ['HR'],
  myStats: { HR: 8 },
  oppStats: { HR: 9 },
  days: 5,
  platform: 'yahoo',
}
const roster: RosterSlotPlayer[] = [
  { playerKey: 'stud', name: 'Stud', team: 'LAD', position: 'OF', side: 'hit', roleValue: 90, started: true, stats: { HR: 40 } },
  { playerKey: 'scrub', name: 'Scrub', team: 'COL', position: '1B', side: 'hit', roleValue: 12, started: true, stats: { HR: 1 } },
]
const addBigBat: MoveCandidate = {
  kind: 'add',
  player: { key: 'fa1', name: 'Power Bat', team: 'NYY', position: 'OF' },
  side: 'hit',
  addDelta: { HR: 30 },
  detail: 'Free agent',
}
const weekProjector = (p: RosterSlotPlayer) => projectRemainingWeek(p.stats, null, cats, ctx.days, 0.6)

describe('pickCounterparty', () => {
  it('drops the weakest droppable same-side player; never a keeper', () => {
    expect(pickCounterparty(roster, 'hit', 'add')!.playerKey).toBe('scrub')
    const allKeepers = [roster[0]]
    expect(pickCounterparty(allKeepers, 'hit', 'add')).toBeNull()
  })
})

describe('buildMoves', () => {
  it('nets the swap, names the drop, keeps only honestly-flipped cats, tags the layer', () => {
    const moves = buildMoves([addBigBat], roster, ['HR'], cats, ctx, weekProjector, 'longTerm')
    expect(moves).toHaveLength(1)
    expect(moves[0].counterparty?.name).toBe('Scrub')
    expect(moves[0].categories).toContain('HR')
    expect(moves[0].winProbLift).toBeGreaterThan(0)
    expect(moves[0].layer).toBe('longTerm')
  })

  it('suppresses moves when the only counterparty would be a keeper', () => {
    expect(buildMoves([addBigBat], [roster[0]], ['HR'], cats, ctx, weekProjector)).toEqual([])
  })

  it('suppresses a swap that flips nothing (add no better than the drop)', () => {
    const weakAdd: MoveCandidate = { ...addBigBat, addDelta: { HR: 1 } }
    expect(buildMoves([weakAdd], roster, ['HR'], cats, ctx, weekProjector)).toEqual([])
  })

  it('a zero-cost (off-today) counterparty makes the swap more valuable', () => {
    const zeroCost = () => ({ HR: 0 })
    const offToday = buildMoves([addBigBat], roster, ['HR'], cats, ctx, zeroCost)
    const fullCost = buildMoves([addBigBat], roster, ['HR'], cats, ctx, weekProjector)
    expect(offToday[0].winProbLift).toBeGreaterThanOrEqual(fullCost[0].winProbLift)
  })
})

describe('buildRankedMoves', () => {
  it('assigns a distinct counterparty to each move (no repeated drop)', () => {
    const twoBigBats: MoveCandidate[] = [
      { ...addBigBat, player: { key: 'fa1', name: 'Bat One', team: 'NYY', position: 'OF' } },
      { ...addBigBat, player: { key: 'fa2', name: 'Bat Two', team: 'LAD', position: 'OF' } },
    ]
    const rosterTwoDrops: RosterSlotPlayer[] = [
      ...roster,
      { playerKey: 'scrub2', name: 'Scrub Two', team: 'KC', position: 'OF', side: 'hit', roleValue: 20, started: true, stats: { HR: 2 } },
    ]
    const moves = buildRankedMoves(twoBigBats, rosterTwoDrops, ['HR'], cats, ctx, weekProjector, {
      maxMoves: 4,
      liftFloor: 1,
      usedCounterparties: new Set(),
      usedPlayers: new Set(),
    })
    expect(moves).toHaveLength(2)
    const drops = moves.map((m) => m.counterparty?.key)
    expect(new Set(drops).size).toBe(2) // distinct
    expect(drops).toContain('scrub') // weakest goes to the top move
  })

  it('respects counterparties already used by an earlier layer', () => {
    const used = new Set<string>(['scrub'])
    const moves = buildRankedMoves([addBigBat], roster, ['HR'], cats, ctx, weekProjector, {
      maxMoves: 4,
      liftFloor: 1,
      usedCounterparties: used,
      usedPlayers: new Set(),
    })
    // 'scrub' is taken and 'stud' is a keeper -> no acceptable counterparty -> no move
    expect(moves).toEqual([])
  })
})
