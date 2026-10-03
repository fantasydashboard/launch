/**
 * Who comes off the roster to make room — the other half of every add.
 *
 * THE BUG THIS EXISTS TO PREVENT. The cut used to be "the cheapest man on your bench who has a
 * game tonight", ranked by his value TONIGHT. On a full Saturday slate, in a category league,
 * that handed back Brayden Point: a genuine star whose nightly score was low only because he is
 * an assists player and assists happened to be the column we were losing. Three separate
 * streaming adds, each worth about three points for one night, all proposed cutting him
 * permanently.
 *
 * Tonight's score answers "should he start", which is a different question from "is he
 * expendable". A man is expendable because of what he is worth over the rest of the season, and
 * that is what this ranks on. The schedule does not enter into it at all: a star idle tonight
 * is not a cut, and a fourth-liner playing tonight still is.
 */

export interface DropCandidate {
  playerKey: string
  name: string
  /** What he is worth over the rest of the season — NOT his value tonight. */
  seasonValue: number
  /** Raw platform status; anyone out or on IL occupies a different kind of seat. */
  status: string
}

export interface DroppableOptions {
  /** Returns 'out' for a man who cannot play — he is not the cut, he is a stashed asset. */
  availability: (status: string | undefined | null) => string
}

/**
 * The least valuable body you could actually cut, or null when there is nobody to name.
 *
 * Players who are out or on IL are excluded: dropping one is usually wrong, and on a thin
 * roster they are frequently the lowest number on the board, which is exactly how an injured
 * star gets offered up as the cost of a streaming add.
 */
export function cheapestDroppable<T extends DropCandidate>(
  bench: T[],
  opts: DroppableOptions,
): T | null {
  const eligible = (bench ?? []).filter((b) => opts.availability(b.status) !== 'out')
  if (!eligible.length) return null
  return eligible.reduce((cheapest, b) => (b.seasonValue < cheapest.seasonValue ? b : cheapest))
}

/**
 * Whether an add is worth making at all, given what it costs.
 *
 * A one-night gain against a permanent loss. Even with the right man named as the cut, handing
 * back someone the rest of the season values highly to gain a few points for one evening is a
 * bad trade — and the panel states the gain in bold and the cost in small grey text, so the
 * asymmetry does not read as one. An add whose cut is worth MORE than the man arriving is not
 * an upgrade in any time frame, and that is the floor this enforces.
 */
export function addIsWorthTheCut(
  addSeasonValue: number,
  drop: { seasonValue: number } | null,
): boolean {
  if (!drop) return true
  return addSeasonValue > drop.seasonValue
}
