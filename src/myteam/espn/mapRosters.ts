import type { PoolPlayer, RosterPlayer } from '@/composables/useMyRoster'
import type { Sport } from '@/types/supabase'
import { isEspnIL } from '@/wire/injury'

/** The subset of EspnPlayer the roster mappers read. */
export interface EspnPlayerLike {
  playerId: number
  fullName: string
  proTeam: string
  position: string
  started?: boolean
  eligiblePositions?: string[]
  injuryStatus?: string
  lineupSlot?: string // 'IL' / 'IL+' / 'BE' / a position — reserve-slot signal
  actualPoints?: number
  stats: Record<string, number>
}

/** The subset of EspnTeam the roster mappers read. */
export interface EspnTeamRosterLike {
  id: number
  name: string
  roster?: EspnPlayerLike[]
}

const ESPN_SPORT_PATH: Record<Sport, string> = {
  football: 'nfl',
  baseball: 'mlb',
  basketball: 'nba',
  hockey: 'nhl',
}

/** ESPN CDN headshot URL for a player id, sport-aware. */
export function espnHeadshotUrl(playerId: number, sport: Sport): string {
  const path = ESPN_SPORT_PATH[sport] ?? 'mlb'
  return `https://a.espncdn.com/i/headshots/${path}/players/full/${playerId}.png`
}

// Multi-position eligibility from eligibleSlots (parsed upstream), falling back to
// the single default position when absent.
export function espnEligible(p: EspnPlayerLike): string[] {
  if (p.eligiblePositions && p.eligiblePositions.length) return p.eligiblePositions
  return p.position ? [p.position] : []
}

/** Flatten every team's roster into the league-wide percentile pool. teamKey/name let
 *  league-wide consumers (Trades) group the pool by team and label players, keyed
 *  `espn_<id>` to match the standings/myTeamId keys. `sport` (when given) adds headshots. */
export function mapRostersToPool(teams: EspnTeamRosterLike[], sport?: Sport): PoolPlayer[] {
  return teams.flatMap((t) =>
    (t.roster ?? []).map((p) => ({
      playerKey: String(p.playerId),
      name: p.fullName ?? '',
      position: p.position ?? '',
      eligiblePositions: espnEligible(p),
      stats: p.stats && typeof p.stats === 'object' ? { ...p.stats } : {},
      teamKey: `espn_${t.id}`,
      headshot: sport ? espnHeadshotUrl(p.playerId, sport) : undefined,
      proTeam: p.proTeam || undefined,
      onIL: isEspnIL(p.lineupSlot),
      status: p.injuryStatus && p.injuryStatus !== 'ACTIVE' ? p.injuryStatus : '',
    })),
  )
}

/** Map one team's roster to the RosterPlayer rows the roster panel renders. */
export function mapRosterToPlayers(team: EspnTeamRosterLike, sport: Sport): RosterPlayer[] {
  return (team.roster ?? []).map((p) => ({
    playerKey: String(p.playerId),
    name: p.fullName ?? '',
    position: p.position ?? '',
    eligiblePositions: espnEligible(p),
    team: p.proTeam ?? '',
    headshot: espnHeadshotUrl(p.playerId, sport),
    status: p.injuryStatus && p.injuryStatus !== 'ACTIVE' ? p.injuryStatus : '',
    totalPoints: typeof p.actualPoints === 'number' ? p.actualPoints : 0,
    stats: p.stats && typeof p.stats === 'object' ? { ...p.stats } : {},
    started: p.started,
  }))
}
