/**
 * Normalizes a league's raw scoring settings into the unified weight map that
 * projectPlayerPoints() consumes (keyed by the unified scoring keys in
 * pointsValue.POINTS_STAT_SPECS: R, HR, K, ER, H_P, …).
 *
 * Each platform reports scoring differently:
 *  - Yahoo: stat_modifiers keyed by Yahoo stat_id + a stat_categories array that
 *    carries each stat's NAME and position_type ('B' | 'P'). We normalize by
 *    (name, side) — robust, no fragile id table.
 *  - ESPN: scoringItems[] with a numeric statId + points/pointsOverride and no
 *    inline names. ESPN's id enumeration is inconsistent across endpoints (the
 *    repo already carries two conflicting maps), so this path is best-effort and
 *    meant to be verified against a real league via the ?ptsaudit panel.
 *
 * Anything we can't confidently map is dropped rather than mis-scored. When a
 * league yields no usable weights we fall back to the sport's generic defaults
 * so the page still renders (flagged as source: 'default').
 */
import { baseballConfig } from '@/config/sports/baseball'

export type ScoringSource = 'yahoo' | 'espn' | 'default'

export interface LeagueScoring {
  weights: Record<string, number>
  source: ScoringSource
}

/** Sport defaults, used when a league reports no usable scoring weights. */
export function defaultWeights(): Record<string, number> {
  return { ...(baseballConfig.pointsConfig.defaults as Record<string, number>) }
}

// ─── Yahoo ───────────────────────────────────────────────────────────────────

// Uppercased Yahoo stat display name → unified key, split by side so the
// batting/pitching homonyms (K, H, BB, HR) resolve correctly. position_type
// from stat_categories picks the side.
const YAHOO_BAT_NAME: Record<string, string> = {
  R: 'R', HR: 'HR', RBI: 'RBI', SB: 'SB', H: 'H', '1B': '1B', '2B': '2B',
  '3B': '3B', TB: 'TB', BB: 'BB', HBP: 'HBP', K: 'SO', CS: 'CS',
}
const YAHOO_PIT_NAME: Record<string, string> = {
  W: 'W', L: 'L', SV: 'SV', BSV: 'BS', BS: 'BS', HLD: 'HLD', HD: 'HLD',
  K: 'K', IP: 'IP', QS: 'QS', ER: 'ER', H: 'H_P', BB: 'BB_P', HR: 'HR_P',
}

interface YahooStatCat {
  stat?: { stat_id?: string | number; name?: string; display_name?: string; position_type?: string }
}

/**
 * Build unified weights from Yahoo's settings blob (getLeagueSettings result).
 * statCategories supplies stat_id → (name, position_type); statModifiers
 * supplies stat_id → point value.
 */
export function normalizeYahooWeights(
  statCategories: YahooStatCat[] | undefined,
  statModifiers: Record<string, number> | undefined,
): Record<string, number> {
  const mods = statModifiers || {}
  const meta = new Map<string, { name: string; side: 'B' | 'P' }>()
  for (const c of statCategories || []) {
    const id = c?.stat?.stat_id
    if (id == null) continue
    const name = String(c.stat?.display_name || c.stat?.name || '').toUpperCase().trim()
    const side = String(c.stat?.position_type || 'B').toUpperCase().startsWith('P') ? 'P' : 'B'
    meta.set(String(id), { name, side })
  }

  const weights: Record<string, number> = {}
  for (const [id, value] of Object.entries(mods)) {
    const v = Number(value)
    if (!v) continue // 0 (or NaN) weight: not scored
    const m = meta.get(String(id))
    if (!m) continue
    const key = (m.side === 'P' ? YAHOO_PIT_NAME : YAHOO_BAT_NAME)[m.name]
    if (!key) continue
    // If two source stats map to the same key (rare), keep the larger magnitude.
    if (weights[key] == null || Math.abs(v) > Math.abs(weights[key])) weights[key] = v
  }
  return weights
}

// ─── ESPN ──────────────────────────────────────────────────────────────────

// ESPN scoring statId → unified key, verified against a live points league via
// ?ptsaudit. `mult` rescales a stat that FG doesn't carry in the same unit —
// ESPN scores OUTS (statId 34) at N pts/out, which is 3N pts per projected
// INNING, so we fold the ×3 into the IP weight (FG gives innings, not outs).
const ESPN_POINTS_STAT: Record<string, { key: string; mult?: number }> = {
  // Batting
  '3': { key: '2B' }, '4': { key: '3B' }, '5': { key: 'HR' }, '7': { key: '1B' },
  '8': { key: 'TB' }, '10': { key: 'BB' }, '12': { key: 'HBP' }, '15': { key: 'SB' },
  '20': { key: 'R' }, '21': { key: 'RBI' }, '23': { key: 'SB' }, '27': { key: 'SO' },
  // Pitching
  '34': { key: 'IP', mult: 3 }, // OUTS → IP (1 pt/out = 3 pt/IP)
  '37': { key: 'H_P' }, '39': { key: 'BB_P' }, '45': { key: 'ER' }, '46': { key: 'HR_P' },
  '48': { key: 'K' }, '53': { key: 'W' }, '54': { key: 'L' }, '57': { key: 'SV' },
  '58': { key: 'BS' }, '60': { key: 'HLD' }, '63': { key: 'QS' },
}

interface EspnScoringItem {
  statId?: number | string
  points?: number
  pointsOverride?: number
  isReverseItem?: boolean
}

/** Build unified weights from ESPN's scoringSettings.scoringItems[]. */
export function normalizeEspnWeights(scoringItems: EspnScoringItem[] | undefined): Record<string, number> {
  const weights: Record<string, number> = {}
  for (const item of scoringItems || []) {
    if (item?.statId == null) continue
    const map = ESPN_POINTS_STAT[String(item.statId)]
    if (!map) continue
    const raw = typeof item.pointsOverride === 'number' ? item.pointsOverride : item.points
    if (raw == null) continue
    const v = Number(raw) * (map.mult ?? 1)
    if (!v) continue
    weights[map.key] = v
  }
  return weights
}

/** True when a weight map carries enough to score both sides of a roster. */
export function weightsAreUsable(weights: Record<string, number>): boolean {
  const keys = Object.keys(weights)
  return keys.length >= 3
}
