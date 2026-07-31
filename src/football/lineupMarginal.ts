import { assignSlots, type DepthPlayer } from '@/trades/positionalLandscape'

export interface OptimalLineup {
  total: number
  started: Set<string>
}

/** Optimal starting-lineup point total + the set of players who start (bar 0). */
export function optimalLineup(players: DepthPlayer[], slots: Record<string, number>): OptimalLineup {
  const a = assignSlots(players, slots, 0)
  const val = new Map(players.map((p) => [p.playerKey, p.value]))
  const started = new Set<string>()
  let total = 0
  for (const keys of Object.values(a.assignedByPos)) {
    for (const k of keys) { started.add(k); total += val.get(k) ?? 0 }
  }
  return { total, started }
}

export interface MarginalResult {
  marginal: number       // optimal-with-add − optimal-now (≥ 0)
  dropKey: string | null // the starter displaced by the add (null if the add doesn't crack the lineup)
}

/**
 * Flex-aware waiver-upgrade value: the point gain to *my* optimal lineup from
 * adding `candidate`, plus the incumbent starter it displaces. A 2nd QB behind
 * an elite starter yields 0; a better flex body yields its real gain. Pure.
 */
export function lineupMarginal(
  myPlayers: DepthPlayer[],
  candidate: DepthPlayer,
  slots: Record<string, number>,
): MarginalResult {
  const base = optimalLineup(myPlayers, slots)
  const withAdd = optimalLineup([...myPlayers, candidate], slots)
  const marginal = withAdd.total - base.total
  if (marginal <= 0 || !withAdd.started.has(candidate.playerKey)) {
    return { marginal: Math.max(0, marginal), dropKey: null }
  }
  // The displaced starter = in the base lineup but not in the with-add lineup.
  let dropKey: string | null = null
  for (const k of base.started) if (!withAdd.started.has(k)) { dropKey = k; break }
  return { marginal, dropKey }
}
