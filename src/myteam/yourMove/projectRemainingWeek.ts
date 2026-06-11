import type { CatSpec } from '@/myteam/value'

// Regular-season length in days (~26 weeks). Used to turn a full-season projection
// into a rest-of-week contribution. Phase 2 replaces day-proportional scaling with
// real games-per-week from the schedule service.
const SEASON_DAYS = 183

/**
 * Project a player's stat accrual over the remaining days of the fantasy week.
 * Counting stats: full-season projection (YTD / seasonFractionComplete, or FG ROS)
 * scaled by remainingDays/SEASON_DAYS. Ratio stats pass through unchanged; the
 * scorer volume-weights them so a small sample can't swing a rate unrealistically.
 */
export function projectRemainingWeek(
  seasonStats: Record<string, number>,
  fgStats: Record<string, number> | null,
  cats: CatSpec[],
  remainingDays: number,
  seasonFractionComplete: number,
): Record<string, number> {
  const out: Record<string, number> = {}
  const frac = seasonFractionComplete > 0 ? seasonFractionComplete : 1
  for (const cat of cats) {
    if (cat.isRatio) {
      const fg = fgStats?.[cat.statId]
      out[cat.statId] = fg !== undefined && Number.isFinite(fg) ? fg : (seasonStats[cat.statId] ?? 0)
      continue
    }
    const fgCount = fgStats?.[cat.statId]
    const fullSeason =
      fgCount !== undefined && Number.isFinite(fgCount)
        ? fgCount
        : (seasonStats[cat.statId] ?? 0) / frac
    out[cat.statId] = fullSeason * (remainingDays / SEASON_DAYS)
  }
  return out
}
