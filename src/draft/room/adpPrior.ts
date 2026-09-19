import type { PositionPrior } from './tendencies'

/**
 * What the room takes next, when you have no history on the room.
 *
 * `tendencies` builds a prior out of what each manager has actually done across past drafts,
 * and nothing replaces that. But it needs drafts to have happened. A first hockey season has
 * none, and a new league in any sport has none, and the fallback in that case used to be a
 * flat spread over every position — which is a claim, and a bad one. Spread evenly across
 * C, LW, RW, D and G, a simulated drafter takes a goalie one pick in five; a real one takes
 * two goalies in twenty-two rounds.
 *
 * So the prior comes from ADP instead. THE POSITION MIX OF THE NEXT N PLAYERS BY AVERAGE
 * DRAFT POSITION IS, DIRECTLY, WHAT THE ROOM IS ABOUT TO DRAFT — it is a measurement of the
 * market rather than an assumption about it, and it needs no history at all. It also moves
 * by itself as the draft goes: once the goalies are gone from the next twenty names, the
 * model stops simulating goalie picks, without anybody encoding that rule.
 *
 * WHAT IT CANNOT DO, said plainly so nobody mistakes it for the real thing: it is the same
 * prior for every manager. It cannot express "Mike always reaches for a goalie", because
 * that lives in history we do not have. When hockey drafts accumulate, tendencies replaces
 * this for managers with a sample and this stays as the cold-start.
 */

export interface AdpPriorPlayer {
  position: string
  adp: number | null
}

/**
 * How far ahead to measure the mix.
 *
 * A full round is the natural window — it is the set of players who realistically go before
 * the board comes back around — and it scales with league size rather than needing a tuning
 * constant. Doubling it was tried and flattens the mix toward the pool average, which is the
 * thing this exists to avoid.
 */
export const DEFAULT_LOOKAHEAD_ROUNDS = 1

const normPos = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()

/**
 * A position prior taken from the next slice of the ADP board.
 *
 * `taken` is excluded, so this is always about what is still on the board rather than what
 * was on it at the start. Players the market never priced are skipped entirely: a null ADP
 * means nobody is reaching for him, and counting him would put weight on a position the room
 * is not actually about to take.
 */
export function priorFromAdp(
  available: AdpPriorPlayer[],
  lookahead: number,
): PositionPrior {
  const priced = (available ?? [])
    .filter((p) => typeof p.adp === 'number')
    .sort((a, b) => (a.adp as number) - (b.adp as number))
    .slice(0, Math.max(1, Math.floor(lookahead)))

  const counts: Record<string, number> = {}
  for (const p of priced) {
    const pos = normPos(p.position)
    if (!pos) continue
    counts[pos] = (counts[pos] ?? 0) + 1
  }

  const sample = Object.values(counts).reduce((s, v) => s + v, 0)
  if (!sample) {
    /* Nothing priced ahead of us. Returning a flat spread would be the invention this module
       exists to avoid, so it returns an empty prior and the simulation draws nobody — which
       correctly means "the market has no opinion about what happens next". */
    return { byPosition: {}, sample: 0, counts: {} }
  }

  const byPosition: Record<string, number> = {}
  for (const [pos, n] of Object.entries(counts)) byPosition[pos] = n / sample
  return { byPosition, sample, counts }
}
