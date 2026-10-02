import type { SkaterRate } from './nhlRates'
import type { GoalieProjection } from './goalieProjection'

/**
 * OUR RATES, HALF-WEIGHTED TOWARD A FREE PUBLIC BASELINE (5v5 Hockey), so the board cannot
 * drift far from consensus. The same idea as football's weekly analyst blend.
 *
 * Rates, never totals: their rest-of-season columns zero out 70 skaters and give everyone else
 * a flat 84 games, so they have no playing-time model to average with. We keep our games played
 * and our goalie starts (theirs are templated at about 76 for a starter and 21 for a backup),
 * and average only how good each player is per game or per start.
 * Measured 2026-10-02: skater top-10s agreed within about 2 ranks; 21-30 drifted 7-14.
 */
export interface BaselineSkater { playerId: number; name: string; perGame: Record<string, number> }
export interface BaselineGoalie { playerId: number; name: string; savePct: number; winsPerStart: number; shutoutsPerStart: number }
export interface Baseline { fetchedAt: string; skaters: BaselineSkater[]; goalies: BaselineGoalie[] }

export const BASELINE_WEIGHT = 0.5
export const BLENDED_SKATER_CATEGORIES = [
  'goals', 'assists', 'plusMinus', 'penaltyMinutes', 'ppPoints', 'shots', 'hits', 'blockedShots',
] as const

const mix = (a: number, b: number, w: number) => a * (1 - w) + b * w

export function blendSkaterRates(rates: SkaterRate[], baseline: Baseline, w = BASELINE_WEIGHT) {
  const theirs = new Map(baseline.skaters.map((s) => [s.playerId, s]))
  let matched = 0
  const out = rates.map((r) => {
    const t = theirs.get(r.playerId)
    if (!t) return r
    matched++
    const pg = { ...r.perGame }
    for (const c of BLENDED_SKATER_CATEGORIES) {
      const ours = pg[c], their = t.perGame[c]
      if (Number.isFinite(ours) && Number.isFinite(their)) pg[c] = mix(ours, their, w)
    }
    pg.points = (pg.goals ?? 0) + (pg.assists ?? 0)
    const ppShare = r.perGame.ppPoints > 0 ? (r.perGame.ppGoals ?? 0) / r.perGame.ppPoints : 1 / 3
    if (Number.isFinite(pg.ppPoints)) pg.ppGoals = pg.ppPoints * Math.min(1, ppShare)
    return { ...r, perGame: pg }
  })
  return { rates: out, matched }
}

export function blendGoalieProjections(goalies: GoalieProjection[], baseline: Baseline, w = BASELINE_WEIGHT) {
  const theirs = new Map(baseline.goalies.map((g) => [g.playerId, g]))
  let matched = 0
  const out = goalies.map((g) => {
    const t = theirs.get(g.playerId)
    if (!t || !(g.starts > 0)) return g
    matched++
    const savePct = mix(g.savePct, t.savePct, w)
    const winRate = mix(g.wins / g.starts, t.winsPerStart, w)
    const soRate = mix(g.shutouts / g.starts, t.shutoutsPerStart, w)
    const saves = g.shotsAgainst * savePct
    return { ...g, savePct, wins: g.starts * winRate, shutouts: g.starts * soRate,
             saves, goalsAgainst: g.shotsAgainst - saves }
  })
  return { goalies: out, matched }
}

/**
 * The blend step, fenced. A malformed baseline must leave the board exactly as it was, so any
 * throw returns our numbers untouched and no `baseline` field.
 */
export function applyBaseline(rates: SkaterRate[], goalies: GoalieProjection[], baseline: Baseline | null) {
  if (!baseline) return { rates, goalieProjections: goalies }
  try {
    const sk = blendSkaterRates(rates, baseline)
    const gl = blendGoalieProjections(goalies, baseline)
    return {
      rates: sk.rates,
      goalieProjections: gl.goalies,
      baseline: { fetchedAt: baseline.fetchedAt, skatersMatched: sk.matched, goaliesMatched: gl.matched },
    }
  } catch (e) {
    console.warn('[hockey baseline] blend failed, using our rates', e)
    return { rates, goalieProjections: goalies }
  }
}
