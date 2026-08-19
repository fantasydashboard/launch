import { describe, it, expect } from 'vitest'
import { orderByRanking } from '../customRankings'

const row = (playerKey: string, points: number) => ({ playerKey, points })
const keyOf = (r: { playerKey: string }) => r.playerKey

describe('orderByRanking', () => {
  const rows = [row('a', 300), row('b', 250), row('c', 200), row('d', 150)]

  it('puts rows in the list order', () => {
    const out = orderByRanking(rows, { c: 1, a: 2, b: 3, d: 4 }, keyOf)
    expect(out.map(keyOf)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('changes no value on the row', () => {
    // The whole point: an in-season list reorders, it does not re-price.
    const out = orderByRanking(rows, { c: 1 }, keyOf)
    expect(out.find((r) => r.playerKey === 'c')!.points).toBe(200)
    expect(out.map((r) => r.points).sort()).toEqual(rows.map((r) => r.points).sort())
  })

  it('keeps players the list omits, after the ones it ranks', () => {
    // A list published on Tuesday will not have Thursday's waiver claim on it.
    const out = orderByRanking(rows, { d: 1, b: 2 }, keyOf)
    expect(out.map(keyOf)).toEqual(['d', 'b', 'a', 'c'])
  })

  it('preserves the existing order among the players it omits', () => {
    const out = orderByRanking(rows, { d: 1 }, keyOf)
    expect(out.map(keyOf).slice(1)).toEqual(['a', 'b', 'c'])
  })

  it('is a no-op when no list is active', () => {
    expect(orderByRanking(rows, {}, keyOf).map(keyOf)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('does not mutate the input', () => {
    const original = [...rows]
    orderByRanking(rows, { d: 1 }, keyOf)
    expect(rows).toEqual(original)
  })

  it('survives an empty list of rows', () => {
    expect(orderByRanking([], { a: 1 }, keyOf)).toEqual([])
  })
})
