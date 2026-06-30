/**
 * Normalized, platform-neutral history shapes.
 *
 * The composable (`useLeagueHistory`) reduces each platform's multi-season fetch
 * into these shapes so the pure builders (`buildChampions`, `buildAllTimeStandings`,
 * …) and the view never branch on platform.
 *
 * `teamKey` is the CROSS-SEASON identity key — teams rekey every season on every
 * platform, so we anchor to a stable owner/manager id where available (ESPN
 * primaryOwner, Yahoo manager_guid, Sleeper owner_id) and only fall back to a
 * season-scoped key when no stable id exists.
 */

export type HistoryResult = 'W' | 'L' | 'T'

export interface HistoryTeam {
  /** Cross-season identity key (stable owner/manager id where available). */
  teamKey: string
  teamName: string
  teamLogo?: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  /** Final standings rank (1 = best). */
  rank: number
  playoffSeed?: number
  madePlayoffs: boolean
  champion: boolean
}

export interface HistoryWeek {
  week: number
  /** teamKey → outcome that week. */
  results: Record<string, HistoryResult>
  /** teamKey → points that week (points leagues only). */
  points?: Record<string, number>
  /**
   * Head-to-head pairings that week: each entry is the two teamKeys that played.
   * `results`/`points` alone are per-team and can't reconstruct who-played-whom,
   * so rivalries (and margin-based moments) require this. Populated where the
   * platform's matchup data exposes both sides (ESPN home/away, Yahoo two teams,
   * Sleeper rosters paired by matchup_id). Regular-season pairs only.
   */
  matchups?: [string, string][]
}

export interface HistorySeason {
  season: number
  teams: HistoryTeam[]
  weeks?: HistoryWeek[]
}
