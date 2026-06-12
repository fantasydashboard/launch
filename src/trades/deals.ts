export type DealClass = 'winWin' | 'leverage' | 'fleece'

export interface DealEval {
  yourGain: number
  theirGain: number
  klass: DealClass
}

// A trade is "leverage" (you exploit their need / your scarcity) once your need-weighted
// gain is at least this multiple of theirs while theirs is still positive.
export const LEVERAGE_RATIO = 1.5

/**
 * Score a 1-for-1 trade by NEED-WEIGHTED value transfer, not balanced raw value — the
 * whole point of category leagues. Each player is a per-category strength vector
 * (direction-normalized: higher = better contribution in that cat). You GET `getter` and
 * GIVE `giver`, so your roster changes by (getter − giver) per cat and theirs by the
 * opposite. Weighting by each side's NEED is what makes a "lopsided" raw trade
 * positive-sum: giving a category you're 1st in costs ~0 because your need there is ~0.
 *
 *  - winWin   — both gains clearly positive, roughly balanced.
 *  - leverage — both positive but yours ≫ theirs (you press their desperation / your
 *               scarcity, and they still benefit). The product's edge.
 *  - fleece   — their gain is ~0 or negative (little reason to accept). Surfaced, flagged.
 */
export function evalDeal(
  getterStrength: Record<string, number>,
  giverStrength: Record<string, number>,
  myNeed: Record<string, number>,
  theirNeed: Record<string, number>,
  statIds: string[],
): DealEval {
  let yourGain = 0
  let theirGain = 0
  for (const c of statIds) {
    const delta = (getterStrength[c] ?? 0) - (giverStrength[c] ?? 0) // your roster's change in c
    yourGain += (myNeed[c] ?? 0) * delta
    theirGain += (theirNeed[c] ?? 0) * -delta // they receive giver, lose getter
  }
  const klass: DealClass =
    theirGain <= 0 ? 'fleece' : yourGain >= theirGain * LEVERAGE_RATIO ? 'leverage' : 'winWin'
  return { yourGain, theirGain, klass }
}
