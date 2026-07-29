/**
 * Projected fantasy POINTS for a player — the points-league analog of the
 * category value model (computeRosterValue / z-scores).
 *
 * In a points league every stat collapses into one currency: the league's
 * scoring weight × the projected counting stat, summed. There are no
 * categories to rank in, no ratio cats, no cross-category z. This module turns
 * a FanGraphs rest-of-season projection into a single projected-points total
 * (plus a per-stat breakdown, so the UI can show where a player's points come
 * from).
 *
 * The heavy lifting — pulling the right counting stats out of an FG row,
 * including pitcher ER/H/BB/HR allowed and disambiguating batter-vs-pitcher
 * homonyms (HR, BB, H, K) — is already done by mapToEspnStats(). We just feed
 * it the league's scored stats as "categories" and dot-product the result with
 * the weights.
 */
import { mapToEspnStats, type FGProjection } from '@/services/projectionService'

export type PointsSide = 'hit' | 'pit'

/**
 * One scorable stat in a points league: our unified key (the key the weights
 * map is normalized to), the FanGraphs display name mapToEspnStats resolves it
 * by, and which side of the ball it belongs to (so a batter row never fills a
 * pitching stat and vice-versa).
 *
 * Overlapping names are split by unified key the same way the sport config's
 * pointsConfig does: batter strikeouts = SO, pitcher strikeouts = K; pitcher
 * hits/walks/HR allowed = H_P / BB_P / HR_P. The `fg` column maps each back to
 * the FG mapper's own name ('H' / 'BB' / 'HR' with isPitching set).
 */
export interface PointsStatSpec {
  key: string // unified scoring key (matches the normalized weights map)
  fg: string // FanGraphs display name for mapToEspnStats
  side: PointsSide
}

// Every stat a baseball points league plausibly scores. Weights drive which of
// these actually count for a given league — a stat with no weight is skipped —
// so it's safe for this to be a superset.
export const POINTS_STAT_SPECS: PointsStatSpec[] = [
  // Batting
  { key: 'R', fg: 'R', side: 'hit' },
  { key: 'HR', fg: 'HR', side: 'hit' },
  { key: 'RBI', fg: 'RBI', side: 'hit' },
  { key: 'SB', fg: 'SB', side: 'hit' },
  { key: 'H', fg: 'H', side: 'hit' },
  { key: '1B', fg: '1B', side: 'hit' },
  { key: '2B', fg: '2B', side: 'hit' },
  { key: '3B', fg: '3B', side: 'hit' },
  { key: 'TB', fg: 'TB', side: 'hit' },
  { key: 'BB', fg: 'BB', side: 'hit' },
  { key: 'HBP', fg: 'HBP', side: 'hit' },
  { key: 'SO', fg: 'SO', side: 'hit' }, // batter strikeouts (usually negative)
  { key: 'CS', fg: 'CS', side: 'hit' }, // FG may not project; resolves to nothing
  // Pitching
  { key: 'W', fg: 'W', side: 'pit' },
  { key: 'L', fg: 'L', side: 'pit' },
  { key: 'SV', fg: 'SV', side: 'pit' },
  { key: 'HLD', fg: 'HLD', side: 'pit' },
  { key: 'K', fg: 'K', side: 'pit' }, // pitcher strikeouts
  { key: 'IP', fg: 'IP', side: 'pit' },
  { key: 'QS', fg: 'QS', side: 'pit' },
  { key: 'ER', fg: 'ER', side: 'pit' },
  { key: 'H_P', fg: 'H', side: 'pit' }, // hits allowed
  { key: 'BB_P', fg: 'BB', side: 'pit' }, // walks allowed
  { key: 'HR_P', fg: 'HR', side: 'pit' }, // HR allowed
  { key: 'BS', fg: 'BS', side: 'pit' }, // blown saves
]

export interface PlayerPoints {
  total: number // projected rest-of-season fantasy points
  perStat: Record<string, number> // unified key -> points contributed (weight × stat)
  side: PointsSide // which side of the ball this player scores on
  games: number // projected games (batters) / appearances (pitchers), for per-game
}

/**
 * Project a single player's rest-of-season fantasy points from their FG
 * projection and the league's (normalized) scoring weights.
 *
 * `weights` is keyed by the unified scoring keys in POINTS_STAT_SPECS (R, HR,
 * K, ER, H_P, …). Only stats present in `weights` contribute.
 */
export function projectPlayerPoints(
  fg: FGProjection | null | undefined,
  weights: Record<string, number>,
): PlayerPoints {
  const side: PointsSide = fg?.player_type === 'pitcher' ? 'pit' : 'hit'
  const empty: PlayerPoints = { total: 0, perStat: {}, side, games: 0 }
  if (!fg) return empty

  // Only map the stats this league actually scores AND that match this player's
  // side — mapToEspnStats also gates by isPitching, but filtering here keeps the
  // category list small and the per-stat breakdown clean.
  const specs = POINTS_STAT_SPECS.filter((s) => weights[s.key] != null && s.side === side)
  if (!specs.length) return { ...empty, games: projectedGames(fg, side) }

  const mapped = mapToEspnStats(
    fg,
    specs.map((s) => ({ stat_id: s.key, display_name: s.fg, isPitching: s.side === 'pit' })),
  )

  const perStat: Record<string, number> = {}
  let total = 0
  for (const s of specs) {
    const stat = mapped[s.key]
    if (stat == null) continue
    const pts = stat * weights[s.key]
    if (pts === 0) continue
    perStat[s.key] = pts
    total += pts
  }

  return { total, perStat, side, games: projectedGames(fg, side) }
}

/** Projected games for per-game scoring: batters use G, pitchers GP (appearances). */
export function projectedGames(fg: FGProjection, side: PointsSide): number {
  if (side === 'pit') return fg.gp ?? fg.gs ?? 0
  return fg.g ?? 0
}
