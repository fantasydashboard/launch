/**
 * Pure builder: the all-time franchise pecking order ("best franchise in league
 * history"). Groups every team by its cross-season identity key and sums a fixed-
 * weight dynasty score across every season the team appears in.
 *
 * Weights (fixed, no customization), per season:
 *   champion .................. +100
 *   runner-up (rank === 2) ....  +40
 *   third place (rank === 3) ..  +20
 *   made playoffs .............  +20
 *   top-half finish ..........  +10   (rank > 0 && rank <= ceil(numTeams/2))
 *   last place ...............  −15   (rank > 0 && rank === numTeams)
 *   season strength ..........  + round(winPct * 30)   winPct = (W + 0.5T)/games
 *   longevity ................   +5   per season played
 *
 * numTeams = that season's teams.length. Sorted by score desc, tiebreak titles
 * desc then teamKey. Latest name/logo (newest-first), like allTimeStandings.
 *
 * Deterministic + side-effect-free; unit-tested in __tests__/dynastyRankings.test.ts.
 */
import type { HistorySeason } from './types'

export interface DynastyRow {
  teamKey: string
  teamName: string
  teamLogo?: string
  score: number
  titles: number
  runnerUps: number
  playoffApps: number
  seasonsPlayed: number
  isMe: boolean
}

export function buildDynastyRankings(
  seasons: HistorySeason[],
  myTeamKey: string,
): DynastyRow[] {
  interface Acc {
    teamKey: string
    teamName: string
    teamLogo?: string
    latestSeason: number
    score: number
    titles: number
    runnerUps: number
    playoffApps: number
    seasonsPlayed: number
  }
  const byKey = new Map<string, Acc>()

  // Newest-first so the first-seen name/logo is the most recent.
  const ordered = [...seasons].sort((a, b) => b.season - a.season)
  for (const s of ordered) {
    const numTeams = s.teams.length
    const topHalfCutoff = Math.ceil(numTeams / 2)
    for (const t of s.teams) {
      let acc = byKey.get(t.teamKey)
      if (!acc) {
        acc = {
          teamKey: t.teamKey,
          teamName: t.teamName,
          teamLogo: t.teamLogo,
          latestSeason: s.season,
          score: 0,
          titles: 0,
          runnerUps: 0,
          playoffApps: 0,
          seasonsPlayed: 0,
        }
        byKey.set(t.teamKey, acc)
      }
      if (s.season >= acc.latestSeason) {
        acc.latestSeason = s.season
        acc.teamName = t.teamName
        if (t.teamLogo) acc.teamLogo = t.teamLogo
      }

      let pts = 0
      if (t.champion) {
        pts += 100
        acc.titles += 1
      }
      if (t.rank === 2) {
        pts += 40
        acc.runnerUps += 1
      }
      if (t.rank === 3) pts += 20
      if (t.madePlayoffs) {
        pts += 20
        acc.playoffApps += 1
      }
      if (t.rank > 0 && t.rank <= topHalfCutoff) pts += 10
      if (t.rank > 0 && t.rank === numTeams) pts -= 15

      const games = t.wins + t.losses + t.ties
      const winPct = games > 0 ? (t.wins + 0.5 * t.ties) / games : 0
      pts += Math.round(winPct * 30)

      pts += 5 // longevity
      acc.seasonsPlayed += 1

      acc.score += pts
    }
  }

  const rows: DynastyRow[] = [...byKey.values()].map((a) => ({
    teamKey: a.teamKey,
    teamName: a.teamName,
    teamLogo: a.teamLogo,
    score: a.score,
    titles: a.titles,
    runnerUps: a.runnerUps,
    playoffApps: a.playoffApps,
    seasonsPlayed: a.seasonsPlayed,
    isMe: !!myTeamKey && a.teamKey === myTeamKey,
  }))

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.titles !== a.titles) return b.titles - a.titles
    return a.teamKey < b.teamKey ? -1 : a.teamKey > b.teamKey ? 1 : 0
  })
  return rows
}
