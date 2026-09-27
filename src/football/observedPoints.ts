import type { SeasonLine } from '@/services/playerUsage'

/**
 * What a player's season so far is WORTH, before the blend gets hold of it.
 *
 * Two things were wrong with feeding `SeasonLine.points` straight into `buildRosPoints`, and
 * they pull in opposite directions, which is why neither showed up in aggregate error.
 *
 * ONE: IT WAS THE WRONG CURRENCY. `linesFromStats` reads `pts_half_ppr`, while the preseason
 * forecast on the other side of the blend is scored under the LEAGUE's weights — full PPR by
 * default. So every reception in the observed half counted half of what the same reception was
 * worth in the projected half. Quarterbacks do not catch passes, which is exactly why the
 * quarterback board looked fine while receiver was our worst position against every outside
 * reference we checked.
 *
 * TWO: A POINT IS NOT A POINT. Touchdowns are the least repeatable line on a stat sheet and
 * roughly 40% of quarterback scoring. Two players with identical fantasy points deserve
 * different forecasts when one got there on yardage he will keep producing and the other on a
 * touchdown rate he will not. Measured on 2025 (weeks 2-9, no lookahead), replacing observed
 * touchdowns with what each player's own yardage implies at the league rate beat raw points at
 * ALL FOUR positions — QB 4.231 -> 4.205, RB 3.470 -> 3.438, WR 3.509 -> 3.441,
 * TE 2.597 -> 2.520 mean absolute error against rest-of-season actual.
 *
 * Those gains look tiny because most players are not touchdown outliers. The ones who are, are
 * precisely the ones a reader notices: at week 3 of 2026 it was worth seven rank slots at
 * quarterback, moving Mahomes (five passing scores in two games) down and Drake Maye, who had
 * been touchdown-UNLUCKY by 11.5 points, up seven.
 *
 * Regression is applied only to the OBSERVED sample. The forecast already has an expectation
 * baked into it, and the upcoming week's projection is somebody else's model; neither is ours
 * to second-guess here.
 */

/** Touchdowns per yard, by position, measured on the sample rather than assumed. */
export interface TdRates {
  pass: number
  rush: number
  rec: number
}

/** A rate is only usable if the sample behind it is big enough to mean anything. */
const MIN_YARDS_FOR_RATE = 500

/**
 * League touchdown rates per yard, per position, from the lines themselves.
 *
 * Measured rather than hardcoded because the rate that matters is the one in THIS season's
 * scoring environment, and because a hardcoded constant silently rots. A position without
 * enough yardage to support a rate returns zero for it, and `rescoreObserved` then leaves that
 * component's touchdowns alone rather than regressing them toward a number it does not trust.
 */
export function leagueTdRates(lines: SeasonLine[]): Record<string, TdRates> {
  const acc: Record<string, { py: number; pt: number; ry: number; rt: number; cy: number; ct: number }> = {}
  for (const l of lines) {
    const s = l.stats
    if (!s) continue
    const a = (acc[l.position] ??= { py: 0, pt: 0, ry: 0, rt: 0, cy: 0, ct: 0 })
    a.py += s.pass_yd || 0
    a.pt += s.pass_td || 0
    a.ry += s.rush_yd || 0
    a.rt += s.rush_td || 0
    a.cy += s.rec_yd || 0
    a.ct += s.rec_td || 0
  }
  const out: Record<string, TdRates> = {}
  for (const [pos, a] of Object.entries(acc)) {
    out[pos] = {
      pass: a.py >= MIN_YARDS_FOR_RATE ? a.pt / a.py : 0,
      rush: a.ry >= MIN_YARDS_FOR_RATE ? a.rt / a.ry : 0,
      rec: a.cy >= MIN_YARDS_FOR_RATE ? a.ct / a.cy : 0,
    }
  }
  return out
}

/** Score one stat line under a league's weights. Keys the league does not price are ignored. */
export function scoreStats(stats: Record<string, number>, weights: Record<string, number>): number {
  let total = 0
  for (const [key, w] of Object.entries(weights)) {
    const v = stats[key]
    if (typeof v === 'number' && Number.isFinite(v) && w) total += v * w
  }
  return total
}

export interface RescoreOptions {
  /** Replace observed touchdowns with what that player's yardage implies. Default true. */
  regressTds?: boolean
}

/**
 * Re-score every line under the league's own weights, optionally regressing touchdowns.
 *
 * Lines that arrive without a `stats` payload are passed through untouched — an older cache
 * entry or a feed that changed shape must not silently become a zero, which would read as a
 * player who stopped producing rather than one we cannot score.
 */
export function rescoreObserved(
  lines: SeasonLine[],
  weights: Record<string, number>,
  options: RescoreOptions = {},
): SeasonLine[] {
  const regress = options.regressTds !== false
  const rates = regress ? leagueTdRates(lines) : {}
  return lines.map((l) => {
    const s = l.stats
    if (!s) return l
    let stats = s
    const r = rates[l.position]
    if (regress && r) {
      stats = { ...s }
      /* Only where the rate is trustworthy AND the player has yardage to imply from. A tight
         end with one carry does not get his rushing touchdown taken away on the strength of a
         rate built from somebody else's twelve hundred yards. */
      if (r.pass > 0 && (s.pass_yd || 0) > 0) stats.pass_td = (s.pass_yd || 0) * r.pass
      if (r.rush > 0 && (s.rush_yd || 0) > 0) stats.rush_td = (s.rush_yd || 0) * r.rush
      if (r.rec > 0 && (s.rec_yd || 0) > 0) stats.rec_td = (s.rec_yd || 0) * r.rec
    }
    return { ...l, points: scoreStats(stats, weights) }
  })
}
