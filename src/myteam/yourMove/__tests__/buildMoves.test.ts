import { describe, it, expect } from 'vitest'
import { buildMoves } from '../buildMoves'
import { pickCounterparty, type RosterSlotPlayer } from '../pairDrop'
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
  { playerKey: 'stud', name: 'Stud', side: 'hit', roleValue: 90, started: true, stats: { HR: 40 } },
  { playerKey: 'scrub', name: 'Scrub', side: 'hit', roleValue: 12, started: true, stats: { HR: 1 } },
]
const addBigBat: MoveCandidate = {
  kind: 'add',
  player: { key: 'fa1', name: 'Power Bat', team: 'NYY', position: 'OF' },
  side: 'hit',
  addDelta: { HR: 30 },
  detail: 'Free agent',
}

describe('pickCounterparty', () => {
  it('drops the weakest droppable same-side player; never a keeper', () => {
    expect(pickCounterparty(roster, 'hit', 'add')!.playerKey).toBe('scrub')
    const allKeepers: RosterSlotPlayer[] = [{ ...roster[0] }]
    expect(pickCounterparty(allKeepers, 'hit', 'add')).toBeNull()
  })
})

describe('buildMoves', () => {
  it('nets the swap, names the drop, and keeps only honestly-flipped cats', () => {
    const moves = buildMoves([addBigBat], roster, ['HR'], cats, ctx, 0.6)
    expect(moves).toHaveLength(1)
    expect(moves[0].counterparty?.name).toBe('Scrub')
    expect(moves[0].categories).toContain('HR')
    expect(moves[0].winProbLift).toBeGreaterThan(0)
  })

  it('suppresses moves when the only counterparty would be a keeper', () => {
    const keepersOnly: RosterSlotPlayer[] = [
      { playerKey: 'stud', name: 'Stud', side: 'hit', roleValue: 90, started: true, stats: { HR: 40 } },
    ]
    expect(buildMoves([addBigBat], keepersOnly, ['HR'], cats, ctx, 0.6)).toEqual([])
  })

  it('suppresses a swap that flips nothing (add no better than the drop)', () => {
    const weakAdd: MoveCandidate = { ...addBigBat, addDelta: { HR: 1 } }
    expect(buildMoves([weakAdd], roster, ['HR'], cats, ctx, 0.6)).toEqual([])
  })
})
