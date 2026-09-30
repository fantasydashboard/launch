import { describe, it, expect } from 'vitest'
import { seatEdge, sideUnknown } from '../seatEdge'

const side = (over: Partial<{ playsToday: boolean; priced: boolean; today: number }> = {}) =>
  ({ playsToday: true, priced: true, today: 0, ...over })

describe('sideUnknown', () => {
  it('is unknown only when a man is playing and we have no number for him', () => {
    expect(sideUnknown(side({ playsToday: true, priced: false }))).toBe(true)
    /* Not playing is a real zero, and we know it. */
    expect(sideUnknown(side({ playsToday: false, priced: false }))).toBe(false)
    expect(sideUnknown(side({ playsToday: true, priced: true, today: 0 }))).toBe(false)
    /* An empty seat is not an unknown one — there is nobody in it. */
    expect(sideUnknown(null)).toBe(false)
  })
})

describe('seatEdge', () => {
  it('scores a seat both sides can be priced', () => {
    expect(seatEdge(side({ today: 4.4 }), side({ today: 1.2 })))
      .toEqual({ edge: expect.closeTo(3.2, 5), known: true })
  })

  /* An empty seat opposite is a real zero: they put nobody there and you score against nobody. */
  it('counts an empty seat opposite as the zero it is', () => {
    expect(seatEdge(side({ today: 4.4 }), null)).toEqual({ edge: 4.4, known: true })
  })

  it('counts a man with no game as the zero he is', () => {
    expect(seatEdge(side({ today: 4.4 }), side({ playsToday: false, priced: false, today: 0 })))
      .toEqual({ edge: 4.4, known: true })
  })

  /*
   * THE ONE THIS EXISTS FOR. Anton Frondell is on the ice tonight and we have no projection for
   * him. Treating that as zero handed his seat to the man opposite at full value and counted it
   * as a seat won — a verdict built on a number we never had.
   */
  it('refuses to call a seat where a man is playing and we cannot price him', () => {
    expect(seatEdge(side({ today: 4.4 }), side({ playsToday: true, priced: false, today: 0 })))
      .toEqual({ edge: 0, known: false })
  })

  it('refuses just the same when the unpriced man is mine', () => {
    expect(seatEdge(side({ playsToday: true, priced: false, today: 0 }), side({ today: 3.1 })))
      .toEqual({ edge: 0, known: false })
  })

  it('never reports an edge alongside known:false', () => {
    const out = seatEdge(side({ today: 9 }), side({ playsToday: true, priced: false, today: 0 }))
    expect(out.known).toBe(false)
    expect(out.edge).toBe(0)
  })
})
