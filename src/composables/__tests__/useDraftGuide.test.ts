import { beforeEach, describe, expect, it } from 'vitest'
import { useDraftGuide } from '../useDraftGuide'

const KEY = 'ufd:draftRoom:guide'

function payload(players: Record<string, unknown>) {
  return JSON.stringify({ source: 'test guide', generated: '2026-08-28', players })
}

const GOOD = {
  '4034': { name: 'Chase Brown', pos: 'RB', team: 'CIN', kind: 'target', confidence: 7, page: 219, note: 'because Cincinnati' },
  '6794': { name: 'Josh Jacobs', pos: 'RB', team: 'GB', kind: 'avoid', confidence: 10, page: 255, note: 'because volume' },
}

describe('useDraftGuide', () => {
  beforeEach(() => localStorage.clear())

  it('is inert when nothing has been loaded — everyone else gets no overlay at all', () => {
    const g = useDraftGuide()
    g.clear()
    expect(g.loaded.value).toBe(false)
    expect(g.entryFor('4034')).toBeNull()
  })

  it('joins entries onto Sleeper player ids', () => {
    const g = useDraftGuide()
    expect(g.load(payload(GOOD))).toBe(2)
    expect(g.loaded.value).toBe(true)
    expect(g.entryFor('4034')?.kind).toBe('target')
    expect(g.entryFor('4034')?.confidence).toBe(7)
    expect(g.entryFor('6794')?.kind).toBe('avoid')
    expect(g.entryFor('nobody')).toBeNull()
  })

  it('drops malformed rows instead of throwing while the board is rendering', () => {
    const g = useDraftGuide()
    g.load(payload({ ...GOOD, bad1: null, bad2: { name: 'X', kind: 'nonsense' }, bad3: { kind: 'target' } }))
    expect(g.count.value).toBe(2)
    expect(g.entryFor('4034')?.name).toBe('Chase Brown')
  })

  it('survives a corrupt payload rather than blanking the Draft Room', () => {
    const g = useDraftGuide()
    localStorage.setItem(KEY, '{not json')
    expect(() => g.load('{still not json')).not.toThrow()
    expect(g.loaded.value).toBe(false)
  })

  it('coerces a non-numeric confidence to null rather than rendering NaN on screen', () => {
    const g = useDraftGuide()
    g.load(payload({ '1': { name: 'A', pos: 'WR', team: 'KC', kind: 'dart', confidence: 'high', page: 1, note: '' } }))
    expect(g.entryFor('1')?.confidence).toBeNull()
  })
})
