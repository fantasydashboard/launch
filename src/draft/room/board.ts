/**
 * The ranked board.
 *
 * Ranks by VONA — value over the best player still expected at that position at
 * your NEXT pick — rather than raw value, because that is the decision you are
 * actually making. A back who is barely better than the one you could get a round
 * later is not worth this pick, however good his projection looks.
 *
 * The blend shifts toward upside as your starting slots fill, which is also what
 * keeps the board discriminating in rounds 10+: once marginal starter value has
 * collapsed to roughly zero for everyone, ceiling is the only thing left worth
 * sorting on.
 */

export interface AvailablePlayerRow {
  playerKey: string
  name: string
  position: string
  proTeam?: string
  headshot?: string
  value: number
  /** Optional depth-chart/injury signal from the VOR engine. */
  opportunity?: string
}

export interface BoardInput {
  available: AvailablePlayerRow[]
  survival: Record<string, number>
  expectedBestAtPosition: Record<string, number>
  adpByKey: Record<string, number>
  currentOverallPick: number
  filledStarterSlots: number
  totalStarterSlots: number
}

export interface BoardRow {
  playerKey: string
  name: string
  position: string
  proTeam?: string
  headshot?: string
  value: number
  vona: number
  upside: number
  score: number
  survival: number
  tier: number
  overallTier: number
  flag: 'value' | 'reach' | ''
  adp: number | null
}

/** How far past ADP a player must still be available to count as a value. */
const VALUE_PICKS = 12
/** How far before ADP taking someone counts as a reach. */
const REACH_PICKS = 12
/** Bonus (in points) for a healthy backup behind an injured starter. */
const OPPORTUNITY_UPSIDE = 8
/**
 * Ceiling on the upside term, in points. Market-vs-projection disagreement can
 * run to hundreds of points on a player one side barely rates; uncapped, a single
 * wild disagreement outweighs every real edge on the board.
 */
const MAX_UPSIDE = 40
/** Ceiling on tiers per group — beyond this, "tier" stops meaning anything. */
const MAX_TIERS = 8
/** Roughly how many players belong in a tier. Drives how many tiers we cut. */
const TARGET_TIER_SIZE = 5

const normPos = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()

/**
 * Tiers = the biggest cliffs, not "every gap above a threshold".
 *
 * A threshold-based rule fragments badly on a deep position: with two hundred
 * receivers the median gap is near zero, so nearly every gap clears the bar and
 * you get "WR tier 57", which tells the user nothing. Instead, decide how many
 * tiers a group should have and cut at exactly the largest gaps — which is what
 * a person means by a tier: the drop-offs everyone can see.
 *
 * Deterministic, needs no tuning constant, and cannot fragment.
 */
function assignTiers(rows: { playerKey: string; value: number }[]): Record<string, number> {
  const out: Record<string, number> = {}
  if (!rows.length) return out
  const sorted = [...rows].sort((a, b) => b.value - a.value)
  if (sorted.length === 1) {
    out[sorted[0].playerKey] = 1
    return out
  }

  // Always allow at least one cut: a three-man group with an obvious cliff still
  // has two tiers, even though it is smaller than one nominal tier.
  const cuts = Math.min(
    MAX_TIERS - 1,
    Math.max(1, Math.ceil(sorted.length / TARGET_TIER_SIZE) - 1),
  )

  // Gap i sits between sorted[i] and sorted[i+1].
  const gaps = sorted.slice(0, -1).map((p, i) => ({ i, gap: p.value - sorted[i + 1].value }))
  const boundaries = new Set(
    gaps
      .filter((g) => g.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, cuts)
      .map((g) => g.i),
  )

  let tier = 1
  for (let i = 0; i < sorted.length; i++) {
    out[sorted[i].playerKey] = tier
    if (boundaries.has(i)) tier++
  }
  return out
}

export function buildBoard(input: BoardInput): BoardRow[] {
  const {
    available,
    survival,
    expectedBestAtPosition,
    adpByKey,
    currentOverallPick,
    filledStarterSlots,
    totalStarterSlots,
  } = input

  const players = (available ?? []).map((p) => ({ ...p, position: normPos(p.position) }))
  if (!players.length) return []

  // Upside proxy, DENOMINATED IN POINTS.
  //
  // We have no variance from the projection feed, but we have two independent
  // opinions. If the market drafts a player like the 20th-best available while we
  // project him 60th, the market is implicitly valuing him at what our 20th-best
  // is worth — so the disagreement, in points, is value(20th) − value(him).
  //
  // An earlier version used the raw rank difference, which was a units bug: VONA
  // is points (tens) and rank deltas are positions (hundreds), so blending them
  // let upside swamp VONA completely and floated zero-projection players to the
  // top of the board. This is market DISAGREEMENT, not modeled variance.
  const byValueDesc = [...players].sort((a, b) => b.value - a.value)
  const projRank = new Map(byValueDesc.map((p, i) => [p.playerKey, i + 1]))
  const valueAtRank = (rank: number): number => {
    const i = Math.max(0, Math.min(byValueDesc.length - 1, rank - 1))
    return byValueDesc[i]?.value ?? 0
  }
  const withAdp = players
    .filter((p) => typeof adpByKey?.[p.playerKey] === 'number')
    .sort((a, b) => adpByKey[a.playerKey] - adpByKey[b.playerKey])
  const adpRank = new Map(withAdp.map((p, i) => [p.playerKey, i + 1]))

  // Tiers within position, plus an overall tier across the whole board — the
  // board can be read either way, and "tier 2 overall" is a different and useful
  // statement from "tier 2 among running backs".
  const tierByKey: Record<string, number> = {}
  const positions = new Set(players.map((p) => p.position))
  for (const pos of positions) {
    Object.assign(tierByKey, assignTiers(players.filter((p) => p.position === pos)))
  }
  const overallTierByKey = assignTiers(players)

  // "Points now, upside late" has to mean LATE. Weighting upside in proportion to
  // slots filled put it at ~55% by round 6, which is squarely still starter
  // territory — and it produced boards where a 170-point player outranked a
  // 206-point one because the market liked him more. Upside now stays at zero
  // until the starting lineup is nearly complete, then takes over for bench picks,
  // which is the round range it was always meant for.
  const remaining = Math.max(0, totalStarterSlots - filledStarterSlots)
  const w = totalStarterSlots > 0 ? Math.min(1, Math.max(0, 1 - remaining)) : 0

  const rows: BoardRow[] = players.map((p) => {
    const adp = typeof adpByKey?.[p.playerKey] === 'number' ? adpByKey[p.playerKey] : null
    const vona = p.value - (expectedBestAtPosition?.[p.position] ?? 0)

    const pr = projRank.get(p.playerKey)
    const ar = adpRank.get(p.playerKey)
    // Points the market implies he's worth beyond our projection. Only counted
    // when the market is HIGHER on him than we are; the reverse is just us
    // agreeing he's worse, which VONA already captures.
    // A zero projection is missing data, not a considered opinion of worthlessness.
    // Without this guard the market's enthusiasm for an unprojected player reads as
    // an enormous disagreement and floats him to the top of the board.
    const hasProjection = p.value > 0
    let upside =
      hasProjection && pr !== undefined && ar !== undefined && ar < pr
        ? valueAtRank(ar) - p.value
        : 0
    if (p.opportunity === 'backup-elevated') upside += OPPORTUNITY_UPSIDE
    upside = Math.min(upside, MAX_UPSIDE)

    let flag: BoardRow['flag'] = ''
    if (adp !== null) {
      if (currentOverallPick > adp + VALUE_PICKS) flag = 'value'
      else if (currentOverallPick < adp - REACH_PICKS) flag = 'reach'
    }

    return {
      playerKey: p.playerKey,
      name: p.name,
      position: p.position,
      proTeam: p.proTeam,
      headshot: p.headshot,
      value: p.value,
      vona,
      upside,
      score: (1 - w) * vona + w * upside,
      survival: survival?.[p.playerKey] ?? 1,
      tier: tierByKey[p.playerKey] ?? 1,
      overallTier: overallTierByKey[p.playerKey] ?? 1,
      flag,
      adp,
    }
  })

  return rows.sort((a, b) => b.score - a.score || b.value - a.value)
}
