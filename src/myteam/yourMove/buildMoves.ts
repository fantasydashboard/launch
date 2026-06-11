import type { CatSpec } from '@/myteam/value'
import type { CandidateAction, MoveCandidate, MoveLayer, ScoredContext } from './types'
import { scoreCandidate } from './scoreCandidate'
import { helpedCats } from './helpedCats'
import { pickCounterparty, type RosterSlotPlayer } from './pairDrop'

/** How to project a counterparty's cost over this move's horizon (a full week for
 * roster upgrades, just today's one game/appearance for a daily play). */
export type CounterpartyProjector = (player: RosterSlotPlayer) => Record<string, number>

/** Evaluate a candidate swap against a specific counterparty: net the projected
 * contributions, keep only honestly-flipped cats, and score the net win-prob lift.
 * Returns null if the swap flips nothing. */
export function evaluateSwap(
  c: MoveCandidate,
  counterparty: RosterSlotPlayer,
  projectCounterparty: CounterpartyProjector,
  flippableCatIds: string[],
  cats: CatSpec[],
  ctx: ScoredContext,
): { categories: string[]; winProbLift: number } | null {
  const counterProj = projectCounterparty(counterparty)
  const netDelta: Record<string, number> = {}
  for (const cat of cats) {
    netDelta[cat.statId] = (c.addDelta[cat.statId] ?? 0) - (counterProj[cat.statId] ?? 0)
  }
  const categories = helpedCats(netDelta, flippableCatIds, cats, c.side, ctx)
  if (categories.length === 0) return null
  return { categories, winProbLift: scoreCandidate(netDelta, ctx) }
}

/**
 * Turn raw move candidates into believable, drop-aware actions (pairing each with
 * the weakest droppable/sittable same-side player). Unranked; one counterparty may
 * recur. Used in tests and simple cases — the page uses buildRankedMoves.
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
    if (!counterparty || counterparty.playerKey === c.player.key) continue
    const ev = evaluateSwap(c, counterparty, projectCounterparty, flippableCatIds, cats, ctx)
    if (!ev) continue
    out.push({
      kind: c.kind,
      player: c.player,
      counterparty: { key: counterparty.playerKey, name: counterparty.name },
      categories: ev.categories,
      winProbLift: ev.winProbLift,
      rationale: c.detail,
      layer,
    })
  }
  return out
}

export interface RankedBuildOptions {
  layer?: MoveLayer
  maxMoves: number
  liftFloor: number
  // Counterparties / players already committed by an earlier layer — kept distinct
  // so no two surfaced moves drop or sit the same player, and no player is suggested
  // twice. Mutated as moves are emitted.
  usedCounterparties: Set<string>
  usedPlayers: Set<string>
}

/**
 * Rank candidates by their best-case lift, then greedily assign each a DISTINCT
 * counterparty (the weakest still-available droppable/sittable same-side player),
 * re-scoring against the actually-assigned counterparty. The result is a stack of
 * independently-doable swaps — no repeated "drop the same guy".
 */
export function buildRankedMoves(
  candidates: MoveCandidate[],
  roster: RosterSlotPlayer[],
  flippableCatIds: string[],
  cats: CatSpec[],
  ctx: ScoredContext,
  projectCounterparty: CounterpartyProjector,
  opts: RankedBuildOptions,
): CandidateAction[] {
  if (flippableCatIds.length === 0) return []

  // Rank by best-case lift (each against the currently-weakest available drop).
  const ranked = candidates
    .map((c) => {
      const cp = pickCounterparty(roster, c.side, c.kind, opts.usedCounterparties)
      if (!cp || cp.playerKey === c.player.key) return null
      const ev = evaluateSwap(c, cp, projectCounterparty, flippableCatIds, cats, ctx)
      return ev ? { c, bestLift: ev.winProbLift } : null
    })
    .filter((x): x is { c: MoveCandidate; bestLift: number } => x !== null)
    .sort((a, b) => b.bestLift - a.bestLift)

  const out: CandidateAction[] = []
  for (const { c } of ranked) {
    if (out.length >= opts.maxMoves) break
    if (opts.usedPlayers.has(c.player.key)) continue
    const cp = pickCounterparty(roster, c.side, c.kind, opts.usedCounterparties)
    if (!cp || cp.playerKey === c.player.key) continue
    const ev = evaluateSwap(c, cp, projectCounterparty, flippableCatIds, cats, ctx)
    if (!ev || ev.winProbLift < opts.liftFloor) continue
    out.push({
      kind: c.kind,
      player: c.player,
      counterparty: { key: cp.playerKey, name: cp.name },
      categories: ev.categories,
      winProbLift: ev.winProbLift,
      rationale: c.detail,
      layer: opts.layer,
    })
    opts.usedCounterparties.add(cp.playerKey)
    opts.usedPlayers.add(c.player.key)
  }
  return out
}
