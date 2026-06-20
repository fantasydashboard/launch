import type { AvailablePlayer } from '@/players/types'
import type { Sport } from '@/types/supabase'
import { espnHeadshotUrl, espnEligible, type EspnPlayerLike } from './mapRosters'

/** Map ESPN free agents into the AvailablePlayer shape rankAddsForHoles consumes. */
export function mapEspnFreeAgents(
  freeAgents: (EspnPlayerLike & { percentOwned?: number; percentChange?: number })[],
  sport: Sport,
): AvailablePlayer[] {
  return freeAgents.map((p) => ({
    playerKey: String(p.playerId),
    name: p.fullName ?? '',
    position: p.position ?? '',
    eligiblePositions: espnEligible(p),
    team: p.proTeam ?? '',
    headshot: espnHeadshotUrl(p.playerId, sport),
    percentOwned: typeof p.percentOwned === 'number' ? p.percentOwned : 0,
    percentChange: typeof p.percentChange === 'number' ? p.percentChange : 0,
    status: p.injuryStatus && p.injuryStatus !== 'ACTIVE' ? p.injuryStatus : '',
    stats: p.stats && typeof p.stats === 'object' ? { ...p.stats } : {},
  }))
}
