/**
 * Per-team projected category totals for a HOCKEY category league.
 *
 * WHY THIS EXISTS. The League page's category strength runs every roster through the trade
 * engine, which prices players from FanGraphs — `matchFG({ full_name, mlb_team })`. For a
 * hockey league that matcher returns null for every player and the pool carries no raw stats,
 * so the engine aggregated nothing, every team tied at zero in every column, and the page
 * reported .000 categories won for all ten teams. Power rankings for the sport were running on
 * whatever counting stats a week of games had produced.
 *
 * The projections to use already existed — the same NHL feed the draft board, the Wire and the
 * Today page price players from. This module only reshapes them into the totals the shared ECW
 * code already knows how to rank, so the League page agrees with every other hockey surface
 * rather than having a second opinion.
 */
import { aggregateTeamCatTotals, type TeamCategoryTotals } from '@/trades/standings'
import type { CatSpec } from '@/myteam/types'
import type { HockeyCategory } from '@/hockey/hockeyCategoryValue'
import type { HockeyProjection } from '@/hockey/hockeyValue'
import { GOALIE_STAT_BY_ID, SKATER_STAT_BY_ID } from '@/hockey/hockeyPositions'

/** Columns only a goalie can appear in — the goalie map minus anything a skater also has. */
const SKATER_KEYS = new Set(Object.values(SKATER_STAT_BY_ID))
const GOALIE_ONLY = new Set(Object.values(GOALIE_STAT_BY_ID).filter((k) => !SKATER_KEYS.has(k)))

/**
 * The volume each rate category is earned over, FOR OUR PROJECTIONS.
 *
 * Deliberately not `RATE_VOLUME` from hockeyCategoryValue, which pairs GAA with time on ice
 * because that is how ESPN publishes it. Our goalie model projects GAA as goals against per
 * START (hockeyProjectionSource), and a weighted mean is only exact when the weight is the
 * rate's own denominator: Σ(GA/starts · starts) / Σ starts is the team's real goals-against
 * average, while weighting the same number by seconds of ice time is an average of a thing
 * nobody computed. The feed also carries no TOI for a projected goalie, so pairing them would
 * drop the column entirely and quietly hand every team an identical score in it.
 */
export const HOCKEY_TEAM_RATE_VOLUME: Record<string, string> = {
  SVPCT: 'SA',    // saves over shots faced — Σ(SV%·SA)/ΣSA is exactly team save percentage
  GAA: 'GP',      // goals against per start, so starts is the weight
  WINPCT: 'DEC',  // wins over decisions
  TOIG: 'GP',     // minutes per game over games
}

/**
 * The league's columns as category specs the shared ranking code understands.
 *
 * `statId` is the unified hockey stat key ('G', 'SVPCT'), which is also the key the
 * projections are stored under — so there is no id-space bridge to get wrong here, which is
 * the bug that inverted the ESPN baseball ranking.
 */
export function hockeyCatSpecs(categories: HockeyCategory[]): CatSpec[] {
  const out: CatSpec[] = []
  const seen = new Set<string>()
  for (const c of categories) {
    if (!c?.key || seen.has(c.key)) continue
    seen.add(c.key)
    const volumeStatId = HOCKEY_TEAM_RATE_VOLUME[c.key]
    out.push({
      statId: c.key,
      lowerIsBetter: Boolean(c.reverse),
      side: GOALIE_ONLY.has(c.key) ? 'goalie' : 'skater',
      isRatio: Boolean(volumeStatId),
      ...(volumeStatId ? { volumeStatId } : {}),
    })
  }
  return out
}

export interface HockeyRosterPlayer {
  playerKey: string
  teamKey: string
  name?: string
}

/**
 * Each fantasy team's projected totals, over its WHOLE roster.
 *
 * Whole roster on purpose, matching what the baseball path does, so the two sports are
 * answering the same question: this ranks the players a manager owns, not the lineup he
 * happens to have set tonight. A player nobody projected contributes nothing rather than a
 * zero — an unprojected body is an unknown, and counting him as a scoreless one would punish
 * a manager for our feed's gaps.
 */
export function buildHockeyTeamTotals(input: {
  roster: HockeyRosterPlayer[]
  projectionFor: (p: HockeyRosterPlayer) => HockeyProjection | null
  cats: CatSpec[]
}): TeamCategoryTotals[] {
  const { roster, projectionFor, cats } = input
  if (!roster.length || !cats.length) return []

  const byTeam = new Map<string, { playerKey: string; stats: Record<string, number> }[]>()
  for (const p of roster) {
    if (!p.teamKey) continue
    const proj = projectionFor(p)
    const list = byTeam.get(p.teamKey) ?? []
    if (!byTeam.has(p.teamKey)) byTeam.set(p.teamKey, list)
    if (!proj) continue
    list.push({ playerKey: p.playerKey, stats: proj.stats ?? {} })
  }
  /* Teams are kept even when nobody on them matched, so a roster we cannot price reads as a
     team with nothing rather than vanishing from its own league's table. */
  return aggregateTeamCatTotals([...byTeam.entries()].map(([teamId, players]) => ({ teamId, players })), cats)
}

/**
 * How much of the league we could actually price, 0..1.
 *
 * The caller shows the ECW number only when this is high enough. A ranking built from a third
 * of each roster is not a quieter version of the right answer, it is a different one, and the
 * .000 this module replaces was itself a confident-looking number with nothing behind it.
 */
export function hockeyProjectionCoverage(input: {
  roster: HockeyRosterPlayer[]
  projectionFor: (p: HockeyRosterPlayer) => HockeyProjection | null
}): number {
  const rostered = input.roster.filter((p) => p.teamKey)
  if (!rostered.length) return 0
  return rostered.filter((p) => input.projectionFor(p)).length / rostered.length
}
