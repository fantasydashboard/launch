import type { CatSpec } from '@/myteam/value'
import type { EligiblePlayer, NeedWeights } from './positionalValue'

export interface LineupLeak {
  position: string
  starter: { key: string; name: string }
  better: { key: string; name: string; source: 'bench' | 'waiver' }
  categories: string[] // contested cats the upgrade is ahead in
  gap: number // roleValue gap (same 0-100 scale as the roster badge)
}

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
 * Flag positions where a started player is materially weaker than an eligible,
 * available alternative — preferring a bench player you already own (a free
 * start/sit) over a waiver add.
 *
 * Ranking is by `roleValue`, the SAME 0-100 number on the roster badge, so the
 * callout can never contradict the roster ordering. Need-weighting is a gate, not
 * the rank: a leak only fires when the better player also leads the starter in a
 * category the team is still contesting (`categoriesAhead`).
 *
 * A bench/waiver upgrade fills exactly one lineup slot, so each candidate is
 * assigned at most once (shared `used` set). Starters are processed worst-leak
 * first, so the scarce upgrade lands where it helps most rather than being claimed
 * three times by three different starters.
 */
export function detectLeaks(
  starters: EligiblePlayer[],
  bench: EligiblePlayer[],
  freeAgents: EligiblePlayer[],
  cats: CatSpec[],
  needWeights: NeedWeights,
  opts: { materiality?: number; excludeKeys?: Set<string> } = {},
): LineupLeak[] {
  const materiality = opts.materiality ?? 8 // roleValue points (0-100 scale)
  const exclude = opts.excludeKeys ?? new Set<string>()
  const used = new Set<string>() // a bench/waiver arm fills one slot: assign it once

  // Best eligible, available alternative whose badge value clears the starter by a
  // material margin AND leads in a needed category — never one Your Move surfaced
  // (excludeKeys) or one already assigned to another starter (used).
  const bestAlternative = (
    candidates: EligiblePlayer[],
    position: string,
    starter: EligiblePlayer,
  ): EligiblePlayer | null => {
    let best: EligiblePlayer | null = null
    for (const p of candidates) {
      if (p.playerKey === starter.playerKey) continue
      if (exclude.has(p.playerKey) || used.has(p.playerKey)) continue
      if (!p.eligiblePositions.includes(position) || !isAvailable(p)) continue
      if (p.roleValue <= starter.roleValue + materiality) continue
      if (categoriesAhead(p, starter, cats, needWeights).length === 0) continue
      if (!best || p.roleValue > best.roleValue) best = p
    }
    return best
  }

  // Rank starters by the size of their best available leak (bench or waiver, before
  // contention), so the worst leak gets first pick of a shared upgrade.
  const order = starters
    .filter((s) => s.eligiblePositions.length > 0)
    .map((s) => {
      const position = s.eligiblePositions[0] // primary eligible position (v1)
      const prov = bestAlternative([...bench, ...freeAgents], position, s)
      return { starter: s, position, gap: prov ? prov.roleValue - s.roleValue : -Infinity }
    })
    .filter((o) => o.gap > 0)
    .sort((a, b) => b.gap - a.gap)

  const leaks: LineupLeak[] = []
  for (const { starter, position } of order) {
    // Prefer a bench player you already own (free swap); fall back to waiver.
    const benchBest = bestAlternative(bench, position, starter)
    const pick = benchBest
      ? { p: benchBest, source: 'bench' as const }
      : (() => {
          const w = bestAlternative(freeAgents, position, starter)
          return w ? { p: w, source: 'waiver' as const } : null
        })()
    if (!pick) continue
    used.add(pick.p.playerKey)

    leaks.push({
      position,
      starter: { key: starter.playerKey, name: starter.name },
      better: { key: pick.p.playerKey, name: pick.p.name, source: pick.source },
      categories: categoriesAhead(pick.p, starter, cats, needWeights),
      gap: pick.p.roleValue - starter.roleValue,
    })
  }

  return leaks // already worst-leak first
}
