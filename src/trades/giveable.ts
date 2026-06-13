/**
 * Give from SURPLUS, not holes.
 *
 * A player is a sound thing to TRADE AWAY only if their value sits at least as much in the
 * categories you dominate (surplus — dead value you can spend) as in the categories you're
 * trying to fix (holes). Otherwise you'd be dealing away help in a category you NEED — e.g.
 * shipping an ace while you're weak in ERA, which makes your weakness worse.
 *
 * Note this is deliberately NOT the same as the hump-shaped "need" used to score offense: a
 * category you're hopelessly last in has low need (you can't catch up), but you still must not
 * GIVE from it — punting a hole by trading its contributors away is strictly bad. Surplus is
 * specifically where you WIN by a margin, so the production is wasted and free to move.
 *
 * @param strength per-category z-vector for the player (higher = better contribution)
 * @param surplusCats statIds you dominate (e.g. top-2 in the league)
 * @param holeCats    statIds you're trying to fix (bottom-tier)
 */
export function isGiveable(
  strength: Record<string, number>,
  surplusCats: string[],
  holeCats: string[],
): boolean {
  const surplus = surplusCats.reduce((t, c) => t + Math.max(0, strength[c] ?? 0), 0)
  const hole = holeCats.reduce((t, c) => t + Math.max(0, strength[c] ?? 0), 0)
  return surplus >= hole
}
