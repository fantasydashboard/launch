/**
 * Opposing-starter resolution + a normalized SP-quality factor for the Today matchup
 * layer. The factor answers "how good is TODAY's spot for a HITTER facing this arm":
 * >1 for a soft opposing starter, <1 for an ace. The composable resolves raw stats
 * into PitcherQuality best-effort and passes null when it can't (→ neutral 1.0).
 */
import type { WeekSchedule } from '@/services/mlbSchedule'
import { teamAbbrVariants } from '@/services/mlbSchedule'

export interface PitcherQuality {
  kRate?: number // strikeouts / batters faced (or / IP-derived), ~0.10–0.35
  era?: number
}

/** True if two abbreviations refer to the same club, across cross-source variants.
 *  teamAbbrVariants is one-directional (canonical -> variants), so check both ways. */
function sameTeam(a: string, b: string): boolean {
  if (a === b) return true
  return teamAbbrVariants(a).includes(b) || teamAbbrVariants(b).includes(a)
}

/** Name of the pitcher starting AGAINST `teamAbbr` today, or null. */
export function opposingStarterName(schedule: WeekSchedule, teamAbbr: string): string | null {
  for (const starts of Object.values(schedule.startsByPitcher)) {
    for (const s of starts) {
      if (sameTeam(s.opponentAbbr, teamAbbr)) return s.pitcherName
    }
  }
  return null
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/**
 * Hitter-facing factor. League-average anchors: K% ~0.22, ERA ~4.0. A tougher-than-average
 * arm pushes below 1; a softer one above 1. Missing inputs contribute nothing.
 */
export function spQualityFactor(q: PitcherQuality | null): number {
  if (!q) return 1
  let tilt = 0 // positive = good for the hitter
  if (q.kRate != null) tilt += (0.22 - q.kRate) * 1.5 // facing high-K arm → negative tilt
  if (q.era != null) tilt += (q.era - 4.0) * 0.05 // facing high-ERA arm → positive tilt
  return clamp(+(1 + tilt).toFixed(3), 0.75, 1.25)
}
