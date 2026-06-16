import { matchupPath } from './matchupPath'
import type { StakesMode } from './seasonStakes'

export interface PlanCategory {
  statId: string
  status: 'safe' | 'tossup' | 'loss'
  myWinPct: number // 0..100
}
export interface MatchupPlan {
  path: string // the one-line strategic read, reframed for the mode
  fight: string[] // statIds to push (tossups, + losses in must-win)
  swing: string[] // statIds worth a stretch (close losses in maximize)
  concede: string[] // statIds to leave alone
}

// A loss within this win% of flipping is "worth a swing" when you need ground.
const SWING_FLOOR = 35

/**
 * Turn the per-category statuses into a stakes-aware plan: which categories to fight, stretch for, or
 * concede, plus the one-line path. 'clinch' uses the base matchupPath and concedes all losses;
 * 'maximize' promotes close losses to a swing tier; 'must-win' fights everything winnable; 'coast'
 * keeps the split but tells you to conserve.
 */
export function matchupPlan(categories: PlanCategory[], mode: StakesMode): MatchupPlan {
  const tossups = categories.filter((c) => c.status === 'tossup').map((c) => c.statId)
  const losses = categories.filter((c) => c.status === 'loss')
  const base = matchupPath(categories) ?? 'No categories to plan around yet.'

  if (mode === 'must-win') {
    return {
      path: `Must-win. Empty the tank — take every move that lifts you, even small ones, and stream aggressively. There's no next week to save for.`,
      fight: [...tossups, ...losses.map((c) => c.statId)],
      swing: [],
      concede: [],
    }
  }
  if (mode === 'maximize') {
    const swing = losses.filter((c) => c.myWinPct >= SWING_FLOOR).map((c) => c.statId)
    const concede = losses.filter((c) => c.myWinPct < SWING_FLOOR).map((c) => c.statId)
    return {
      path: `Don't just clinch — every extra category is seeding. Push beyond the majority: the close losses are worth a swing.`,
      fight: tossups,
      swing,
      concede,
    }
  }
  // clinch + coast share the base split (fight tossups, concede losses); coast adds a save-resources nudge.
  const concede = losses.map((c) => c.statId)
  const path = mode === 'coast'
    ? `${base} You're set for the bracket — save your FAAB and streamers for the playoffs.`
    : base
  return { path, fight: tossups, swing: [], concede }
}
