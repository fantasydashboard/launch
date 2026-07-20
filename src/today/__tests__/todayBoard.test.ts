import { describe, it, expect } from 'vitest'
import { buildTodayBoard, type ScoredPlay } from '../todayBoard'
import type { OpenSlot } from '../openSlots'

function play(p: Partial<ScoredPlay> & { name: string; value: number }): ScoredPlay {
  return {
    kind: 'stream',
    playerKey: p.name,
    team: 'LAD',
    position: 'SP',
    side: 'pit',
    value: p.value,
    score: p.value, // default: score mirrors value so ordering assertions hold unless overridden
    bucket: 4,
    detail: '',
    oneDay: true,
    fillsSlot: undefined,
    helpsCats: [],
    ...p,
  }
}

describe('buildTodayBoard', () => {
  it('hero = highest-value play; streamers sorted desc; assigns fills to open slots', () => {
    const plays: ScoredPlay[] = [
      play({ name: 'Ace', value: 18, kind: 'stream', fillsSlot: 'SP' }),
      play({ name: 'Mid', value: 9, kind: 'stream' }),
      play({ name: 'BenchBat', value: 7, kind: 'startSit', fillsSlot: 'OF', oneDay: false, position: 'OF' }),
    ]
    const openSlots: OpenSlot[] = [
      { slot: 'SP', reason: 'empty' },
      { slot: 'OF', reason: 'off-day', vacating: { playerKey: 'x', name: 'Off Guy', position: 'OF' } },
    ]
    const board = buildTodayBoard(plays, openSlots)
    expect(board.hero?.playerKey).toBe('Ace')
    expect(board.streamers.map((s) => s.playerKey)).toEqual(['Ace', 'Mid'])
    const fills = Object.fromEntries(board.openSlots.map((o) => [o.slot, o.fill?.playerKey ?? null]))
    expect(fills).toEqual({ SP: 'Ace', OF: 'BenchBat' })
  })
  it('empty inputs → all empty, hero null', () => {
    const b = buildTodayBoard([], [])
    expect(b).toEqual({ hero: null, openSlots: [], streamers: [], upgrades: [], sitAlerts: [] })
  })
  it('sorts by normalized score (not raw value) and carries drop / helpsCats fields', () => {
    const plays: ScoredPlay[] = [
      play({ name: 'RawBig', value: 99, score: 30, kind: 'stream', helpsCats: ['K'] }),
      play({ name: 'ScoreBig', value: 5, score: 90, kind: 'stream', drop: { playerKey: 'd', name: 'Cut Me', reason: 'off-day' } }),
    ]
    const board = buildTodayBoard(plays, [])
    expect(board.hero?.playerKey).toBe('ScoreBig') // score 90 beats score 30 despite lower raw value
    expect(board.streamers.map((s) => s.playerKey)).toEqual(['ScoreBig', 'RawBig'])
    expect(board.hero?.drop?.name).toBe('Cut Me')
    expect(board.streamers[1].helpsCats).toEqual(['K'])
  })
})
