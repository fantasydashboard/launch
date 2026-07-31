import { computeReplacementLevels, type RepPlayer } from './footballReplacement'

export interface PlayerVor {
  playerKey: string
  position: string
  pointsRos: number
  vorRos: number
  pointsNextWeek: number
  vorWeek: number
  streamWeeks: number // count of the next N weeks projecting above weekly replacement
  streamOf: number    // N (number of weekly maps supplied)
  confidence: 'high' | 'low'
}

export interface FootballVorInput {
  points: Record<string, number>          // ROS points by key (rostered + FA)
  positionByKey: Record<string, string>
  slots: Record<string, number>
  teams: number
  weekly?: Record<string, number>[]        // [nextWeek, +1, …] points by key; byes already zeroed
}

const normPos = (pos: string): string => (pos || '').toUpperCase().split(/[,/|]/)[0].trim()

function repPlayers(points: Record<string, number>, positionByKey: Record<string, string>): RepPlayer[] {
  return Object.keys(points).map((k) => ({ playerKey: k, position: positionByKey[k] ?? '', points: points[k] }))
}

/**
 * Per-player VOR in two timeframes. ROS drives ranking/fair value; the optional
 * weekly maps drive the streaming lens: vorWeek is next week's edge, and
 * streamWeeks is how many of the supplied weeks the player projects above
 * weekly replacement (a durable stream vs a one-week plug). Pure.
 */
export function buildFootballVor(input: FootballVorInput): Record<string, PlayerVor> {
  const { points, positionByKey, slots, teams, weekly } = input
  const rosLevels = computeReplacementLevels(repPlayers(points, positionByKey), slots, teams)

  // Precompute weekly replacement levels once per week.
  const weeklyLevels = (weekly ?? []).map((wk) => computeReplacementLevels(repPlayers(wk, positionByKey), slots, teams))

  const out: Record<string, PlayerVor> = {}
  for (const key of Object.keys(points)) {
    const pos = normPos(positionByKey[key] ?? '')
    const pointsRos = points[key] ?? 0
    const pointsNextWeek = weekly?.[0]?.[key] ?? 0
    let streamWeeks = 0
    weeklyLevels.forEach((levels, i) => {
      const wkPts = weekly![i][key] ?? 0
      if (wkPts > (levels[pos] ?? 0)) streamWeeks++
    })
    out[key] = {
      playerKey: key,
      position: pos,
      pointsRos,
      vorRos: pointsRos - (rosLevels[pos] ?? 0),
      pointsNextWeek,
      vorWeek: weeklyLevels.length ? pointsNextWeek - (weeklyLevels[0][pos] ?? 0) : 0,
      streamWeeks: weeklyLevels.length ? streamWeeks : 0,
      streamOf: weeklyLevels.length,
      confidence: pointsRos > 0 ? 'high' : 'low',
    }
  }
  return out
}
