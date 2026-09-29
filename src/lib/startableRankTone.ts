/**
 * Colour for "where this player ranks in the pool his league can actually START", in one place.
 *
 * The sibling of leagueRankTone, and the distinction between them is the whole reason both
 * exist. leagueRankTone takes rank over TEAMS, a fraction that can never exceed 1, and splits
 * the league into fifths. This one takes rank over the STARTABLE POOL, where exceeding 1 is
 * the most important thing the number can say — it means the player is outside the pool
 * altogether — and its top two bands exist to say exactly that. Feeding either scale the
 * other's fraction makes two of five bands unreachable, which is a bug this codebase has
 * already shipped once.
 *
 * WHY IT MOVED HERE. The scale was written twice, verbatim, in PointsTradesView and
 * WeeklyView, and the Today board had a third rule of its own: green for the top fifth of
 * TONIGHT'S POOL, amber past 45%. A share of tonight's pool is not a judgement about
 * startability, because the pool's size is an accident of how many players resolved — when a
 * name-matching fix doubled the hockey pool from 39 defencemen to 87, the green line slid from
 * rank 8 to rank 17 and every colour on the board changed without a single projection moving.
 * The panel's own comment said the cut-off "is the number of seats that position fills across
 * the league, which we do not know here". startableCounts has known it all along.
 */

/** Band edges as a fraction of the startable pool, best to worst. Above 1 is outside the pool. */
const BANDS = [1 / 3, 2 / 3, 1, 1.5]

const TEXT = [
  'text-[#7ee787]', // top third of the starters — an obvious start
  'text-[#3fb950]', // comfortably inside the pool
  'text-dark-text', // the last third — a starter, but a replaceable one
  'text-[#d29922]', // just off the pool — you are reaching
  'text-[#f85149]', // well outside — this is a hole
]

const BAR = [
  'bg-[#7ee787]',
  'bg-[#3fb950]',
  'bg-dark-textMuted/50',
  'bg-[#d29922]/70',
  'bg-[#f85149]/70',
]

const WORDS = [
  'one of the best starts at the position',
  'comfortably a starter',
  'a starter, but a replaceable one',
  'just outside the starters — you are reaching',
  'well outside the starters',
]

function band(fraction: number | null): number | null {
  if (fraction === null || !Number.isFinite(fraction) || fraction <= 0) return null
  for (let i = 0; i < BANDS.length; i++) if (fraction <= BANDS[i]) return i
  return BANDS.length
}

/** Text colour for a rank expressed as a fraction of the startable pool. */
export function startableRankTone(fraction: number | null): string {
  const b = band(fraction)
  return b === null ? 'text-dark-textMuted/60' : TEXT[b]
}

/** Matching fill for a bar beside it. */
export function startableRankBar(fraction: number | null): string {
  const b = band(fraction)
  return b === null ? 'bg-dark-textMuted/40' : BAR[b]
}

/**
 * What the colour means, in words.
 *
 * Goes on the row's title for the same reason leagueRankLabel does: a colour nobody can decode
 * is decoration, and the reader should be able to check our arithmetic rather than infer a
 * scale from five shades.
 */
export function startableRankLabel(
  rank: number,
  pool: number | null,
  position: string,
): string {
  const b = band(pool && pool > 0 ? rank / pool : null)
  if (b === null || !pool) return ''
  return `${position}${rank} tonight — ${pool} ${position} start in this league, so ${WORDS[b]}`
}
