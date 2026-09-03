import type { PowerRow, LuckStatus, Tier } from './powerRankings'

export type StakesTag = 'clinched' | 'eliminated' | 'bubble'

/**
 * How to order the board.
 *
 * These are not three tables. They are the same teams sorted three ways, which is the whole
 * reason League and Power Rankings kept duplicating each other: one ordered by record and
 * annotated the talent, the other ordered by talent and annotated the record, and neither
 * held a row the other did not. A sort control says that outright.
 *
 *   record  what the standings say — what you have banked
 *   resume  what you have actually done, mostly schedule-adjusted
 *   talent  what you own, going forward
 */
export type BoardSort = 'record' | 'resume' | 'talent'

export const BOARD_SORTS: { key: BoardSort; label: string; hint: string }[] = [
  { key: 'record', label: 'Record', hint: 'the standings — what you have banked' },
  { key: 'resume', label: 'Résumé', hint: 'the season you have had — mostly all-play' },
  { key: 'talent', label: 'Talent', hint: 'the roster you own, going forward' },
]

export interface StandingRow {
  teamKey: string
  teamName: string
  teamLogo?: string
  isMe: boolean
  wins: number
  losses: number
  ties: number
  recordRank: number
  talentRank: number // strengthRank
  resumeRank: number
  allPlayRank: number
  /** luckDelta split: what you did with the roster, and who the schedule handed you. */
  executionDelta: number
  scheduleDelta: number
  luck: LuckStatus
  tier: Tier
  managerless: boolean
  stakes: StakesTag | null
  strength: number // raw roster strength (pts/wk or cats/wk) for the talent bar
  /** The rank this row is currently sorted by — what the left column prints. */
  rank: number
}

const rankFor = (r: PowerRow, sort: BoardSort): number =>
  sort === 'talent' ? r.strengthRank : sort === 'resume' ? r.resumeRank : r.recordRank

/**
 * One ordered view of the power-ranking rows, carrying the playoff-stakes tag and every
 * rank the board can be read by — so switching the sort never has to refetch or rebuild.
 */
export function buildLeagueStandings(
  rows: PowerRow[],
  stakes: Map<string, StakesTag>,
  myTeamKey: string,
  sort: BoardSort = 'record',
): StandingRow[] {
  return [...rows]
    .sort((a, b) => rankFor(a, sort) - rankFor(b, sort) || a.recordRank - b.recordRank)
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
      resumeRank: r.resumeRank,
      allPlayRank: r.allPlayRank,
      executionDelta: r.executionDelta,
      scheduleDelta: r.scheduleDelta,
      luck: r.luck,
      tier: r.tier,
      managerless: r.managerless,
      stakes: stakes.get(r.teamKey) ?? null,
      strength: r.strength,
      rank: rankFor(r, sort),
    }))
}
