/**
 * Pure reducer: organize already-scored daily plays + detected open slots into the Today
 * board view-model. Selection only — the composable does the fetching/scoring. Deterministic.
 */
import type { OpenSlot } from './openSlots'

export type PlayKind = 'stream' | 'add' | 'startSit'

export interface ScoredPlay {
  kind: PlayKind
  playerKey: string
  name: string
  team: string
  position: string
  value: number // scoreToday value
  bucket: number // 0..6 matchup bar
  detail: string // e.g. "vs COL"
  oneDay: boolean // pure stream / one-day play → "drop tomorrow"
  fillsSlot?: string // the open slot this play is eligible to fill, if any
}

export interface FilledSlot extends OpenSlot {
  fill?: ScoredPlay // best play to plug this slot (bench-first handled upstream via value/kind)
}

export interface TodayBoard {
  hero: ScoredPlay | null
  openSlots: FilledSlot[]
  streamers: ScoredPlay[]
  upgrades: ScoredPlay[]
  sitAlerts: ScoredPlay[]
}

export function buildTodayBoard(plays: ScoredPlay[], openSlots: OpenSlot[]): TodayBoard {
  const byValue = [...plays].sort((a, b) => b.value - a.value)

  // Each open slot gets the highest-value play eligible to fill it.
  const filled: FilledSlot[] = openSlots.map((slot) => ({
    ...slot,
    fill: byValue.find((p) => p.fillsSlot === slot.slot),
  }))

  const streamers = byValue.filter((p) => p.kind === 'stream')
  // Upgrades = non-stream adds/startSits that DON'T fill an open slot (i.e. improve a filled slot).
  const filledSlotSet = new Set(openSlots.map((s) => s.slot))
  const upgrades = byValue.filter((p) => p.kind !== 'stream' && (!p.fillsSlot || !filledSlotSet.has(p.fillsSlot)))

  return {
    hero: byValue[0] ?? null,
    openSlots: filled,
    streamers,
    upgrades,
    sitAlerts: [], // populated by the composable when a rostered starter has a poor today spot
  }
}
