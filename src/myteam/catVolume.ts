import type { FGProjection } from '@/services/projectionService'
import type { CatSpec } from './types'

// Ratio categories (AVG, ERA, WHIP, OPS…) must be VOLUME-weighted to rank — you can't average
// rates, you blend them by playing time (AB/PA for batting, IP for pitching). Leagues that score
// AB/IP as their own category give us a real volumeStatId; many (esp. Yahoo) don't, leaving ratio
// cats unrankable (every team ties at the no-data sentinel). These helpers give such cats a
// synthetic volume id and fill it straight from the FanGraphs projection.

export const SYNTH_VOL_PA = '__volpa' // batting ratios (AVG/OPS/OBP) when no AB/PA category
export const SYNTH_VOL_IP = '__volip' // pitching ratios (ERA/WHIP) when no IP category

/** The volume stat that weights a ratio cat: the real AB/IP category if the league scores one,
 *  else a synthetic id so the ratio can still be weighted from projections. Undefined for non-ratios. */
export function resolveVolumeStatId(
  isRatio: boolean,
  side: 'hit' | 'pit',
  ipStatId?: string,
  abStatId?: string,
): string | undefined {
  if (!isRatio) return undefined
  return side === 'pit' ? (ipStatId ?? SYNTH_VOL_IP) : (abStatId ?? SYNTH_VOL_PA)
}

/** Fill each ratio cat's volume (IP for pitching, PA/AB for batting) from the FG projection under
 *  its volumeStatId, when that volume isn't itself a scored category. Call after the normal FG→stat
 *  mapping so ratio cats with a synthetic volume id become rankable. No-op for leagues that score
 *  AB/IP (the volume is already mapped as a category). */
export function attachRatioVolume(mapped: Record<string, number>, fg: FGProjection, cats: CatSpec[]): void {
  const catIds = new Set(cats.map((c) => c.statId))
  for (const c of cats) {
    if (!c.isRatio || !c.volumeStatId || catIds.has(c.volumeStatId)) continue
    if (mapped[c.volumeStatId] !== undefined) continue
    const vol = c.side === 'pit' ? fg.ip : (fg.pa ?? fg.ab)
    if (vol != null && Number.isFinite(vol)) mapped[c.volumeStatId] = vol
  }
}
