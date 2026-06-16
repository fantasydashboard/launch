import { lookupStarts, type WeekSchedule } from '@/services/mlbSchedule'

export interface VolPlayer {
  name: string
  teamAbbr: string // MLB team abbreviation
  isPitcher: boolean
}
export interface VolumeEdge {
  myGames: number
  myStarts: number
  oppGames: number
  oppStarts: number
  read: string // one-line "the volume is on your side / it's even / they out-volume you"
}

function tally(players: VolPlayer[], schedule: WeekSchedule): { games: number; starts: number } {
  let games = 0
  let starts = 0
  for (const p of players) {
    if (p.isPitcher) starts += lookupStarts(schedule, p.name).length
    else games += schedule.gamesByTeam[p.teamAbbr] ?? 0
  }
  return { games, starts }
}

/**
 * Counting-stat volume left this week. Hitter-games come from each player's MLB team schedule;
 * pitcher starts from the probable-starter list. The read is a one-liner on who has more bites at
 * the apple in the counting cats. Pure given a schedule + the two rosters; an unknown team is 0.
 */
export function volumeEdge(mine: VolPlayer[], opp: VolPlayer[], schedule: WeekSchedule): VolumeEdge {
  const m = tally(mine, schedule)
  const o = tally(opp, schedule)
  const diff = m.games - o.games
  const read =
    diff >= 3 ? `The volume is on your side — push the counting cats.`
      : diff <= -3 ? `They out-game you this week — your counting cats are at risk; lean on rate stats.`
        : `Volume's about even — the counting cats are a true coin-flip.`
  return { myGames: m.games, myStarts: m.starts, oppGames: o.games, oppStarts: o.starts, read }
}
