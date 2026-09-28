/**
 * Goals rebuilt from shots and a regressed finishing rate.
 *
 * WHY NOT PROJECT GOALS DIRECTLY. Measured over three completed seasons, roughly 470 skaters
 * with 40+ games and 40+ shots in each pair:
 *
 *     shots per game   r = 0.889, 0.875     a skill, and a stable one
 *     goals per game   r = 0.814, 0.797
 *     shooting pct     r = 0.646, 0.631     the part that does not carry
 *
 * Volume persists; finishing persists much less. A goal rate is the product of the two, so
 * projecting it as one number quietly carries a hot season's finishing into next year at full
 * weight. Tim Stutzle went 0.240, 0.293, 0.425 goals a game over three seasons and our board
 * projected 0.385 — fifth among centres, against an analyst baseline's fifteenth. Almost all
 * of that jump was finishing, which is the half least likely to repeat.
 *
 * SO: goals = projected shots x a shooting percentage pulled toward the positional mean by
 * exactly what the measurement says survives. A volume shooter keeps his goals because his
 * shots are real. A man who shot the lights out for one season does not.
 *
 * IT IS NOT A HAIRCUT. Regression is two-directional and the mean is preserved: a skater who
 * finished badly is pulled UP by the same rule. The distribution narrows; the average does
 * not move.
 */

/**
 * How much of a skater's edge in finishing survives to next season.
 *
 * Measured: r = 0.646 (2023-24 -> 2024-25) and 0.631 (2024-25 -> 2025-26). Averaged rather
 * than taking the kinder end.
 */
export const SHOOTING_PERSISTENCE = 0.64

/** Below this, a shooting percentage is a rumour rather than a rate. */
export const MIN_SHOTS_PER_GAME = 0.5

export interface HasShooting { position?: string; perGame: Record<string, number> }

const groupOf = (position?: string) => (String(position ?? '').toUpperCase() === 'D' ? 'D' : 'F')

/**
 * Rebuild the goal rate of a whole pool from shots and regressed finishing.
 *
 * Whole-pool, like the plus-minus regression and for the same reason: the mean being regressed
 * toward has to come from the population being regressed, and forwards and defencemen finish
 * at genuinely different rates — one pooled mean would drag every defenceman upward.
 *
 * Returns new objects. These rates are shared by every hockey surface and a board rewriting
 * them in place would be changing another board's inputs from across the app.
 */
export function regressShooting<T extends HasShooting>(
  rates: T[],
  persistence = SHOOTING_PERSISTENCE,
): T[] {
  if (!rates.length) return rates

  /* Pooled finishing rate per group: total goals over total shots, NOT the average of each
     man's percentage — that would let a fourth liner's twelve shots count like a sniper's
     three hundred. */
  const totals = new Map<string, { g: number; s: number }>()
  for (const r of rates) {
    const shots = r.perGame?.shots ?? 0
    const goals = r.perGame?.goals ?? 0
    if (!(shots > 0)) continue
    const k = groupOf(r.position)
    const t = totals.get(k) ?? { g: 0, s: 0 }
    t.g += goals; t.s += shots
    totals.set(k, t)
  }

  return rates.map((r) => {
    const shots = r.perGame?.shots ?? 0
    const goals = r.perGame?.goals ?? 0
    /* Too few shots to have a finishing rate worth regressing, and dividing by them would
       manufacture one. His goals stand as projected. */
    if (!(shots >= MIN_SHOTS_PER_GAME) || !(goals >= 0)) return r

    const t = totals.get(groupOf(r.position))
    if (!t || !(t.s > 0)) return r
    const groupPct = t.g / t.s
    const own = goals / shots
    const regressed = groupPct + (own - groupPct) * persistence
    return { ...r, perGame: { ...r.perGame, goals: shots * regressed } }
  })
}
