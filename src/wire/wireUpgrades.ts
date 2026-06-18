import { addDropDelta, type TeamCategoryTotals } from '@/trades/standings'
import type { CatSpec } from '@/myteam/types'

export interface WireFreeAgent {
  playerKey: string
  name: string
  position: string
  team: string
  headshot?: string
  side: 'hit' | 'pit'
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
 * spot, instead of repeating "drop your weakest guy" on every row. When a side runs
 * out of fresh droppables, it falls back to its weakest (the tail may repeat).
 *
 * @remarks `dropOptions` MUST be ordered weakest-first.
 */
export function rankUpgrades(args: {
  freeAgents: WireFreeAgent[]
  leagueTotals: TeamCategoryTotals[]
  myTeamId: string
  cats: CatSpec[]
  dropOptions: WireDropOption[] // weak roster players, weakest first
  minDelta?: number
}): WireUpgrade[] {
  const minDelta = args.minDelta ?? 0.05

  // 1) Best-case delta per FA (paired with the weakest same-side droppable), ranked.
  const ranked: { fa: WireFreeAgent; best: number }[] = []
  for (const fa of args.freeAgents) {
    const drop = args.dropOptions.find((d) => d.side === fa.side) ?? null
    const d = addDropDelta(args.leagueTotals, args.cats, args.myTeamId, fa.effStats, drop?.effStats ?? null)
    if (d.deltaEcw < minDelta) continue
    ranked.push({ fa, best: d.deltaEcw })
  }
  ranked.sort((a, b) => b.best - a.best)

  // 2) Greedy distinct-drop assignment down the ranking, delta recomputed per drop.
  const used = new Set<string>()
  const out: WireUpgrade[] = []
  for (const { fa } of ranked) {
    const sideDrops = args.dropOptions.filter((d) => d.side === fa.side)
    const drop = sideDrops.find((d) => !used.has(d.playerKey)) ?? sideDrops[0] ?? null
    if (drop) used.add(drop.playerKey)
    const d = addDropDelta(args.leagueTotals, args.cats, args.myTeamId, fa.effStats, drop?.effStats ?? null)
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
