/**
 * What a year does to a skater's scoring rate.
 *
 * WHY IT EXISTS. The board had no age term at all. A player's projection was his past seasons
 * carried forward unchanged, which quietly asserts that a 22-year-old and a 35-year-old are
 * both exactly what they were last year. They are not, and the error runs in opposite
 * directions at the two ends — which is why it survived so long, since it cancels in any
 * aggregate that mixes them.
 *
 * It showed up twice before it was named. Against a category consensus we were low on young
 * risers (Bedard, Fantilli, Cooley). Against a points baseline we were high on productive
 * veterans (Ovechkin our 50 to their 120, Hyman 26 to 89, Tkachuk 22 to 71) — and the gap was
 * never games, it was rate: Ovechkin 82 games against their 78, but 71 projected points
 * against their 54.
 *
 * MEASURED HERE, NOT IMPORTED. The delta method over three completed seasons: every skater
 * appearing in two adjacent years with at least 40 games in both, his points-per-game in the
 * second over the first, bucketed by his age in the first. 986 pairs. Comparing a man to
 * himself is the whole point — it cannot be fooled by better players arriving or worse ones
 * leaving.
 *
 * THE KNOWN WEAKNESS, stated because it changes how far to trust the old end: survivor bias.
 * A player who collapses is not re-signed and never appears in the second season, so measured
 * decline after 32 is gentler than real decline. The curve is therefore conservative where it
 * is least certain, which is the right direction for that error.
 *
 * MEDIANS, NOT MEANS. A handful of players doubling off a low base drags a mean badly — age 30
 * reads 1.067 weighted and 0.989 median, and the median is the one describing the typical
 * player.
 */

/** Multiplier applied going from this age to the next. Ages below/above clamp to the ends. */
export const AGE_CURVE: Record<number, number> = {
  21: 1.111, 22: 1.091, 23: 1.077, 24: 1.012, 25: 1.045,
  26: 0.980, 27: 1.003, 28: 0.952, 29: 0.949, 30: 0.989,
  31: 0.994, 32: 0.896, 33: 0.898, 34: 0.885, 35: 0.900,
}

const MIN_AGE = 21
const MAX_AGE = 35

/**
 * How far the curve is applied. 0 ignores age entirely; 1 applies it as measured.
 *
 * Swept against two independent outside boards rather than chosen.
 */
export const AGE_STRENGTH = 1

const stepFor = (age: number) => AGE_CURVE[Math.min(MAX_AGE, Math.max(MIN_AGE, Math.round(age)))] ?? 1

/**
 * The multiplier carrying a rate from one age to another.
 *
 * Ageing a season forward is a product of single-year steps, not one step scaled — two years
 * from 33 to 35 is 0.898 x 0.885, and treating it as a doubled single step would be a
 * different and wrong number. Going BACKWARDS divides, so a projection can be stated at an
 * age earlier than the sample if a caller ever needs it.
 */
export function ageFactor(fromAge: number, toAge: number, strength = AGE_STRENGTH): number {
  if (!Number.isFinite(fromAge) || !Number.isFinite(toAge)) return 1
  const from = Math.round(fromAge)
  const to = Math.round(toAge)
  if (from === to) return 1

  let f = 1
  if (to > from) for (let a = from; a < to; a++) f *= stepFor(a)
  else for (let a = to; a < from; a++) f /= stepFor(a)

  /* Interpolated toward 1 rather than toward nothing: strength 0 must be a no-op, and any
     value between must move proportionally along the curve it measured. */
  return 1 + (f - 1) * strength
}

/** Age in whole years at a given season's start. Null when the birth date is unknown. */
export function ageAtSeason(birthDate: string | undefined, seasonStartYear: number): number | null {
  if (!birthDate || birthDate.length < 4) return null
  const born = Number(birthDate.slice(0, 4))
  if (!Number.isFinite(born)) return null
  const age = seasonStartYear - born
  return age > 10 && age < 60 ? age : null
}
