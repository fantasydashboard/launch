/**
 * Two-sided trade FIT — how well a deal serves each team, on one comparable 0..1 axis.
 *
 * Fit blends three things: how much it fills a positional HOLE, how much it moves CATEGORIES you
 * need, and whether the VALUE is fair. The blend is centred on 0.5 (an even, do-nothing deal), so a
 * deal that ships value to pad a category you don't need lands BELOW half on your side — the meter
 * can show "good for them, bad for you", not just "how much good".
 *
 * The active tab leads the weighting: on Position, the positional hole dominates and categories are
 * the bonus; on Categories, the reverse. Same formula, different weights — so one fit number ranks
 * every mode (win-win / reach / consolidate) consistently.
 */

export interface FitWeights {
  pos: number
  cat: number
  val: number
}
export interface FitPair {
  you: number // 0..1
  them: number // 0..1
}

// Active-tab-leads presets (weights sum to 1).
export const FIT_WEIGHTS_POSITION: FitWeights = { pos: 0.55, cat: 0.3, val: 0.15 }
export const FIT_WEIGHTS_CATEGORY: FitWeights = { pos: 0.3, cat: 0.55, val: 0.15 }

export interface FitDeal {
  getStr: Record<string, number> // category z-strengths of the player(s) you GET
  giveStr: Record<string, number> // category z-strengths of the player(s) you GIVE
  myNeed: Record<string, number> // 0..1 per statId, your side
  theirNeed: Record<string, number> // 0..1 per statId, their side
  statIds: string[]
  myPosNeed: number // 0..1 — need at the slot your GET fills (0 = fills no hole of yours)
  theirPosNeed: number // 0..1 — need at the slot your GIVE fills for them
  getVal: number // cross value 0..100 you receive
  giveVal: number // cross value 0..100 you ship
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))

// A z-swing of ~±2 in a needed category is a big move; map the need-weighted delta to 0..1 around 0.5.
const CAT_SCALE = 4
// ~±24 cross-value points is a full trade band; map the value delta to 0..1 around 0.5.
const VAL_SCALE = 48

function catFit(
  getStr: Record<string, number>,
  giveStr: Record<string, number>,
  need: Record<string, number>,
  statIds: string[],
): number {
  let raw = 0
  for (const c of statIds) raw += (need[c] ?? 0) * ((getStr[c] ?? 0) - (giveStr[c] ?? 0))
  return clamp01(0.5 + raw / CAT_SCALE)
}

const valFit = (getVal: number, giveVal: number): number => clamp01(0.5 + (getVal - giveVal) / VAL_SCALE)

// Position sub-fit centred at 0.5: filling a hole pushes above neutral (0.75 for a 1-slot hole,
// 1.0 for a 2-slot hole); filling none sits at neutral. Our generators never open a hole on the
// surplus side, so this stays >= 0.5. Centring every sub-fit makes an even deal land at band 2.
const posFit = (need: number): number => clamp01(0.5 + 0.5 * need)

export function computeFit(d: FitDeal, w: FitWeights): FitPair {
  const catYou = catFit(d.getStr, d.giveStr, d.myNeed, d.statIds)
  const catThem = catFit(d.giveStr, d.getStr, d.theirNeed, d.statIds)
  const you = w.pos * posFit(d.myPosNeed) + w.cat * catYou + w.val * valFit(d.getVal, d.giveVal)
  const them = w.pos * posFit(d.theirPosNeed) + w.cat * catThem + w.val * valFit(d.giveVal, d.getVal)
  return { you: clamp01(you), them: clamp01(them) }
}

/** Coarse band 0..4 for the meter (2 = neutral). Keeps the display honest about precision. */
export const fitBand = (f: number): number => Math.max(0, Math.min(4, Math.round(f * 4)))
