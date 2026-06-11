import type { CatSpec } from '@/myteam/value'

export type ActionKind = 'add' | 'stream' | 'startSit'
export type Side = 'hit' | 'pit'

/**
 * A proposed move before drop-cost netting: which player, their projected
 * contribution over the horizon, and a contextual detail line. Generators emit
 * these; buildMoves pairs the drop/sit and scores the net swap.
 */
export interface MoveCandidate {
  kind: ActionKind
  player: { key: string; name: string; team: string; position: string }
  side: Side
  addDelta: Record<string, number>
  detail: string
}

/** Which decision layer a move belongs to: a one-day daily play, or a longer-term
 * roster upgrade. */
export type MoveLayer = 'today' | 'longTerm'

/** A single recommended action, scored by its this-week win-probability lift. */
export interface CandidateAction {
  kind: ActionKind
  player: { key: string; name: string; team: string; position: string }
  // add/stream: the drop target (optional). startSit: the player benched in the swap.
  counterparty?: { key: string; name: string }
  categories: string[] // the flippable this-week cats this move helps
  winProbLift: number // percentage points vs the baseline matchup
  rationale: string // human-readable, opinionated
  layer?: MoveLayer
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
