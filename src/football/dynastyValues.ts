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
  /** Change in dynasty value over the last 30 days, on the same scale as `value`. */
  trend30: number
}

/** Which way a player leans once you compare the two horizons. */
export type DynastyLean = 'win-now' | 'future' | 'level'

/**
 * Recent movement, which is how you tell a mispricing from a news event.
 *
 * "Buy low" means the market is asleep on a player. It is exactly the wrong read when the
 * market has just marked him down 28% in a month, because then the market is not asleep — it
 * is early, and the projection is the thing lagging. Josh Jacobs is the case that made this
 * necessary: placed on the exempt list, the single biggest 30-day faller in the whole feed,
 * while Sleeper still carried him as Active with an 18-game projection and a fourth-round
 * ADP. Our own rule would have tagged him BUY-LOW and told someone to trade for a player who
 * may never play again.
 */
export type DynastyMomentum = 'falling' | 'rising' | 'steady'

/**
 * How far a 30-day move has to run before it is news rather than churn.
 *
 * Measured against the live feed: the median player moves 4.8% in a month and the 75th
 * percentile moves 11.8%, so ordinary preseason drift is well under this. A quarter of a
 * player's value sits between the 75th and 90th percentile (32.5%) and catches about an
 * eighth of the field — which in September, with camp and depth charts still settling, is
 * roughly the number of players something has actually happened to.
 */
export const MOMENTUM_THRESHOLD = 0.25

export function momentumOf(value: number, trend30: number): DynastyMomentum {
  if (!value || !Number.isFinite(trend30) || !trend30) return 'steady'
  const share = trend30 / Math.abs(value)
  if (share <= -MOMENTUM_THRESHOLD) return 'falling'
  if (share >= MOMENTUM_THRESHOLD) return 'rising'
  return 'steady'
}

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
  trend30: number
  momentum: DynastyMomentum
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
    const trend30 = Number.isFinite(s.trend30) ? s.trend30 : 0
    out[key] = {
      playerKey: key,
      value: s.value,
      redraftValue,
      overallRank: s.overallRank,
      positionRank: s.positionRank,
      age: Number.isFinite(s.age as number) ? (s.age as number) : null,
      lean,
      skew,
      trend30,
      momentum: momentumOf(s.value, trend30),
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

/**
 * Re-seat our own value onto the dynasty market's ORDER.
 *
 * The trade page's landscape, leverage, best-partners and head-to-head all read one value
 * map, so re-seating that map is what makes every one of them answer the dynasty question at
 * once — the same move The Wire makes for an uploaded rest-of-season list.
 *
 * Our value CURVE is preserved and merely re-assigned, rather than the market's own numbers
 * being substituted in. Those live on a different scale entirely (a five-figure trade value
 * against points per week), and everything downstream — lineup optimisation, positional
 * ranks, the strength bars — is built to consume points. Handing it a market value would
 * produce numbers that render fine and mean nothing.
 *
 * Players the market never priced keep their own value and sort below the priced ones, which
 * is the same rule the dynasty sort already follows: absent is not "best available".
 */
export function reseatByDynasty<T extends { vorRos: number }>(
  vorByKey: Record<string, T>,
  rows: Record<string, DynastyRow>,
): Record<string, T> {
  const keys = Object.keys(vorByKey)
  if (!keys.length || !Object.keys(rows).length) return vorByKey

  const priced = keys.filter((k) => rows[k])
  if (!priced.length) return vorByKey

  // Our own values, richest first — the curve that gets handed out in the market's order.
  const curve = priced.map((k) => vorByKey[k].vorRos).sort((a, b) => b - a)
  const byMarketOrder = [...priced].sort((a, b) => rows[a].overallRank - rows[b].overallRank)

  const out: Record<string, T> = {}
  for (const k of keys) out[k] = vorByKey[k]
  byMarketOrder.forEach((k, i) => {
    out[k] = { ...vorByKey[k], vorRos: curve[i] }
  })
  return out
}
