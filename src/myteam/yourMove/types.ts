import type { CatSpec } from '@/myteam/value'

export type ActionKind = 'add' | 'stream' | 'startSit'

/** A single recommended action, scored by its this-week win-probability lift. */
export interface CandidateAction {
  kind: ActionKind
  player: { key: string; name: string; team: string; position: string }
  // add/stream: the drop target (optional). startSit: the player benched in the swap.
  counterparty?: { key: string; name: string }
  categories: string[] // the flippable this-week cats this move helps
  winProbLift: number // percentage points vs the baseline matchup
  rationale: string // human-readable, opinionated
}

/** Everything the scorer needs to evaluate a candidate against the live matchup. */
export interface ScoredContext {
  cats: CatSpec[]
  categoryIds: string[]
  myStats: Record<string, number> // this-week team totals (baseline)
  oppStats: Record<string, number>
  days: number // days remaining in the week
  platform: 'yahoo' | 'espn'
}
