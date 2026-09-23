import { describe, it, expect } from 'vitest'
import { ppgFromLines, addCostFromUpgrades } from '../useRankings'

describe('ppgFromLines', () => {
  it('averages a player over the games he actually played', () => {
    const out = ppgFromLines([
      { playerKey: 'a', points: 20 }, { playerKey: 'a', points: 10 },
      { playerKey: 'b', points: 9 },
    ] as any)
    expect(out.a).toBe(15)
    expect(out.b).toBe(9)
  })

  /* Games played, not weeks elapsed. A player who missed two weeks is not a worse player for
     it, and dividing by the calendar would say he is. */
  it('does not dilute a player by weeks he did not play', () => {
    const out = ppgFromLines([{ playerKey: 'a', points: 30 }] as any)
    expect(out.a).toBe(30)
  })

  it('says nothing about a player with no lines', () => {
    expect(ppgFromLines([] as any)).toEqual({})
  })
})

describe('addCostFromUpgrades', () => {
  const up = (key: string, marginal: number, dropName: string) => ({
    add: { player: { playerKey: key, name: key } }, marginal, dropName, dropKey: 'd',
  })

  it('keys each add by the player it is for', () => {
    const out = addCostFromUpgrades([up('a', 4.2, 'Bench Guy')] as any)
    expect(out.a).toEqual({ marginal: 4.2, dropName: 'Bench Guy' })
  })

  /* The same player can appear in more than one solved swap. The best one is the honest answer
     — it is what the add is worth if you make the right drop, and a smaller number would
     undersell a move the engine already found. */
  it('keeps the best swap when a player appears more than once', () => {
    const out = addCostFromUpgrades([up('a', 2, 'Worse'), up('a', 7, 'Better')] as any)
    expect(out.a).toEqual({ marginal: 7, dropName: 'Better' })
  })

  it('is empty when nothing clears the bar', () => {
    expect(addCostFromUpgrades([] as any)).toEqual({})
  })
})
