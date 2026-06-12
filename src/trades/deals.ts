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
 * (direction-normalized: higher = better contribution). Only POSITIVE contributions count
 * (a player's weaknesses aren't value you trade), and each side weights by its own need:
 *
 *   yourGain  = Σ need(you,c)·max(0, getter[c])  −  Σ need(you,c)·max(0, giver[c])
 *   theirGain = Σ need(them,c)·max(0, giver[c])  −  Σ need(them,c)·max(0, getter[c])
 *
 * The need vectors are expected to carry a FLOOR (no category fully free): otherwise
 * giving away a star in a category you've "given up" reads as free, which is how a naive
 * scorer recommends trading your best hitter. With the floor, his lost production costs
 * real value, so the deal is rejected.
 *
 *  - winWin   — both gains clearly positive, roughly balanced.
 *  - leverage — both positive but yours ≫ theirs (you press their need / your scarcity,
 *               and they still benefit). The product's edge.
 *  - fleece   — their gain ~0 or negative (little reason to accept). Surfaced, flagged.
 */
export function evalDeal(
  getterStrength: Record<string, number>,
  giverStrength: Record<string, number>,
  myNeed: Record<string, number>,
  theirNeed: Record<string, number>,
  statIds: string[],
): DealEval {
  let getValue = 0
  let giveCost = 0
  let theirGet = 0
  let theirGive = 0
  for (const c of statIds) {
    const g = Math.max(0, getterStrength[c] ?? 0)
    const v = Math.max(0, giverStrength[c] ?? 0)
    getValue += (myNeed[c] ?? 0) * g
    giveCost += (myNeed[c] ?? 0) * v
    theirGet += (theirNeed[c] ?? 0) * v // they receive the giver
    theirGive += (theirNeed[c] ?? 0) * g // they lose the getter
  }
  const yourGain = getValue - giveCost
  const theirGain = theirGet - theirGive
  const klass: DealClass =
    theirGain <= 0 ? 'fleece' : yourGain >= theirGain * LEVERAGE_RATIO ? 'leverage' : 'winWin'
  return { yourGain, theirGain, klass }
}
