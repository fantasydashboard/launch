import type { CatSpec, PlayerCategoryContrib, PlayerContribution, ValuePoolPlayer } from './types'

// Re-export so existing imports `from '@/myteam/value'` keep resolving.
export type { CatSpec, ValuePoolPlayer } from './types'

const PLUS_THRESHOLD = 0.66
const MINUS_THRESHOLD = 0.33
const Z_CLAMP = 3

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
 * Whether a player participates (accumulates value) in a category.
 *  - Ratio cats: gated by VOLUME (IP for pitching ratios, AB/PA for batting), so a
 *    0.00 ERA still counts and a hitter with no innings is excluded. Falls back to
 *    role/side when no volume stat could be resolved.
 *  - Counting cats: gated by ACCUMULATION (non-zero value), so a starting pitcher is
 *    not penalized in SV/HLD and a reliever is not penalized in W — the same way a
 *    hitter is never penalized in pitching cats. This is what keeps SP/RP fair.
 */
function participatesIn(player: ValuePoolPlayer, cat: CatSpec): boolean {
  if (cat.isRatio) {
    if (cat.volumeStatId) return (player.stats[cat.volumeStatId] ?? 0) > 0
    return participatesBySide(player.position, cat.side)
  }
  return (player.stats[cat.statId] ?? 0) !== 0
}

function clamp(z: number): number {
  return Math.max(-Z_CLAMP, Math.min(Z_CLAMP, z))
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
): PlayerContribution[] {
  // Per category: z by playerKey, percentile by playerKey (both over participants).
  const zByCat = new Map<string, Map<string, number>>()
  const pctByCat = new Map<string, Map<string, number>>()

  for (const cat of cats) {
    const participants = pool.filter((p) => participatesIn(p, cat))
    const dir = cat.lowerIsBetter ? -1 : 1
    const zMap = new Map<string, number>()
    const pctMap = new Map<string, number>()

    // Build the quantity we z-score: counting -> value; ratio -> volume-weighted impact.
    let quantities: { key: string; q: number }[]
    if (cat.isRatio && cat.volumeStatId) {
      const withVol = participants.filter((p) => (p.stats[cat.volumeStatId!] ?? 0) > 0)
      const totalVol = withVol.reduce((s, p) => s + (p.stats[cat.volumeStatId!] ?? 0), 0)
      const wMean =
        totalVol > 0
          ? withVol.reduce((s, p) => s + (p.stats[cat.statId] ?? 0) * (p.stats[cat.volumeStatId!] ?? 0), 0) / totalVol
          : 0
      quantities = withVol.map((p) => ({
        key: p.playerKey,
        q: ((p.stats[cat.statId] ?? 0) - wMean) * (p.stats[cat.volumeStatId!] ?? 0) * dir,
      }))
    } else {
      quantities = participants.map((p) => ({ key: p.playerKey, q: (p.stats[cat.statId] ?? 0) * dir }))
    }

    const n = quantities.length
    const mean = n > 0 ? quantities.reduce((s, x) => s + x.q, 0) / n : 0
    const variance = n > 0 ? quantities.reduce((s, x) => s + (x.q - mean) ** 2, 0) / n : 0
    const std = Math.sqrt(variance)
    for (const { key, q } of quantities) {
      zMap.set(key, std > 0 ? clamp((q - mean) / std) : 0)
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

  const myKeys = new Set(myPlayerKeys)
  const mine = pool.filter((p) => myKeys.has(p.playerKey))

  // TEMP DIAGNOSTIC (remove): why do Yahoo pitchers all show roleValue 50?
  console.log(
    '[mt-debug] poolN', pool.length,
    '| hitN', scoresByRole.hitter.length, '| pitN', scoresByRole.pitcher.length,
    '| poolPitScores', scoresByRole.pitcher.slice(0, 16).map((v) => Math.round(v * 100) / 100),
    '| myPit', mine.filter((p) => roleOf.get(p.playerKey) === 'pitcher')
      .map((p) => [p.playerKey, Math.round((scoreByKey.get(p.playerKey) ?? 0) * 100) / 100]),
  )

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
        contribs.push({ statId: cat.statId, tier: 'neutral', value, percentile: 0 })
        continue
      }
      const z = zByCat.get(cat.statId)?.get(player.playerKey) ?? 0
      const percentileVal = pctByCat.get(cat.statId)?.get(player.playerKey) ?? 0
      valueScore += z

      let tier: PlayerCategoryContrib['tier'] = 'neutral'
      if (percentileVal >= PLUS_THRESHOLD) { tier = 'plus'; plusCount++ }
      else if (cat.lowerIsBetter && percentileVal <= MINUS_THRESHOLD) { tier = 'minus'; minusCount++ }
      contribs.push({ statId: cat.statId, tier, value, percentile: percentileVal })
      contributedPercentiles.push(percentileVal)
      if (percentileVal > topPercentile) { topPercentile = percentileVal; topStatId = cat.statId }
    }

    const overallValue =
      contributedPercentiles.length === 0 ? 0
        : contributedPercentiles.reduce((s, p) => s + p, 0) / contributedPercentiles.length

    const role = roleOf.get(player.playerKey) ?? 'hitter'
    const roleValue = percentile(scoresByRole[role], scoreByKey.get(player.playerKey) ?? 0)

    return { playerKey: player.playerKey, contribs, plusCount, minusCount, overallValue, valueScore, role, roleValue, topStatId }
  })
}

export function valueTier(roleValue: number): 'core' | 'solid' | 'fringe' {
  if (roleValue >= 67) return 'core'
  if (roleValue >= 34) return 'solid'
  return 'fringe'
}
