import { describe, it, expect } from 'vitest'
import { readTalentSnapshots, recordTalentSnapshot, type SnapshotStore } from '../talentSnapshots'

function fakeStore(): SnapshotStore {
  const map = new Map<string, string>()
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
  }
}

describe('talentSnapshots', () => {
  it('records and reads back a snapshot', () => {
    const store = fakeStore()
    recordTalentSnapshot('lg1', 5, { A: 1, B: 2 }, store)
    expect(readTalentSnapshots('lg1', store)).toEqual([{ week: 5, ranks: { A: 1, B: 2 } }])
  })

  it('overwrites the same week, appends new weeks, keeps them sorted', () => {
    const store = fakeStore()
    recordTalentSnapshot('lg1', 6, { A: 2 }, store)
    recordTalentSnapshot('lg1', 5, { A: 1 }, store)
    recordTalentSnapshot('lg1', 6, { A: 9 }, store) // overwrite week 6
    const snaps = readTalentSnapshots('lg1', store)
    expect(snaps.map((s) => s.week)).toEqual([5, 6])
    expect(snaps[1].ranks.A).toBe(9)
  })

  it('isolates leagues and ignores empty/invalid input', () => {
    const store = fakeStore()
    recordTalentSnapshot('lg1', 5, { A: 1 }, store)
    recordTalentSnapshot('lg2', 5, {}, store) // empty ranks → no write
    expect(readTalentSnapshots('lg2', store)).toEqual([])
    expect(readTalentSnapshots('lg1', store)).toHaveLength(1)
  })

  it('survives corrupt storage', () => {
    const store = fakeStore()
    store.setItem('ufd:powertalent:lg1', '{not json')
    expect(readTalentSnapshots('lg1', store)).toEqual([])
  })
})
