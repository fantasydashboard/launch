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
export type BoardSort = 'record' | 'allplay' | 'talent'

export const BOARD_SORTS: { key: BoardSort; label: string; hint: string }[] = [
  /*
   * Standings and Rankings, because that is what a fantasy manager already calls them.
   *
   * The labels were Record / Résumé / Talent, three words for what a reader experiences as
   * two familiar things plus one they have never met. "Standings" is what happened and
   * "Rankings" is who is actually good — the distinction every sport already makes, and the
   * one this toggle was trying to invent a vocabulary for.
   *
   * Résumé is gone as a sort. It was 65% all-play blended with 35% actual record, which is a
   * defensible number and an indefensible thing to put on a button: the reader cannot hold a
   * blend, and the two ingredients are each clearer alone. All-play is one idea, it is the one
   * people ask for by name, and buildPowerRankings already computes its rank.
   */
  { key: 'record', label: 'Standings', hint: "what you've banked" },
  { key: 'talent', label: 'Rankings', hint: 'the roster you own from here' },
  { key: 'allplay', label: 'All-play', hint: "your record if you'd played every team, every week" },
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
  sort === 'talent' ? r.strengthRank : sort === 'allplay' ? r.allPlayRank : r.recordRank

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
