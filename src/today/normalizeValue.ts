import type { ScoredPlay } from './todayBoard'

/**
 * Assign each play a 0–100 `score` = its percentile within its OWN side's pool (bats vs bats,
 * arms vs arms), so a top bat and a top arm both approach 100 and cross-type ranking stops
 * favouring pitchers purely by raw magnitude. Percentile = (# same-side plays with a strictly
 * lower value) / (poolSize - 1) × 100; a single-element side pool scores 100; equal values share
 * a percentile. Pure — returns new objects, does not mutate the input.
 */
export function normalizeMoves(plays: ScoredPlay[]): ScoredPlay[] {
  const bySide: Record<'hit' | 'pit', ScoredPlay[]> = { hit: [], pit: [] }
  for (const p of plays) bySide[p.side].push(p)

  const scoreByKey = new Map<string, number>()
  for (const side of ['hit', 'pit'] as const) {
    const pool = bySide[side]
    const n = pool.length
    for (const p of pool) {
      if (n === 1) {
        scoreByKey.set(p.playerKey, 100)
        continue
      }
      const lower = pool.filter((x) => x.value < p.value).length
      scoreByKey.set(p.playerKey, Math.round((lower / (n - 1)) * 100))
    }
  }
  return plays.map((p) => ({ ...p, score: scoreByKey.get(p.playerKey) ?? 0 }))
}
