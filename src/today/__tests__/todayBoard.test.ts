import { describe, it, expect } from 'vitest'
import { buildTodayBoard, type ScoredPlay } from '../todayBoard'
import type { OpenSlot } from '../openSlots'

function play(p: Partial<ScoredPlay> & { name: string; value: number }): ScoredPlay {
  return {
    kind: 'stream',
    playerKey: p.name,
    team: 'LAD',
    position: 'SP',
    value: p.value,
    bucket: 4,
    detail: '',
    oneDay: true,
    fillsSlot: undefined,
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
})
