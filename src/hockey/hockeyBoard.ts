import type { AvailablePlayerRow } from '@/draft/room/board'
import { buildHockeyValue, type HockeyProjection } from './hockeyValue'
import { buildHockeyVor } from './hockeyVor'
import type { HockeyLeagueRules } from './hockeyLeague'

/**
 * A draft board for a hockey league: projections in, ranked rows out.
 *
 * This is the join between the three hockey modules and the sport-agnostic draft board. The
 * board itself needed no changes — `buildBoard` has never known what sport it is looking at,
 * and it still does not.
 *
 * ORDERED BY VALUE OVER REPLACEMENT, NOT BY POINTS. The difference decides drafts. In the
 * test league an elite defenceman sits below the fourth-best centre on raw points and above
 * him on VOR, because defence replacement is 59.3 where forward replacement is 107.7 — the
 * seat he is competing for is much cheaper to fill badly. A board sorted by points would
 * quietly tell you to take the centre.
 */

export interface HockeyBoardInput {
  projections: Record<string, HockeyProjection>
  rules: HockeyLeagueRules
  /** playerKey -> display name, from the projection feed. */
  namesByKey: Record<string, string>
  /** playerKey -> pro team abbreviation, when known. */
  teamsByKey?: Record<string, string>
  /** Already drafted, by key. Excluded from the board. */
  drafted?: Set<string>
  /** Games each player has already played, for an in-season board. */
  gamesPlayed?: Record<string, number>
}

export interface HockeyBoardResult {
  rows: AvailablePlayerRow[]
  /** Replacement level per pool, so a surface can explain WHY a player ranks where he does. */
  replacement: Record<string, number>
  /** Scored stat ids we could not name — every total is short by whatever they were worth. */
  unnamedScoredStatIds: number[]
}

export function buildHockeyBoard(input: HockeyBoardInput): HockeyBoardResult {
  const { projections, rules, namesByKey, teamsByKey = {}, drafted, gamesPlayed } = input

  const { valueByKey } = buildHockeyValue({
    projections,
    weights: rules.weights,
    gamesPlayed,
    scoringItems: undefined,     // the gap is already carried on the rules
  })

  const points: Record<string, number> = {}
  const positionByKey: Record<string, string> = {}
  for (const [key, v] of Object.entries(valueByKey)) {
    /*
     * No projection is no opinion.
     *
     * A player scoring zero reaches the board and then floats upward on any term that
     * rewards uncertainty — the football board had exactly this bug, where players nobody
     * had a number for became recommendations. Drop them instead.
     */
    if (!(v.total > 0)) continue
    points[key] = v.total
    positionByKey[key] = projections[key]?.position ?? ''
  }

  const vor = buildHockeyVor({
    points,
    positionByKey,
    slots: rules.slots,
    teams: rules.teams,
  })

  const replacement: Record<string, number> = {}
  for (const r of Object.values(vor)) {
    if (replacement[r.pool] === undefined) replacement[r.pool] = r.points - r.vor
  }

  const rows: AvailablePlayerRow[] = []
  for (const r of Object.values(vor)) {
    if (drafted?.has(r.playerKey)) continue
    rows.push({
      playerKey: r.playerKey,
      name: namesByKey[r.playerKey] ?? r.playerKey,
      position: r.position,
      proTeam: teamsByKey[r.playerKey],
      /* `value` is the ordering quantity and `projected` is the player's own points, which is
         the same split the football board uses — so a points column stays meaningful when a
         custom ranking list re-seats the order. */
      value: r.vor,
      projected: r.points,
    })
  }
  rows.sort((a, b) => b.value - a.value)

  return { rows, replacement, unnamedScoredStatIds: rules.unnamedScoredStatIds }
}
