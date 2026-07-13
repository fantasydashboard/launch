/** Injury availability tier, derived from a platform status string (+ reserve-slot flag). */
export type InjuryTier = 'healthy' | 'dtd' | 'il'

// Rest-of-season points multipliers. Tunable in one place: DTD players usually still
// play (light haircut); IL players miss a chunk of the remaining season (heavy haircut).
export const DTD_DISCOUNT = 0.9
export const IL_DISCOUNT = 0.5

const IL_CODES = new Set(['NA', 'DL', 'O', 'OUT', 'SUSP', 'PUP'])
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
  if (s.startsWith('DTD') || DTD_CODES.has(s)) return 'dtd'
  return 'healthy'
}

/** Rest-of-season points multiplier for a tier. */
export function injuryDiscount(tier: InjuryTier): number {
  return tier === 'il' ? IL_DISCOUNT : tier === 'dtd' ? DTD_DISCOUNT : 1
}
