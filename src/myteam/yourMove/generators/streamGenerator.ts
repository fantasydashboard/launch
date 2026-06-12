import type { AvailablePlayer } from '@/players/types'
import type { CatSpec } from '@/myteam/value'
import type { MoveCandidate } from '../types'
import { projectStarts } from '../projectRemainingWeek'
import { sideOf } from '../helpedCats'
import { lookupStarts, type ProbableStart, type WeekSchedule } from '@/services/mlbSchedule'

const isPitcher = (pos: string): boolean =>
  (pos || '')
    .split(/[,/|]/)
    .some((t) => ['SP', 'RP', 'P'].includes(t.trim().toUpperCase()))

/**
 * Propose streaming-pitcher candidates: available pitchers with confirmed probable
 * start(s), projected over their scheduled starts. Two-start weeks flagged.
 */
export function streamGenerator(
  freeAgents: AvailablePlayer[],
  startsByPitcher: Record<string, ProbableStart[]>,
  cats: CatSpec[],
  seasonFraction = 0.6,
  // Per-player FanGraphs rest-of-season stats, keyed by playerKey (see addGenerator).
  fgStatsByKey: Record<string, Record<string, number> | null> = {},
): MoveCandidate[] {
  const out: MoveCandidate[] = []
  const schedule: WeekSchedule = { gamesByTeam: {}, startsByPitcher }
  for (const fa of freeAgents) {
    if (!isPitcher(fa.position)) continue
    const starts = lookupStarts(schedule, fa.name)
    if (starts.length === 0) continue
    const twoStart = starts.length >= 2
    const opp = starts.map((s) => s.opponentAbbr).filter(Boolean).join(', ')
    out.push({
      kind: 'stream',
      player: { key: fa.playerKey, name: fa.name, team: fa.team ?? '', position: fa.position ?? '' },
      side: sideOf(fa.position ?? ''),
      addDelta: projectStarts(fa.stats, fgStatsByKey[fa.playerKey] ?? null, cats, starts.length, seasonFraction),
      detail: twoStart ? `Two-start week${opp ? ` vs ${opp}` : ''}` : `Spot start${opp ? ` vs ${opp}` : ''}`,
    })
  }
  return out
}
