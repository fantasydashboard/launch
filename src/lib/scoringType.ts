/**
 * The league's own scoring-type string, resolved across the places it hides.
 *
 * THE BUG THIS EXISTS TO PREVENT. Two parts of the Today page asked "is this a category
 * league" and answered differently about the same Yahoo league: useDailyLineup consulted the
 * saved league as a fallback and said yes, while useToday read only the live record, found
 * nothing, and let getLeagueType fall through to its 'points' default. So the lineup panel
 * printed "category value" while the matchup rendered the points-league seat-by-seat board,
 * and the category board was gated off a league that had every input it needed.
 *
 * One function, one order of authority, so the two cannot disagree again.
 */

export interface ScoringTypeSources {
  /**
   * True when ESPN's own category path accepted this league. ESPN never writes the store
   * field, because its detection fetches the league and checks scoringType itself — so for
   * ESPN this flag IS the answer, and it is the only thing we can honestly report.
   */
  espnCategory?: boolean
  /** `league_scoring_type` off Yahoo's settings response — the platform's own word. */
  yahoo?: string | null
  /** The store's live league record. */
  live?: string | null
  /** The saved league record. Absent from the live one often enough to matter. */
  saved?: string | null
}

export function resolveScoringType(sources: ScoringTypeSources): string | undefined {
  if (sources.espnCategory) return 'H2H_CATEGORY'
  for (const candidate of [sources.yahoo, sources.live, sources.saved]) {
    const s = String(candidate ?? '').trim()
    if (s) return s
  }
  return undefined
}
