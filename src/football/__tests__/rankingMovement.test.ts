import { describe, it, expect } from 'vitest'
import { computeMovement } from '@/football/rankingMovement'

const spread = () => {
  /* A board with one big mover and a crowd of small ones, so the 90th percentile is a real
     number rather than an artefact of three data points. */
  const prev: Record<string, number> = {}
  const curr: Record<string, number> = {}
  for (let i = 0; i < 20; i++) { prev[`p${i}`] = 100; curr[`p${i}`] = 101 }
  prev.big = 100; curr.big = 140
  prev.drop = 100; curr.drop = 70
  return { prev, curr }
}

describe('computeMovement', () => {
  it('is empty until there are two weeks to compare', () => {
    expect(computeMovement(null, { a: 1 })).toEqual({})
    expect(computeMovement({ a: 1 }, null)).toEqual({})
    expect(computeMovement({}, {})).toEqual({})
  })

  it('directs a rise up and a fall down', () => {
    const { prev, curr } = spread()
    const m = computeMovement(prev, curr)
    expect(m.big.dir).toBe('up')
    expect(m.drop.dir).toBe('down')
    expect(m.big.delta).toBe(40)
    expect(m.drop.delta).toBe(-30)
  })

  /* The whole point: the crowd of one-point movers must not light up. */
  it('leaves noise uncoloured', () => {
    const { prev, curr } = spread()
    const m = computeMovement(prev, curr)
    expect(m.p0.intensity).toBe(0)
    expect(m.p0.dir).toBe('flat')
    expect(m.big.intensity).toBeGreaterThan(0.5)
  })

  /* Half the board grey, whatever shape the week has — the property that makes the rest of it
     legible, and the one a ninetieth-percentile-only scale does not have. */
  it('leaves at least half the board uncoloured', () => {
    const prev: Record<string, number> = {}
    const curr: Record<string, number> = {}
    for (let i = 0; i < 40; i++) { prev[`p${i}`] = 100; curr[`p${i}`] = 100 + i }
    const m = computeMovement(prev, curr)
    const grey = Object.values(m).filter((x) => x.intensity === 0).length
    expect(grey).toBeGreaterThanOrEqual(Object.keys(m).length / 2)
  })

  /* Self-calibrating: the same absolute change means different things in different weeks. */
  it('scales to the board it is given, not to a fixed threshold', () => {
    const quiet = computeMovement(
      Object.fromEntries([...Array(20)].map((_, i) => [`p${i}`, 100])),
      Object.fromEntries([...Array(20)].map((_, i) => [`p${i}`, 100 + (i === 0 ? 4 : 1)])),
    )
    const loud = computeMovement(
      Object.fromEntries([...Array(20)].map((_, i) => [`p${i}`, 100])),
      Object.fromEntries([...Array(20)].map((_, i) => [`p${i}`, 100 + (i === 0 ? 80 : 20)])),
    )
    /* A four-point move in a quiet week reads as loudly as an eighty-point move in a wild one,
       which is the intent — the reader wants the week's movers, not a physics constant. */
    expect(quiet.p0.intensity).toBeGreaterThan(0)
    expect(loud.p0.intensity).toBeGreaterThan(0)
  })

  /* A new arrival has no measured movement, and guessing one would be a claim we cannot make. */
  it('ignores a player who was not on the board last week', () => {
    const m = computeMovement({ a: 10 }, { a: 10, brandNew: 999 })
    expect(m.brandNew).toBeUndefined()
  })

  it('ignores a player who has dropped off', () => {
    const m = computeMovement({ a: 10, gone: 50 }, { a: 10 })
    expect(m.gone).toBeUndefined()
  })
})
