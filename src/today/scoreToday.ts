/**
 * One daily play's value = base single-game projection × a clamped matchup multiplier.
 * The multiplier only TILTS the ranking (park + opposing-SP), never dominates it, and is
 * bucketed to 0..6 blocks for the ▓▓▓▓▓░ bar. Missing factors → neutral 1.0 (base only).
 */
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

export interface MatchupFactors {
  parkFactor?: number
  spFactor?: number
}

export interface TodayScore {
  value: number
  multiplier: number
  bucket: number // 0..6
}

export function scoreToday(base: number, f: MatchupFactors): TodayScore {
  const raw = (f.parkFactor ?? 1) * (f.spFactor ?? 1)
  const multiplier = clamp(raw, 0.7, 1.3)
  // Map 0.7..1.3 → 0..6.
  const bucket = Math.round(((multiplier - 0.7) / 0.6) * 6)
  return { value: +(base * multiplier).toFixed(3), multiplier, bucket: clamp(bucket, 0, 6) }
}
