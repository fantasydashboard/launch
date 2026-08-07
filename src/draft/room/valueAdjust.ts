/**
 * A light market anchor on raw projected value, applied before the board ranks.
 *
 * A handcuff-contingency model lived here too and was removed after measurement:
 * crediting backup running backs with a share of their starter's value made
 * agreement with a trusted analyst WORSE at every share tried. The analyst's real
 * bias turned out to be a general premium on running backs rather than a
 * handcuff-specific one, so the adjustment overshot on individuals while missing
 * the actual pattern. Kept in the history, not in the code.
 */

/** How much of the blend the market gets. Measured: 0.25 buys most of the
 *  agreement gain while leaving our positional math in charge. Past ~0.25 you are
 *  buying consensus and discarding the correction that makes the board ours. */
export const DEFAULT_ADP_WEIGHT = 0.25

/**
 * Pull values gently toward the market.
 *
 * The market's opinion is expressed as a draft position, so it is converted to
 * points the same way an analyst's order is: the player the market drafts Nth
 * takes the value our Nth-best holds. Then we blend.
 *
 * Its real job is not agreement — it is a guardrail. When our single projection
 * source is simply wrong about someone, consensus drags him back toward sanity.
 * Players with no ADP keep their own value; absence of a market opinion is not
 * evidence of anything.
 */
export function applyAdpAnchor(
  players: { playerKey: string; value: number }[],
  adpByKey: Record<string, number>,
  weight: number = DEFAULT_ADP_WEIGHT,
): Record<string, number> {
  const out: Record<string, number> = {}
  const list = players ?? []
  if (!list.length) return out
  for (const p of list) out[p.playerKey] = p.value

  const w = Math.min(1, Math.max(0, weight))
  if (w === 0) return out

  const withAdp = list
    .filter((p) => typeof adpByKey?.[p.playerKey] === 'number')
    .sort((a, b) => adpByKey[a.playerKey] - adpByKey[b.playerKey])
  if (!withAdp.length) return out

  // The value slots those players already occupy, best first — the market's
  // ordering re-seated onto our curve.
  const slots = withAdp.map((p) => p.value).sort((a, b) => b - a)
  withAdp.forEach((p, i) => {
    const implied = slots[i] ?? p.value
    out[p.playerKey] = (1 - w) * p.value + w * implied
  })
  return out
}
