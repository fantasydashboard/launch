/**
 * Park factors for the Today matchup layer: a hitter factor (>1 = hitter-friendly) and
 * pitcher factor (<1 = pitcher gets suppressed, i.e. good for the pitcher's own value).
 * Small embedded static table (public, roughly stable year to year); no external feed.
 * Unknown parks are neutral. Keyed by home-team abbreviation; accepts cross-source variants.
 */
import { teamAbbrVariants } from '@/services/mlbSchedule'

export interface ParkFactor {
  hit: number
  pit: number
}

// hit = run/offense factor at that park (1.0 neutral). pit is derived as the inverse-ish
// benefit to a pitcher throwing there. Values are coarse, directional buckets.
const HITTER_FACTOR: Record<string, number> = {
  COL: 1.2, CIN: 1.08, BOS: 1.07, KC: 1.05, ARI: 1.04, PHI: 1.04, TEX: 1.03,
  BAL: 1.03, LAA: 1.02, ATL: 1.02, TOR: 1.02, WSH: 1.01, HOU: 1.01, MIN: 1.0,
  CHC: 1.0, NYY: 1.0, MIL: 1.0, STL: 0.99, PIT: 0.99, WAS: 1.01, CLE: 0.98,
  CHW: 0.98, LAD: 0.98, NYM: 0.98, DET: 0.97, TB: 0.97, ATH: 0.96, OAK: 0.96, SF: 0.95,
  MIA: 0.95, SD: 0.94, SEA: 0.93,
}

export function parkFactor(homeTeamAbbr: string): ParkFactor {
  for (const v of teamAbbrVariants(homeTeamAbbr)) {
    const hit = HITTER_FACTOR[v]
    if (hit != null) return { hit, pit: +(2 - hit).toFixed(3) } // pitcher benefits inversely
  }
  return { hit: 1, pit: 1 }
}
