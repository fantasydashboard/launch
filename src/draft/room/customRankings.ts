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
  /** The source's own tier, when the file declares one. */
  tier?: number
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

  const HEADER_WORDS = /\b(overall|rank|rk|player|name|position|pos|tier|adp|bye|team|auction|value)\b/i
  const isNum = (v: string) => /^\d+(\.\d+)?$/.test(v.replace(/[$,]/g, ''))
  const num = (v: string) => Number(v.replace(/[$,]/g, ''))

  const splitRow = (line: string): string[] => {
    if (line.includes('\t')) return line.split('\t').map((c) => c.trim()).filter(Boolean)
    if (line.includes(',')) return line.split(',').map((c) => c.trim().replace(/^"|"$/g, '')).filter(Boolean)
    if (/\s{2,}/.test(line)) return line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean)
    return [line.trim()]
  }

  /**
   * Column positions read off a header row. A ranking file's own tier column is
   * the only overall tiering we get — ours are per-position, which cannot draw a
   * horizontal band on a list ordered by someone else's overall ranking.
   */
  let col: { rank?: number; name?: number; position?: number; tier?: number } | null = null

  let implicitRank = 0
  let seenAnyRow = false
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\uFEFF/g, '').trimEnd()
    if (!line.trim()) continue

    const cells = splitRow(line)
    if (!cells.length) continue

    const startsWithNumber = /^\s*\d/.test(line)
    if (!seenAnyRow && !startsWithNumber && !cells.some(isNum) && HEADER_WORDS.test(line)) {
      seenAnyRow = true
      col = {}
      cells.forEach((c, i) => {
        const h = c.toLowerCase()
        if (col!.rank === undefined && /^(overall|rank|rk|#)$/.test(h)) col!.rank = i
        else if (col!.name === undefined && /^(player|name)$/.test(h)) col!.name = i
        else if (col!.position === undefined && /^(position|pos)$/.test(h)) col!.position = i
        // "Pos Rank" must not be mistaken for the tier column.
        else if (col!.tier === undefined && /^tier$/.test(h)) col!.tier = i
      })
      if (col.name === undefined) col = null
      continue
    }
    seenAnyRow = true

    // Header-driven parse when the file told us its columns.
    if (col && col.name !== undefined && cells.length > col.name) {
      const name = (cells[col.name] ?? '').replace(/\s+/g, ' ').trim()
      if (!name || !/[a-z]/i.test(name)) continue
      const rawRank = col.rank !== undefined ? cells[col.rank] : undefined
      const rawTier = col.tier !== undefined ? cells[col.tier] : undefined
      const rawPos = col.position !== undefined ? cells[col.position] : undefined
      const up = (rawPos ?? '').toUpperCase()
      implicitRank++
      out.push({
        rank: rawRank && isNum(rawRank) ? num(rawRank) : implicitRank,
        name,
        position: POSITIONS.has(up) ? (up === 'D/ST' || up === 'DST' ? 'DEF' : up) : undefined,
        tier: rawTier && isNum(rawTier) ? num(rawTier) : undefined,
      })
      continue
    }

    // Otherwise fall back to shape-sniffing.
    let rank: number | null = null
    let rest: string[]
    if (cells.length > 1) {
      const first = cells[0].replace(/[.)]$/, '')
      if (isNum(first)) { rank = num(first); rest = cells.slice(1) } else rest = cells
    } else {
      const m = /^(\d+)[.)]?\s+(.*)$/.exec(cells[0])
      if (m) { rank = Number(m[1]); rest = [m[2]] } else rest = [cells[0]]
    }
    if (!rest.length) continue

    let name = rest[0]
    let position: string | undefined
    let team: string | undefined

    const takeToken = (tok: string): boolean => {
      const up = tok.toUpperCase()
      if (!position && POSITIONS.has(up)) {
        position = up === 'D/ST' || up === 'DST' ? 'DEF' : up
        return true
      }
      if (!team && /^[A-Z]{2,4}$/.test(up) && !POSITIONS.has(up)) { team = up; return true }
      return isNum(tok)
    }
    for (const cell of rest.slice(1)) takeToken(cell)
    if (rest.length === 1) {
      const tokens = name.split(/\s+/)
      while (tokens.length > 2 && takeToken(tokens[tokens.length - 1])) tokens.pop()
      name = tokens.join(' ')
    }
    name = name.replace(/\s+/g, ' ').trim()
    if (!name || !/[a-z]/i.test(name)) continue

    implicitRank++
    out.push({ rank: rank ?? implicitRank, name, position, team })
  }

  return out
    .sort((a, b) => a.rank - b.rank)
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

export interface MatchResult {
  /** playerKey -> analyst rank. */
  rankByKey: Record<string, number>
  /** playerKey -> the source's own tier, where it declared one. */
  tierByKey: Record<string, number>
  /** Analyst entries we could not tie to a player in the pool. */
  unmatched: ParsedRanking[]
  /** Entries where several players share the name and we will NOT guess. */
  ambiguous: AmbiguousMatch[]
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
  const byName = new Map<string, { playerKey: string; name: string; position?: string }[]>()
  for (const p of players ?? []) {
    const key = normalizeName(p.name)
    if (!key) continue
    const arr = byName.get(key) ?? []
    arr.push({ playerKey: p.playerKey, name: p.name, position: p.position })
    byName.set(key, arr)
  }

  const rankByKey: Record<string, number> = {}
  const tierByKey: Record<string, number> = {}
  const unmatched: ParsedRanking[] = []
  const ambiguous: AmbiguousMatch[] = []
  const used = new Set<string>()

  for (const entry of parsed ?? []) {
    const all = byName.get(normalizeName(entry.name)) ?? []
    const free = all.filter((c) => !used.has(c.playerKey))
    if (!free.length) { unmatched.push(entry); continue }

    // The analyst's position can settle a shared name — but only if it settles it
    // to exactly one player.
    const byPos = entry.position
      ? free.filter((c) => (c.position ?? '').toUpperCase() === entry.position)
      : []
    const resolved = byPos.length === 1 ? byPos[0] : free.length === 1 ? free[0] : null

    if (!resolved) {
      // Several real players share this name. Silently taking the first looks
      // confident and is sometimes wrong — surface it and let a human decide.
      ambiguous.push({ entry, candidates: byPos.length ? byPos : free })
      continue
    }

    rankByKey[resolved.playerKey] = entry.rank
    if (typeof entry.tier === 'number') tierByKey[resolved.playerKey] = entry.tier
    used.add(resolved.playerKey)
  }

  return { rankByKey, tierByKey, unmatched, ambiguous, matched: Object.keys(rankByKey).length }
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

  // Start from our own values, then permute ONLY within the ranked group.
  for (const p of list) out[p.playerKey] = p.value

  const ranked = list.filter((p) => typeof rankByKey[p.playerKey] === 'number')
  if (!ranked.length) return out

  // The value slots the ranked players already occupy, best first. Reassigning
  // these in the analyst's order adopts their opinion of who is better without
  // touching anyone they didn't rank.
  //
  // The previous version pushed every unranked player below the last ranked one,
  // which is fine for a full overall list but collapses on a partial or
  // positional one: upload "my top 40 RBs" and 35 unrelated players flatten onto
  // a single value, destroying their order entirely.
  const slots = ranked.map((p) => p.value).sort((a, b) => b - a)
  const inAnalystOrder = [...ranked].sort((a, b) => rankByKey[a.playerKey] - rankByKey[b.playerKey])
  inAnalystOrder.forEach((p, i) => { out[p.playerKey] = slots[i] ?? p.value })

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
  ambiguous: AmbiguousMatch[]
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
/**
 * `ourBoard` must arrive ALREADY ORDERED the way we would actually rank these
 * players — array position is taken as our rank. Re-sorting by raw projected
 * points here reproduced the exact distortion replacement level exists to fix,
 * and made every quarterback look like a wild disagreement.
 */
export function compareRankings(
  ourBoard: { playerKey: string; name: string; position: string; value: number; adp: number | null }[],
  rankByKey: Record<string, number>,
  unmatched: ParsedRanking[] = [],
  ambiguous: AmbiguousMatch[] = [],
): RankingComparison {
  const ours = ourBoard ?? []
  const ourRank = new Map(ours.map((p, i) => [p.playerKey, i + 1]))

  // Collect the overlap first, then rank BOTH lists densely within it.
  //
  // Our pool is the whole player universe (600+) while an analyst publishes a
  // top-250, so comparing raw positions makes anyone they rank late look like a
  // 200-spot disagreement purely because our list runs deeper. Dense ranking
  // within the shared subset is the only apples-to-apples comparison — and it is
  // what the Spearman figure already used, so the two now agree.
  const overlap: { playerKey: string; name: string; position: string; value: number; adp: number | null; rawOurs: number; rawTheirs: number }[] = []
  for (const p of ours) {
    const theirs = rankByKey?.[p.playerKey]
    if (typeof theirs !== 'number') continue
    overlap.push({ ...p, rawOurs: ourRank.get(p.playerKey)!, rawTheirs: theirs })
  }

  const denseOurs = new Map(
    [...overlap].sort((a, b) => a.rawOurs - b.rawOurs).map((d, i) => [d.playerKey, i + 1]),
  )
  const denseTheirs = new Map(
    [...overlap].sort((a, b) => a.rawTheirs - b.rawTheirs).map((d, i) => [d.playerKey, i + 1]),
  )

  const diffs: RankingDiff[] = overlap.map((p) => {
    const mine = denseOurs.get(p.playerKey)!
    const theirs = denseTheirs.get(p.playerKey)!
    return {
      playerKey: p.playerKey,
      name: p.name,
      position: p.position,
      ourRank: mine,
      theirRank: theirs,
      delta: mine - theirs, // positive: they rank him higher than we do
      ourValue: p.value,
      adp: p.adp,
    }
  })

  const n = diffs.length
  const meanAbsDelta = n ? diffs.reduce((s, d) => s + Math.abs(d.delta), 0) / n : 0

  let spearman = 0
  if (n > 1) {
    let sumD2 = 0
    for (const d of diffs) sumD2 += (d.ourRank - d.theirRank) ** 2
    spearman = 1 - (6 * sumD2) / (n * (n * n - 1))
  }

  return {
    diffs: diffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    matched: n,
    unmatched,
    ambiguous,
    meanAbsDelta,
    spearman,
  }
}

/**
 * Sort rows into a list's order, changing nothing else.
 *
 * The draft board takes a different route — it re-seats our VALUES onto the
 * list's order, because VONA, tiers and survival all have to keep working in
 * points. That remap is why a card could once claim "+26 pts" beside a column
 * reading 15: two scales, one screen.
 *
 * In-season surfaces need none of that. They are sorted lists, so the list can
 * supply the order directly and every number on the row stays our own. Anyone
 * the list does not cover keeps his existing relative order, below those it does
 * — an omission is not a verdict, and dropping him would hide a player who is
 * simply newer than the list.
 */
export function orderByRanking<T>(
  rows: T[],
  rankByKey: Record<string, number>,
  keyOf: (row: T) => string,
): T[] {
  if (!rows?.length || !Object.keys(rankByKey ?? {}).length) return [...(rows ?? [])]
  const ranked: { row: T; rank: number }[] = []
  const rest: T[] = []
  for (const row of rows) {
    const rank = rankByKey[keyOf(row)]
    if (typeof rank === 'number') ranked.push({ row, rank })
    else rest.push(row)
  }
  ranked.sort((a, b) => a.rank - b.rank)
  return [...ranked.map((r) => r.row), ...rest]
}
