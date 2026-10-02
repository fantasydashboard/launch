import type { GoalieProjection } from './goalieProjection'

export interface GoalieRankInput {
  playerId: number
  name: string
  team: string
  /** Projected starts — what the GS column shows and the W/SV/SHO/GA totals are built on. */
  starts: number
  stats: { W: number; SV: number; SHO: number; GA: number; GP: number }
}

interface GoalieSummaryRow {
  playerId: number
  goalieFullName: string
  teamAbbrevs: string
  gamesStarted: number
  wins: number
  saves: number
  shutouts: number
  goalsAgainst: number
}

/**
 * What the rankings page's goalie list is built from: the PROJECTION, not the box score.
 *
 * The list used to rank the NHL's summary rows for whichever season the feed called current.
 * In preseason that was last year's full season and read sensibly. One week into October it was
 * this year's one or two starts, and the board put Silovs second and Markstrom third off a
 * single game each while Vasilevskiy, who had not played yet, was nowhere. The goalie model —
 * multi-season persistence, ESPN depth-chart starts, the public-baseline blend — was already
 * built for every other surface and simply never reached this list.
 *
 * The summary rows stay as the fallback, so a feed with no projections still shows goalies.
 */
export function goalieRankInput(
  projections: GoalieProjection[] | undefined,
  summary: GoalieSummaryRow[],
): GoalieRankInput[] {
  if (projections?.length) {
    return projections
      .filter((g) => g.starts > 0)
      .map((g) => ({
        playerId: g.playerId,
        name: g.name,
        team: String(g.team ?? '').split(',').pop()?.trim() ?? '',
        starts: g.starts,
        stats: { W: g.wins, SV: g.saves, SHO: g.shutouts, GA: g.goalsAgainst, GP: g.starts },
      }))
  }
  return summary.map((g) => ({
    playerId: g.playerId,
    name: g.goalieFullName,
    team: String(g.teamAbbrevs ?? '').split(',').pop()?.trim() ?? '',
    starts: g.gamesStarted,
    stats: { W: g.wins, SV: g.saves, SHO: g.shutouts, GA: g.goalsAgainst, GP: g.gamesStarted },
  }))
}
