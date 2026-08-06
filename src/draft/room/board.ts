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
  flag: 'value' | 'reach' | ''
  adp: number | null
}

/** How far past ADP a player must still be available to count as a value. */
const VALUE_PICKS = 12
/** How far before ADP taking someone counts as a reach. */
const REACH_PICKS = 12
/** A gap this many times the position's median gap opens a new tier. */
const TIER_GAP_MULTIPLE = 1.8
/** Bonus applied to a healthy backup behind an injured starter. */
const OPPORTUNITY_UPSIDE = 8

const normPos = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()

/**
 * Tier numbers within a position: 1 for the top group, incrementing wherever a
 * consecutive value gap is unusually large for that position.
 */
function assignTiers(rows: { playerKey: string; value: number }[]): Record<string, number> {
  const out: Record<string, number> = {}
  if (!rows.length) return out
  const sorted = [...rows].sort((a, b) => b.value - a.value)
  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i - 1].value - sorted[i].value)
  const positive = gaps.filter((g) => g > 0).sort((a, b) => a - b)
  // Lower median: with only a handful of gaps, the upper median can BE the cliff
  // we are trying to detect, inflating the threshold until it suppresses itself.
  const median = positive.length ? positive[Math.floor((positive.length - 1) / 2)] : 0
  const threshold = median * TIER_GAP_MULTIPLE

  let tier = 1
  out[sorted[0].playerKey] = tier
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i - 1].value - sorted[i].value
    if (threshold > 0 && gap > threshold) tier++
    out[sorted[i].playerKey] = tier
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

  // Upside proxy: the market's ranking versus ours. We have no variance from the
  // projection feed, but we have two independent opinions — when the market drafts
  // someone materially earlier than our projection justifies, that gap encodes
  // something the median projection misses. This is market DISAGREEMENT, not a
  // modeled distribution, and the UI must describe it that way.
  const byValueDesc = [...players].sort((a, b) => b.value - a.value)
  const projRank = new Map(byValueDesc.map((p, i) => [p.playerKey, i + 1]))
  const withAdp = players
    .filter((p) => typeof adpByKey?.[p.playerKey] === 'number')
    .sort((a, b) => adpByKey[a.playerKey] - adpByKey[b.playerKey])
  const adpRank = new Map(withAdp.map((p, i) => [p.playerKey, i + 1]))

  // Tiers are computed within position.
  const tierByKey: Record<string, number> = {}
  const positions = new Set(players.map((p) => p.position))
  for (const pos of positions) {
    Object.assign(tierByKey, assignTiers(players.filter((p) => p.position === pos)))
  }

  const w =
    totalStarterSlots > 0
      ? Math.min(1, Math.max(0, filledStarterSlots / totalStarterSlots))
      : 0

  const rows: BoardRow[] = players.map((p) => {
    const adp = typeof adpByKey?.[p.playerKey] === 'number' ? adpByKey[p.playerKey] : null
    const vona = p.value - (expectedBestAtPosition?.[p.position] ?? 0)

    const pr = projRank.get(p.playerKey)
    const ar = adpRank.get(p.playerKey)
    let upside = pr !== undefined && ar !== undefined ? pr - ar : 0
    if (p.opportunity === 'backup-elevated') upside += OPPORTUNITY_UPSIDE

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
      flag,
      adp,
    }
  })

  return rows.sort((a, b) => b.score - a.score || b.value - a.value)
}
