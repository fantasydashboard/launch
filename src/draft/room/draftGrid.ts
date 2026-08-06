/**
 * The draft board as everyone pictures it: rounds down, teams across, snake rows
 * reversed so a row reads in the order picks actually happened.
 */

import { slotAtPick, type DraftShape } from './pickOrder'

export interface GridPick {
  overallPick: number
  playerKey: string
  playerName: string
  position: string
  slot: number
}

export interface GridCell {
  overallPick: number
  slot: number
  pick: GridPick | null
  isMine: boolean
  /** The pick currently on the clock. */
  isCurrent: boolean
}

export interface GridRow {
  round: number
  cells: GridCell[]
}

export function buildDraftGrid(
  shape: DraftShape,
  picks: GridPick[],
  opts: { mySlot?: number | null; currentOverallPick?: number } = {},
): GridRow[] {
  const teams = Math.max(1, shape.teams)
  const byOverall = new Map(picks.map((p) => [p.overallPick, p]))
  const rows: GridRow[] = []

  for (let round = 1; round <= Math.max(0, shape.rounds); round++) {
    const cells: GridCell[] = []
    for (let i = 1; i <= teams; i++) {
      const overallPick = (round - 1) * teams + i
      const slot = slotAtPick(shape, overallPick)
      cells.push({
        overallPick,
        slot,
        pick: byOverall.get(overallPick) ?? null,
        isMine: opts.mySlot != null && slot === opts.mySlot,
        isCurrent: overallPick === opts.currentOverallPick,
      })
    }
    rows.push({ round, cells })
  }
  return rows
}
