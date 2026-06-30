/**
 * Pure builder: the all-time franchise pecking order ("best franchise in league
 * history"). Groups every team by its cross-season identity key and sums a fixed-
 * weight dynasty score across every season the team appears in.
 *
 * Weights (fixed, no customization), per season, in priority order:
 *   champion (title) .......... +100
 *   runner-up (reached final) .  +50
 *   regular-season title ......  +35   (best win% that season — the #1 seed)
 *   semifinal (rank === 3) ....  +25   (a deep playoff run)
 *   made playoffs .............  +20
 *   top-half finish ..........  +10   (rank > 0 && rank <= ceil(numTeams/2))
 *   season strength ..........  + round(winPct * 30)   winPct = (W + 0.5T)/games
 *   longevity ................   +5   per season played
 *   last place ...............  −15   (rank > 0 && rank === numTeams)
 *
 * Note: true per-round playoff WINS aren't available (no bracket data), so the
 * champion / runner-up / semifinal / made-playoffs ladder stands in for playoff success.
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
  regSeasonTitles: number
  playoffApps: number
  seasonsPlayed: number
  isMe: boolean
}

/** The regular-season #1 of a season = the best win% (min 1 game). Tiebreak: more wins,
 *  then more pointsFor, then teamKey — deterministic, single winner per season. */
function regSeasonTitleKey(teams: HistorySeason['teams']): string | null {
  let best: { key: string; pct: number; wins: number; pf: number } | null = null
  for (const t of teams) {
    const games = t.wins + t.losses + t.ties
    if (games < 1) continue
    const pct = (t.wins + 0.5 * t.ties) / games
    if (
      !best ||
      pct > best.pct ||
      (pct === best.pct && t.wins > best.wins) ||
      (pct === best.pct && t.wins === best.wins && t.pointsFor > best.pf) ||
      (pct === best.pct && t.wins === best.wins && t.pointsFor === best.pf && t.teamKey < best.key)
    ) {
      best = { key: t.teamKey, pct, wins: t.wins, pf: t.pointsFor }
    }
  }
  return best?.key ?? null
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
    regSeasonTitles: number
    playoffApps: number
    seasonsPlayed: number
  }
  const byKey = new Map<string, Acc>()

  // Newest-first so the first-seen name/logo is the most recent.
  const ordered = [...seasons].sort((a, b) => b.season - a.season)
  for (const s of ordered) {
    const numTeams = s.teams.length
    const topHalfCutoff = Math.ceil(numTeams / 2)
    const regTitleKey = regSeasonTitleKey(s.teams)
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
          regSeasonTitles: 0,
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
        pts += 50
        acc.runnerUps += 1
      }
      if (t.teamKey === regTitleKey) {
        pts += 35
        acc.regSeasonTitles += 1
      }
      if (t.rank === 3) pts += 25
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
    regSeasonTitles: a.regSeasonTitles,
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
