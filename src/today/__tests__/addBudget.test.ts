import { describe, it, expect } from 'vitest'
import { annotateAddBudget, type AddBudget } from '../addBudget'
import type { ScoredPlay } from '../todayBoard'

function play(name: string, kind: ScoredPlay['kind'], score: number): ScoredPlay {
  return {
    kind, playerKey: name, name, team: 'LAD', position: 'SP', side: 'pit',
    value: score, score, bucket: 4, detail: '', oneDay: kind === 'stream', helpsCats: [],
  }
}

describe('annotateAddBudget', () => {
  it('count: top `remaining` add-moves are worth-add, rest save-add; start-sits untagged', () => {
    const plays = [
      play('A', 'stream', 30), play('B', 'add', 20), play('C', 'stream', 10), play('bench', 'startSit', 99),
    ]
    const out = annotateAddBudget(plays, { kind: 'count', limit: 5, used: 3, remaining: 2, period: 'week' })
    const tag = Object.fromEntries(out.map((p) => [p.playerKey, p.budgetTag]))
    expect(tag.A).toBe('worth-add')
    expect(tag.B).toBe('worth-add')
    expect(tag.C).toBe('save-add')
    expect(tag.bench).toBeUndefined()
  })
  it('count remaining 0 → all add-moves save-add', () => {
    const out = annotateAddBudget([play('A', 'stream', 30)], { kind: 'count', limit: 5, used: 5, remaining: 0, period: 'week' })
    expect(out[0].budgetTag).toBe('save-add')
  })
  it('faab: remaining>0 → worth-bid; remaining<=0 → save-add', () => {
    expect(annotateAddBudget([play('A', 'add', 5)], { kind: 'faab', budget: 100, remaining: 34 })[0].budgetTag).toBe('worth-bid')
    expect(annotateAddBudget([play('A', 'add', 5)], { kind: 'faab', budget: 100, remaining: 0 })[0].budgetTag).toBe('save-add')
  })
  it('unlimited → no tags', () => {
    expect(annotateAddBudget([play('A', 'stream', 5)], { kind: 'unlimited' })[0].budgetTag).toBeUndefined()
  })
})
