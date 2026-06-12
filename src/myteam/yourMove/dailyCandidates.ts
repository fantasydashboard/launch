import type { AvailablePlayer } from '@/players/types'
import type { CatSpec } from '@/myteam/value'
import type { MoveCandidate } from './types'
import type { WeekSchedule } from '@/services/mlbSchedule'
import { lookupStarts } from '@/services/mlbSchedule'
import { projectGames, projectStarts } from './projectRemainingWeek'
import { sideOf } from './helpedCats'
import type { BenchPlayer } from './generators/startSitGenerator'

/**
 * Today's daily-league move candidates, projected over a single day:
 * - free-agent starters with a probable start TODAY (one-start projection),
 * - free-agent hitters whose team plays today (one-game projection),
 * - benched roster hitters whose team plays today (one-game projection).
 * buildMoves nets each against the player's today-only cost.
 */
export function dailyCandidates(
  freeAgents: AvailablePlayer[],
  benched: BenchPlayer[],
  today: WeekSchedule,
  cats: CatSpec[],
  seasonFraction = 0.6,
): MoveCandidate[] {
  const playsToday = (team: string) => (today.gamesByTeam[team] ?? 0) > 0
  const out: MoveCandidate[] = []

  for (const fa of freeAgents) {
    const side = sideOf(fa.position ?? '')
    if (side === 'pit') {
      const starts = lookupStarts(today, fa.name)
      if (starts.length === 0) continue
      out.push({
        kind: 'stream',
        player: { key: fa.playerKey, name: fa.name, team: fa.team ?? '', position: fa.position ?? '' },
        side,
        addDelta: projectStarts(fa.stats, null, cats, starts.length, seasonFraction),
        detail: `Starts today${starts[0]?.opponentAbbr ? ` vs ${starts[0].opponentAbbr}` : ''}`,
      })
    } else if (playsToday(fa.team ?? '')) {
      out.push({
        kind: 'add',
        player: { key: fa.playerKey, name: fa.name, team: fa.team ?? '', position: fa.position ?? '' },
        side,
        addDelta: projectGames(fa.stats, null, cats, 1, seasonFraction),
        detail: 'Plays today',
      })
    }
  }

  for (const p of benched) {
    if (sideOf(p.position) !== 'hit' || !playsToday(p.team)) continue
    out.push({
      kind: 'startSit',
      player: { key: p.playerKey, name: p.name, team: p.team, position: p.position },
      side: 'hit',
      addDelta: projectGames(p.stats, null, cats, 1, seasonFraction),
      detail: 'On your bench, plays today',
    })
  }

  return out
}
