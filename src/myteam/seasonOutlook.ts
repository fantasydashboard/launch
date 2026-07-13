import { simulatePlayoffOdds, type OddsTeam, type ScheduleWeek } from '@/league/playoffOdds'
import { luckVerdict, type LuckVerdict, type StandingState } from './luckVerdict'
import type { TeamStanding } from './pointsTeam'

export interface OutlookTeamMeta {
  wins: number
  losses: number
  ties: number
  pointsFor: number
}

export interface SeasonOutlook {
  record: { wins: number; losses: number; ties: number }
  recordRank: number // 1 = best by win% (tiebreak pointsFor)
  leagueSize: number
  talentRank: number // rest-of-season per-week points rank (from buildPointsTeam.myLineupRank)
  projSeed: number | null // avg finishing seed from the sim (null until schedule known)
  playoffPct: number | null // 0..1 (null until schedule known)
  playoffSpots: number
  weeksLeft: number
  standingState: StandingState
  reasoning: string // honest one-liner for the badge sub-line ('' when not ready)
  luck: LuckVerdict
  ready: boolean // seed/odds/state available (remaining schedule present)
}

function winPct(m: OutlookTeamMeta): number {
  const g = m.wins + m.losses + m.ties
  return g > 0 ? (m.wins + 0.5 * m.ties) / g : 0
}

function standingStateOf(playoffPct: number): StandingState {
  if (playoffPct >= 0.99) return 'clinched'
  if (playoffPct <= 0.01) return 'eliminated'
  if (playoffPct >= 0.75) return 'in'
  if (playoffPct <= 0.25) return 'chasing'
  return 'bubble'
}

function reasoningOf(state: StandingState, weeksLeft: number, playoffSpots: number, playoffPct: number): string {
  const pct = Math.round(playoffPct * 100)
  switch (state) {
    case 'clinched': return `Locked into the top ${playoffSpots} with ${weeksLeft} to play.`
    case 'eliminated': return `Out of the top ${playoffSpots} with only ${weeksLeft} left — out of reach.`
    case 'in': return `Inside the cut — ${pct}% to hold a top-${playoffSpots} spot.`
    case 'chasing': return `Outside the top ${playoffSpots} — ${pct}% to climb in with ${weeksLeft} left.`
    case 'bubble': return `On the bubble — ${pct}% to make the top ${playoffSpots}, ${weeksLeft} to play.`
    default: return ''
  }
}

/**
 * Assemble the season outlook for one team from league records + a per-week points model + the
 * remaining schedule. recordRank + seeding use win% (tiebreak pointsFor), matching
 * simulatePlayoffOdds. When the schedule is unknown (pre-season / off-week), ready=false and the
 * seed/odds/state are withheld rather than invented; the luck stance still resolves from the ranks.
 */
export function buildSeasonOutlook(input: {
  myTeamKey: string
  teamMeta: Record<string, OutlookTeamMeta>
  standings: TeamStanding[]
  talentRank: number
  schedule: ScheduleWeek[]
  weeksLeft: number
  playoffSpots: number
  sims?: number
  rng?: () => number
}): SeasonOutlook {
  const { myTeamKey, teamMeta, standings, talentRank, schedule, weeksLeft, playoffSpots } = input
  const keys = Object.keys(teamMeta)
  const leagueSize = keys.length
  const meRec = teamMeta[myTeamKey] ?? { wins: 0, losses: 0, ties: 0, pointsFor: 0 }

  const ranked = [...keys].sort(
    (a, b) =>
      winPct(teamMeta[b]) - winPct(teamMeta[a]) ||
      teamMeta[b].pointsFor - teamMeta[a].pointsFor ||
      (a < b ? -1 : 1),
  )
  const recordRank = (ranked.indexOf(myTeamKey) + 1) || leagueSize

  const strengthByKey = new Map(standings.map((s) => [s.teamKey, s.startingPoints]))
  const ready = schedule.length > 0 && weeksLeft > 0 && playoffSpots > 0

  let projSeed: number | null = null
  let playoffPct: number | null = null
  let standingState: StandingState = 'unknown'
  let reasoning = ''

  if (ready) {
    const oddsTeams: OddsTeam[] = keys.map((k) => ({
      teamKey: k,
      strength: strengthByKey.get(k) ?? 0,
      wins: teamMeta[k].wins,
      losses: teamMeta[k].losses,
      ties: teamMeta[k].ties,
      pointsFor: teamMeta[k].pointsFor,
    }))
    const out = simulatePlayoffOdds(oddsTeams, schedule, {
      playoffSpots,
      sims: input.sims ?? 5000,
      rng: input.rng,
    })
    const mine = out.results.find((r) => r.teamKey === myTeamKey)
    projSeed = mine ? Math.round(mine.avgSeed) : null
    playoffPct = mine ? mine.playoffPct : null
    if (playoffPct != null) {
      standingState = standingStateOf(playoffPct)
      reasoning = reasoningOf(standingState, weeksLeft, playoffSpots, playoffPct)
    }
  }

  const luck = luckVerdict({ recordRank, talentRank, leagueSize, standingState })

  return {
    record: { wins: meRec.wins, losses: meRec.losses, ties: meRec.ties },
    recordRank,
    leagueSize,
    talentRank,
    projSeed,
    playoffPct,
    playoffSpots,
    weeksLeft,
    standingState,
    reasoning,
    luck,
    ready,
  }
}
