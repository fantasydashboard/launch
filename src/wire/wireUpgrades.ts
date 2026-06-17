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
 * Rank free agents by season ECW delta, each netted against the weakest same-side droppable.
 *
 * @remarks `dropOptions` MUST be ordered weakest-first — the first same-side entry is used as the
 * drop for every free agent on that side, so a mis-ordered list produces wrong pairings.
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
  const upgrades: WireUpgrade[] = []
  for (const fa of args.freeAgents) {
    const drop = args.dropOptions.find((d) => d.side === fa.side) ?? null
    const d = addDropDelta(args.leagueTotals, args.cats, args.myTeamId, fa.effStats, drop?.effStats ?? null)
    if (d.deltaEcw < minDelta) continue
    upgrades.push({
      player: { key: fa.playerKey, name: fa.name, position: fa.position, team: fa.team, headshot: fa.headshot },
      deltaEcw: d.deltaEcw,
      dropKey: drop?.playerKey ?? null,
      fixes: d.fixes,
      holds: d.holds,
    })
  }
  return upgrades.sort((a, b) => b.deltaEcw - a.deltaEcw)
}
