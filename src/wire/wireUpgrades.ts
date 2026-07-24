import { addDropDelta, type TeamCategoryTotals } from '@/trades/standings'
import type { CatSpec } from '@/myteam/types'

export interface WireFreeAgent {
  playerKey: string
  name: string
  position: string
  team: string
  headshot?: string
  side: 'hit' | 'pit'
  percentOwned?: number // current roster ownership %
  percentChange?: number // week-over-week ownership delta (rising = trending)
  effStats: Record<string, number> // effective ROS stats (incl. ratio volume stats)
}
export interface WireDropOption {
  playerKey: string
  side: 'hit' | 'pit'
  effStats: Record<string, number>
}
export interface WireUpgrade {
  player: { key: string; name: string; position: string; team: string; headshot?: string }
  deltaEcw: number
  dropKey: string | null
  fixes: string[] // statIds
  holds: string[] // statIds
}

/**
 * Rank free agents by season ECW delta, with DISTINCT drops across same-side adds.
 *
 * Each add is first scored against the weakest same-side droppable (its best-case
 * gain) and the list is ranked by that. Then drops are assigned greedily down the
 * ranking — the strongest add takes the weakest droppable, the next same-side add
 * the next-weakest UNUSED droppable (delta recomputed against it), and so on — so
 * the surfaced upgrades read as a menu of moves that each clear a DIFFERENT roster
 * spot, instead of repeating "drop your weakest guy" on every row.
 *
 * Distinct drops are only spread across `diversifyKeys` — your GENUINE weak links.
 * Once those run out (or when a side has none), every remaining add falls back to
 * the single weakest expendable and REPEATS it, rather than reaching into a good
 * player just for variety (e.g. never "drop your closer for a worse reliever"). If
 * `diversifyKeys` is omitted, all drops are diversifiable (legacy behavior).
 *
 * @remarks `dropOptions` MUST be ordered weakest-first.
 */
export function rankUpgrades(args: {
  freeAgents: WireFreeAgent[]
  leagueTotals: TeamCategoryTotals[]
  myTeamId: string
  cats: CatSpec[]
  dropOptions: WireDropOption[] // weak roster players, weakest first
  diversifyKeys?: Set<string> // genuine weak links to spread distinct drops across
  minDelta?: number
}): WireUpgrade[] {
  const minDelta = args.minDelta ?? 0.05
  const diversify = args.diversifyKeys ?? null

  // 1) Best-case delta per FA (paired with the weakest same-side droppable), ranked.
  const ranked: { fa: WireFreeAgent; best: number }[] = []
  for (const fa of args.freeAgents) {
    const drop = args.dropOptions.find((d) => d.side === fa.side) ?? null
    const d = addDropDelta(args.leagueTotals, args.cats, args.myTeamId, fa.effStats, drop?.effStats ?? null, {
      addSide: fa.side,
      dropSide: drop?.side ?? null,
    })
    if (d.deltaEcw < minDelta) continue
    ranked.push({ fa, best: d.deltaEcw })
  }
  ranked.sort((a, b) => b.best - a.best)

  // 2) Greedy drop assignment down the ranking, delta recomputed per drop. Distinct
  //    drops come only from the genuine weak links; the rest repeat the weakest.
  const used = new Set<string>()
  const out: WireUpgrade[] = []
  for (const { fa } of ranked) {
    const sideDrops = args.dropOptions.filter((d) => d.side === fa.side)
    const spreadable = diversify ? sideDrops.filter((d) => diversify.has(d.playerKey)) : sideDrops
    const drop = spreadable.find((d) => !used.has(d.playerKey)) ?? sideDrops[0] ?? null
    if (drop && (!diversify || diversify.has(drop.playerKey))) used.add(drop.playerKey)
    const d = addDropDelta(args.leagueTotals, args.cats, args.myTeamId, fa.effStats, drop?.effStats ?? null, {
      addSide: fa.side,
      dropSide: drop?.side ?? null,
    })
    out.push({
      player: { key: fa.playerKey, name: fa.name, position: fa.position, team: fa.team, headshot: fa.headshot },
      deltaEcw: d.deltaEcw,
      dropKey: drop?.playerKey ?? null,
      fixes: d.fixes,
      holds: d.holds,
    })
  }
  return out.sort((a, b) => b.deltaEcw - a.deltaEcw)
}
