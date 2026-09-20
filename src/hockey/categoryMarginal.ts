import type { HockeyProjection } from './hockeyValue'
import { createLedgerEngine, type LedgerColumn, type LedgerInput } from './categoryLedger'

/**
 * What a player is worth to THIS roster, in a league decided column by column.
 *
 * THE NUMBER THE BOARD SORTS BY AFTER YOUR FIRST FEW PICKS. A summed z-score answers "how good
 * is he" — a fact about the player, true before the draft starts and still true in round
 * fourteen. That is the right question exactly once, on the clock for pick one. Every pick
 * after that, the question is "what does he do for ME", and the two answers come apart fast:
 * a fourth elite hits man is a genuinely excellent hockey player and buys you nothing, because
 * you already had hits locked and the column does not pay twice. Meanwhile a modest shot
 * blocker who carries you from seventh to third in blocks has just moved a column from lost to
 * won, which is the entire currency of the format.
 *
 * SO VALUE IS MEASURED IN COLUMNS GAINED, NOT UNITS GAINED. Take the ledger as it stands, add
 * the candidate, and ask how much closer that puts you to winning each column. Summed across
 * the nine, that is his worth to you — and it re-prices after every pick you make, which is
 * the thing a static ranked list structurally cannot do.
 *
 * WHY THE WIN CURVE IS SMOOTH AND THE LEDGER'S IS NOT. The ledger reports the plain, checkable
 * truth: the share of opponents you currently beat. That is a step function — a player can add
 * real production and move it not at all, until he crosses somebody. Correct for reporting,
 * useless for ranking, because four hundred candidates would tie at zero. Here the same
 * standing is read through a logistic on the margin, so getting closer to the team above you
 * counts for something even before you pass them.
 */

/** A candidate, priced against the roster you actually have. */
export interface MarginalRow {
  playerKey: string
  /** Columns-worth of win probability added, summed across everything you are contesting. */
  gain: number
  /** Per column: how much win probability he adds there. Negative is real and shown. */
  byCategory: Record<string, number>
  /** Columns he flips from not-winning to winning outright. */
  flips: string[]
  /**
   * Columns he actively DAMAGES.
   *
   * A points league has no equivalent: a bad player there scores zero and zero is the floor.
   * A sub-.900 goalie does not fail to help save percentage, he drags the team's rate down —
   * so starting him is worse than starting nobody, and the board has to be able to say so.
   */
  harms: string[]
}

export interface MarginalInput extends LedgerInput {
  /** Who is still on the board. Anyone drafted is not a candidate. */
  candidates: string[]
  /** Cap on how many to price, highest raw value first. Whole board when absent. */
  limit?: number
}

/**
 * How decisive a column is, in the units that column is measured in.
 *
 * A margin of one blocked shot means nothing; a margin of 0.05 in save percentage is a
 * landslide, so the curve cannot use a fixed width. Two things set the scale, and both are
 * needed.
 *
 * THE OPPONENTS' SPREAD, WITH ME EXCLUDED. Measured against a field I am part of, my own
 * improvement lifts the mean and inflates the spread by nearly as much as it lifts me, and the
 * standardised edge comes out unchanged — adding an elite player scored as exactly zero. The
 * thing you are trying to beat cannot include you.
 *
 * A FLOOR OF ONE PLAYER'S WORTH. Early in a draft every opponent is the same pile of
 * replacement bodies, so their spread is nearly nil and any margin divides out to infinity —
 * which saturated the curve and made all fifty-seven goalies score an identical +0.49. The
 * floor is what a single good player swings in that column, which is the natural unit: a
 * column margin means something relative to what one pick can move.
 */
function columnScale(col: LedgerColumn, playerScale: number): number {
  const floor = playerScale > 1e-9 ? playerScale : Math.abs(col.oppMean) * 0.05
  return Math.max(col.oppSpread, floor, 1e-9)
}

/** Smooth chance of taking this column, from how far clear of the opponents I sit. */
function softWin(col: LedgerColumn, playerScale: number): number {
  const edge = (col.reverse ? col.oppMean - col.mine : col.mine - col.oppMean)
    / columnScale(col, playerScale)
  return 1 / (1 + Math.exp(-edge * 1.6))
}

/**
 * What one good player is worth in each column — the floor for the curve above.
 *
 * Taken as the spread among the players who actually get drafted rather than the whole feed,
 * because the feed's tail is four hundred names nobody rosters and including them describes a
 * population no league contains.
 */
function playerScales(
  projections: Record<string, HockeyProjection>,
  cats: { key: string }[],
  drafted: number,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const cat of cats) {
    const vals = Object.values(projections)
      .map((p) => Number(p.stats[cat.key]))
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => b - a)
      .slice(0, Math.max(8, drafted))
    if (vals.length < 2) { out[cat.key] = 0; continue }
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length
    out[cat.key] = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length)
  }
  return out
}

/** A column counts toward value only if you are actually contesting it. */
const contested = (col: LedgerColumn) => col.status !== 'punted'

export function buildCategoryMarginal(input: MarginalInput): MarginalRow[] {
  const { projections, candidates, limit } = input
  const engine = createLedgerEngine(input)
  const base = engine.ledger
  if (!base.length) return []

  const scales = playerScales(
    projections, input.categories,
    Object.keys(input.picksByTeam).length * Math.max(1, input.rosterSize),
  )
  const baseWin = new Map(base.map((c) => [c.key, softWin(c, scales[c.key] ?? 0)]))
  const baseStatus = new Map(base.map((c) => [c.key, c.status]))

  /* Price the plausible ones. Pricing all 450 is affordable but pointless — nobody drafts the
     four-hundredth-best player, and the limit keeps the sort honest about what it examined. */
  const pool = typeof limit === 'number' ? candidates.slice(0, limit) : candidates

  const rows: MarginalRow[] = []
  for (const playerKey of pool) {
    const proj: HockeyProjection | undefined = projections[playerKey]
    if (!proj) continue

    const after = engine.withPlayer(playerKey)
    const byCategory: Record<string, number> = {}
    const flips: string[] = []
    const harms: string[] = []
    let gain = 0

    for (const col of after) {
      if (!contested(col)) continue
      const delta = softWin(col, scales[col.key] ?? 0) - (baseWin.get(col.key) ?? 0.5)
      byCategory[col.key] = delta
      gain += delta
      if (col.status === 'winning' && baseStatus.get(col.key) !== 'winning') flips.push(col.key)
      /* A real drag, not a rounding artefact. */
      if (delta < -0.01) harms.push(col.key)
    }

    rows.push({ playerKey, gain, byCategory, flips, harms })
  }

  return rows.sort((a, b) => b.gain - a.gain)
}
