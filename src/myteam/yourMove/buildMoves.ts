import type { CatSpec } from '@/myteam/value'
import type { CandidateAction, MoveCandidate, ScoredContext } from './types'
import { projectRemainingWeek } from './projectRemainingWeek'
import { scoreCandidate } from './scoreCandidate'
import { helpedCats } from './helpedCats'
import { pickCounterparty, type RosterSlotPlayer } from './pairDrop'

/**
 * Turn raw move candidates into believable, drop-aware actions: pair each with the
 * player it replaces (drop, or sit), net its projected contribution against that
 * player's, keep only the categories the *net* swap honestly flips, and score the
 * net win-probability lift. Drops candidates with no acceptable counterparty or no
 * flipped category.
 */
export function buildMoves(
  candidates: MoveCandidate[],
  roster: RosterSlotPlayer[],
  flippableCatIds: string[],
  cats: CatSpec[],
  ctx: ScoredContext,
  seasonFraction = 0.6,
): CandidateAction[] {
  if (flippableCatIds.length === 0) return []
  const out: CandidateAction[] = []
  for (const c of candidates) {
    const counterparty = pickCounterparty(roster, c.side, c.kind)
    // Every move is a swap; with no acceptable drop/sit, don't churn the roster.
    if (!counterparty || counterparty.playerKey === c.player.key) continue

    const counterProj = projectRemainingWeek(counterparty.stats, null, cats, ctx.days, seasonFraction)
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
    })
  }
  return out
}
