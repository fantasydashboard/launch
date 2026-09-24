import { HOCKEY_STAT_BY_ID, hockeySlot, startingSlotsFromEspn } from './hockeyPositions'
import { categoriesFromScoringItems, type HockeyCategory } from './hockeyCategoryValue'

/**
 * Read a hockey league's own rules out of ESPN's settings blob.
 *
 * Everything downstream is priced with these: the value engine multiplies raw stats by these
 * weights, and the replacement engine counts these seats. Reading them wrongly does not
 * break anything visibly — it produces a board ranked on rules nobody plays by, which is the
 * failure this file exists to prevent.
 *
 * WHAT IS DELIBERATELY NOT DONE HERE. No default scoring is supplied. A league that returns
 * no scoring items gets an empty weight map and therefore no values, rather than a plausible
 * set of numbers borrowed from somewhere else. A board built on invented rules looks exactly
 * like a board built on real ones, and there is no way for a reader to tell.
 */

export interface HockeyLeagueRules {
  leagueId: string
  season: number
  name: string
  teams: number
  /** H2H_POINTS, H2H_CATEGORY, ROTO — the shape of the league. */
  scoringType: string
  /** Unified stat key -> points per unit. Empty when the league published none. */
  weights: Record<string, number>
  /**
   * The columns a CATEGORY league is decided in. Empty for a points league.
   *
   * Populated for every league so the shape is stable, but only meaningful — and only read —
   * when `scoringType` says categories. A points league lists every stat it could score and
   * zeroes most, so reading this for one would report twenty-one categories it does not have.
   */
  categories: HockeyCategory[]
  /** Starting openings only: { F: 9, D: 5, G: 2, UTIL: 1 }. Bench and IR excluded. */
  slots: Record<string, number>
  /** Roster size per team, for sizing the draftable pool. Zero when ESPN did not say. */
  rosterSize: number
  /**
   * Stat ids the league PAYS for that we cannot name.
   *
   * Every total is short by whatever these were worth. Carried on the rules rather than
   * computed later so the gap travels with the thing that caused it.
   */
  unnamedScoredStatIds: number[]
}

/** True when the league scores by category rather than by points. */
export function isCategoryLeague(scoringType: string): boolean {
  const t = String(scoringType || '').toUpperCase()
  return t.includes('CATEGORY') || t.includes('ROTO')
}

/**
 * Turn ESPN's `scoringItems` into a weight map.
 *
 * Zero-weight items are dropped rather than stored. A league lists every stat it COULD score
 * and sets most to nought, so keeping them would make an eight-stat league look like a
 * twenty-one-stat one, and `unnamedScoredStatIds` would report gaps that cost nothing.
 */
export function weightsFromScoringItems(
  items: { statId?: number; points?: number }[] | undefined,
): { weights: Record<string, number>; unnamed: number[] } {
  const weights: Record<string, number> = {}
  const unnamed: number[] = []
  for (const it of items ?? []) {
    const id = Number(it?.statId)
    const pts = Number(it?.points)
    if (!Number.isFinite(id) || !Number.isFinite(pts) || pts === 0) continue
    const key = HOCKEY_STAT_BY_ID[id]
    if (key) weights[key] = pts
    else unnamed.push(id)
  }
  return { weights, unnamed: [...new Set(unnamed)].sort((a, b) => a - b) }
}

/** Parse the `?view=mSettings` response for a hockey league. */
export function rulesFromEspnSettings(
  payload: any,
  leagueId: string,
  season: number,
): HockeyLeagueRules | null {
  const s = payload?.settings
  if (!s) return null
  const sc = s.scoringSettings ?? {}
  const scoringType = String(sc.scoringType ?? '')
  const { weights, unnamed } = weightsFromScoringItems(sc.scoringItems)
  const cats = categoriesFromScoringItems(sc.scoringItems)

  /*
   * Seats the draft actually fills: the lineup plus the bench, and NOT injured reserve.
   *
   * This counted every slot including IR and came out one too many — 23 for a league whose
   * draft is 22 rounds, which ESPN's own 220-pick schedule confirms at 10 teams. Nobody
   * drafts into IR; it is a holding place for players already on the roster. The extra round
   * would have invented a pick at the end of every drafter's list.
   */
  const rosterSize = Object.entries(
    (s.rosterSettings?.lineupSlotCounts ?? {}) as Record<string, number>,
  ).reduce((sum, [slotId, n]) => (
    hockeySlot(Number(slotId)) === 'IR' ? sum : sum + (Number(n) || 0)
  ), 0)

  const isCategory = isCategoryLeague(scoringType)
  return {
    leagueId: String(leagueId),
    season,
    name: String(s.name ?? ''),
    /* Team count decides every replacement level. Falling back to a guess would price the
       whole board off a league size nobody is playing, so zero is returned instead and the
       caller can refuse to build a board at all. */
    teams: Number(s.size) || 0,
    scoringType,
    weights,
    categories: isCategory ? cats.categories : [],
    slots: startingSlotsFromEspn(s.rosterSettings?.lineupSlotCounts),
    rosterSize,
    /* Whichever read applies to THIS league. A points league's gap is the stats it pays for
       and we cannot name; a category league's is the columns it is decided in and we cannot
       name. Reporting the points-league gap for a category league would always come back
       empty, because a category league sets no points. */
    unnamedScoredStatIds: isCategory ? cats.unnamed : unnamed,
  }
}

/**
 * Can we build an honest board from these rules?
 *
 * Three ways the answer is no, and each returns the reason rather than a boolean, because
 * "we cannot rank your league" is only useful with the because attached.
 */
export function rulesProblem(rules: HockeyLeagueRules | null): string {
  if (!rules) return 'ESPN returned no settings for this league.'
  if (!rules.teams) return 'The league did not report how many teams are in it, and every replacement level depends on that.'

  /* A category league is asked a different question. It publishes no weights by design —
     there is no exchange rate in a league you win column by column — so checking for weights
     here would refuse to build a board for every category league in existence, which is
     exactly what it used to do. */
  if (isCategoryLeague(rules.scoringType)) {
    if (!rules.categories.length) {
      return 'The league did not publish which categories it is decided in, so there is nothing to rank against.'
    }
  } else if (!Object.keys(rules.weights).length) {
    return 'The league published no scoring weights, so nothing can be priced. We will not substitute a default set — a board built on invented rules looks exactly like a real one.'
  }

  if (!Object.keys(rules.slots).length) return 'The league reported no starting lineup slots.'

  /*
   * A roster has to hold its own starting lineup.
   *
   * The failure without this is silent rather than loud: categoryLedger derives the bench as
   * `rosterSize - named` and clamps it at zero, so thirteen starters on a roster of ten drafts
   * as though there were no bench. Nothing looks wrong; it is simply a roster nobody can field.
   *
   * A roster size of zero is a different complaint — it means nobody reported one — and is not
   * this check's to make. Exactly enough is legal: a league may run with no bench at all.
   */
  const starters = Object.values(rules.slots).reduce((n, v) => n + (Number(v) || 0), 0)
  if (rules.rosterSize > 0 && starters > rules.rosterSize) {
    return `This lineup needs ${starters} starting spots but the roster only holds `
      + `${rules.rosterSize}. Check the roster size, or the slot counts.`
  }
  return ''
}
