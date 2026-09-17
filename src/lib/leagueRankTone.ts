/**
 * Colour for "where this starter ranks against every other team's", in one place.
 *
 * WHAT WENT WRONG. The trades page coloured this with `toneForFraction`, which was written for
 * a different quantity: a rank divided by the STARTABLE POOL, where the value can exceed 1 and
 * "above 1" means the player is outside the pool altogether. Its top two bands, amber and red,
 * exist to say exactly that.
 *
 * Feeding it rank/teams broke it silently, because rank/teams can never exceed 1. Two of the
 * five bands became unreachable and the scale collapsed to: top third bright green, next third
 * green, bottom third grey. In a ten-team league that made SIXTH green — below the median — and
 * left tenth of ten looking identical to seventh. A panel whose whole job is showing you where
 * you need help had no colour for needing help.
 *
 * My Team drew the same panel with its own three-band rule, so the same sixth-place slot was
 * green on one page and neutral on the other.
 *
 * THE SCALE. Even fifths of the league, so every band is reachable and each covers the same
 * share of teams. In a ten-team league that is 1-2 / 3-4 / 5-6 / 7-8 / 9-10, which puts sixth
 * where it belongs: the middle, neither an asset nor a hole.
 */

/** Cut points as a share of the league, best to worst. */
const BANDS = [0.2, 0.4, 0.6, 0.8]

const TEXT = [
  'text-[#7ee787]', // top fifth — a genuine asset
  'text-[#3fb950]', // above the middle
  'text-dark-text', // the middle: neither a strength nor a hole
  'text-[#d29922]', // below the middle — a slot worth upgrading
  'text-[#f85149]', // bottom fifth — the hole to trade for
]

const BAR = [
  'bg-[#7ee787]',
  'bg-[#3fb950]',
  'bg-dark-textMuted/50',
  'bg-[#d29922]/70',
  'bg-[#f85149]/70',
]

const WORDS = [
  'a real edge on the league',
  'better than most of the league',
  'middle of the league',
  'below the middle — worth upgrading',
  'the weakest slot in your lineup',
]

/** Which fifth of the league this rank falls in, 0 = best. Null when the league size is unknown. */
function band(rank: number, teams: number): number | null {
  if (!(teams > 1) || !(rank > 0)) return null
  const f = rank / teams
  for (let i = 0; i < BANDS.length; i++) if (f <= BANDS[i]) return i
  return BANDS.length
}

/** Text colour for a starter's rank among the league's starters at that slot. */
export function leagueRankTone(rank: number, teams: number): string {
  const b = band(rank, teams)
  return b === null ? 'text-dark-textMuted/60' : TEXT[b]
}

/** Matching fill for the bar beside it. */
export function leagueRankBar(rank: number, teams: number): string {
  const b = band(rank, teams)
  return b === null ? 'bg-dark-textMuted/40' : BAR[b]
}

/**
 * What the colour means, in words.
 *
 * A colour nobody can decode is decoration. This goes on the row's title so the reader can
 * check our arithmetic rather than infer a scale from five shades of green.
 */
export function leagueRankLabel(rank: number, teams: number): string {
  const b = band(rank, teams)
  if (b === null) return ''
  return `${rank} of ${teams} — ${WORDS[b]}`
}

/** Bar length: full at first, shortest at last. Rank-based, like the colour. */
export function leagueRankWidth(rank: number, teams: number): number {
  if (!(teams > 1)) return 100
  return Math.round(((teams - rank + 1) / teams) * 100)
}
