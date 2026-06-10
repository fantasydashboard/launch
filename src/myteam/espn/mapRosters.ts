import type { PoolPlayer, RosterPlayer } from '@/composables/useMyRoster'
import type { Sport } from '@/types/supabase'

/** The subset of EspnPlayer the roster mappers read. */
export interface EspnPlayerLike {
  playerId: number
  fullName: string
  proTeam: string
  position: string
  injuryStatus?: string
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

/** Flatten every team's roster into the league-wide percentile pool. */
export function mapRostersToPool(teams: EspnTeamRosterLike[]): PoolPlayer[] {
  return teams.flatMap((t) =>
    (t.roster ?? []).map((p) => ({
      playerKey: String(p.playerId),
      position: p.position ?? '',
      stats: p.stats && typeof p.stats === 'object' ? { ...p.stats } : {},
    })),
  )
}

/** Map one team's roster to the RosterPlayer rows the roster panel renders. */
export function mapRosterToPlayers(team: EspnTeamRosterLike, sport: Sport): RosterPlayer[] {
  return (team.roster ?? []).map((p) => ({
    playerKey: String(p.playerId),
    name: p.fullName ?? '',
    position: p.position ?? '',
    team: p.proTeam ?? '',
    headshot: espnHeadshotUrl(p.playerId, sport),
    status: p.injuryStatus && p.injuryStatus !== 'ACTIVE' ? p.injuryStatus : '',
    totalPoints: typeof p.actualPoints === 'number' ? p.actualPoints : 0,
    stats: p.stats && typeof p.stats === 'object' ? { ...p.stats } : {},
  }))
}
