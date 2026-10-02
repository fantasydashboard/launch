import type { GoalieProjection } from './goalieProjection'

export interface GoalieRankInput {
  playerId: number
  name: string
  team: string
  /** Projected starts — what the GS column shows and the volume behind every column. */
  starts: number
  /**
   * The standard goalie columns plus the volume each rate is earned over: SV% over shots
   * faced (SA), GAA over minutes in net (TOI, starts × 60). The units only need to agree
   * across goalies, since impact is measured against the pool.
   */
  stats: { W: number; SHO: number; SVPCT: number; SA: number; GAA: number; TOI: number; GP: number }
}

function statsOf(starts: number, wins: number, shutouts: number, saves: number, goalsAgainst: number) {
  const shotsAgainst = saves + goalsAgainst
  return {
    W: wins,
    SHO: shutouts,
    SVPCT: shotsAgainst > 0 ? saves / shotsAgainst : NaN,
    SA: shotsAgainst,
    GAA: starts > 0 ? goalsAgainst / starts : NaN,
    TOI: starts * 60,
    GP: starts,
  }
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
        stats: statsOf(g.starts, g.wins, g.shutouts, g.saves, g.goalsAgainst),
      }))
  }
  return summary.map((g) => ({
    playerId: g.playerId,
    name: g.goalieFullName,
    team: String(g.teamAbbrevs ?? '').split(',').pop()?.trim() ?? '',
    starts: g.gamesStarted,
    stats: statsOf(g.gamesStarted, g.wins, g.shutouts, g.saves, g.goalsAgainst),
  }))
}
