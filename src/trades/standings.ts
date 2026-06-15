import type { CatSpec } from '@/myteam/value'
import type { AggPlayer } from './aggregate'

/** One category's aggregate for a team. `num`/`den` retained for ratio cats so a swap can recompute. */
export interface CatAgg {
  value: number
  num?: number // ratio numerator (Σ rate·vol)
  den?: number // ratio denominator (Σ vol)
}
export interface TeamCategoryTotals {
  teamId: string
  cats: Record<string, CatAgg>
}

/**
 * Aggregate each team's ROS-projected players into per-category totals:
 *  - counting cats → sum.
 *  - ratio cats → volume-weighted blend (Σ rate·vol / Σ vol), RETAINING num/den so a previewed
 *    swap can add/remove a player's (rate·vol, vol) and recompute the ratio (you can't add ratios).
 */
export function aggregateTeamCatTotals(
  playersByTeam: { teamId: string; players: AggPlayer[] }[],
  cats: CatSpec[],
): TeamCategoryTotals[] {
  return playersByTeam.map(({ teamId, players }) => {
    const out: Record<string, CatAgg> = {}
    for (const cat of cats) {
      if (cat.isRatio && cat.volumeStatId) {
        let num = 0, den = 0
        for (const p of players) {
          const vol = p.stats[cat.volumeStatId] ?? 0
          const rate = p.stats[cat.statId]
          if (rate === undefined || !Number.isFinite(rate) || vol <= 0) continue
          num += rate * vol
          den += vol
        }
        out[cat.statId] = { value: den > 0 ? num / den : 0, num, den }
      } else {
        let sum = 0
        for (const p of players) {
          const v = p.stats[cat.statId]
          if (Number.isFinite(v)) sum += v
        }
        out[cat.statId] = { value: sum }
      }
    }
    return { teamId, cats: out }
  })
}

// Sort key for a team in a category. Zero-denominator ratio teams sort to the worst end so a team
// with no innings is not "1st in ERA". Direction handled by the caller's asc/desc.
function sortValue(agg: CatAgg | undefined, cat: CatSpec): number {
  if (!agg) return cat.lowerIsBetter ? Infinity : -Infinity
  if (cat.isRatio && (agg.den ?? 0) <= 0) return cat.lowerIsBetter ? Infinity : -Infinity
  return agg.value
}

/** teamId -> rank (1 = best). Ties share the average of the positions they span. */
export function rankInCategory(totals: TeamCategoryTotals[], cat: CatSpec): Map<string, number> {
  const dir = cat.lowerIsBetter ? 1 : -1 // asc for lower-is-better, desc otherwise
  const sorted = [...totals].sort((a, b) => dir * (sortValue(a.cats[cat.statId], cat) - sortValue(b.cats[cat.statId], cat)))
  const out = new Map<string, number>()
  let i = 0
  while (i < sorted.length) {
    let j = i
    const v = sortValue(sorted[i].cats[cat.statId], cat)
    while (j + 1 < sorted.length && sortValue(sorted[j + 1].cats[cat.statId], cat) === v) j++
    const avgRank = (i + j) / 2 + 1 // positions i..j (0-based) -> 1-based average
    for (let k = i; k <= j; k++) out.set(sorted[k].teamId, avgRank)
    i = j + 1
  }
  return out
}

/** Expected categories won per week vs an average opponent: Σ_c (N - rank_c)/(N - 1). */
export function expectedCatsWon(teamId: string, totals: TeamCategoryTotals[], cats: CatSpec[]): number {
  const n = totals.length
  if (n < 2) return 0.5 * cats.length
  let ecw = 0
  for (const cat of cats) {
    const rank = rankInCategory(totals, cat).get(teamId) ?? n
    ecw += (n - rank) / (n - 1)
  }
  return ecw
}

export interface CatRankMove {
  statId: string
  rankBefore: number
  rankAfter: number
  beatsMore: number // rankBefore - rankAfter (positive = improved)
}
export interface StandingsDelta {
  you: number
  them: number
  ladder: CatRankMove[]
}
export type PartnerRead = 'fair' | 'reach' | 'steal'

// Apply a roster change to ONE team's totals (pure — returns a new object). `remove`/`add` are the
// projected stat lines leaving/joining the team. Counting cats add/subtract the stat; ratio cats
// adjust num (Σ rate·vol) and den (Σ vol) then recompute value.
function applySwapToTeam(
  team: TeamCategoryTotals,
  remove: Record<string, number>[],
  add: Record<string, number>[],
  cats: CatSpec[],
): TeamCategoryTotals {
  const next: Record<string, CatAgg> = {}
  for (const cat of cats) {
    const cur = team.cats[cat.statId] ?? { value: 0 }
    if (cat.isRatio && cat.volumeStatId) {
      let num = cur.num ?? 0
      let den = cur.den ?? 0
      const adj = (lines: Record<string, number>[], sign: number) => {
        for (const s of lines) {
          const vol = s[cat.volumeStatId!] ?? 0
          const rate = s[cat.statId]
          if (rate === undefined || !Number.isFinite(rate) || vol <= 0) continue
          num += sign * rate * vol
          den += sign * vol
        }
      }
      adj(remove, -1)
      adj(add, +1)
      next[cat.statId] = { value: den > 0 ? num / den : 0, num, den }
    } else {
      let sum = cur.value
      for (const s of remove) if (Number.isFinite(s[cat.statId])) sum -= s[cat.statId]
      for (const s of add) if (Number.isFinite(s[cat.statId])) sum += s[cat.statId]
      next[cat.statId] = { value: sum }
    }
  }
  return { teamId: team.teamId, cats: next }
}

/**
 * ECW impact of a swap for both teams, plus the per-category rank ladder for MY team. `giveKeys`
 * leave my team (and join the partner); `getKeys` leave the partner (and join me). Re-ranks the
 * whole league with both teams updated so a category where either team crosses a third team flips.
 */
export function tradeStandingsDelta(
  totals: TeamCategoryTotals[],
  statsById: Map<string, Record<string, number>>,
  cats: CatSpec[],
  myTeamId: string,
  partnerTeamId: string,
  giveKeys: string[],
  getKeys: string[],
): StandingsDelta {
  const lines = (keys: string[]) => keys.map((k) => statsById.get(k) ?? {})
  const give = lines(giveKeys)
  const get = lines(getKeys)

  const youBefore = expectedCatsWon(myTeamId, totals, cats)
  const themBefore = expectedCatsWon(partnerTeamId, totals, cats)
  const rankBefore = new Map(cats.map((c) => [c.statId, rankInCategory(totals, c).get(myTeamId) ?? totals.length]))

  const after = totals.map((t) => {
    if (t.teamId === myTeamId) return applySwapToTeam(t, give, get, cats)   // lose give, gain get
    if (t.teamId === partnerTeamId) return applySwapToTeam(t, get, give, cats) // lose get, gain give
    return t
  })

  const youAfter = expectedCatsWon(myTeamId, after, cats)
  const themAfter = expectedCatsWon(partnerTeamId, after, cats)
  const ladder: CatRankMove[] = cats.map((c) => {
    const rb = rankBefore.get(c.statId)!
    const ra = rankInCategory(after, c).get(myTeamId) ?? after.length
    return { statId: c.statId, rankBefore: rb, rankAfter: ra, beatsMore: rb - ra }
  })

  return { you: youAfter - youBefore, them: themAfter - themBefore, ladder }
}

// Partner read from THEIR ECW delta. ε = tolerated wash; β = "they clearly lose" (a steal you only
// pitch under press-leverage). Tuned after a screenshot pass.
const PARTNER_EPS = 0.15
const PARTNER_BIG = 0.6
export function classifyPartnerRead(deltaThem: number, eps = PARTNER_EPS, big = PARTNER_BIG): PartnerRead {
  if (deltaThem >= -eps) return 'fair'
  if (deltaThem >= -big) return 'reach'
  return 'steal'
}
