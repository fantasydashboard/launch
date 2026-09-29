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

export interface YahooStatCategory {
  stat?: { stat_id?: string | number; name?: string; display_name?: string }
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

export function yahooHockeyWeights(
  statCategories: YahooStatCategory[] | undefined,
  statModifiers: Record<string, number> | unknown,
): YahooHockeyWeights {
  const weights: Record<string, number> = {}
  const unmatched: string[] = []
  if (!statCategories?.length || !statModifiers) return { weights, unmatched }

  const nameById = new Map<string, string>()
  for (const c of statCategories) {
    const id = c?.stat?.stat_id
    if (id == null) continue
    nameById.set(String(id), String(c.stat?.display_name || c.stat?.name || ''))
  }

  for (const [id, raw] of modifierEntries(statModifiers)) {
    /* Yahoo sends these as strings in some leagues and numbers in others. */
    const value = Number(raw)
    /* Zero is "this league does not score it", not "it is worth nothing" — Yahoo lists every
       stat it could score and zeroes the rest. */
    if (!Number.isFinite(value) || value === 0) continue
    const display = nameById.get(String(id))
    if (!display) continue
    const key = BY_NAME[display.toUpperCase().trim()]
    if (key) weights[key] = value
    else unmatched.push(display)
  }
  return { weights, unmatched: [...new Set(unmatched)] }
}
