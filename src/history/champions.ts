/**
 * Pure builder: the title roll. One row per season (newest first).
 *
 * Champion = the team flagged `champion:true` (playoff winner where the platform
 * derives it), else final-standings rank 1 as a fallback. Runner-up = rank 2.
 * Regular-season leader = the team with the most pointsFor (the "best record on
 * paper"), surfaced only when it differs from the champion — the classic
 * "best team didn't win it" callout.
 *
 * Deterministic + side-effect-free; unit-tested in __tests__/champions.test.ts.
 */
import type { HistorySeason, HistoryTeam } from './types'

export interface ChampionRow {
  season: number
  championKey: string
  championName: string
  championLogo?: string
  runnerUpName?: string
  regularLeaderName?: string
}

function pickChampion(teams: HistoryTeam[]): HistoryTeam | undefined {
  if (!teams.length) return undefined
  const flagged = teams.find((t) => t.champion)
  if (flagged) return flagged
  // Fallback: best (lowest) rank. Rank 0/missing sorts last.
  return [...teams].sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity))[0]
}

function pickByRank(teams: HistoryTeam[], rank: number): HistoryTeam | undefined {
  return teams.find((t) => t.rank === rank)
}

function pickRegularLeader(teams: HistoryTeam[]): HistoryTeam | undefined {
  if (!teams.length) return undefined
  // Best pointsFor; if no points recorded at all, fall back to rank 1.
  const anyPoints = teams.some((t) => t.pointsFor > 0)
  if (!anyPoints) return pickByRank(teams, 1)
  return [...teams].sort((a, b) => b.pointsFor - a.pointsFor)[0]
}

export function buildChampions(seasons: HistorySeason[]): ChampionRow[] {
  return [...seasons]
    .sort((a, b) => b.season - a.season)
    .map((s) => {
      const champ = pickChampion(s.teams)
      if (!champ) return null
      const runnerUp = pickByRank(s.teams, 2)
      const regularLeader = pickRegularLeader(s.teams)
      const row: ChampionRow = {
        season: s.season,
        championKey: champ.teamKey,
        championName: champ.teamName,
        championLogo: champ.teamLogo,
        runnerUpName: runnerUp?.teamName,
        regularLeaderName:
          regularLeader && regularLeader.teamKey !== champ.teamKey
            ? regularLeader.teamName
            : undefined,
      }
      return row
    })
    .filter((r): r is ChampionRow => r != null)
}
