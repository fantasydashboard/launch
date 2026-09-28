import { describe, it, expect } from 'vitest'
import { regressShooting, SHOOTING_PERSISTENCE, MIN_SHOTS_PER_GAME } from '../shootingRegression'

const sk = (goals: number, shots: number, position = 'C') => ({ position, perGame: { goals, shots, assists: 0.5 } })
const pct = (r: any) => r.perGame.goals / r.perGame.shots

describe('regressShooting', () => {
  /* A hot finisher comes down; the pool average is what he comes down toward. */
  it('pulls a hot shooter toward the pool finishing rate', () => {
    const pool = [sk(0.5, 2.0), sk(0.2, 2.0), sk(0.2, 2.0), sk(0.2, 2.0)]   // pool pct = 0.1375
    const out = regressShooting(pool)
    expect(pct(out[0])).toBeLessThan(pct(pool[0]))
    expect(pct(out[0])).toBeGreaterThan(0.1375)
  })

  /* And it is NOT a haircut — a cold finisher is pulled up by the same rule. */
  it('pulls a cold shooter up', () => {
    const pool = [sk(0.02, 2.0), sk(0.3, 2.0), sk(0.3, 2.0), sk(0.3, 2.0)]
    const out = regressShooting(pool)
    expect(pct(out[0])).toBeGreaterThan(pct(pool[0]))
  })

  it('keeps volume: a shooter with more shots keeps more goals', () => {
    const pool = [sk(0.3, 3.0), sk(0.3, 1.5), sk(0.2, 2.0), sk(0.2, 2.0)]
    const out = regressShooting(pool)
    expect(out[0].perGame.goals).toBeGreaterThan(out[1].perGame.goals)
  })

  /*
   * A finishing rate off half a shot a game is a rumour. Dividing by it would manufacture a
   * percentage out of nothing and then regress that, which is worse than leaving him alone.
   */
  it('leaves a player with too few shots untouched', () => {
    const thin = sk(0.2, MIN_SHOTS_PER_GAME - 0.01)
    const out = regressShooting([thin, sk(0.3, 3), sk(0.3, 3)])
    expect(out[0].perGame.goals).toBe(0.2)
  })

  /* Defencemen finish at a different rate than forwards; one pooled mean would drag every
     defenceman upward toward a forward's percentage. */
  it('regresses defencemen toward defencemen', () => {
    const pool = [sk(0.30, 3.0, 'C'), sk(0.30, 3.0, 'C'), sk(0.06, 2.0, 'D'), sk(0.06, 2.0, 'D')]
    const out = regressShooting(pool)
    expect(pct(out[2])).toBeCloseTo(0.03, 6)      // already at the D mean: unchanged
  })

  it('is identity at persistence 1', () => {
    const pool = [sk(0.4, 2.0), sk(0.1, 2.0)]
    const out = regressShooting(pool, 1)
    expect(out[0].perGame.goals).toBeCloseTo(0.4, 9)
  })

  it('does not mutate, and survives an empty pool', () => {
    const pool = [sk(0.4, 2.0), sk(0.1, 2.0)]
    regressShooting(pool)
    expect(pool[0].perGame.goals).toBe(0.4)
    expect(regressShooting([])).toEqual([])
  })

  it('ships at less than full persistence', () => {
    expect(SHOOTING_PERSISTENCE).toBeGreaterThan(0)
    expect(SHOOTING_PERSISTENCE).toBeLessThan(1)
  })
})
