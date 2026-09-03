/**
 * Dynasty value, joined onto our own players.
 *
 * WHY A MARKET AND NOT A FORMULA
 *
 * The obvious build is an age curve over our own projections: discount each future season,
 * fall off a cliff at the positional age. It cannot work, and the live data says why —
 * Jordyn Tyson is 22 with a redraft value of 506 and a dynasty value of 3328. His projection
 * is near zero, so no discount rate applied to it produces a top-40 dynasty asset. Dynasty
 * prices UPSIDE ON UNPROVEN YOUTH, which a projection structurally cannot see.
 *
 * So the number comes from a market, and stays a market: an ordering and a value, never
 * blended with our points.
 *
 * TWO CURRENCIES, NEVER ONE
 *
 * Every consumer gets both `value` (dynasty) and `redraftValue` (this year) on the source's
 * single internal scale, so the two are honestly comparable to each other — and NEITHER is
 * ever averaged with our VOR. The disagreement between them is the entire product: a trade
 * that wins this year and loses the future is a real, common, useful thing to be told, and
 * one blended score is precisely how every other tool hides it.
 *
 * Pure. The fetching lives in services/dynastyService.
 */

/** One row as the provider gives it, already normalised to what we use. */
export interface DynastySource {
  sleeperId: string
  name: string
  position: string
  age: number | null
  /** Long-term value on the provider's scale. Higher = better. */
  value: number
  /** Same scale, this season only. */
  redraftValue: number
  overallRank: number
  positionRank: number
}

/** Which way a player leans once you compare the two horizons. */
export type DynastyLean = 'win-now' | 'future' | 'level'

export interface DynastyRow {
  playerKey: string
  value: number
  redraftValue: number
  overallRank: number
  /** Rank at this position among players the market has priced. */
  positionRank: number
  age: number | null
  lean: DynastyLean
  /**
   * How lopsided, 0..1, as a share of the bigger of the two values. Scale-free so it can be
   * compared across a 12,000-point stud and a 500-point flier.
   */
  skew: number
}

/**
 * Below this the two horizons agree closely enough that saying anything would be noise.
 * A quarter of a player's own value is a real disagreement; a tenth is the market rounding.
 */
export const LEAN_THRESHOLD = 0.25

export function leanOf(value: number, redraftValue: number): { lean: DynastyLean; skew: number } {
  const big = Math.max(value, redraftValue)
  if (big <= 0) return { lean: 'level', skew: 0 }
  const skew = (value - redraftValue) / big
  if (skew >= LEAN_THRESHOLD) return { lean: 'future', skew }
  if (skew <= -LEAN_THRESHOLD) return { lean: 'win-now', skew }
  return { lean: 'level', skew }
}

/**
 * Join the market onto the players we actually have.
 *
 * Keyed on the Sleeper id, which is our own playerKey for Sleeper leagues — so this is an
 * exact join, not a name match. Name matching is where this class of feature usually rots
 * (suffixes, apostrophes, "Marvin Harrison" vs "Marvin Harrison Jr."), and the provider
 * carrying sleeperId on every row is most of why it was worth choosing.
 *
 * Players the market has not priced are ABSENT from the result, never zero. A missing
 * dynasty value has to render as "—"; a zero would sort a real player to the bottom of the
 * board and read as a verdict we never made.
 */
export function buildDynastyRows(source: DynastySource[]): Record<string, DynastyRow> {
  const out: Record<string, DynastyRow> = {}
  for (const s of source) {
    const key = String(s.sleeperId ?? '').trim()
    if (!key || !Number.isFinite(s.value)) continue
    const redraftValue = Number.isFinite(s.redraftValue) ? s.redraftValue : 0
    const { lean, skew } = leanOf(s.value, redraftValue)
    out[key] = {
      playerKey: key,
      value: s.value,
      redraftValue,
      overallRank: s.overallRank,
      positionRank: s.positionRank,
      age: Number.isFinite(s.age as number) ? (s.age as number) : null,
      lean,
      skew,
    }
  }
  return out
}

/** Total dynasty value of a set of players. Absent players contribute nothing. */
export function dynastyTotal(keys: string[], rows: Record<string, DynastyRow>): number {
  return keys.reduce((sum, k) => sum + (rows[k]?.value ?? 0), 0)
}

/**
 * How many of a side's players the market could actually price.
 *
 * Reported alongside any total, because a deal total built from two of four players is not
 * a smaller number — it is a different question, and the view has to be able to say so
 * rather than print a confident sum over a hole.
 */
export function dynastyCoverage(keys: string[], rows: Record<string, DynastyRow>): {
  priced: number
  total: number
  complete: boolean
} {
  const priced = keys.filter((k) => rows[k]).length
  return { priced, total: keys.length, complete: priced === keys.length }
}

/**
 * Score a trade in the dynasty currency: what you get minus what you give.
 *
 * Returns null when either side has an unpriced player, rather than a total that silently
 * omits it. The alternative — summing what we happen to know — produces a verdict that looks
 * identical whether the market priced everyone or nobody.
 */
export function scoreDynastyTrade(
  gives: string[],
  gets: string[],
  rows: Record<string, DynastyRow>,
): { delta: number; lean: DynastyLean } | null {
  const g = dynastyCoverage(gives, rows)
  const r = dynastyCoverage(gets, rows)
  if (!g.complete || !r.complete || !gives.length || !gets.length) return null
  const delta = dynastyTotal(gets, rows) - dynastyTotal(gives, rows)
  const scale = Math.max(dynastyTotal(gets, rows), dynastyTotal(gives, rows))
  const skew = scale > 0 ? delta / scale : 0
  return {
    delta,
    lean: skew >= LEAN_THRESHOLD ? 'future' : skew <= -LEAN_THRESHOLD ? 'win-now' : 'level',
  }
}
