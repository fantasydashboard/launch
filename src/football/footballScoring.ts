import {
  defaultWeights,
  weightsAreUsable,
  normalizeEspnWeights,
  normalizeYahooWeights,
} from '@/myteam/pointsScoring'

export type FootballScoringSource = 'sleeper' | 'espn' | 'yahoo' | 'default'

export interface FootballScoring {
  weights: Record<string, number>
  source: FootballScoringSource
}

/**
 * Sleeper's scoring blob, as weights.
 *
 * A pass-through, and deliberately so: our stat keys in config/sports/football.ts ARE Sleeper's
 * key names. They have to be — the projections we score come from Sleeper keyed that way, so
 * any other key space would already have failed to score anything at all.
 *
 * The one rule that is not obvious: an explicit zero is KEPT. A league that scores nothing per
 * reception is standard scoring, which is most of the leagues this exists for, and dropping
 * falsy values would let the PPR default show through underneath and hand that league a board
 * built for somebody else's.
 */
export function sleeperFootballWeights(scoringSettings: unknown): Record<string, number> | null {
  if (!scoringSettings || typeof scoringSettings !== 'object' || Array.isArray(scoringSettings)) return null
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(scoringSettings as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  return Object.keys(out).length ? out : null
}

/**
 * The league's real scoring, or an honest default.
 *
 * Everything before this resolved to `defaultWeights('football')` — full PPR, for every league,
 * on every football surface. A manager in a standard league has been reading a board built for
 * somebody else's rules, with nothing on the page saying so.
 *
 * `source` is returned rather than inferred because the fallback has to be visible. A default
 * weight map does not look like a failure: it produces a complete, plausible, confidently wrong
 * board, which is the one outcome worth being able to detect.
 */
export function resolveFootballScoring(input: {
  platform?: string | null
  sleeperScoringSettings?: unknown
  espnScoringItems?: unknown
  yahooStatCategories?: unknown
  yahooStatModifiers?: unknown
}): FootballScoring {
  const fallback: FootballScoring = { weights: defaultWeights('football'), source: 'default' }

  switch (input.platform) {
    case 'sleeper': {
      const w = sleeperFootballWeights(input.sleeperScoringSettings)
      return w && weightsAreUsable(w) ? { weights: w, source: 'sleeper' } : fallback
    }
    case 'espn': {
      const w = normalizeEspnWeights(input.espnScoringItems as any)
      return weightsAreUsable(w) ? { weights: w, source: 'espn' } : fallback
    }
    case 'yahoo': {
      const w = normalizeYahooWeights(input.yahooStatCategories as any, input.yahooStatModifiers as any)
      return weightsAreUsable(w) ? { weights: w, source: 'yahoo' } : fallback
    }
    default:
      return fallback
  }
}
