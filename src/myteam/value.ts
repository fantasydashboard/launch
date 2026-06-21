import type { CatSpec, PlayerCategoryContrib, PlayerContribution, ValuePoolPlayer } from './types'

// Re-export so existing imports `from '@/myteam/value'` keep resolving.
export type { CatSpec, ValuePoolPlayer } from './types'

const PLUS_THRESHOLD = 0.66
const MINUS_THRESHOLD = 0.33
const Z_CLAMP = 3
// Cross-role trade value: standard auction-style hitting/pitching budget split, applied to
// value-over-replacement so a hitter's and a pitcher's number land on one comparable scale.
const HIT_BUDGET_SHARE = 0.7
const PIT_BUDGET_SHARE = 0.3
// Replacement level = this quantile of each role's rostered pool. Players below it carry ≈0
// trade value (freely replaceable depth), so studs aren't compared against bench filler.
const REPLACEMENT_QUANTILE = 0.35

function isPitcherPos(position: string): boolean {
  return (position || '')
    .split(/[,/|]/)
    .some((t) => ['SP', 'RP', 'P'].includes(t.trim().toUpperCase()))
}
function isHitterPos(position: string): boolean {
  const tokens = (position || '').split(/[,/|]/).map((t) => t.trim().toUpperCase()).filter(Boolean)
  return tokens.some((t) => !['SP', 'RP', 'P'].includes(t))
}
function participatesBySide(position: string, side: 'hit' | 'pit'): boolean {
  return side === 'pit' ? isPitcherPos(position) : isHitterPos(position)
}

/**
 * Strip cross-side stats so a hitter never contributes to pitching categories and vice versa.
 * ESPN attaches stray cross-side stats (a hitter carrying junk BF/K, a pitcher carrying junk
 * hitting stats) that otherwise pollute team category totals and make a swap appear to move the
 * wrong side. Keeps each kept ratio cat's volume stat too. Two-way players keep both sides.
 */
export function sideCleanStats(position: string, stats: Record<string, number>, cats: CatSpec[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const cat of cats) {
    if (!participatesBySide(position, cat.side)) continue
    const v = stats[cat.statId]
    if (Number.isFinite(v)) out[cat.statId] = v
    if (cat.isRatio && cat.volumeStatId) {
      const vol = stats[cat.volumeStatId]
      if (Number.isFinite(vol)) out[cat.volumeStatId] = vol
    }
  }
  return out
}

/**
 * Whether a player participates (accumulates value) in a category.
 *  - Ratio cats: gated by VOLUME (IP for pitching ratios, AB/PA for batting), so a
 *    0.00 ERA still counts and a hitter with no innings is excluded. Falls back to
 *    role/side when no volume stat could be resolved.
 *  - Counting cats: gated by ACCUMULATION (non-zero value), so a starting pitcher is
 *    not penalized in SV/HLD and a reliever is not penalized in W — the same way a
 *    hitter is never penalized in pitching cats. This is what keeps SP/RP fair.
 */
function participatesIn(player: ValuePoolPlayer, cat: CatSpec): boolean {
  // Side gate FIRST: a pitcher never participates in a hitting category and vice versa, no matter
  // what stray non-zero stats the platform attaches (ESPN pitchers can carry junk hitting stats,
  // which otherwise polluted the per-category z-pool and scrambled trade helps/hurts).
  if (!participatesBySide(player.position, cat.side)) return false
  if (cat.isRatio) {
    if (cat.volumeStatId) return (player.stats[cat.volumeStatId] ?? 0) > 0
    return true
  }
  return (player.stats[cat.statId] ?? 0) !== 0
}

function clamp(z: number, cap: number = Z_CLAMP): number {
  return Math.max(-cap, Math.min(cap, z))
}

/**
 * The quantity we z-score for a category: counting cats use the raw value; ratio cats
 * use a volume-weighted impact `(rate - wMean) * volume` so a tiny sample can't dominate.
 * `dir` flips it for lower-is-better cats. Shared by the pool path and the universe
 * baseline so both score on exactly the same metric.
 */
function categoryQuantity(player: ValuePoolPlayer, cat: CatSpec, wMean: number): number {
  const dir = cat.lowerIsBetter ? -1 : 1
  if (cat.isRatio && cat.volumeStatId) {
    const vol = player.stats[cat.volumeStatId] ?? 0
    return ((player.stats[cat.statId] ?? 0) - wMean) * vol * dir
  }
  return (player.stats[cat.statId] ?? 0) * dir
}

/** Per-category z baseline (mean/std of the scoring quantity, plus the volume-weighted
 *  mean rate for ratio cats) computed over a fixed reference population. */
export interface CatBaseline {
  mean: number
  std: number
  wMean: number // ratio cats only; 0 for counting cats
}
export type ValueBaseline = Map<string, CatBaseline>

/**
 * Build a value baseline from a reference population — pass the FULL projected-player
 * universe (every FanGraphs row), NOT just your league's rostered players. Anchoring z
 * to the universe is what makes "elite" mean elite vs all of MLB: a 40-SB burner scores
 * a big z instead of being compressed to "slightly above your stacked roster", and a
 * broad compiler stops out-totaling a concentrated star. This is the trade-value fix.
 */
export function computeValueBaseline(universe: ValuePoolPlayer[], cats: CatSpec[]): ValueBaseline {
  const out: ValueBaseline = new Map()
  for (const cat of cats) {
    const participants = universe.filter((p) => participatesIn(p, cat))
    let wMean = 0
    if (cat.isRatio && cat.volumeStatId) {
      const withVol = participants.filter((p) => (p.stats[cat.volumeStatId!] ?? 0) > 0)
      const totalVol = withVol.reduce((s, p) => s + (p.stats[cat.volumeStatId!] ?? 0), 0)
      wMean =
        totalVol > 0
          ? withVol.reduce((s, p) => s + (p.stats[cat.statId] ?? 0) * (p.stats[cat.volumeStatId!] ?? 0), 0) / totalVol
          : 0
    }
    const qs = participants
      .filter((p) => !cat.isRatio || !cat.volumeStatId || (p.stats[cat.volumeStatId] ?? 0) > 0)
      .map((p) => categoryQuantity(p, cat, wMean))
      .filter((q) => Number.isFinite(q))
    const n = qs.length
    const mean = n > 0 ? qs.reduce((s, q) => s + q, 0) / n : 0
    const variance = n > 0 ? qs.reduce((s, q) => s + (q - mean) ** 2, 0) / n : 0
    out.set(cat.statId, { mean, std: Math.sqrt(variance), wMean })
  }
  return out
}

/** Classify a player's role. Two-way (both pitcher and hitter eligible) is assigned
 *  to whichever side they participate in more categories (tie -> hitter). */
function playerRole(player: ValuePoolPlayer, cats: CatSpec[]): 'hitter' | 'pitcher' {
  const pitcher = isPitcherPos(player.position)
  const hitter = isHitterPos(player.position)
  if (pitcher && !hitter) return 'pitcher'
  if (hitter && !pitcher) return 'hitter'
  // two-way: count participated cats per side
  let pit = 0, hit = 0
  for (const c of cats) {
    if (!participatesIn(player, c)) continue
    if (c.side === 'pit') pit++
    else hit++
  }
  return pit > hit ? 'pitcher' : 'hitter'
}

/**
 * Role-aware value-above-replacement. For each category, only role-matching
 * players participate. Counting cats z-score the value directly; ratio cats
 * z-score a volume-weighted impact so tiny samples don't dominate. A player's
 * valueScore is the sum of clamped z-scores across participated cats. Per-cat
 * percentile + tier are retained for the chip UI.
 */
export function computeRosterValue(
  pool: ValuePoolPlayer[],
  myPlayerKeys: string[],
  cats: CatSpec[],
  opts: { baseline?: ValueBaseline; zClamp?: number } = {},
): PlayerContribution[] {
  // When a `baseline` is supplied, z is measured against the full projected-player
  // universe (not this league's rostered pool), with a looser clamp — so a real star's
  // elite categories register at full magnitude instead of being compressed by a deep
  // roster. Absent a baseline, the math is identical to before (pool-relative z).
  const { baseline } = opts
  const zClamp = opts.zClamp ?? Z_CLAMP
  // Per category: z by playerKey, percentile by playerKey (both over participants).
  const zByCat = new Map<string, Map<string, number>>()
  const pctByCat = new Map<string, Map<string, number>>()

  for (const cat of cats) {
    const participants = pool.filter((p) => participatesIn(p, cat))
    const base = baseline?.get(cat.statId)
    const zMap = new Map<string, number>()
    const pctMap = new Map<string, number>()

    // The z-scored quantity (counting value / volume-weighted ratio impact). When a
    // baseline is present its `wMean` defines the ratio center; otherwise derive it from
    // this pool.
    const isVolRatio = cat.isRatio && !!cat.volumeStatId
    const scored = isVolRatio ? participants.filter((p) => (p.stats[cat.volumeStatId!] ?? 0) > 0) : participants
    let wMean = base?.wMean ?? 0
    if (isVolRatio && !base) {
      const totalVol = scored.reduce((s, p) => s + (p.stats[cat.volumeStatId!] ?? 0), 0)
      wMean =
        totalVol > 0
          ? scored.reduce((s, p) => s + (p.stats[cat.statId] ?? 0) * (p.stats[cat.volumeStatId!] ?? 0), 0) / totalVol
          : 0
    }
    // A single non-finite stat (e.g. Yahoo returns "-" for a pitcher with no decisions
    // -> NaN) would poison mean/std and collapse the category. Drop non-finite quantities.
    const quantities = scored
      .map((p) => ({ key: p.playerKey, q: categoryQuantity(p, cat, wMean) }))
      .filter((x) => Number.isFinite(x.q))

    let mean: number, std: number
    if (base) {
      mean = base.mean
      std = base.std
    } else {
      const n = quantities.length
      mean = n > 0 ? quantities.reduce((s, x) => s + x.q, 0) / n : 0
      const variance = n > 0 ? quantities.reduce((s, x) => s + (x.q - mean) ** 2, 0) / n : 0
      std = Math.sqrt(variance)
    }
    for (const { key, q } of quantities) {
      zMap.set(key, std > 0 ? clamp((q - mean) / std, zClamp) : 0)
    }
    // Percentile for chips: rank by raw value (direction-aware) over participants.
    const sorted = [...participants].sort((a, b) =>
      cat.lowerIsBetter ? (a.stats[cat.statId] ?? 0) - (b.stats[cat.statId] ?? 0) : (b.stats[cat.statId] ?? 0) - (a.stats[cat.statId] ?? 0),
    )
    sorted.forEach((p, idx) => pctMap.set(p.playerKey, sorted.length === 0 ? 0 : (sorted.length - idx) / sorted.length))

    zByCat.set(cat.statId, zMap)
    pctByCat.set(cat.statId, pctMap)
  }

  // valueScore for EVERY pool player (cheap: z's already computed per category).
  const scoreOf = (player: ValuePoolPlayer): number => {
    let s = 0
    for (const cat of cats) {
      if (!participatesIn(player, cat)) continue
      s += zByCat.get(cat.statId)?.get(player.playerKey) ?? 0
    }
    return s
  }
  const roleOf = new Map<string, 'hitter' | 'pitcher'>()
  const scoreByKey = new Map<string, number>()
  const scoresByRole: Record<'hitter' | 'pitcher', number[]> = { hitter: [], pitcher: [] }
  for (const p of pool) {
    const role = playerRole(p, cats)
    const score = scoreOf(p)
    roleOf.set(p.playerKey, role)
    scoreByKey.set(p.playerKey, score)
    scoresByRole[role].push(score)
  }
  for (const k of ['hitter', 'pitcher'] as const) scoresByRole[k].sort((a, b) => a - b)
  // Percentile (0-100) of a value within a sorted ascending array: fraction strictly
  // below + half of ties, so a lone player is 50 and the max is ~100.
  const percentile = (arr: number[], v: number): number => {
    const n = arr.length
    if (n === 0) return 50
    let below = 0, equal = 0
    for (const x of arr) { if (x < v) below++; else if (x === v) equal++ }
    return Math.round(((below + equal / 2) / n) * 100)
  }

  // Cross-role trade value: value-over-replacement per role, scaled so each role's positive
  // VOR sums to its budget share — so a hitter's and a pitcher's number are comparable.
  const quantile = (sortedAsc: number[], q: number): number => {
    if (sortedAsc.length === 0) return 0
    const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.round(q * (sortedAsc.length - 1))))
    return sortedAsc[idx]
  }
  const replacementByRole = {
    hitter: quantile(scoresByRole.hitter, REPLACEMENT_QUANTILE),
    pitcher: quantile(scoresByRole.pitcher, REPLACEMENT_QUANTILE),
  }
  const budgetShare = { hitter: HIT_BUDGET_SHARE, pitcher: PIT_BUDGET_SHARE }
  const sumVorByRole = { hitter: 0, pitcher: 0 }
  for (const p of pool) {
    const role = roleOf.get(p.playerKey)!
    sumVorByRole[role] += Math.max(0, (scoreByKey.get(p.playerKey) ?? 0) - replacementByRole[role])
  }
  // crossValue: floored at 0 (a non-negative budget-share currency). crossRaw: the SAME
  // metric but UNfloored, so below-replacement players keep a continuous (negative) ordering
  // instead of all collapsing onto one percentile — otherwise the display meter shows a big
  // plateau (every depth player reads the same number, and closers look like scrubs).
  const crossValueByKey = new Map<string, number>()
  const crossRawByKey = new Map<string, number>()
  const allCrossRaw: number[] = []
  for (const p of pool) {
    const role = roleOf.get(p.playerKey)!
    const denom = sumVorByRole[role] || 1
    const above = (scoreByKey.get(p.playerKey) ?? 0) - replacementByRole[role]
    crossValueByKey.set(p.playerKey, (Math.max(0, above) / denom) * budgetShare[role])
    const raw = (above / denom) * budgetShare[role]
    crossRawByKey.set(p.playerKey, raw)
    allCrossRaw.push(raw)
  }
  allCrossRaw.sort((a, b) => a - b)

  const myKeys = new Set(myPlayerKeys)
  const mine = pool.filter((p) => myKeys.has(p.playerKey))

  return mine.map((player) => {
    const contribs: PlayerCategoryContrib[] = []
    let plusCount = 0
    let minusCount = 0
    let valueScore = 0
    const contributedPercentiles: number[] = []
    let topStatId: string | null = null
    let topPercentile = -Infinity

    for (const cat of cats) {
      const value = typeof player.stats[cat.statId] === 'number' ? player.stats[cat.statId] : 0
      if (!participatesIn(player, cat)) {
        contribs.push({ statId: cat.statId, tier: 'neutral', value, percentile: 0, z: 0 })
        continue
      }
      const z = zByCat.get(cat.statId)?.get(player.playerKey) ?? 0
      const percentileVal = pctByCat.get(cat.statId)?.get(player.playerKey) ?? 0
      valueScore += z

      let tier: PlayerCategoryContrib['tier'] = 'neutral'
      if (percentileVal >= PLUS_THRESHOLD) { tier = 'plus'; plusCount++ }
      else if (cat.lowerIsBetter && percentileVal <= MINUS_THRESHOLD) { tier = 'minus'; minusCount++ }
      contribs.push({ statId: cat.statId, tier, value, percentile: percentileVal, z })
      contributedPercentiles.push(percentileVal)
      if (percentileVal > topPercentile) { topPercentile = percentileVal; topStatId = cat.statId }
    }

    const overallValue =
      contributedPercentiles.length === 0 ? 0
        : contributedPercentiles.reduce((s, p) => s + p, 0) / contributedPercentiles.length

    const role = roleOf.get(player.playerKey) ?? 'hitter'
    const roleValue = percentile(scoresByRole[role], scoreByKey.get(player.playerKey) ?? 0)

    const crossValue = crossValueByKey.get(player.playerKey) ?? 0
    const crossPercentile = percentile(allCrossRaw, crossRawByKey.get(player.playerKey) ?? 0)
    return { playerKey: player.playerKey, contribs, plusCount, minusCount, overallValue, valueScore, role, roleValue, crossValue, crossPercentile, topStatId }
  })
}

export function valueTier(roleValue: number): 'core' | 'solid' | 'fringe' {
  if (roleValue >= 67) return 'core'
  if (roleValue >= 34) return 'solid'
  return 'fringe'
}
