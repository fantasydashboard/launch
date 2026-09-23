/**
 * A league's rules, stated by hand instead of read from a platform.
 *
 * WHY THIS EXISTS. The hockey board looks like an ESPN feature and is barely one. Projections
 * come from our own endpoint, and picks are marked by the user — the tool never syncs a draft
 * from anywhere, because ESPN does not publish one in progress. The ONLY thing tying the board
 * to a platform is where these eight or so settings come from.
 *
 * So a Yahoo league could never work, not because the board needs Yahoo but because it needed
 * somebody to say how many teams there are and which columns the league is decided in. Yahoo
 * refuses anonymous reads outright — 401 on every endpoint, no public-league exception — so
 * the paste-a-URL trick that makes the ESPN path work cannot be built for it at any price.
 * Typing the rules can.
 *
 * It generalises past Yahoo: a Sleeper league, a private league that will not load, a league
 * on a platform we have never heard of, or next year's rules before the platform publishes
 * them. The board already asks the user to mark every pick. Asking for the rules too is the
 * same bargain, and it is the one that makes the board portable.
 *
 * NO DEFAULT SCORING, THE SAME AS EVERYWHERE ELSE. hockeyLeague.ts refuses to invent weights
 * for a league that published none, on the grounds that a board built on invented rules looks
 * exactly like one built on real rules. A hand-entered league gets the identical treatment:
 * leave the weights empty and `rulesProblem` will refuse it.
 */
import { HOCKEY_STAT_BY_ID, LOWER_IS_BETTER } from './hockeyPositions'
import type { HockeyCategory } from './hockeyCategoryValue'
import type { HockeyLeagueRules } from './hockeyLeague'

/** One category a hand-entered league can be decided in, and the id it came from. */
export interface CategoryChoice {
  key: string
  statId: number
  /** True when the lower number wins the column. */
  reverse: boolean
}

/*
 * Only what the value engine can actually price.
 *
 * Built from the verified stat map rather than typed out again, so a category can never be
 * offered that the projections cannot fill. Faceoff wins are the notable absence: plenty of
 * Yahoo leagues use them and our feed has no id for them, so they cannot be offered and are
 * reported as unknown if asked for.
 */
export const CATEGORY_CHOICES: CategoryChoice[] = Object.entries(HOCKEY_STAT_BY_ID)
  .map(([id, key]) => ({ key, statId: Number(id), reverse: LOWER_IS_BETTER.has(key) }))
  // One entry per key: several ids share a name (time on ice for skaters and goalies).
  .filter((c, i, all) => all.findIndex((o) => o.key === c.key) === i)
  .sort((a, b) => a.key.localeCompare(b.key))

/**
 * Yahoo's standard hockey categories, minus the ones we cannot price.
 *
 * Offered as a starting point because typing twelve columns correctly at eleven at night
 * before a draft is where mistakes come from. Faceoff wins are deliberately absent.
 */
export const YAHOO_DEFAULT_CATEGORIES = [
  'G', 'A', 'PLUSMINUS', 'PIM', 'PPP', 'SOG', 'HITS', 'BLK',
  'W', 'GAA', 'SVPCT', 'SHO',
]

export interface ManualLeagueInput {
  name?: string
  season: number
  teams: number
  kind: 'categories' | 'points'
  /** Category league: the columns it is decided in. Ignored for a points league. */
  categoryKeys: string[]
  /** Points league: unified stat key -> points per unit. Ignored for a category league. */
  weights?: Record<string, number>
  /** Starting openings only, e.g. { F: 9, D: 4, G: 2, UTIL: 1 }. Bench and IR excluded. */
  slots: Record<string, number>
  rosterSize: number
}

/** Rules as entered, plus whatever we had to refuse. Shape matches the ESPN-read rules. */
export type ManualRules = HockeyLeagueRules & {
  /**
   * Categories asked for that we cannot price — faceoff wins being the usual one.
   *
   * Carried on the rules rather than swallowed, exactly like `unnamedScoredStatIds` for an
   * ESPN league: every total below is short by whatever these were worth, and the gap should
   * travel with the thing that caused it.
   */
  unknownCategoryKeys: string[]
}

const byKey = new Map(CATEGORY_CHOICES.map((c) => [c.key, c]))

export function rulesFromManual(input: ManualLeagueInput): ManualRules {
  const categories: HockeyCategory[] = []
  const unknownCategoryKeys: string[] = []
  if (input.kind === 'categories') {
    for (const key of input.categoryKeys ?? []) {
      const found = byKey.get(key)
      if (found) categories.push({ key: found.key, statId: found.statId, reverse: found.reverse })
      else unknownCategoryKeys.push(key)
    }
  }

  /* A seat with nobody in it is not a seat. A zero here would be counted as a position the
     league starts, and every replacement level is a count of seats. */
  const slots: Record<string, number> = {}
  for (const [pos, n] of Object.entries(input.slots ?? {})) {
    if (Number.isFinite(n) && n > 0) slots[pos] = n
  }

  return {
    leagueId: 'manual',
    season: input.season,
    name: input.name?.trim() || 'Hand-entered league',
    teams: Number(input.teams) || 0,
    scoringType: input.kind === 'categories' ? 'H2H_CATEGORY' : 'H2H_POINTS',
    weights: input.kind === 'points' ? { ...(input.weights ?? {}) } : {},
    categories,
    slots,
    rosterSize: Number(input.rosterSize) || 0,
    // An ESPN-only concept: ids the league pays for that we cannot name. Nothing to report
    // here, because a hand-entered league never mentions a stat id at all.
    unnamedScoredStatIds: [],
    unknownCategoryKeys,
  }
}
