import { getLeagueType } from '@/config/sports'

export type Cadence = 'daily' | 'weekly'
export type Scoring = 'points' | 'categories' | 'roto'
export type ShapeSource = 'manual' | 'detected' | 'default'

export interface LeagueShape {
  cadence: Cadence
  scoring: Scoring
  /** Where `cadence` came from. A guess must never be presented as a fact. */
  source: ShapeSource
}

/** Sports that play most nights, and can therefore run either cadence. */
const NIGHTLY = new Set(['hockey', 'basketball', 'baseball'])

/**
 * Lineup cadence from the platform, or null when it did not say.
 *
 * ESPN carries `rosterSettings.rosterLocktimeType`. Verified 2026-09-23 against its public
 * league defaults: `FIRSTGAME_SCORINGPERIOD` for hockey, basketball and baseball;
 * `INDIVIDUAL_GAME` for football.
 *
 * The asymmetry below is deliberate and is the honest part. A roster that locks at the first
 * game of the scoring period, in a sport that plays nightly, is committed for the night — that
 * is daily, and it was observed. Football's `INDIVIDUAL_GAME` is weekly because its scoring
 * period is already a week, which is a fact about the sport rather than about the string.
 *
 * What was NOT observed is what a weekly-lineup hockey league returns, because league defaults
 * for those sports are daily and only one of the two values was ever visible. Mapping
 * `INDIVIDUAL_GAME` to weekly in a nightly sport would be a rule inferred from the case it
 * happens to get right. So it returns null and the caller falls back visibly.
 */
export function detectCadence(input: {
  sport?: string | null
  rosterLocktimeType?: string | null
}): Cadence | null {
  const sport = String(input.sport ?? '')
  const lock = String(input.rosterLocktimeType ?? '')
  if (sport === 'football') return 'weekly'
  if (!NIGHTLY.has(sport) || !lock) return null
  return lock === 'FIRSTGAME_SCORINGPERIOD' ? 'daily' : null
}

/**
 * What kind of league this is, on the two axes that decide every page.
 *
 * The product used to ask `activeSport === 'football'` and take that as the answer to both,
 * which is wrong in both directions: a weekly-lineup hockey league was handed a daily optimiser
 * it could not act on. Sport decides which player universe to load and nothing else.
 *
 * Scoring reuses `getLeagueType` rather than reimplementing it — there is one definition of
 * what "roto" means and it already lives there.
 */
export function leagueShape(input: {
  sport?: string | null
  scoringType?: string | null
  rosterLocktimeType?: string | null
  manualCadence?: Cadence | null
}): LeagueShape {
  const sport = String(input.sport ?? '')
  const scoring: Scoring = sport === 'football' ? 'points' : getLeagueType(input.scoringType ?? undefined)

  if (input.manualCadence) {
    return { cadence: input.manualCadence, scoring, source: 'manual' }
  }
  const detected = detectCadence(input)
  if (detected) return { cadence: detected, scoring, source: 'detected' }

  /* Nightly sports default to daily because that is the more common setup and the one whose
     page is built; football has no other shape. Either way `source` says it was a default, so
     the surface offers the override rather than asserting. */
  return { cadence: NIGHTLY.has(sport) ? 'daily' : 'weekly', scoring, source: 'default' }
}
