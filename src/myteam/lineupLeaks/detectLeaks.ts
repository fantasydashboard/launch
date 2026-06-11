import type { CatSpec } from '@/myteam/value'
import { positionalValue, type EligiblePlayer, type NeedWeights } from './positionalValue'

export interface LineupLeak {
  position: string
  starter: { key: string; name: string }
  better: { key: string; name: string; source: 'bench' | 'waiver' }
  categories: string[] // contested cats the upgrade is ahead in
  gap: number // need-weighted positional-value gap
}

// P2 is hitters-only; SP/RP are a streaming game handled by Your Move, not a stable
// "weak at position" slot (P3 extends to pitchers carefully).
const isHittingPosition = (pos: string): boolean => !/^(SP|RP|P)$/i.test(pos.trim())

// Exclude IL / NA / OUT alternatives — never recommend swapping in someone unavailable.
function isAvailable(p: EligiblePlayer): boolean {
  const s = (p.status ?? '').toUpperCase()
  return s === '' || s === 'ACTIVE' || s === 'DTD'
}

/** Contested categories where `better` projects ahead of `starter` (for the rationale). */
function categoriesAhead(
  better: EligiblePlayer,
  starter: EligiblePlayer,
  cats: CatSpec[],
  needWeights: NeedWeights,
): string[] {
  return cats
    .filter((c) => (needWeights[c.statId] ?? 0) > 0)
    .filter((c) => {
      const dir = c.lowerIsBetter ? -1 : 1
      return (better.stats[c.statId] ?? 0) * dir > (starter.stats[c.statId] ?? 0) * dir
    })
    .map((c) => c.statId)
}

/**
 * Flag positions where a started hitter is materially weaker (for the team's needs)
 * than an eligible, available alternative — preferring a bench player you already own
 * (a free start/sit) over a waiver add. Greedy single-swap, one leak per starter,
 * ranked by gap. Position-relative and need-weighted, so it only fires where a real,
 * legal upgrade exists in a category the team is contesting.
 */
export function detectLeaks(
  starters: EligiblePlayer[],
  bench: EligiblePlayer[],
  freeAgents: EligiblePlayer[],
  cats: CatSpec[],
  needWeights: NeedWeights,
  opts: { materiality?: number } = {},
): LineupLeak[] {
  const materiality = opts.materiality ?? 0.5
  const pool = [...starters, ...bench, ...freeAgents]
  const leaks: LineupLeak[] = []

  const bestAlternative = (
    candidates: EligiblePlayer[],
    position: string,
    starter: EligiblePlayer,
    starterVal: number,
  ): { p: EligiblePlayer; val: number } | null => {
    let best: { p: EligiblePlayer; val: number } | null = null
    for (const p of candidates) {
      if (p.playerKey === starter.playerKey) continue
      if (!p.eligiblePositions.includes(position) || !isAvailable(p)) continue
      const val = positionalValue(p, position, pool, cats, needWeights)
      if (val > starterVal + materiality && (!best || val > best.val)) best = { p, val }
    }
    return best
  }

  for (const starter of starters) {
    const positions = starter.eligiblePositions.filter(isHittingPosition)
    if (positions.length === 0) continue
    const position = positions[0] // primary eligible position (v1)
    const starterVal = positionalValue(starter, position, pool, cats, needWeights)

    // Prefer a bench player you already own (free swap); fall back to waiver.
    const benchBest = bestAlternative(bench, position, starter, starterVal)
    const pick = benchBest
      ? { p: benchBest.p, val: benchBest.val, source: 'bench' as const }
      : (() => {
          const w = bestAlternative(freeAgents, position, starter, starterVal)
          return w ? { p: w.p, val: w.val, source: 'waiver' as const } : null
        })()
    if (!pick) continue

    leaks.push({
      position,
      starter: { key: starter.playerKey, name: starter.name },
      better: { key: pick.p.playerKey, name: pick.p.name, source: pick.source },
      categories: categoriesAhead(pick.p, starter, cats, needWeights),
      gap: pick.val - starterVal,
    })
  }

  return leaks.sort((a, b) => b.gap - a.gap)
}
