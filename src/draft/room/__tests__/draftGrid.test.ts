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

  it('numbers picks consecutively across the whole board', () => {
    const grid = buildDraftGrid(shape, picks)
    expect(grid[0].cells.map((c) => c.overallPick)).toEqual([1, 2, 3, 4])
    expect(grid[1].cells.map((c) => c.overallPick)).toEqual([5, 6, 7, 8])
  })

  it('reverses slots on even rounds so a row reads in pick order', () => {
    const grid = buildDraftGrid(shape, picks)
    expect(grid[0].cells.map((c) => c.slot)).toEqual([1, 2, 3, 4])
    expect(grid[1].cells.map((c) => c.slot)).toEqual([4, 3, 2, 1])
    expect(grid[2].cells.map((c) => c.slot)).toEqual([1, 2, 3, 4])
  })

  it('places made picks in their cells and leaves the rest empty', () => {
    const grid = buildDraftGrid(shape, picks)
    expect(grid[0].cells[0].pick?.playerName).toBe('A')
    expect(grid[0].cells[1].pick).toBeNull()
    expect(grid[1].cells[0].pick?.playerName).toBe('E') // pick 5, slot 4
  })

  it('marks my cells and the pick on the clock', () => {
    const grid = buildDraftGrid(shape, picks, { mySlot: 4, currentOverallPick: 6 })
    expect(grid[0].cells[3].isMine).toBe(true)
    expect(grid[1].cells[0].isMine).toBe(true) // reversed row — slot 4 leads
    expect(grid[0].cells[0].isMine).toBe(false)
    expect(grid[1].cells[1].isCurrent).toBe(true)
  })

  it('linear drafts never reverse', () => {
    const grid = buildDraftGrid({ type: 'linear', teams: 4, rounds: 2 }, [])
    expect(grid[1].cells.map((c) => c.slot)).toEqual([1, 2, 3, 4])
  })

  it('handles an empty draft', () => {
    const grid = buildDraftGrid({ type: 'snake', teams: 2, rounds: 0 }, [])
    expect(grid).toEqual([])
  })
})
