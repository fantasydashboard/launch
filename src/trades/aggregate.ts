import type { CatSpec } from '@/myteam/value'
import type { TeamTotals } from './landscape'

export interface AggPlayer {
  playerKey: string
  stats: Record<string, number>
}

/**
 * Aggregate each team's players into per-category totals for the landscape:
 *  - counting cats (HR, K, SV...) → sum.
 *  - ratio cats (ERA, WHIP, AVG...) → volume-weighted blend (Σ rate·vol / Σ vol), using
 *    the category's volume stat (IP for pitching ratios, AB for hitting), so a team's
 *    ERA reflects innings, not a naive average of rates.
 * v1 uses the full roster (bench over-count is ~uniform across teams, so ranks hold).
 */
export function aggregateTeamCats(
  playersByTeam: { teamId: string; players: AggPlayer[] }[],
  cats: CatSpec[],
): TeamTotals[] {
  return playersByTeam.map(({ teamId, players }) => {
    const totals: Record<string, number> = {}
    for (const cat of cats) {
      if (cat.isRatio && cat.volumeStatId) {
        let num = 0
        let den = 0
        for (const p of players) {
          const vol = p.stats[cat.volumeStatId] ?? 0
          const rate = p.stats[cat.statId]
          if (rate === undefined || !Number.isFinite(rate) || vol <= 0) continue
          num += rate * vol
          den += vol
        }
        totals[cat.statId] = den > 0 ? num / den : 0
      } else {
        let sum = 0
        for (const p of players) {
          const v = p.stats[cat.statId]
          if (Number.isFinite(v)) sum += v
        }
        totals[cat.statId] = sum
      }
    }
    return { teamId, totals }
  })
}

/**
 * Per-player, per-category strength as a direction-normalized z-score vs the pool
 * (higher = a better contribution in that category, regardless of lower/higher-is-better).
 * Feeds the deal scorer, where what matters is the RELATIVE category strength two players
 * trade, not their raw stat lines.
 */
export function playerStrengths(
  players: AggPlayer[],
  cats: CatSpec[],
): Map<string, Record<string, number>> {
  const moments = new Map<string, { mean: number; std: number }>()
  for (const cat of cats) {
    const vals = players.map((p) => p.stats[cat.statId]).filter((v): v is number => Number.isFinite(v))
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    const variance = vals.length ? vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length : 0
    moments.set(cat.statId, { mean, std: Math.sqrt(variance) || 1 })
  }
  const out = new Map<string, Record<string, number>>()
  for (const p of players) {
    const rec: Record<string, number> = {}
    for (const cat of cats) {
      const v = p.stats[cat.statId]
      if (!Number.isFinite(v)) {
        rec[cat.statId] = 0
        continue
      }
      const { mean, std } = moments.get(cat.statId)!
      rec[cat.statId] = ((v - mean) / std) * (cat.lowerIsBetter ? -1 : 1)
    }
    out.set(p.playerKey, rec)
  }
  return out
}
