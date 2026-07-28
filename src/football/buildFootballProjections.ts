import { calculatePoints } from '@/config/sports'
import type { WeekProjections } from '@/services/footballProjections'

export interface FootballProjection {
  stats: Record<string, number>
  points: number
}

/** A league player to attach a projection to. `sleeperId` is present for Sleeper
 * leagues; ESPN/Yahoo players match by name+position instead. */
export interface ProjPlayer {
  key: string
  name: string
  position: string
  sleeperId?: string
}

export interface SleeperPlayerMeta {
  name: string
  position: string
}

/** Normalize an NFL player name for cross-platform matching. */
export function normalizeNflName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[.'’,]/g, '')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Build the football fgByKey analog: per-player { stats, points } keyed by the platform
 * player key. Sleeper players match by sleeperId; ESPN/Yahoo match by normalized
 * name + position against the Sleeper player-meta map. Unmatched players are omitted
 * (consumers treat an absent key as 0, same as MLB unmatched).
 */
export function buildFootballProjectionsByKey(
  players: ProjPlayer[],
  summedStats: WeekProjections,
  sleeperMeta: Record<string, SleeperPlayerMeta>,
  scoring: Record<string, number>,
): Record<string, FootballProjection> {
  const nameIndex = new Map<string, string>()
  for (const [id, meta] of Object.entries(sleeperMeta)) {
    if (!meta) continue
    nameIndex.set(`${normalizeNflName(meta.name)}|${(meta.position || '').toUpperCase()}`, id)
  }
  const out: Record<string, FootballProjection> = {}
  for (const p of players) {
    const sleeperId =
      p.sleeperId ?? nameIndex.get(`${normalizeNflName(p.name)}|${(p.position || '').toUpperCase()}`)
    if (!sleeperId) continue
    const stats = summedStats[sleeperId]
    if (!stats) continue
    out[p.key] = { stats, points: calculatePoints('football', stats, scoring) }
  }
  return out
}
