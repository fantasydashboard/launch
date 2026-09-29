/**
 * A Yahoo hockey league's own scoring, in the keys the projections use.
 *
 * WHY IT DID NOT EXIST. useHockeyValue read scoring from ESPN and only ESPN:
 *
 *     espnService.getRawLeagueViews('hockey', inputs.leagueId.value, ...)
 *
 * and usePointsValue handed it whatever league id was active — including a Yahoo one, which
 * is not an ESPN league id and never resolves. The weight map came back empty, buildHockeyValue
 * prices nothing without weights, and a Yahoo hockey points league therefore showed no number
 * beside any player. `normalizeYahooWeights` already existed for baseball and football and was
 * imported by nothing but its own test; hockey needs its own column names regardless.
 *
 * NO DEFAULTS, deliberately, matching hockeyLeague.ts: a league whose scoring we cannot read
 * gets an empty map and therefore no values, rather than a plausible set of numbers borrowed
 * from somewhere else. A board built on invented rules looks exactly like a board built on real
 * ones, and there is no way for a reader to tell which they are looking at.
 */

import { LOWER_IS_BETTER } from './hockeyPositions'
import type { HockeyCategory } from './hockeyCategoryValue'

/** Yahoo's column names, in every spelling seen, to the stat keys a projection carries. */
const BY_NAME: Record<string, string> = {
  // Skaters
  G: 'G', GOALS: 'G',
  A: 'A', ASSISTS: 'A',
  P: 'PTS', PTS: 'PTS', POINTS: 'PTS',
  '+/-': 'PLUSMINUS', 'PLUS/MINUS': 'PLUSMINUS', PLUSMINUS: 'PLUSMINUS',
  PIM: 'PIM', 'PENALTY MINUTES': 'PIM', 'PENALTY MINS': 'PIM',
  PPG: 'PPG', 'POWERPLAY GOALS': 'PPG', 'POWER PLAY GOALS': 'PPG',
  PPA: 'PPA', 'POWERPLAY ASSISTS': 'PPA', 'POWER PLAY ASSISTS': 'PPA',
  PPP: 'PPP', 'POWERPLAY POINTS': 'PPP', 'POWER PLAY POINTS': 'PPP',
  SHG: 'SHG', 'SHORTHANDED GOALS': 'SHG', 'SHORT HANDED GOALS': 'SHG',
  SHA: 'SHA', 'SHORTHANDED ASSISTS': 'SHA', 'SHORT HANDED ASSISTS': 'SHA',
  SHP: 'SHP', 'SHORTHANDED POINTS': 'SHP', 'SHORT HANDED POINTS': 'SHP',
  SOG: 'SOG', S: 'SOG', SHOTS: 'SOG', 'SHOTS ON GOAL': 'SOG',
  HIT: 'HITS', HITS: 'HITS',
  BLK: 'BLK', BLOCKS: 'BLK', 'BLOCKED SHOTS': 'BLK',
  // Goalies
  W: 'W', WINS: 'W',
  L: 'L', LOSSES: 'L',
  GA: 'GA', 'GOALS AGAINST': 'GA',
  GAA: 'GAA', 'GOALS AGAINST AVERAGE': 'GAA',
  SV: 'SV', SAVES: 'SV',
  SA: 'SA', 'SHOTS AGAINST': 'SA',
  'SV%': 'SVPCT', SVPCT: 'SVPCT', 'SAVE PERCENTAGE': 'SVPCT',
  SHO: 'SHO', SO: 'SHO', SHUTOUTS: 'SHO',
  GS: 'GS', 'GAMES STARTED': 'GS',
}

/**
 * One entry of Yahoo's stat_categories, in either of the two shapes it arrives in.
 *
 * `stat` is how the Fantasy API documents it and how it usually comes back; the bare form is
 * how some responses send it, which is why both proven readers of this payload write
 * `cat?.stat ?? cat`. `abbr` is the only field that is reliably short — "SOG" where
 * display_name can be "Shots on Goal Total" — so it is tried first.
 */
export interface YahooStatEntry {
  stat_id?: string | number
  name?: string
  display_name?: string
  abbr?: string
  /** '1' or 1 means Yahoo shows the column and nobody competes in it. */
  is_only_display_stat?: string | number
}
export interface YahooStatCategory extends YahooStatEntry {
  stat?: YahooStatEntry
}

/** The entry itself, whichever way it is wrapped. */
function statOf(entry: unknown): YahooStatEntry {
  if (!entry || typeof entry !== 'object') return {}
  const inner = (entry as YahooStatCategory).stat
  return (inner && typeof inner === 'object' ? inner : (entry as YahooStatEntry))
}

/** True for a column Yahoo displays but does not score — games played, innings, H/AB. */
function isDisplayOnly(stat: YahooStatEntry): boolean {
  const d = stat.is_only_display_stat
  return d === '1' || d === 1
}

/**
 * The stat key this column maps to, trying every name Yahoo gives it.
 *
 * abbr first because it is the short one, then the display name, then the internal name. A
 * league whose display_name is spelled long still resolves, which reading one field could not.
 */
function keyOf(stat: YahooStatEntry): { key: string; label: string } {
  const label = String(stat.display_name || stat.name || stat.abbr || '')
  for (const candidate of [stat.abbr, stat.display_name, stat.name]) {
    if (!candidate) continue
    const key = BY_NAME[String(candidate).toUpperCase().trim()]
    if (key) return { key, label }
  }
  return { key: '', label }
}

export interface YahooHockeyWeights {
  /** Unified stat key -> points per unit, for buildHockeyValue. */
  weights: Record<string, number>
  /**
   * Columns this league scores that we could not name.
   *
   * Reported because the failure is invisible otherwise: a board missing one of the league's
   * columns ranks and renders exactly like a correct one. Faceoffs are the common case — Yahoo
   * scores them, and no projection here carries them.
   */
  unmatched: string[]
}

/**
 * Yahoo sends the modifiers in more than one shape and this cannot be verified from here.
 *
 * `normalizeYahooWeights` assumes a flat `{ statId: value }` map; the Fantasy API more often
 * returns `{ stats: [{ stat: { stat_id, value } }] }`, and some responses are the bare array.
 * That function is imported by exactly one place, so the assumption has had little chance to be
 * proven — and if it is wrong the failure is silent: an empty weight map, which is
 * indistinguishable downstream from a league that published no scoring.
 *
 * Accepting all three costs a few lines and removes the only way this change could quietly do
 * nothing. Unrecognised shapes yield nothing, which the caller already reports as a problem.
 */
function modifierEntries(
  statModifiers: unknown,
): Array<[string, unknown]> {
  if (!statModifiers || typeof statModifiers !== 'object') return []
  const wrapped = (statModifiers as any).stats
  const list = Array.isArray(statModifiers) ? statModifiers
    : Array.isArray(wrapped) ? wrapped
      : null
  if (list) {
    return list
      .map((m: any) => [String(m?.stat?.stat_id ?? m?.stat_id ?? ''), m?.stat?.value ?? m?.value] as [string, unknown])
      .filter(([id]) => id !== '')
  }
  return Object.entries(statModifiers as Record<string, unknown>)
}

/**
 * The categories, whatever Yahoo wrapped them in.
 *
 * The modifiers were taught to accept `{ stats: [...] }` and this side was not, so
 * `statCategories.length` read undefined on the real response and the whole function bailed
 * before looking at anything — an empty weight map, indistinguishable from a league that
 * publishes no scoring at all. Handling one half of a symmetric API is its own bug.
 */
function categoryList(statCategories: unknown): YahooStatCategory[] {
  if (Array.isArray(statCategories)) return statCategories as YahooStatCategory[]
  if (!statCategories || typeof statCategories !== 'object') return []
  const wrapped = (statCategories as any).stats
  return Array.isArray(wrapped) ? wrapped as YahooStatCategory[] : []
}

export function yahooHockeyWeights(
  statCategories: YahooStatCategory[] | unknown,
  statModifiers: Record<string, number> | unknown,
): YahooHockeyWeights {
  const weights: Record<string, number> = {}
  const unmatched: string[] = []
  const cats = categoryList(statCategories)
  if (!cats.length || !statModifiers) return { weights, unmatched }

  const byId = new Map<string, { key: string; label: string }>()
  for (const c of cats) {
    const stat = statOf(c)
    if (stat.stat_id == null) continue
    byId.set(String(stat.stat_id), keyOf(stat))
  }

  for (const [id, raw] of modifierEntries(statModifiers)) {
    /* Yahoo sends these as strings in some leagues and numbers in others. */
    const value = Number(raw)
    /* Zero is "this league does not score it", not "it is worth nothing" — Yahoo lists every
       stat it could score and zeroes the rest. */
    if (!Number.isFinite(value) || value === 0) continue
    const named = byId.get(String(id))
    if (!named || !named.label) continue
    if (named.key) weights[named.key] = value
    else unmatched.push(named.label)
  }
  return { weights, unmatched: [...new Set(unmatched)] }
}

/**
 * A Yahoo hockey league's CATEGORY columns.
 *
 * WHY THIS IS A SEPARATE READ. A points league publishes stat_categories AND stat_modifiers,
 * and the weights are the whole answer. A category league publishes the categories and no
 * modifiers at all — so useHockeyValue, which demanded weights, reported "this league
 * published no scoring weights, so nothing can be priced" and set categories to empty. That
 * was true of the weights and false of the league: the columns were sitting in the same
 * payload, unread. Yahoo hockey category leagues were the last unpriceable kind.
 *
 * Nothing downstream joins on `statId` — it is a Vue key on the matchup header and an
 * explanation of where a column came from — so Yahoo's own ids can go in the field ESPN's
 * ids occupy without the two id spaces ever having to meet.
 *
 * Direction comes from hockey's own LOWER_IS_BETTER, not from players/direction.ts, whose set
 * is baseball's (ERA, WHIP, L, CS) and would call goals-against a good thing. Yahoo does
 * publish a sort_order per stat, and it is deliberately not read here: it cannot be verified
 * from this side, and a wrong direction silently inverts a whole column of the board.
 */
export function yahooHockeyCategories(
  statCategories: YahooStatCategory[] | unknown,
): { categories: HockeyCategory[]; unmatched: string[] } {
  const categories: HockeyCategory[] = []
  const unmatched: string[] = []
  const seen = new Set<string>()

  for (const c of categoryList(statCategories)) {
    const stat = statOf(c)
    if (stat.stat_id == null || isDisplayOnly(stat)) continue
    const { key, label } = keyOf(stat)
    if (!key) { if (label) unmatched.push(label); continue }
    if (seen.has(key)) continue
    seen.add(key)
    categories.push({ key, statId: Number(stat.stat_id), reverse: LOWER_IS_BETTER.has(key) })
  }
  return { categories, unmatched: [...new Set(unmatched)] }
}
