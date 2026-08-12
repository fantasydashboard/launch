/**
 * The call.
 *
 * The recommendation is only as useful as its stated reasoning — on a 90-second
 * clock you need to know WHY in one glance, and a reason you can't verify is worse
 * than none. So every reason here cites a number the model actually computed. If a
 * value isn't available, the reason is omitted rather than softened into prose.
 */

import type { BoardRow } from './board'
import type { PositionPrior } from './tendencies'

export interface Reason {
  kind: 'vona' | 'tendency' | 'tier' | 'survival'
  text: string
}

export interface Alternate {
  row: BoardRow
  note: string
}

export interface Recommendation {
  pick: BoardRow
  reasons: Reason[]
  alternates: Alternate[]
}

export interface RecommendContext {
  /** My next overall pick, for phrasing. Null when I have none left. */
  nextPick: number | null
  /** Managers picking before my next turn, with their priors — drives the tendency reason. */
  upcoming?: { teamKey: string; teamName: string; prior: PositionPrior }[]
  /** Human label for the round range the tendency was measured over. */
  roundRange?: string
  /** The tier the BOARD shows for this player — the reason must not disagree. */
  displayTier?: number
  /** How many players remain in the pick's tier at his position, after taking him. */
  tierRemaining?: number
  /** Value drop to the next tier at the pick's position. */
  nextTierDrop?: number
  maxAlternates?: number
}

/**
 * Never 0% and never 100%.
 *
 * The simulation runs a few hundred times; nobody taken in any of them reads as
 * 0/300, which is not the same as impossible. Measurement agrees — players shown
 * at ~1% to last did last a tenth of the time. Printing a certainty the model
 * cannot support is the one number a reader has no way to discount.
 */
const pct = (p: number) => `${Math.min(99, Math.max(1, Math.round(p * 100)))}%`
const pts = (n: number) => `${n >= 0 ? '+' : ''}${Math.round(n * 10) / 10}`

/**
 * The strongest tendency among upcoming managers for the pick's position — only
 * counted when that manager actually has history, and always reported with the
 * sample so the reader can weigh it.
 */
function tendencyReason(pos: string, ctx: RecommendContext): Reason | null {
  const candidates = (ctx.upcoming ?? [])
    .filter((u) => u.prior.sample > 0 && (u.prior.counts?.[pos] ?? 0) > 0)
    .sort((a, b) => (b.prior.byPosition[pos] ?? 0) - (a.prior.byPosition[pos] ?? 0))
  const top = candidates[0]
  if (!top) return null
  const share = top.prior.byPosition[pos] ?? 0
  // Below a coin flip this isn't a tendency worth citing.
  if (share < 0.4) return null

  // The COUNT is what the manager actually did; the share is a shrunk estimate
  // used for prediction. Reporting share x sample would invent an observation.
  const hits = top.prior.counts?.[pos] ?? 0
  const range = ctx.roundRange ? ` in ${ctx.roundRange}` : ''
  return {
    kind: 'tendency',
    text: `${top.teamName} picks before you and has taken ${pos} with ${hits} of his last ${top.prior.sample} picks${range}`,
  }
}

export function buildRecommendation(
  rows: BoardRow[],
  ctx: RecommendContext,
): Recommendation | null {
  if (!rows?.length) return null

  const pick = rows[0]
  const reasons: Reason[] = []

  // 1. VONA — the core of the decision.
  //
  // Printed in PROJECTED POINTS, not in the ranking scale. When an analyst list
  // is driving the order, `vona` is denominated in re-seated values: a real
  // quantity, but not one the reader can check against the points column, which
  // is the only way they can check it at all. If our own points don't support the
  // claim, the claim isn't made — the tier and survival lines still stand.
  const edge = pick.vonaPoints ?? pick.vona
  if (edge > 0) {
    // Name the comparison he is actually in. Someone headed for a flex is not
    // being measured against his own position, and saying he is turns a correct
    // number into a wrong argument: "+35 over your next-best TE" reads as tight
    // end scarcity when the TE slot is already filled and he is competing with
    // every receiver and back on the board.
    const against = pick.viaFlex ? 'flex option' : pick.position
    reasons.push({
      kind: 'vona',
      text: ctx.nextPick
        ? `${pts(edge)} pts over your next-best ${against} at ${ctx.nextPick}`
        : `${pts(edge)} pts over the next-best ${against} available`,
    })
  }

  // 2. Who picks before you, and what they do.
  const tendency = tendencyReason(pick.position, ctx)
  if (tendency) reasons.push(tendency)

  // 3. Tier cliff — often the most actionable line on the screen.
  if (typeof ctx.nextTierDrop === 'number' && ctx.nextTierDrop > 0 && typeof ctx.tierRemaining === 'number') {
    reasons.push({
      kind: 'tier',
      text:
        ctx.tierRemaining === 0
          ? `Last ${pick.position} in tier ${ctx.displayTier ?? pick.tier} — next tier drops ${Math.round(ctx.nextTierDrop)} pts`
          : `${ctx.tierRemaining} more ${pick.position} in tier ${ctx.displayTier ?? pick.tier} — next tier drops ${Math.round(ctx.nextTierDrop)} pts`,
    })
  }

  // 4. Survival, only when it actually argues for acting now.
  if (pick.survival < 0.5) {
    reasons.push({
      kind: 'survival',
      text: `${pct(1 - pick.survival)} chance he's gone before your next pick`,
    })
  }

  const maxAlternates = ctx.maxAlternates ?? 3
  const alternates: Alternate[] = rows.slice(1, 1 + maxAlternates).map((row) => ({
    row,
    note:
      row.survival >= 0.7
        ? ctx.nextPick
          ? `likely there at ${ctx.nextPick}`
          : 'likely still available'
        : `${pct(1 - row.survival)} chance he's gone`,
  }))

  return { pick, reasons, alternates }
}
