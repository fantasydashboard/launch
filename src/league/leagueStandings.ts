import type { PowerRow, LuckStatus } from './powerRankings'

export type StakesTag = 'clinched' | 'eliminated' | 'bubble'

export interface StandingRow {
  teamKey: string
  teamName: string
  teamLogo?: string
  isMe: boolean
  wins: number
  losses: number
  ties: number
  recordRank: number
  talentRank: number // strengthRank — the Power Rankings connector
  luck: LuckStatus
  stakes: StakesTag | null
  strength: number // raw roster strength (pts/wk or cats/wk) for the talent bar
}

/** Standings-ordered view (by record) of the power-ranking rows, with the playoff-stakes
 *  tag and the talent-rank/luck connector to Power Rankings. */
export function buildLeagueStandings(
  rows: PowerRow[],
  stakes: Map<string, StakesTag>,
  myTeamKey: string,
): StandingRow[] {
  return [...rows]
    .sort((a, b) => a.recordRank - b.recordRank)
    .map((r) => ({
      teamKey: r.teamKey,
      teamName: r.teamName,
      teamLogo: r.teamLogo,
      isMe: r.teamKey === myTeamKey,
      wins: r.wins,
      losses: r.losses,
      ties: r.ties,
      recordRank: r.recordRank,
      talentRank: r.strengthRank,
      luck: r.luck,
      stakes: stakes.get(r.teamKey) ?? null,
      strength: r.strength,
    }))
}
