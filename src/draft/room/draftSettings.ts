/**
 * Reading a draft's own format instead of assuming your league's.
 *
 * A mock draft is a real Sleeper draft with its own roster slots and scoring. If
 * we score a 2-QB half-PPR mock using your 1-QB PPR league's settings, every
 * number is quietly wrong — replacement level, the ADP market, and how fast the
 * board tilts to upside all depend on format. So when we're pointed at a draft,
 * we take the format from that draft.
 */

/** Sleeper's draft settings use slots_<pos> keys. */
const SLOT_FIELDS: Record<string, string> = {
  slots_qb: 'QB',
  slots_rb: 'RB',
  slots_wr: 'WR',
  slots_te: 'TE',
  slots_k: 'K',
  slots_def: 'DEF',
  slots_flex: 'FLEX',
  slots_super_flex: 'SUPER_FLEX',
  slots_wr_rb: 'FLEX',
  slots_wr_te: 'FLEX',
  slots_rec_flex: 'FLEX',
  slots_idp_flex: 'IDP_FLEX',
  slots_bn: 'BN',
}

/**
 * Roster slots from a draft's settings, in the shape the VOR engine expects.
 * Returns null when the draft carries no usable slot information, so the caller
 * can fall back to the league rather than acting on an empty roster.
 */
export function slotsFromDraftSettings(
  settings: Record<string, any> | null | undefined,
): Record<string, number> | null {
  if (!settings || typeof settings !== 'object') return null
  const out: Record<string, number> = {}
  let any = false
  for (const [field, pos] of Object.entries(SLOT_FIELDS)) {
    const n = Number(settings[field])
    if (Number.isFinite(n) && n > 0) {
      out[pos] = (out[pos] ?? 0) + n
      any = true
    }
  }
  return any ? out : null
}

/**
 * Reception scoring from a draft's metadata. Sleeper reports `scoring_type` as
 * 'ppr' | 'half_ppr' | 'std' (also seen as '2qb' variants on the league side).
 * Returned in the `{ rec }` shape `adpVariantFor` already consumes, so the two
 * paths — league settings and draft metadata — stay interchangeable.
 */
export function scoringFromDraftMetadata(
  metadata: Record<string, any> | null | undefined,
): Record<string, number> | null {
  const raw = String(metadata?.scoring_type ?? '').toLowerCase()
  if (!raw) return null
  if (raw.includes('half')) return { rec: 0.5 }
  if (raw.includes('ppr')) return { rec: 1 }
  if (raw.includes('std') || raw.includes('standard')) return { rec: 0 }
  return null
}
