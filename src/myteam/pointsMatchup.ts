/**
 * The points-league Matchup brain: your week vs your opponent's. The cheat code
 * here isn't roster talent (that's My Team) — it's VOLUME. In a daily points
 * league the manager who racks up the most games played and two-start weeks
 * wins, and the native apps never surface it. This module projects each side's
 * week from the MLB schedule (games per team, probable two-start pitchers) on
 * top of the rest-of-season per-game rates.
 */
import { projectPlayerPoints } from '@/myteam/pointsValue'
import { assignSlots, type DepthPlayer } from '@/trades/positionalLandscape'
import { parseEligible, type PointsPoolPlayer } from '@/myteam/pointsTeam'
import { lookupStarts, type WeekSchedule } from '@/services/mlbSchedule'
import type { FGProjection } from '@/services/projectionService'

const PITCHER_SLOTS = new Set(['SP', 'RP', 'P', 'SP/RP', 'RP/SP'])
const isPitcherSlot = (pos: string) => PITCHER_SLOTS.has(pos.toUpperCase())

export interface TwoStartArm {
  name: string
  starts: number
}

export interface TeamWeek {
  startingPoints: number // rest-of-season optimal-lineup total (roster strength)
  weeklyHitterPoints: number // projected hitter points THIS week (rate × games)
  weeklyPitcherPoints: number // projected pitcher points THIS week (rate × appearances)
  totalWeekly: number // weeklyHitterPoints + weeklyPitcherPoints
  hitterGames: number // total hitter-games your starters play this week
  pitcherStarts: number // total probable starts from your starting pitchers
  twoStartArms: TwoStartArm[] // starters going twice this week
  openHitterSlots: number // position slots your lineup can't fill (games left on the bench)
}

export interface PointsMatchup {
  my: TeamWeek
  opp: TeamWeek
  gamesDiff: number // my hitter-games − opp's (the volume edge)
  myWinPct: number // 0..100, from the projected weekly-points margin
  volumeRead: string
}

function teamWeek(
  players: PointsPoolPlayer[],
  fgByKey: Record<string, FGProjection | null>,
  weights: Record<string, number>,
  slots: Record<string, number>,
  schedule: WeekSchedule,
): TeamWeek {
  const ptsBy = new Map(players.map((p) => [p.playerKey, projectPlayerPoints(fgByKey[p.playerKey], weights)]))
  const byKey = new Map(players.map((p) => [p.playerKey, p]))
  const dp: DepthPlayer[] = players.map((p) => ({
    playerKey: p.playerKey,
    teamKey: p.teamKey,
    eligiblePositions: parseEligible(p),
    value: ptsBy.get(p.playerKey)!.total,
    status: p.onIL ? 'IL' : '',
  }))
  const a = assignSlots(dp, slots, 0)

  let startingPoints = 0
  let weeklyHitterPoints = 0
  let weeklyPitcherPoints = 0
  let hitterGames = 0
  let pitcherStarts = 0
  const twoStartArms: TwoStartArm[] = []
  for (const [pos, keys] of Object.entries(a.assignedByPos)) {
    for (const k of keys) {
      const pl = byKey.get(k)
      const pp = ptsBy.get(k)
      if (!pl || !pp) continue
      startingPoints += pp.total
      const perGame = pp.games > 0 ? pp.total / pp.games : 0
      if (isPitcherSlot(pos)) {
        const starts = lookupStarts(schedule, pl.name).length
        pitcherStarts += starts
        if (starts >= 2) twoStartArms.push({ name: pl.name, starts })
        // Appearances this week: a probable starter pitches once per listed start;
        // a reliever (no probable start) appears in ~half his team's games. Rough,
        // but enough to give pitching a weekly point estimate (flagged in the UI).
        const teamGames = schedule.gamesByTeam[pl.proTeam ?? ''] ?? 0
        const appearances = starts > 0 ? starts : Math.round(teamGames * 0.5)
        weeklyPitcherPoints += perGame * appearances
      } else {
        const g = schedule.gamesByTeam[pl.proTeam ?? ''] ?? 0
        hitterGames += g
        weeklyHitterPoints += perGame * g
      }
    }
  }
  const openHitterSlots = a.unfilled.filter((u) => !isPitcherSlot(u.position)).length
  return {
    startingPoints,
    weeklyHitterPoints,
    weeklyPitcherPoints,
    totalWeekly: weeklyHitterPoints + weeklyPitcherPoints,
    hitterGames,
    pitcherStarts,
    twoStartArms,
    openHitterSlots,
  }
}

export function buildPointsMatchup(
  pool: PointsPoolPlayer[],
  fgByKey: Record<string, FGProjection | null>,
  weights: Record<string, number>,
  myTeamKey: string,
  oppTeamKey: string,
  slots: Record<string, number>,
  schedule: WeekSchedule,
): PointsMatchup | null {
  if (!myTeamKey || !oppTeamKey) return null
  const mine = pool.filter((p) => p.teamKey === myTeamKey)
  const theirs = pool.filter((p) => p.teamKey === oppTeamKey)
  if (!mine.length || !theirs.length) return null

  const my = teamWeek(mine, fgByKey, weights, slots, schedule)
  const opp = teamWeek(theirs, fgByKey, weights, slots, schedule)
  const gamesDiff = my.hitterGames - opp.hitterGames

  // Win probability from the projected weekly-points margin. Logistic with a
  // spread that scales to the total magnitude (bigger weeks swing more in raw
  // points but not proportionally more in outcome).
  const margin = my.totalWeekly - opp.totalWeekly
  const avg = (my.totalWeekly + opp.totalWeekly) / 2
  const scale = Math.max(12, 0.18 * avg)
  const myWinPct = Math.round((100 / (1 + Math.exp(-margin / scale))) * 10) / 10

  const volumeRead =
    gamesDiff >= 3
      ? `You out-game them by ${gamesDiff} this week — your bats get more bites at the apple.`
      : gamesDiff <= -3
        ? `They out-game you by ${-gamesDiff} this week — stream bats into your open days to keep up.`
        : `Hitter volume is about even this week — the edge is in your arms and streaming.`
  return { my, opp, gamesDiff, myWinPct, volumeRead }
}
