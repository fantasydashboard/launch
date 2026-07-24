/**
 * Pure reducer: organize already-scored daily plays + detected open slots into the Today
 * board view-model. Selection only — the composable does the fetching/scoring. Deterministic.
 */
import type { OpenSlot } from './openSlots'
import type { SafeDrop } from './safeDrop'

export type PlayKind = 'stream' | 'add' | 'startSit'

export interface ScoredPlay {
  kind: PlayKind
  playerKey: string
  name: string
  team: string
  position: string
  side: 'hit' | 'pit'
  value: number // raw within-side single-game value (park/SP-adjusted)
  score: number // 0..100 normalized (percentile within side) — the number the UI shows and sorts by
  barPct?: number // 0..100 bar fill; when unset the view falls back to `score` (category)
  budgetTag?: 'worth-add' | 'save-add' | 'worth-bid' // set by annotateAddBudget for FA add-moves
  bucket: number // 0..6 matchup bar (legacy; the view now bars off `score`)
  detail: string // e.g. "vs COL"
  oneDay: boolean // pure stream / one-day play → "drop tomorrow"
  fillsSlot?: string // the open slot this play is eligible to fill, if any
  helpsCats: string[] // category labels this move helps (positive addDelta), for chips
  drop?: SafeDrop // the safe body to cut for this free-agent add (stream/add only)
  noCleanDrop?: boolean // an FA add with no expendable body to cut → "no clean drop"
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
  const byValue = [...plays].sort((a, b) => b.score - a.score)

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
