/**
 * Editorial pipeline — universal data contract.
 *
 * `CategoryLeagueData` is the shape every platform adapter
 * (Sleeper / Yahoo / ESPN) must produce. Detection + rendering only
 * read this shape, so swapping the source of truth never touches
 * the editorial layer.
 *
 * Scope: only the fields the current `categoriesLeague` fixture
 * already exposes. Speculative fields belong in a follow-up — the
 * pipeline ships when the fixture proves it end-to-end.
 */

/* ─────────────────────────────────────────────────────────────────
   PRIMITIVES
───────────────────────────────────────────────────────────────── */

export type WLT = 'W' | 'L' | 'T'

export type CatSide = 'hit' | 'pit'

/* ─────────────────────────────────────────────────────────────────
   CORE LEAGUE DATA
───────────────────────────────────────────────────────────────── */

export interface CategoryLeagueDataTeam {
  id: string
  name: string
  ownerName: string
  ownerInitials: string
  avatarUrl?: string
  avatarColor: string         // OKLCH gradient stops, comma-separated
  isMyTeam: boolean
}

export interface CategoryLeagueDataCategory {
  id: string
  label: string
  name: string
  side: CatSide
}

export interface CategoryLeagueDataStanding {
  rank: number
  teamId: string
  catWins: number
  catLosses: number
  catTies: number
  winPct: number
  streak: { type: WLT; length: number }
  lastSix: WLT[]
  ownsCount: number           // top-3 in this many cats
  bleedingCount: number       // bottom-3 in this many cats
}

export interface CategoryLeagueDataCategoryRank {
  teamId: string
  catRanks: Record<string, number>
}

export interface CategoryLeagueDataWeeklyRanks {
  week: number
  ranks: Record<string, number>
}

export interface CategoryLeagueData {
  // Meta
  leagueId: string
  leagueName: string
  currentWeek: number
  currentSeason: number
  playoffCutoff: number       // top N make playoffs

  // Teams
  teams: CategoryLeagueDataTeam[]

  // Categories
  categories: CategoryLeagueDataCategory[]

  // Standings — current week
  standings: CategoryLeagueDataStanding[]

  // Category ranks — per team × per cat
  categoryRanks: CategoryLeagueDataCategoryRank[]

  // Season rank history — for trajectory detection
  seasonRankHistory: CategoryLeagueDataWeeklyRanks[]
}

/* ─────────────────────────────────────────────────────────────────
   STORY DETECTION TYPES
───────────────────────────────────────────────────────────────── */

/**
 * A single detected story possibility. `kind` is constrained to the
 * template-key union of whichever library the slot will render with
 * (typically `HomeKind` from `home.ts`). `weight` lets the selection
 * stage rank competing candidates; `context` is the unrendered slot
 * data that `render.ts` will shape into a `HomeContext` (or whatever
 * the target library expects) before calling its `renderX(kind, ctx)`.
 *
 * Weight scale (informal):
 *   100  — load-bearing front-page lead
 *    80  — strong feature
 *    60  — solid secondary
 *    40  — ticker-grade beat
 *    20  — quiet-day fallback
 */
export interface StoryCandidate<TKind extends string = string, TContext = unknown> {
  kind: TKind
  weight: number
  context: TContext
}

/**
 * Output of detection for one page render. Each slot holds either
 * the winning candidate (after selection) or null when no candidate
 * cleared the threshold for that slot.
 */
export interface StoryBundle<TKind extends string = string, TContext = unknown> {
  hero: StoryCandidate<TKind, TContext> | null
  playoffPush: StoryCandidate<TKind, TContext> | null
  ticker: Array<StoryCandidate<TKind, TContext>>
  quickReads: Array<StoryCandidate<TKind, TContext>>
}
