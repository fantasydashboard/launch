import type { CatState } from './categoryBoard'

/**
 * What a player is distinctively good at, among the men you could actually start tonight.
 *
 * THE PROBLEM THIS SOLVES. The tag beside each ranked player named the columns he moved most,
 * which on a hockey board meant every single row read "SOG" — shots are the highest-volume
 * counting stat there is, so the biggest contribution of nearly every skater is shots. The tag
 * was true and told a reader nothing: a column that names itself on all ten rows cannot explain
 * why row one is above row ten.
 *
 * Distinctive is a comparison, so it needs something to compare against. The right yardstick is
 * not zero — it is what a typical available start gives you in that column. A skater who takes
 * three shots when everyone takes three is not a shots play; one who takes six is. Measured
 * against the pool, the common columns go quiet by themselves and what is left is the reason
 * this player rather than that one.
 *
 * THE SCORE IS DELIBERATELY NOT CHANGED BY THIS. How much a start is worth is the total
 * movement it buys you, and that is what the ranking sorts on. This answers the different
 * question of how he differs from the alternatives, which is what a label should say.
 */

/** A column has to carry this share of the player's best surplus before it is worth naming. */
const NAMEABLE = 0.2

/**
 * How far above typical a player has to be before the difference is a difference.
 *
 * Any surplus at all is too low a bar: among three interchangeable skaters one is necessarily
 * a hair above the median, and labelling him for it reintroduces exactly the noise this module
 * exists to remove — a tag that fires on everyone explains nothing. A quarter more than a
 * typical start is a gap a manager would actually notice: on NHL shot rates it separates
 * roughly the top third from the field rather than the top half-plus-one.
 *
 * A fraction of the typical line rather than of the pool's spread, which would be the more
 * principled yardstick and needs a second pass to estimate. This is the interpretable version
 * of the same idea, and it is honest about being a threshold rather than a measurement.
 */
const MATERIAL = 0.25

/**
 * The typical line among the men on the board, column by column.
 *
 * MEDIAN, NOT MEAN. One goalie's forty saves or one enforcer's twelve penalty minutes drags a
 * mean far enough that the merely-average look distinctive. The median is what a typical start
 * actually gives you, which is the comparison a manager is making.
 */
export function medianLine(lines: Array<Record<string, number>>, keys: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const key of keys) {
    const values: number[] = []
    for (const line of lines) {
      const v = Number(line[key])
      if (Number.isFinite(v)) values.push(v)
    }
    if (!values.length) { out[key] = 0; continue }
    values.sort((a, b) => a - b)
    const mid = values.length >> 1
    out[key] = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2
  }
  return out
}

/**
 * The columns where this line beats a typical one by enough to be worth saying, best first.
 *
 * Empty is a real answer: a player who is at or below the typical start everywhere is not
 * distinctively anything, and naming his biggest column would imply otherwise. The ranking
 * still carries him at whatever his total is worth.
 */
export function standoutColumns(
  line: Record<string, number>,
  state: CatState[],
  baseline: Record<string, number>,
): string[] {
  const surplus: Array<{ key: string; worth: number }> = []

  for (const c of state) {
    /* Settled and ratio columns price at zero, so being distinctive in one buys nothing —
       the same rule the score uses, for the same reason. */
    if (c.unitValue <= 0) continue
    const units = Number(line[c.key])
    if (!Number.isFinite(units)) continue
    const typical = Number(baseline[c.key]) || 0
    const over = units - typical
    if (over <= 0) continue
    /*
     * Scaled by the SIZE of a typical line, not its signed value.
     *
     * Plus/minus is routinely negative across a pool, and `over < MATERIAL * typical` can never
     * be true against a negative threshold — so every signed column passed as material however
     * slim the surplus, and an otherwise unremarkable skater got labelled a plus/minus play for
     * being one goal better than a slightly-negative median. Against a typical line of zero
     * there is no proportion to take at all, and any production is genuinely distinctive:
     * nobody else on the board produces any.
     */
    if (typical !== 0 && over < MATERIAL * Math.abs(typical)) continue
    surplus.push({ key: c.key, worth: over * c.unitValue })
  }

  const best = surplus.reduce((m, x) => Math.max(m, x.worth), 0)
  return surplus
    .filter((x) => best > 0 && x.worth >= NAMEABLE * best)
    .sort((a, b) => b.worth - a.worth)
    .map((x) => x.key)
}
