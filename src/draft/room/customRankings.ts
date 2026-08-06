/**
 * Someone else's rankings, adopted without abandoning our engine.
 *
 * An analyst gives you an ORDER, not projected points. Ranking the board directly
 * off that order would throw away everything the engine does — replacement level,
 * VONA, tiers all need points. So instead we keep our value CURVE and re-map who
 * sits where on it: the analyst's #1 takes the points of our #1, their #12 takes
 * the points of our #12. Their opinion of the ordering, our arithmetic on top.
 *
 * That keeps VONA, tiers, survival, and the upside proxy all working unchanged.
 */

export interface ParsedRanking {
  rank: number
  name: string
  position?: string
  team?: string
}

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v'])
const POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DST', 'D/ST', 'PK'])

/**
 * Normalize a player name for matching across sources: case, punctuation,
 * generational suffixes, and the several spellings of a team defense.
 */
export function normalizeName(raw: string): string {
  if (!raw) return ''
  let s = String(raw).toLowerCase().trim()
  s = s.replace(/\b(d\/st|dst|defense|def)\b/g, ' def ')
  s = s.replace(/[.'’`]/g, '')
  s = s.replace(/[^a-z0-9 ]+/g, ' ')
  const parts = s.split(/\s+/).filter(Boolean).filter((p) => !SUFFIXES.has(p))
  return parts.join(' ')
}

/**
 * Parse a pasted ranking list. Tolerant by design — people paste numbered lists,
 * CSV exports, and tab-separated tables, and a parser that only accepts one shape
 * will reject the thing the user actually has.
 *
 * Recognised per line:
 *   1. Ja'Marr Chase, WR, CIN
 *   1  Ja'Marr Chase WR CIN
 *   Ja'Marr Chase
 *   1,Ja'Marr Chase,WR,CIN
 */
export function parseRankings(text: string): ParsedRanking[] {
  const out: ParsedRanking[] = []
  if (!text || typeof text !== 'string') return out

  let implicitRank = 0
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    // Skip an obvious header row.
    if (/^(rank|rk|#|player|name)\b/i.test(line) && !/\d/.test(line.replace(/^[^\d]*/, ''))) continue

    const cells = line.includes(',') || line.includes('\t')
      ? line.split(/[,\t]/).map((c) => c.trim()).filter(Boolean)
      : [line]

    let rank: number | null = null
    let rest: string[] = []

    if (cells.length > 1) {
      const first = cells[0].replace(/[.)]$/, '')
      if (/^\d+$/.test(first)) { rank = Number(first); rest = cells.slice(1) }
      else rest = cells
    } else {
      const m = /^(\d+)[.)]?\s+(.*)$/.exec(cells[0])
      if (m) { rank = Number(m[1]); rest = [m[2]] }
      else rest = [cells[0]]
    }

    if (!rest.length) continue

    // Pull position/team out of either separate cells or trailing tokens.
    let name = rest[0]
    let position: string | undefined
    let team: string | undefined

    for (const cell of rest.slice(1)) {
      const up = cell.toUpperCase()
      if (!position && POSITIONS.has(up)) { position = up === 'D/ST' || up === 'DST' ? 'DEF' : up; continue }
      if (!team && /^[A-Z]{2,4}$/.test(up)) { team = up; continue }
    }

    if (rest.length === 1) {
      const tokens = name.split(/\s+/)
      while (tokens.length > 2) {
        const up = tokens[tokens.length - 1].toUpperCase()
        if (!position && POSITIONS.has(up)) { position = up === 'D/ST' || up === 'DST' ? 'DEF' : up; tokens.pop(); continue }
        if (!team && /^[A-Z]{2,4}$/.test(up) && up === tokens[tokens.length - 1]) { team = up; tokens.pop(); continue }
        break
      }
      name = tokens.join(' ')
    }

    name = name.replace(/\s+/g, ' ').trim()
    if (!name || !/[a-z]/i.test(name)) continue

    implicitRank++
    out.push({ rank: rank ?? implicitRank, name, position, team })
  }

  // Renumber densely so a list with gaps or no numbers still ranks 1..n.
  return out
    .sort((a, b) => a.rank - b.rank)
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

export interface MatchResult {
  /** playerKey -> analyst rank. */
  rankByKey: Record<string, number>
  /** Analyst entries we could not tie to a player in the pool. */
  unmatched: ParsedRanking[]
  matched: number
}

/**
 * Tie analyst names to our player keys. Name-matches only — the analyst's list
 * has no ids, and guessing wrong is worse than leaving a player unmatched, so
 * ambiguous names are reported rather than resolved.
 */
export function matchRankings(
  parsed: ParsedRanking[],
  players: { playerKey: string; name: string; position?: string }[],
): MatchResult {
  const byName = new Map<string, { playerKey: string; position?: string }[]>()
  for (const p of players ?? []) {
    const key = normalizeName(p.name)
    if (!key) continue
    const arr = byName.get(key) ?? []
    arr.push({ playerKey: p.playerKey, position: p.position })
    byName.set(key, arr)
  }

  const rankByKey: Record<string, number> = {}
  const unmatched: ParsedRanking[] = []
  const used = new Set<string>()

  for (const entry of parsed ?? []) {
    const candidates = byName.get(normalizeName(entry.name)) ?? []
    let pick = candidates.find((c) => !used.has(c.playerKey))
    // Same name at different positions — let the analyst's position break the tie.
    if (entry.position && candidates.length > 1) {
      const byPos = candidates.find(
        (c) => !used.has(c.playerKey) && (c.position ?? '').toUpperCase() === entry.position,
      )
      if (byPos) pick = byPos
    }
    if (!pick) { unmatched.push(entry); continue }
    rankByKey[pick.playerKey] = entry.rank
    used.add(pick.playerKey)
  }

  return { rankByKey, unmatched, matched: Object.keys(rankByKey).length }
}

/**
 * Re-map our value curve onto the analyst's order.
 *
 * Every ranked player takes the projected points of the player who currently sits
 * at that position on OUR board. Players the analyst didn't rank keep their own
 * value, but are pushed below the ranked group so an unranked player can't
 * outrank someone the analyst deliberately placed.
 */
export function applyRankingOrder(
  players: { playerKey: string; value: number }[],
  rankByKey: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {}
  const list = players ?? []
  if (!list.length) return out

  const ranked = list
    .filter((p) => typeof rankByKey[p.playerKey] === 'number')
    .sort((a, b) => rankByKey[a.playerKey] - rankByKey[b.playerKey])

  // The value curve, highest first — the shape we keep.
  const curve = [...list].map((p) => p.value).sort((a, b) => b - a)

  ranked.forEach((p, i) => { out[p.playerKey] = curve[i] ?? 0 })

  // Unranked players sit below the ranked block, keeping their relative order.
  const floor = ranked.length ? (out[ranked[ranked.length - 1].playerKey] ?? 0) : Infinity
  const unranked = list
    .filter((p) => typeof rankByKey[p.playerKey] !== 'number')
    .sort((a, b) => b.value - a.value)
  unranked.forEach((p) => { out[p.playerKey] = Math.min(p.value, floor) })

  return out
}

export interface RankingDiff {
  playerKey: string
  name: string
  position: string
  ourRank: number
  theirRank: number
  /** Positive = the analyst is higher on him than we are. */
  delta: number
  ourValue: number
  adp: number | null
}

export interface RankingComparison {
  diffs: RankingDiff[]
  matched: number
  unmatched: ParsedRanking[]
  /** Mean absolute rank difference over matched players — overall agreement. */
  meanAbsDelta: number
  /** Spearman rank correlation over matched players. 1 = identical ordering. */
  spearman: number
}

/**
 * Where we disagree with an analyst, and by how much.
 *
 * Diagnostic only — the point is to find out WHY we differ (a projection we
 * distrust, a role change we missed, a market the ADP variant got wrong), not to
 * quietly converge on someone else's list.
 */
export function compareRankings(
  ourBoard: { playerKey: string; name: string; position: string; value: number; adp: number | null }[],
  rankByKey: Record<string, number>,
  unmatched: ParsedRanking[] = [],
): RankingComparison {
  const ours = [...(ourBoard ?? [])].sort((a, b) => b.value - a.value)
  const ourRank = new Map(ours.map((p, i) => [p.playerKey, i + 1]))

  const diffs: RankingDiff[] = []
  for (const p of ours) {
    const theirs = rankByKey?.[p.playerKey]
    if (typeof theirs !== 'number') continue
    const mine = ourRank.get(p.playerKey)!
    diffs.push({
      playerKey: p.playerKey,
      name: p.name,
      position: p.position,
      ourRank: mine,
      theirRank: theirs,
      delta: mine - theirs, // positive: they rank him higher (smaller number) than we do
      ourValue: p.value,
      adp: p.adp,
    })
  }

  const n = diffs.length
  const meanAbsDelta = n ? diffs.reduce((s, d) => s + Math.abs(d.delta), 0) / n : 0

  // Spearman over the matched subset, re-ranked densely within it so the two
  // orderings are compared on equal footing.
  let spearman = 0
  if (n > 1) {
    const byOurs = [...diffs].sort((a, b) => a.ourRank - b.ourRank)
    const denseOurs = new Map(byOurs.map((d, i) => [d.playerKey, i + 1]))
    const byTheirs = [...diffs].sort((a, b) => a.theirRank - b.theirRank)
    const denseTheirs = new Map(byTheirs.map((d, i) => [d.playerKey, i + 1]))
    let sumD2 = 0
    for (const d of diffs) {
      const diff = (denseOurs.get(d.playerKey) ?? 0) - (denseTheirs.get(d.playerKey) ?? 0)
      sumD2 += diff * diff
    }
    spearman = 1 - (6 * sumD2) / (n * (n * n - 1))
  }

  return {
    diffs: diffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    matched: n,
    unmatched,
    meanAbsDelta,
    spearman,
  }
}
