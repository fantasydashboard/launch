/**
 * Average Draft Position, recovered from data we already fetch.
 *
 * Sleeper's season projections payload carries twelve format-specific ADP fields
 * (adp_ppr, adp_half_ppr, adp_std, adp_2qb, and dynasty variants). The existing
 * `fetchSeasonProjectionStats` filters the payload down to scoring stat keys, so
 * those fields are fetched over the network and then discarded. Reading them back
 * out of the same cached response costs zero additional requests.
 */

export type AdpVariant =
  | 'std'
  | 'ppr'
  | 'half_ppr'
  | '2qb'
  | 'dynasty_std'
  | 'dynasty_ppr'
  | 'dynasty_half_ppr'
  | 'dynasty_2qb'

/** Sleeper league type: 0 redraft, 1 keeper, 2 dynasty. */
const DYNASTY_LEAGUE_TYPE = 2

/**
 * Pick the ADP market that matches this league. A SUPER_FLEX slot dominates
 * reception scoring — a two-QB room reorders the entire board far more than PPR
 * does, so the 2qb market is the better predictor of when players actually go.
 */
export function adpVariantFor(
  scoringSettings: Record<string, number>,
  slots: Record<string, number>,
  leagueType?: number,
): AdpVariant {
  const dynasty = leagueType === DYNASTY_LEAGUE_TYPE
  const superFlex = (slots?.SUPER_FLEX ?? 0) > 0

  if (superFlex) return dynasty ? 'dynasty_2qb' : '2qb'

  const rec = Number(scoringSettings?.rec ?? 0)
  const base: AdpVariant = rec >= 1 ? 'ppr' : rec > 0 ? 'half_ppr' : 'std'
  if (!dynasty) return base
  return (`dynasty_${base}` as AdpVariant)
}

/**
 * playerKey -> ADP for one market. Accepts either shape Sleeper serves: the raw
 * array of `{ player_id, stats }` records, or the `playerId -> stats` map that
 * `sleeperService.getSeasonProjections` builds (and caches) from it.
 *
 * Players without a value for the requested variant are omitted entirely rather
 * than defaulted — a fabricated ADP would feed the survival simulation a draft
 * position nobody actually holds.
 */
export function adpByKey(
  raw: any[] | Record<string, any> | null | undefined,
  variant: AdpVariant,
): Record<string, number> {
  const field = `adp_${variant}`
  const out: Record<string, number> = {}
  if (!raw) return out

  const take = (id: unknown, stats: any) => {
    if (!id) return
    const v = stats?.[field]
    if (typeof v === 'number' && Number.isFinite(v)) out[String(id)] = v
  }

  if (Array.isArray(raw)) {
    for (const row of raw) take(row?.player_id, row?.stats)
    return out
  }
  // Map shape: the value is the stats object itself.
  for (const [id, stats] of Object.entries(raw)) take(id, stats)
  return out
}
