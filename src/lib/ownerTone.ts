/**
 * What colour says who holds a player, in one place.
 *
 * THIS HAS DRIFTED BEFORE. RankingsView worked out its free-agent colour and wrote the
 * reasoning down; DailyRankingsPanel then picked a light green anyway and had to be corrected
 * to match, its own comment noting that "the reasoning was written down; this panel simply did
 * not inherit it". Two boards answering the same question in two colours is the bug. A shared
 * token is how it stops happening a third time.
 *
 * WHY FREE AGENTS ARE NOT A COLOUR AT ALL.
 *
 * The hue was boxed in from every side. Lime is "mine" and owns the top of the palette. Amber
 * means ROSTERED on the waiver card and in the dynasty columns — a hundred-odd usages saying
 * the exact opposite of available. Green blurs into lime at this text size, which is what sent
 * the first attempt back. Gold is the most-claimed accent in the app, seven hundred-odd uses
 * across CTAs, grades and eyebrows. Teal was chosen as the one hue far from all of them, and
 * it read as foreign for exactly that reason: nothing else on the page speaks it.
 *
 * So availability is marked by the ABSENCE of a claimed colour, and carried by weight instead.
 * Yours is lime, somebody else's is muted grey, and the man nobody holds is the plain bright
 * text the page is already made of — the brightest thing in a column of grey team names,
 * without borrowing a meaning from anywhere else. It is the same inversion RankingsView
 * already uses for the badge, where absence of a chip means rostered.
 */

export const OWNER_TONE = {
  mine: 'text-primary',
  free: 'text-white font-semibold',
  taken: 'text-dark-textMuted/60',
} as const

/** The "free" chip on a row, where the badge needs a ground of its own. */
export const FREE_BADGE = 'bg-white/10 text-white'

/** A selected filter chip, outlined — the daily board's style. */
export const OWNER_CHIP_OUTLINE = {
  mine: 'border-primary text-primary',
  free: 'border-white text-white',
  taken: 'border-dark-textMuted/60 text-dark-text',
} as const

/** A selected filter chip, filled — the rankings board's style. */
export const OWNER_CHIP_FILLED = {
  mine: 'bg-primary font-bold text-dark-bg',
  free: 'bg-white font-bold text-dark-bg',
  taken: 'bg-dark-textMuted/70 font-bold text-dark-bg',
} as const
