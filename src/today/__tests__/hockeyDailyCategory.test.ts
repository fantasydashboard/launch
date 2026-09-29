import { describe, it, expect } from 'vitest'
import { hockeyDailyCategoryValue } from '../hockeyDailyCategory'

const CATS = [
  { key: 'G', statId: 0, reverse: false },
  { key: 'A', statId: 1, reverse: false },
]
const proj = (key: string, G: number, A: number, GP: number, position = 'C') =>
  [key, { playerKey: key, position, stats: { G, A, GP } }] as const
const build = (rows: ReadonlyArray<ReturnType<typeof proj>>, draftable?: number) =>
  hockeyDailyCategoryValue({
    projections: Object.fromEntries(rows) as any,
    categories: CATS,
    draftablePlayers: draftable,
  })

describe('hockeyDailyCategoryValue', () => {
  it('ranks the better player higher', () => {
    const v = build([proj('a', 40, 50, 80), proj('b', 10, 12, 80)])
    expect(v['a'].total).toBeGreaterThan(v['b'].total)
  })

  /*
   * THE DIVISOR IS THE WHOLE POINT. Season value answers "who is better this year"; a manager
   * filling one seat tonight is asking who is better PER NIGHT. Two players with the same
   * season line and different games played are not the same play tonight.
   */
  it('prices per game, so fewer games at the same season line is worth more a night', () => {
    const v = build([proj('full', 30, 30, 82), proj('half', 30, 30, 41), proj('filler', 5, 5, 82)])
    expect(v['half'].total / v['half'].games).toBeGreaterThan(v['full'].total / v['full'].games)
  })

  it('reports the games it divided by', () => {
    const v = build([proj('a', 30, 30, 70), proj('b', 5, 5, 70)])
    expect(v['a'].games).toBe(70)
  })

  /*
   * A player with no projected games has an unknown schedule, not a one-game season. Dividing
   * by one would rocket him to the top of tonight's board off the least information available —
   * the same trap the baseball divisor documents.
   */
  it('scores a player with no projected games at zero rather than at infinity', () => {
    const v = build([proj('ghost', 30, 30, 0), proj('real', 30, 30, 80), proj('filler', 5, 5, 80)])
    expect(v['ghost'].total).toBe(0)
    expect(v['ghost'].games).toBe(0)
    expect(v['real'].total).toBeGreaterThan(0)
  })

  /*
   * Half of any z-sum pool is negative, and a negative value ranks BELOW a man with no game at
   * all (who scores exactly 0) — inverting the one thing this page exists to say. The whole
   * scale is lifted so the worst player sits at zero.
   */
  it('never returns a negative value, because no-game already means zero', () => {
    const v = build([proj('star', 50, 60, 82), proj('bad', 1, 1, 82), proj('mid', 20, 20, 82)])
    for (const k of Object.keys(v)) expect(v[k].total).toBeGreaterThanOrEqual(0)
    expect(v['bad'].total).toBe(0)
  })

  it('keeps the ordering the lift was applied to', () => {
    const v = build([proj('a', 50, 60, 82), proj('b', 20, 20, 82), proj('c', 1, 1, 82)])
    expect(v['a'].total).toBeGreaterThan(v['b'].total)
    expect(v['b'].total).toBeGreaterThan(v['c'].total)
  })

  it('marks goalies as their own side, which the lineup uses to fill seats', () => {
    const v = build([proj('g1', 0, 0, 60, 'G'), proj('s1', 30, 30, 80, 'C')])
    expect(v['g1'].side).toBe('pit')
    expect(v['s1'].side).toBe('hit')
  })

  it('returns nothing rather than zeroes when the league has no categories', () => {
    expect(hockeyDailyCategoryValue({
      projections: Object.fromEntries([proj('a', 30, 30, 80)]) as any,
      categories: [],
    })).toEqual({})
  })

  it('returns nothing for an empty feed', () => {
    expect(hockeyDailyCategoryValue({ projections: {}, categories: CATS })).toEqual({})
  })
})
