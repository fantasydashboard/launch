/**
 * Pure builder: the all-time "GOAT race". Groups every team by its cross-season
 * identity key and accumulates a career line across all visible seasons.
 *
 * Sorted by titles desc, then win% desc (the natural bragging-rights order).
 * `isMe` marks the user's row for highlighting. Latest name/logo come from the
 * most recent season the team appears in.
 *
 * Deterministic + side-effect-free; unit-tested in __tests__/allTimeStandings.test.ts.
 */
import type { HistorySeason } from './types'

export interface AllTimeRow {
  teamKey: string
  teamName: string
  teamLogo?: string
  wins: number
  losses: number
  ties: number
  winPct: number
  titles: number
  playoffAppearances: number
  seasonsPlayed: number
  isMe: boolean
}

export function buildAllTimeStandings(
  seasons: HistorySeason[],
  myTeamKey: string,
): AllTimeRow[] {
  interface Acc {
    teamKey: string
    teamName: string
    teamLogo?: string
    latestSeason: number
    wins: number
    losses: number
    ties: number
    titles: number
    playoffAppearances: number
    seasonsPlayed: number
  }
  const byKey = new Map<string, Acc>()

  // Process newest-first so the first-seen name/logo is the most recent.
  const ordered = [...seasons].sort((a, b) => b.season - a.season)
  for (const s of ordered) {
    for (const t of s.teams) {
      let acc = byKey.get(t.teamKey)
      if (!acc) {
        acc = {
          teamKey: t.teamKey,
          teamName: t.teamName,
          teamLogo: t.teamLogo,
          latestSeason: s.season,
          wins: 0,
          losses: 0,
          ties: 0,
          titles: 0,
          playoffAppearances: 0,
          seasonsPlayed: 0,
        }
        byKey.set(t.teamKey, acc)
      }
      // Keep the name/logo from the latest season this team appears in.
      if (s.season >= acc.latestSeason) {
        acc.latestSeason = s.season
        acc.teamName = t.teamName
        if (t.teamLogo) acc.teamLogo = t.teamLogo
      }
      acc.wins += t.wins
      acc.losses += t.losses
      acc.ties += t.ties
      if (t.champion) acc.titles += 1
      if (t.madePlayoffs) acc.playoffAppearances += 1
      acc.seasonsPlayed += 1
    }
  }

  const rows: AllTimeRow[] = [...byKey.values()].map((a) => {
    const games = a.wins + a.losses + a.ties
    const winPct = games > 0 ? (a.wins + a.ties * 0.5) / games : 0
    return {
      teamKey: a.teamKey,
      teamName: a.teamName,
      teamLogo: a.teamLogo,
      wins: a.wins,
      losses: a.losses,
      ties: a.ties,
      winPct,
      titles: a.titles,
      playoffAppearances: a.playoffAppearances,
      seasonsPlayed: a.seasonsPlayed,
      isMe: !!myTeamKey && a.teamKey === myTeamKey,
    }
  })

  rows.sort((a, b) => (b.titles !== a.titles ? b.titles - a.titles : b.winPct - a.winPct))
  return rows
}
