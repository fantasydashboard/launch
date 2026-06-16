/**
 * Tiering for contested (tossup) categories on the Matchup page.
 *
 * The win-probability engine labels a wide band of categories "tossup", which
 * floods the "fight these" list with near-decided cats. These helpers let the
 * page surface only the true 50/50s and de-emphasize the rest, and route
 * volume/accumulator cats (won by games played, not a waiver move) out of the
 * fight list entirely.
 */

export type ContestedTier = 'coinflip' | 'leanWin' | 'leanLoss'

// A true coin-flip sits within this margin of 50%. Outside it, the category is
// leaning one way and belongs in the muted secondary tier, not "fight these".
const COINFLIP_LO = 45
const COINFLIP_HI = 55

export function classifyContested(myWinPct: number): ContestedTier {
  if (myWinPct >= COINFLIP_LO && myWinPct <= COINFLIP_HI) return 'coinflip'
  return myWinPct > COINFLIP_HI ? 'leanWin' : 'leanLoss'
}

// Accumulator/volume categories are won by accumulating games (innings, at-bats,
// appearances), not by a single waiver move — so the page routes them to the
// volume read instead of asking you to "fight" them. Matched by canonical label.
const ACCUMULATOR_LABELS = new Set(['G', 'GS', 'IP', 'BF', 'TBF', 'AB', 'PA', 'APP', 'GP'])

export function isAccumulatorCat(label: string): boolean {
  return ACCUMULATOR_LABELS.has(label.trim().toUpperCase())
}
