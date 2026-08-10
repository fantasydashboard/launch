import { describe, it, expect } from 'vitest'
import { buildDraftGrid, type GridPick } from '../draftGrid'
import type { DraftShape } from '../pickOrder'

const shape: DraftShape = { type: 'snake', teams: 4, rounds: 3 }

const picks: GridPick[] = [
  { overallPick: 1, playerKey: 'a', playerName: 'A', position: 'RB', slot: 1 },
  { overallPick: 5, playerKey: 'e', playerName: 'E', position: 'WR', slot: 4 },
]

describe('buildDraftGrid', () => {
  it('lays out rounds by teams', () => {
    const grid = buildDraftGrid(shape, picks)
    expect(grid).toHaveLength(3)
    for (const row of grid) expect(row.cells).toHaveLength(4)
  })

  it('keeps every column on the same team all the way down', () => {
    const grid = buildDraftGrid(shape, picks)
    for (const row of grid) expect(row.cells.map((c) => c.slot)).toEqual([1, 2, 3, 4])
  })

  it('fills snake rounds right-to-left within those fixed columns', () => {
    const grid = buildDraftGrid(shape, picks)
    // Round 1 runs left to right; round 2 turns around, so the rightmost seat
    // picks first — but each seat stays in its own column.
    expect(grid[0].cells.map((c) => c.overallPick)).toEqual([1, 2, 3, 4])
    expect(grid[1].cells.map((c) => c.overallPick)).toEqual([8, 7, 6, 5])
    expect(grid[2].cells.map((c) => c.overallPick)).toEqual([9, 10, 11, 12])
  })

  it('places a made pick under the team that actually made it', () => {
    const grid = buildDraftGrid(shape, picks)
    expect(grid[0].cells[0].pick?.playerName).toBe('A') // pick 1, slot 1
    expect(grid[0].cells[1].pick).toBeNull()
    // Pick 5 belongs to slot 4 and must appear in slot 4's column, not the first.
    expect(grid[1].cells[3].pick?.playerName).toBe('E')
    expect(grid[1].cells[0].pick).toBeNull()
  })

  it('marks my seat in the same column every round', () => {
    const grid = buildDraftGrid(shape, picks, { mySlot: 4, currentOverallPick: 6 })
    for (const row of grid) {
      expect(row.cells.findIndex((c) => c.isMine)).toBe(3)
    }
    expect(grid[0].cells[0].isMine).toBe(false)
  })

  it('marks the pick on the clock under the right team', () => {
    // Pick 6 in a 4-team snake is round 2, and round 2 reverses, so it is slot 3.
    const grid = buildDraftGrid(shape, picks, { mySlot: 4, currentOverallPick: 6 })
    const current = grid[1].cells.find((c) => c.isCurrent)!
    expect(current.slot).toBe(3)
  })

  it('linear drafts never reverse', () => {
    const grid = buildDraftGrid({ type: 'linear', teams: 4, rounds: 2 }, [])
    expect(grid[1].cells.map((c) => c.slot)).toEqual([1, 2, 3, 4])
    expect(grid[1].cells.map((c) => c.overallPick)).toEqual([5, 6, 7, 8])
  })

  it('handles an empty draft', () => {
    const grid = buildDraftGrid({ type: 'snake', teams: 2, rounds: 0 }, [])
    expect(grid).toEqual([])
  })
})
