import { splitWideRankings, parseRankings, matchRankings } from '@/draft/room/customRankings'

/**
 * HALF SLEEPER, HALF A HUMAN RANKER (2026-10-01).
 *
 * Four seasons of backtest (2022-25) found nothing in the box score that beats Sleeper's weekly
 * ORDER, and the raw order read badly (Harold Fannin TE3). The analyst publishes ranks, not
 * points, so his rank is converted to points on our own ladder for that position: his TE10 is
 * worth whatever our TE10 projects. The two are averaged. Where both agree nothing moves.
 *
 * MUST stay identical to blend_with_baseline in ufd-graphics/position-tiers.py, or the posts
 * and the site disagree.
 */
export interface BlendEntry { playerKey: string; value: number; position: string }

const posOf = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()

export function blendWithAnalyst(
  entries: BlendEntry[],
  rankByKey: Record<string, number>,
  lastRankByPos?: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {}
  const byPos = new Map<string, BlendEntry[]>()
  for (const e of entries) {
    out[e.playerKey] = e.value
    const p = posOf(e.position)
    if (!byPos.has(p)) byPos.set(p, [])
    byPos.get(p)!.push(e)
  }
  for (const group of byPos.values()) {
    const ranks = group.map((e) => rankByKey[e.playerKey]).filter((r): r is number => typeof r === 'number')
    if (!ranks.length) continue                      // the list says nothing about this position
    const pos = posOf(group[0].position)
    const lastRank = lastRankByPos?.[pos] ?? Math.max(...ranks)
    const ladder = group.map((e) => e.value).sort((a, b) => b - a)
    for (const e of group) {
      const r = Math.max(1, Math.round(rankByKey[e.playerKey] ?? lastRank + 1))
      const mapped = ladder[Math.min(r, ladder.length) - 1]
      out[e.playerKey] = (e.value + mapped) / 2
    }
  }
  return out
}

/** Parse a published wide sheet, match names, blend. Null when nothing usable was found. */
export function blendBoardWithList(
  entries: BlendEntry[],
  names: { playerKey: string; name: string; position: string }[],
  text: string,
): Record<string, number> | null {
  const wide = splitWideRankings(text)
  if (!wide || !wide.parts.length) return null
  const rankByKey: Record<string, number> = {}
  const lastRankByPos: Record<string, number> = {}
  for (const part of wide.parts) {
    const pos = part.position.toUpperCase()
    const pool = names.filter((n) => posOf(n.position) === pos)
    const parsed = parseRankings(part.text).map((r) => ({ ...r, position: pos }))
    Object.assign(rankByKey, matchRankings(parsed, pool).rankByKey)
    lastRankByPos[pos] = Math.max(...parsed.map(p => p.rank))
  }
  if (!Object.keys(rankByKey).length) return null
  return blendWithAnalyst(entries, rankByKey, lastRankByPos)
}
