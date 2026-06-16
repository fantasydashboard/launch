/**
 * Win-probability trend data for the Matchup page.
 *
 * Honesty rule: we never fabricate the past. The solid "actual" line is built
 * only from real win-probability readings captured each day the page is viewed
 * (so it starts as a single point and fills in over the week). The dotted
 * "projected" line holds today's win% flat to the end of the week — today's
 * win probability is already the unbiased estimate of the end-of-week outcome
 * (a martingale), so drawing it climbing toward 100 would assume the result.
 */

export interface TrendPoint {
  date: string // 'YYYY-MM-DD' (local calendar day)
  my: number // my win% 0..100
  opp: number // opponent win% 0..100
}

/**
 * Add today's reading, replacing any existing point for the same day (the latest
 * view of a day wins), and keep the list sorted ascending by date.
 */
export function mergePoint(points: TrendPoint[], p: TrendPoint): TrendPoint[] {
  const others = points.filter((x) => x.date !== p.date)
  return [...others, p].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * The flat projected segment: from the latest actual reading to week end, held
 * at today's win%. Returns [] when there's no data or the week is already over
 * (week end on/before the latest reading), so a finished week shows no dotted
 * tail. The first point equals the latest actual point so the dotted line picks
 * up exactly where the solid line ends.
 */
export function projectedSegment(latest: TrendPoint | null, weekEndDate: string): TrendPoint[] {
  if (!latest || weekEndDate <= latest.date) return []
  return [latest, { date: weekEndDate, my: latest.my, opp: latest.opp }]
}
