/**
 * Injury availability tier, derived from a platform status string (+ reserve-slot flag).
 *
 * `out` and `il` are DIFFERENT ABSENCES and used to be the same one. A player tagged Out is
 * missing the next game; a player on IR, PUP or a 60-day DL is missing a chunk of the season.
 * Folding the first into the second charged an NFL player half his rest-of-season value for a
 * designation that resets every Wednesday, and — worse — barred him from the optimal lineup
 * entirely, so a trade for him read as changing nothing at all.
 *
 * The feeds keep them apart, which is the evidence this rests on: Sleeper's NFL player list
 * carries Out, IR, PUP, NA and Sus as separate values. A platform that means multi-week has a
 * code for it and does not say "Out".
 */
export type InjuryTier = 'healthy' | 'dtd' | 'out' | 'il'

// Rest-of-season points multipliers. Tunable in one place: DTD players usually still
// play (light haircut); IL players miss a chunk of the remaining season (heavy haircut).
export const DTD_DISCOUNT = 0.9
export const IL_DISCOUNT = 0.5
/* One missed game out of a dozen or so remaining. Deliberately close to healthy: the cost of
   an Out tag is one week, and the previous 0.5 was pricing a season-ending injury. */
export const OUT_DISCOUNT = 0.92

const IL_CODES = new Set(['NA', 'DL', 'SUSP', 'PUP', 'IR', 'NFI', 'DNR', 'COV'])
/* Out for the NEXT game, not the season. Yahoo sends 'O', ESPN and Sleeper send 'OUT'. */
const OUT_CODES = new Set(['O', 'OUT'])
const DTD_CODES = new Set(['DTD', 'GTD', 'Q', 'QUESTIONABLE', 'DOUBTFUL', 'PROBABLE', 'P', 'DD', 'DAY_TO_DAY'])

/**
 * Normalize a platform injury status string to a tier. Covers Yahoo (`IL10`/`IL60`/`NA`/`DTD`/…)
 * and ESPN (`OUT`/`DAY_TO_DAY`/`TEN_DAY_DL`/`SIXTY_DAY_DL`/`ACTIVE`/…). `onIL` (a reserve-slot
 * flag from either platform) forces `il` regardless of the string. Unrecognized non-empty codes
 * are treated as `healthy` — conservative: we never haircut a player we can't confidently read.
 */
export function injuryTier(rawStatus?: string | null, onIL?: boolean): InjuryTier {
  if (onIL) return 'il'
  const s = String(rawStatus ?? '').toUpperCase().trim()
  if (!s || s === 'ACTIVE' || s === 'NORMAL') return 'healthy'
  if (s.startsWith('IL') || s.includes('_DL') || IL_CODES.has(s)) return 'il'
  if (OUT_CODES.has(s)) return 'out'
  if (s.startsWith('DTD') || DTD_CODES.has(s)) return 'dtd'
  return 'healthy'
}

/** Rest-of-season points multiplier for a tier. */
export function injuryDiscount(tier: InjuryTier): number {
  return tier === 'il' ? IL_DISCOUNT
    : tier === 'out' ? OUT_DISCOUNT
      : tier === 'dtd' ? DTD_DISCOUNT : 1
}

/**
 * Is he unavailable for the NEXT game?
 *
 * The question a daily or weekly surface asks, and the one where `out` and `il` agree. Season-
 * long surfaces must NOT use this: there the difference between the two is the whole point.
 */
export function missesNextGame(tier: InjuryTier): boolean {
  return tier === 'out' || tier === 'il'
}
