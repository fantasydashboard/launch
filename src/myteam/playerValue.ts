/**
 * The normalized player value both sports produce and every points engine
 * consumes. Baseball builds it from a FanGraphs projection; football from a
 * summed Sleeper NFL projection. Engines read `total` / `games` / `perStat` /
 * `side` / `weeklyCap` and never touch a raw FGProjection again — that is what
 * makes them sport-agnostic. `side === undefined` marks a football player.
 */
import { projectPlayerPoints, type PointsSide } from '@/myteam/pointsValue'
import type { FGProjection } from '@/services/projectionService'
import type { FootballProjection } from '@/football/buildFootballProjections'

export interface PlayerValue {
  total: number // projected rest-of-season fantasy points
  games: number // projected games (→ perGame = total / games)
  perStat: Record<string, number> // unified stat key → points contributed
  side?: PointsSide // 'hit' | 'pit' (baseball); undefined ⇒ football
  weeklyCap: number // games-per-week ceiling for weeklyRate
}
export type ValueByKey = Record<string, PlayerValue>

export const ZERO_VALUE: PlayerValue = { total: 0, games: 0, perStat: {}, weeklyCap: 0 }

/** Role-based games-per-week ceiling — folds the one thing weeklyRate used to
 *  read off raw fg (starter-vs-reliever) into the value object. */
function baseballCap(side: PointsSide, fg: FGProjection | null | undefined): number {
  if (side === 'hit') return 6.5
  const gs = Number(fg?.gs ?? 0)
  const gp = Number(fg?.gp ?? fg?.gs ?? 0)
  const isStarter = gs >= gp * 0.5
  return isStarter ? 1.3 : 3.5
}

/** Single baseball player → PlayerValue (also used by the free-agent resolver). */
export function baseballValueOne(fg: FGProjection | null | undefined, weights: Record<string, number>): PlayerValue {
  const pp = projectPlayerPoints(fg, weights)
  return { total: pp.total, games: pp.games, perStat: pp.perStat, side: pp.side, weeklyCap: baseballCap(pp.side, fg) }
}

export function buildBaseballValue(
  fgByKey: Record<string, FGProjection | null>,
  weights: Record<string, number>,
): ValueByKey {
  const out: ValueByKey = {}
  for (const [key, fg] of Object.entries(fgByKey)) out[key] = baseballValueOne(fg, weights)
  return out
}

/** Single football player → PlayerValue (per-week basis; see buildFootballValue). */
export function footballValueOne(proj: FootballProjection | null | undefined, weeksLeft: number): PlayerValue {
  const wl = Math.max(1, weeksLeft)
  if (!proj) return { ...ZERO_VALUE, games: wl }
  return { total: proj.points, games: wl, perStat: {}, side: undefined, weeklyCap: 999 }
}

export function buildFootballValue(
  projByKey: Record<string, FootballProjection>,
  weeksLeft: number,
): ValueByKey {
  const out: ValueByKey = {}
  for (const [key, proj] of Object.entries(projByKey)) out[key] = footballValueOne(proj, weeksLeft)
  return out
}

/**
 * Schedule-neutral WEEKLY production rate for talent ranking (moved here from
 * pointsValue.ts and re-based on PlayerValue). rate = perGame × games-per-week,
 * where games-per-week is the player's own remaining-window usage CAPPED at a
 * role-normal ceiling (weeklyCap). The cap throttles a late-season two-start
 * spike while leaving everyday volume intact. Football's cap (999) never binds.
 */
export function weeklyRate(v: PlayerValue, weeksLeft: number): number {
  if (v.games <= 0 || v.total === 0) return 0
  const wl = Math.max(1, weeksLeft)
  return (v.total / v.games) * Math.min(v.games / wl, v.weeklyCap)
}
