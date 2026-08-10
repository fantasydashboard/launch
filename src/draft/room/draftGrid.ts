/**
 * The draft board as everyone pictures it: rounds down, teams across.
 *
 * A column is a TEAM and stays that team all the way down. Building rows in pick
 * order instead put slot 4 in the fourth column on odd rounds and slot 9 there on
 * even ones, so every snake round showed picks under the wrong team's name and a
 * manager's own seat jumped columns round to round. Snake rounds simply fill
 * right-to-left, which is what the pick numbers in each cell show.
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
    // Walk SLOTS, not pick order, so a column belongs to one team throughout.
    for (let slot = 1; slot <= teams; slot++) {
      const indexInRound =
        shape.type === 'snake' && round % 2 === 0 ? teams - slot + 1 : slot
      const overallPick = (round - 1) * teams + indexInRound
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
