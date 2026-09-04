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
  /** Whose opinion put him at this rank — your uploaded list, or our market. */
  source: 'list' | 'market'
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


/**
 * Splice an uploaded list on top of the market, so a 200-deep list still ranks a 324-player
 * league.
 *
 * A list shorter than the league is the normal case, not an edge one: measured against a real
 * dynasty league, a 200-row file covered 198 rostered players and left 126 — 39% of everyone
 * rostered — with no rank at all, showing "—" and sinking to the bottom of the sort. Your
 * opinion of the top 200 says nothing about who is 201st, and it should not have to.
 *
 * Two bands. Your list holds 1..N in your order; the market fills N+1 onward in its own
 * order. Every row records which band it came from, because a board where row 197 and row
 * 205 look equally authoritative hides the moment your opinion stopped and ours started —
 * the view draws that boundary.
 *
 * There is deliberately no third band. Players NEITHER source priced stay absent rather than
 * being ranked off our season points: a season projection is not a dynasty opinion, which is
 * the same reason this feature reads a market instead of discounting our own numbers by an
 * age curve. Absent still sinks to the bottom of a dynasty sort, which is where they belong.
 */
export interface DynastyMerge {
  rows: Record<string, DynastyRow>
  /** How many of the list's entries actually resolved to a player. */
  matched: number
  /** How many rows the market filled in below the list. */
  filled: number
  /** Rank of the first market-sourced row — where the view draws the line. 0 if none. */
  boundary: number
  /**
   * True when the list does not look like a top-N board — it misses most of the market's
   * best players, which is what a positional or partial list looks like. Appending the
   * market below such a list would bury every unlisted position behind the listed one, so
   * the caller is told rather than silently mis-ordered.
   */
  suspectPartial: boolean
}

const TOP_SLICE = 50
const TOP_COVERAGE_MIN = 0.6

export function mergeDynastyOrder(
  market: Record<string, DynastyRow>,
  rankByKey: Record<string, number>,
  positionOf: (playerKey: string) => string,
): DynastyMerge {
  const listed = Object.keys(rankByKey).filter((k) => rankByKey[k] > 0)
  if (!listed.length) {
    return { rows: market, matched: 0, filled: 0, boundary: 0, suspectPartial: false }
  }

  /* Does this behave like a top-N board? Take the market's own best fifty and see how many
     the list bothered to rank. A genuine top-200 covers nearly all of them; a list of forty
     running backs covers a quarter. */
  const marketTop = Object.values(market)
    .sort((a, b) => a.overallRank - b.overallRank)
    .slice(0, TOP_SLICE)
  const covered = marketTop.filter((r) => rankByKey[r.playerKey] > 0).length
  const suspectPartial = marketTop.length >= TOP_SLICE && covered / marketTop.length < TOP_COVERAGE_MIN

  const band1 = [...listed].sort((a, b) => rankByKey[a] - rankByKey[b])
  const band2 = suspectPartial
    ? []
    : Object.keys(market)
        .filter((k) => !rankByKey[k])
        .sort((a, b) => market[a].overallRank - market[b].overallRank)

  const seenByPos = new Map<string, number>()
  const out: Record<string, DynastyRow> = {}
  const place = (key: string, i: number, source: 'list' | 'market') => {
    const pos = (positionOf(key) || '').toUpperCase().split(/[,/|]/)[0].trim()
    const n = (seenByPos.get(pos) ?? 0) + 1
    seenByPos.set(pos, n)
    const m = market[key]
    out[key] = {
      playerKey: key,
      // Values stay the market's. A list gives an ORDER; deal totals need magnitudes, and a
      // player your list ranks but the market never priced still contributes nothing.
      value: m?.value ?? 0,
      redraftValue: m?.redraftValue ?? 0,
      age: m?.age ?? null,
      lean: m?.lean ?? 'level',
      skew: m?.skew ?? 0,
      trend30: m?.trend30 ?? 0,
      momentum: m?.momentum ?? 'steady',
      overallRank: i + 1,
      positionRank: n,
      source,
    }
  }
  band1.forEach((k, i) => place(k, i, 'list'))
  band2.forEach((k, i) => place(k, band1.length + i, 'market'))

  return {
    rows: out,
    matched: band1.length,
    filled: band2.length,
    boundary: band2.length ? band1.length + 1 : 0,
    suspectPartial,
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * WHAT THE HORIZON GAP IS, AND WHAT IT IS NOT
 *
 * The board used to stamp "buy-low" and "sell-high" on the gap between a player's
 * rest-of-season rank and his dynasty rank. Both terms were wrong, in two separate ways.
 *
 * WRONG TERM. Buy-low and sell-high describe a PRICE that has come adrift from a VALUE — the
 * market has mispriced someone against what he will actually produce. That is not what this
 * measures, and we cannot measure it: testing a price requires an independent estimate of
 * value, and the dynasty price is the only long-term number we have. You cannot check a
 * price against itself.
 *
 * WRONG DIRECTION, FOR HALF THE READERS. Christian McCaffrey at season RB3 and dynasty RB13
 * was labelled sell-high. For a contender he is the opposite: the third-best back this season
 * at the price of the thirteenth-best dynasty asset. The labels were backwards for anyone
 * chasing a title and roughly right for anyone rebuilding, and the page silently picked one.
 *
 * AND IT WAS MOSTLY AN AGE READOUT. Measured on the live market, the raw gap correlates with
 * age at r = -0.67. Under 24, thirty-six players flagged "buy-low" against one "sell-high";
 * over 30 it inverted to one against twenty-five. The badge was saying "young" and "old" in
 * different words, directly beside a column that already prints age.
 *
 * So the gap is reported for what it is — a WIN-NOW or FUTURE asset, descriptive rather than
 * prescriptive — and only where it survives what age and position already explain. Fourteen
 * rank places of spread remain after that subtraction, and it is a different fourteen: a
 * 23-year-old the market rates level across both horizons is saying something age cannot,
 * while the thirty-sixth 22-year-old with a positive gap is saying nothing at all.
 * ──────────────────────────────────────────────────────────────────────────── */

export type HorizonLean = 'win-now' | 'future' | ''

export interface HorizonRead {
  /** seasonRank − dynastyRank. Positive = the long market likes him more than this year does. */
  gap: number
  /** What a player of this age and position typically shows. */
  expected: number
  /** gap − expected. The part age does not already account for. */
  residual: number
  lean: HorizonLean
}

/** Age buckets wide enough to hold a useful sample inside one position's board. */
const AGE_BUCKET = 2
/** Below this a bucket cannot support a median, so the board-wide median stands in. */
const MIN_BUCKET = 4
/** A residual under this many rank places is noise however the board is scaled. */
const MIN_PLACES = 6

const median = (xs: number[]): number => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/**
 * Read every player's horizon gap against what his own age band typically shows.
 *
 * The baseline comes from the board in front of you rather than a table written here, so it
 * recalibrates per position and per league instead of asserting a curve. The flagging
 * threshold scales off the spread of the residuals for the same reason: a board where
 * everyone agrees should flag nobody.
 */
export function readHorizons(
  players: { playerKey: string; seasonRank: number; dynastyRank: number; age: number | null }[],
): Record<string, HorizonRead> {
  const usable = players.filter((p) => p.seasonRank > 0 && p.dynastyRank > 0)
  const out: Record<string, HorizonRead> = {}
  if (usable.length < MIN_BUCKET) return out

  const gapOf = (p: (typeof usable)[number]) => p.seasonRank - p.dynastyRank
  const bucketOf = (age: number | null) =>
    age === null ? 'na' : String(Math.floor(age / AGE_BUCKET) * AGE_BUCKET)

  const buckets = new Map<string, number[]>()
  for (const p of usable) {
    const b = bucketOf(p.age)
    buckets.set(b, [...(buckets.get(b) ?? []), gapOf(p)])
  }
  const boardMedian = median(usable.map(gapOf))

  const residuals: { key: string; gap: number; expected: number; residual: number }[] = usable.map((p) => {
    const b = buckets.get(bucketOf(p.age)) ?? []
    const expected = b.length >= MIN_BUCKET ? median(b) : boardMedian
    const gap = gapOf(p)
    return { key: p.playerKey, gap, expected, residual: gap - expected }
  })

  const mean = residuals.reduce((s, r) => s + r.residual, 0) / residuals.length
  const sd = Math.sqrt(residuals.reduce((s, r) => s + (r.residual - mean) ** 2, 0) / residuals.length)
  const threshold = Math.max(MIN_PLACES, sd)

  for (const r of residuals) {
    out[r.key] = {
      gap: r.gap,
      expected: r.expected,
      residual: r.residual,
      lean: r.residual >= threshold ? 'future' : r.residual <= -threshold ? 'win-now' : '',
    }
  }
  return out
}
