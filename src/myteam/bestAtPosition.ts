import { coversSlot } from '@/trades/positionalLandscape'
import { eligOf } from '@/trades/lineupEligibility'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { ValueByKey } from '@/myteam/playerValue'

/**
 * The best body a team holds at a position — the name behind "you buy C".
 *
 * WHY. The best-partners panel listed four managers and told you the same thing about each:
 * "you buy C", "you buy C", "you buy C", "you buy C". Every line was true — the landscape had
 * this roster eleventh of twelve at centre — and four identical recommendations are not four
 * pieces of information. The question a reader actually has at that point is WHICH centre, and
 * the answer is sitting in the pool.
 *
 * Returns null rather than a placeholder when the team has nobody priced there, because "they
 * have nobody" and "we could not price him" both end up looking like a weak suggestion, and
 * only one of them is about the roster.
 */
export function bestBodyAt(input: {
  pool: PointsPoolPlayer[]
  valueByKey: ValueByKey
  teamKey: string
  position: string
  sport?: string
}): { name: string; points: number } | null {
  const { pool, valueByKey, teamKey, position, sport } = input
  let best: { name: string; points: number } | null = null
  for (const p of pool) {
    if (p.teamKey !== teamKey) continue
    if (!coversSlot(eligOf(p), position, sport)) continue
    const v = valueByKey[p.playerKey]
    /* Unpriced is not zero — skip him rather than let an absent projection name the answer. */
    if (!v) continue
    const points = Number(v.total) || 0
    if (!best || points > best.points) best = { name: p.name, points }
  }
  return best
}
