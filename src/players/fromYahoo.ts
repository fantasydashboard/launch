import type { AvailablePlayer } from './types'

export function normalizeFreeAgent(raw: any): AvailablePlayer {
  return {
    playerKey: String(raw.player_key ?? raw.player_id ?? ''),
    name: String(raw.full_name ?? ''),
    position: String(raw.position ?? ''),
    team: String(raw.mlb_team ?? ''),
    headshot: raw.headshot ? String(raw.headshot) : undefined,
    percentOwned: typeof raw.percent_owned === 'number' ? raw.percent_owned : 0,
    status: raw.status ? String(raw.status) : '',
    stats: raw.stats && typeof raw.stats === 'object' ? { ...raw.stats } : {},
  }
}
