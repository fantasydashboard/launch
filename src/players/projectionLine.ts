import type { CatSpec } from '@/myteam/value'

/** One stat in a player's projection line. `helped` marks a category this add flips
 *  (highlighted in the UI) so the helped cats are never restated as separate chips. */
export interface ProjSegment {
  statId: string
  label: string
  value: string
  helped: boolean
}

/** Format a projected value: ratios under 1 read as a leading-dot rate (.288), other
 *  ratios as two decimals (3.74 ERA / 1.19 WHIP), counting stats as whole numbers. */
export function formatProj(value: number, isRatio: boolean): string {
  if (isRatio) {
    return Math.abs(value) < 1 ? value.toFixed(3).replace(/^0/, '') : value.toFixed(2)
  }
  return String(Math.round(value))
}

/**
 * A compact projection line for a Players-page row: the categories this add flips come
 * first (flagged for highlight), then the player's other same-side cats fill up to
 * `max` segments for context. Helped cats appear once — as highlighted segments — so
 * nothing is stated twice (the old "ERA WHIP · 3.90 ERA · 1.22 WHIP" redundancy).
 */
export function projectionLine(
  stats: Record<string, number>,
  cats: CatSpec[],
  side: 'hit' | 'pit',
  helped: string[],
  labelOf: (statId: string) => string,
  max = 3,
): ProjSegment[] {
  const helpedSet = new Set(helped)
  const sideCats = cats.filter((c) => c.side === side)
  const ordered = [
    ...sideCats.filter((c) => helpedSet.has(c.statId)),
    ...sideCats.filter((c) => !helpedSet.has(c.statId)),
  ]
  const out: ProjSegment[] = []
  for (const c of ordered) {
    const v = stats[c.statId]
    if (v === undefined || !Number.isFinite(v)) continue
    out.push({ statId: c.statId, label: labelOf(c.statId), value: formatProj(v, c.isRatio), helped: helpedSet.has(c.statId) })
    if (out.length >= max) break
  }
  return out
}
