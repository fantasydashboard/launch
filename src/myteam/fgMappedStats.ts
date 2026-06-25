import { mapToEspnStats, type FGProjection } from '@/services/projectionService'
import type { CatSpec } from './types'
import { attachRatioVolume } from './catVolume'

/**
 * Translate raw FanGraphs projections (keyed by FanGraphs field names like `hr`, `era`, `ip`)
 * into the league's `{ statId: number }` shape that {@link toEffectiveStats} consumes.
 *
 * This step is NOT optional. `toEffectiveStats` looks up `fgStats?.[cat.statId]`, where
 * `cat.statId` is a numeric league id ("5", "12", …). A raw FGProjection has no such keys, so
 * every lookup misses and the rest-of-season blend silently never applies — leaving the value
 * model on extrapolated season-to-date pace. My Team mapped its projections; Trades and the
 * analyzer did not, which made the same player read differently on the two pages. This helper
 * is the single source of truth so the three call sites can't diverge again.
 */
export function mapFgStatsByKey(
  fgByKey: Record<string, FGProjection | null>,
  cats: CatSpec[],
  labelOf: (statId: string) => string,
): Record<string, Record<string, number>> {
  const fgCats = cats.map((c) => ({
    stat_id: c.statId,
    display_name: labelOf(c.statId),
    isPitching: c.side === 'pit',
  }))
  const out: Record<string, Record<string, number>> = {}
  for (const key of Object.keys(fgByKey)) {
    const fg = fgByKey[key]
    if (!fg) continue
    const mapped = mapToEspnStats(fg, fgCats)
    attachRatioVolume(mapped, fg, cats) // so ratio cats with a synthetic volume id can be weighted
    out[key] = mapped
  }
  return out
}
