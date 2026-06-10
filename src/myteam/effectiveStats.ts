import type { CatSpec } from './types'

/**
 * Project a player's raw season-to-date stats to a full-season scale so matched
 * (FanGraphs full-season) and unmatched (extrapolated) players are comparable.
 *  - FG value present for a stat -> use it (full-season total, or rate for ratios).
 *  - else counting/volume stat -> raw / seasonFractionComplete (extrapolate).
 *  - else ratio rate -> raw unchanged (rates are already scale-free).
 * Slice 1 passes fgStats=null, seasonFractionComplete=1 -> returns raw unchanged.
 */
export function toEffectiveStats(
  rawStats: Record<string, number>,
  fgStats: Record<string, number> | null,
  cats: CatSpec[],
  seasonFractionComplete: number,
): Record<string, number> {
  const frac = seasonFractionComplete > 0 ? seasonFractionComplete : 1
  const out: Record<string, number> = { ...rawStats }
  // Volume stats referenced by ratio cats must also be projected (for ratio weighting).
  const volumeStatIds = new Set(cats.map((c) => c.volumeStatId).filter(Boolean) as string[])

  for (const cat of cats) {
    const fg = fgStats?.[cat.statId]
    if (fg !== undefined && fg !== null && !Number.isNaN(fg)) {
      out[cat.statId] = fg
      continue
    }
    const raw = rawStats[cat.statId]
    if (raw === undefined) continue
    if (cat.isRatio) {
      out[cat.statId] = raw // rate is scale-free
    } else {
      out[cat.statId] = raw / frac // counting -> full season
    }
  }
  // Project volume stats that aren't themselves scoring cats (e.g. IP used only for ERA weighting).
  for (const vId of volumeStatIds) {
    if (cats.some((c) => c.statId === vId)) continue // already handled above
    const fg = fgStats?.[vId]
    if (fg !== undefined && fg !== null && !Number.isNaN(fg)) out[vId] = fg
    else if (rawStats[vId] !== undefined) out[vId] = rawStats[vId] / frac
  }
  return out
}
