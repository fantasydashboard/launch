import { computeReplacementDetail, computeReplacementLevels, type RepPlayer } from './footballReplacement'
import type { OpportunityTag } from './footballOpportunity'

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
  opportunity: OpportunityTag // '' unless a depth-chart/injury signal applies
}

export interface FootballVorInput {
  points: Record<string, number>          // ROS points by key (rostered + FA)
  positionByKey: Record<string, string>
  slots: Record<string, number>
  teams: number
  weekly?: Record<string, number>[]        // [nextWeek, +1, …] points by key; byes already zeroed
  opportunityByKey?: Record<string, OpportunityTag> // depth-chart/injury tag by key
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
  const { points, positionByKey, slots, teams, weekly, opportunityByKey } = input
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
      opportunity: opportunityByKey?.[key] ?? '',
    }
  }
  return out
}

export interface VorAuditPosition {
  position: string
  startable: number         // players at this position who start league-wide
  replacement: number       // ROS replacement level (points)
  replacementWeek1: number  // next-week replacement level; 0 when no weekly maps
  playersAtPosition: number
}

export interface VorAudit {
  teams: number
  slots: Record<string, number>
  positions: VorAuditPosition[]
  playerCount: number
  weeklyMapCount: number
}

/**
 * How the VOR numbers were produced, for `/vor-audit`. Takes the SAME
 * FootballVorInput object the engine takes and recomputes with the same pure
 * helpers, so the reported replacement levels are the levels the engine
 * subtracted — an audit that could disagree with the engine would be worse
 * than none. Pure and total.
 */
export function buildFootballVorAudit(input: FootballVorInput): VorAudit {
  const { points, positionByKey, slots, teams, weekly } = input
  const ros = computeReplacementDetail(repPlayers(points, positionByKey), slots, teams)
  const week1 = weekly?.length
    ? computeReplacementDetail(repPlayers(weekly[0], positionByKey), slots, teams)
    : null

  const positions: VorAuditPosition[] = Object.keys(ros.levels)
    .map((position) => ({
      position,
      startable: ros.startable[position] ?? 0,
      replacement: ros.levels[position] ?? 0,
      replacementWeek1: week1?.levels[position] ?? 0,
      playersAtPosition: ros.countByPos[position] ?? 0,
    }))
    .sort((a, b) => b.playersAtPosition - a.playersAtPosition || a.position.localeCompare(b.position))

  return {
    teams,
    slots,
    positions,
    playerCount: Object.keys(points).length,
    weeklyMapCount: weekly?.length ?? 0,
  }
}
