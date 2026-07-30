import { sleeperService } from './sleeper'
import { getSportConfig } from '@/config/sports'

/** Scoring-relevant NFL stat keys — reuse the football sport-config so summing and
 * scoring stay in sync. */
const NFL_STAT_KEYS: string[] = getSportConfig('football').pointsConfig.statKeys

/** playerId -> raw stat map (Sleeper's weekly projection shape). */
export type WeekProjections = Record<string, Record<string, number>>

/**
 * Sum an array of per-week projection maps into one playerId -> summed-stats map,
 * keeping only `statKeys` and only finite numbers. Pure; never throws or yields NaN.
 */
export function sumWeekProjections(
  weeks: WeekProjections[],
  statKeys: string[] = NFL_STAT_KEYS,
): WeekProjections {
  const out: WeekProjections = {}
  for (const week of weeks) {
    for (const [playerId, stats] of Object.entries(week || {})) {
      if (!stats || typeof stats !== 'object') continue
      const acc = out[playerId] ?? (out[playerId] = {})
      for (const k of statKeys) {
        const v = (stats as Record<string, number>)[k]
        if (typeof v === 'number' && Number.isFinite(v)) acc[k] = (acc[k] ?? 0) + v
      }
    }
  }
  return out
}

/**
 * Fetch Sleeper NFL SEASON projections (one call) → per-player raw projected stats,
 * filtered to scoring-relevant keys. Uses the season endpoint (not per-week summing),
 * which is robust to players missing individual weeks (traded/injured) — summing weeks
 * collapsed such players to ~0.
 */
export async function fetchSeasonProjectionStats(season: string): Promise<WeekProjections> {
  const raw = await sleeperService.getSeasonProjections('football', season)
  const out: WeekProjections = {}
  for (const [playerId, stats] of Object.entries(raw)) {
    if (!stats || typeof stats !== 'object') continue
    const acc: Record<string, number> = {}
    for (const k of NFL_STAT_KEYS) {
      const v = (stats as Record<string, number>)[k]
      if (typeof v === 'number' && Number.isFinite(v)) acc[k] = v
    }
    out[playerId] = acc
  }
  return out
}
