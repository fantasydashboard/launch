import type { CatSpec } from '@/myteam/value'
import type { CandidateAction, MoveCandidate, MoveLayer, ScoredContext } from './types'
import { scoreCandidate } from './scoreCandidate'
import { helpedCats } from './helpedCats'
import { pickCounterparty, type RosterSlotPlayer } from './pairDrop'

/** How to project a counterparty's cost over this move's horizon (a full week for
 * roster upgrades, just today's one game/appearance for a daily play). */
export type CounterpartyProjector = (player: RosterSlotPlayer) => Record<string, number>

/**
 * Turn raw move candidates into believable, drop-aware actions: pair each with the
 * player it replaces (drop, or sit), net its projected contribution against that
 * player's (projected over the SAME horizon as the candidate), keep only the
 * categories the *net* swap honestly flips, and score the net win-probability lift.
 * Drops candidates with no acceptable counterparty or no flipped category.
 */
export function buildMoves(
  candidates: MoveCandidate[],
  roster: RosterSlotPlayer[],
  flippableCatIds: string[],
  cats: CatSpec[],
  ctx: ScoredContext,
  projectCounterparty: CounterpartyProjector,
  layer?: MoveLayer,
): CandidateAction[] {
  if (flippableCatIds.length === 0) return []
  const out: CandidateAction[] = []
  for (const c of candidates) {
    const counterparty = pickCounterparty(roster, c.side, c.kind)
    // Every move is a swap; with no acceptable drop/sit, don't churn the roster.
    if (!counterparty || counterparty.playerKey === c.player.key) continue

    const counterProj = projectCounterparty(counterparty)
    const netDelta: Record<string, number> = {}
    for (const cat of cats) {
      netDelta[cat.statId] = (c.addDelta[cat.statId] ?? 0) - (counterProj[cat.statId] ?? 0)
    }

    const categories = helpedCats(netDelta, flippableCatIds, cats, c.side, ctx)
    if (categories.length === 0) continue

    out.push({
      kind: c.kind,
      player: c.player,
      counterparty: { key: counterparty.playerKey, name: counterparty.name },
      categories,
      winProbLift: scoreCandidate(netDelta, ctx),
      rationale: c.detail,
      layer,
    })
  }
  return out
}
