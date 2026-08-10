/**
 * What the people in your league actually do.
 *
 * This is the part no competitor can replicate: a generic ADP mean cannot express
 * "Mike reaches two rounds early for tight ends," but five seasons of your league's
 * drafts can. It feeds the survival simulation, which walks the picks between now
 * and your next turn.
 *
 * The honest constraint is sample size — three to five drafts per manager. So every
 * prior is shrunk toward league-average behavior in proportion to how much we've
 * actually seen, and carries its sample count so the UI can show it rather than
 * implying certainty we don't have.
 */

export interface HistoricalPick {
  teamKey: string
  position: string
  round: number
  keeper?: boolean
}

export interface PositionPrior {
  /** Position -> probability. Sums to 1. */
  byPosition: Record<string, number>
  /** How many observations this prior is built from. 0 = pure league fallback. */
  sample: number
  /**
   * The manager's RAW observed picks by position — never shrunk, never blended.
   * Anything shown to a user as a count has to come from here: multiplying a
   * shrunk probability by a sample size produces a number that looks observed
   * and is not.
   */
  counts: Record<string, number>
}

export interface Tendencies {
  byManager: Record<string, Record<string, PositionPrior>>
  league: Record<string, PositionPrior>
}

/** How much evidence before a manager's own history outweighs the league's. */
const SHRINK_K = 4

/** Positions we model. A pick outside this set is ignored. */
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

const normPos = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()

/** Rounds grouped so a handful of drafts still yields usable samples. */
export function defaultRoundBucket(round: number): string {
  if (round <= 3) return 'early'
  if (round <= 8) return 'mid'
  return 'late'
}

function toPrior(counts: Record<string, number>): PositionPrior {
  const sample = Object.values(counts).reduce((s, v) => s + v, 0)
  const byPosition: Record<string, number> = {}
  if (sample === 0) {
    // No evidence at all — spread evenly rather than returning something unusable.
    for (const p of POSITIONS) byPosition[p] = 1 / POSITIONS.length
    return { byPosition, sample: 0, counts: {} }
  }
  for (const [pos, n] of Object.entries(counts)) byPosition[pos] = n / sample
  return { byPosition, sample, counts: { ...counts } }
}

export function buildTendencies(
  picks: HistoricalPick[],
  roundBucket: (round: number) => string = defaultRoundBucket,
): Tendencies {
  const managerCounts: Record<string, Record<string, Record<string, number>>> = {}
  const leagueCounts: Record<string, Record<string, number>> = {}

  for (const p of picks ?? []) {
    if (p?.keeper) continue // a kept star is not a draft decision
    const pos = normPos(p?.position ?? '')
    if (!pos || !POSITIONS.includes(pos)) continue
    const bucket = roundBucket(Number(p.round) || 1)
    const team = String(p.teamKey ?? '')
    if (!team) continue

    ;(managerCounts[team] ??= {})[bucket] ??= {}
    managerCounts[team][bucket][pos] = (managerCounts[team][bucket][pos] ?? 0) + 1
    ;(leagueCounts[bucket] ??= {})[pos] = (leagueCounts[bucket][pos] ?? 0) + 1
  }

  const league: Record<string, PositionPrior> = {}
  for (const [bucket, counts] of Object.entries(leagueCounts)) league[bucket] = toPrior(counts)

  const byManager: Record<string, Record<string, PositionPrior>> = {}
  for (const [team, buckets] of Object.entries(managerCounts)) {
    byManager[team] = {}
    for (const [bucket, counts] of Object.entries(buckets)) {
      byManager[team][bucket] = toPrior(counts)
    }
  }

  return { byManager, league }
}

/**
 * A manager's prior for a round bucket, shrunk toward the league. `w = n/(n+k)`:
 * one prior draft leans mostly league-average, five leans mostly personal. The
 * returned `sample` is the manager's own count — what the UI should display.
 */
export function priorFor(t: Tendencies, teamKey: string, bucket: string): PositionPrior {
  const leaguePrior = t.league[bucket] ?? toPrior({})
  const own = t.byManager[teamKey]?.[bucket]
  if (!own || own.sample === 0) {
    return { byPosition: { ...leaguePrior.byPosition }, sample: 0, counts: {} }
  }

  const w = own.sample / (own.sample + SHRINK_K)
  const byPosition: Record<string, number> = {}
  const positions = new Set([
    ...Object.keys(own.byPosition),
    ...Object.keys(leaguePrior.byPosition),
  ])
  for (const pos of positions) {
    byPosition[pos] = w * (own.byPosition[pos] ?? 0) + (1 - w) * (leaguePrior.byPosition[pos] ?? 0)
  }
  // Counts stay the manager's own: the blend is for prediction, not for display.
  return { byPosition, sample: own.sample, counts: { ...own.counts } }
}
