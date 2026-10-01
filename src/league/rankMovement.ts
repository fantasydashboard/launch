/**
 * Week-over-week movement for the two boards the League page draws.
 *
 * Standings movement falls out of the race we already reconstruct from results. Power-rank
 * movement cannot: roster strength is recomputed from TODAY's rosters every time, so there is
 * no historical power rank to look up — only the weekly snapshots the page writes as it goes.
 *
 * Both sign the same way: POSITIVE MEANS CLIMBED. Rank 1 is best, so a team going 3rd to 1st
 * moves +2 while its number falls, and differencing the raw ranks points the arrow backwards.
 */
import type { TalentSnapshot } from '@/league/powerTrajectory'

/**
 * The snapshot to measure against: the newest one from an EARLIER week.
 *
 * Not simply the second-to-last entry. The current week's snapshot is rewritten on every
 * visit, and a reader who skipped a week should be told the move is since week 2 rather than
 * handed a silent zero against a week that never got recorded.
 */
export function priorSnapshot(snapshots: TalentSnapshot[], currentWeek: number): TalentSnapshot | null {
  if (!currentWeek) return null
  const earlier = snapshots.filter((s) => s.week < currentWeek).sort((a, b) => a.week - b.week)
  return earlier.length ? earlier[earlier.length - 1] : null
}

/**
 * Movement in power rank since `prev`.
 *
 * A team missing from the earlier snapshot is LEFT OUT rather than given a zero: "didn't move"
 * and "we weren't watching yet" are different claims, and only one of them is ours to make.
 */
export function powerMovement(
  rows: { teamKey: string; strengthRank: number }[],
  prev: TalentSnapshot | null,
): Record<string, number> {
  const out: Record<string, number> = {}
  if (!prev) return out
  for (const r of rows) {
    const was = prev.ranks[r.teamKey]
    if (typeof was !== 'number') continue
    out[r.teamKey] = was - r.strengthRank
  }
  return out
}

/** Movement in standings rank, from the last two weeks of the reconstructed race. */
export function standingsMovement(
  teams: { teamKey: string; standings: { rank: number }[] }[],
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const t of teams) {
    const pts = t.standings
    if (pts.length < 2) continue
    out[t.teamKey] = pts[pts.length - 2].rank - pts[pts.length - 1].rank
  }
  return out
}
