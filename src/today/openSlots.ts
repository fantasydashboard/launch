/**
 * Detect a manager's OPEN active lineup slots for today — the holes that cost games right
 * now: an empty slot, a starter whose team has no game today, or an injured/out starter.
 * Injury detection here also closes the app's injury-blindness gap (IL/DTD were invisible).
 */
import type { WeekSchedule } from '@/services/mlbSchedule'
import { teamAbbrVariants } from '@/services/mlbSchedule'

export interface LineupSlot {
  slot: string // active slot label, e.g. 'C', 'OF', 'SP', 'UTIL'
  playerKey: string // '' when the slot is empty
  name: string
  team: string
  position: string // eligibility of the current occupant
  status?: string // injury/IL string; '' or undefined = healthy
}

export type OpenReason = 'empty' | 'off-day' | 'injured'

export interface OpenSlot {
  slot: string
  reason: OpenReason
  vacating?: { playerKey: string; name: string; position: string } // the absent starter, if any
}

const INJURED = /IL|DTD|OUT|NA|SUSP/i

function playsToday(team: string, schedule: WeekSchedule): boolean {
  return teamAbbrVariants(team).some((v) => (schedule.gamesByTeam[v] ?? 0) > 0)
}

export function findOpenSlots(lineup: LineupSlot[], schedule: WeekSchedule): OpenSlot[] {
  const out: OpenSlot[] = []
  for (const s of lineup) {
    let reason: OpenReason | null = null
    if (!s.playerKey) reason = 'empty'
    else if (s.status && INJURED.test(s.status)) reason = 'injured'
    else if (!playsToday(s.team, schedule)) reason = 'off-day'
    if (!reason) continue
    out.push({
      slot: s.slot,
      reason,
      vacating: s.playerKey ? { playerKey: s.playerKey, name: s.name, position: s.position } : undefined,
    })
  }
  return out
}
