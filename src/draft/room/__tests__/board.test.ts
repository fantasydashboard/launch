import { describe, it, expect } from 'vitest'
import { buildBoard, type BoardInput } from '../board'

const players = [
  { playerKey: 'rb1', name: 'RB One', position: 'RB', value: 300 },
  { playerKey: 'rb2', name: 'RB Two', position: 'RB', value: 250 },
  { playerKey: 'rb3', name: 'RB Three', position: 'RB', value: 100 }, // real cliff -> tier break
  { playerKey: 'wr1', name: 'WR One', position: 'WR', value: 290 },
]

function build(over: Partial<BoardInput> = {}) {
  const base: BoardInput = {
    available: players,
    survival: { rb1: 0.2, rb2: 0.6, rb3: 0.9, wr1: 0.5 },
    expectedBestAtPosition: { RB: 250, WR: 290 },
    adpByKey: { rb1: 1, rb2: 5, rb3: 30, wr1: 2 },
    currentOverallPick: 10,
    filledStarterSlots: 0,
    totalStarterSlots: 8,
    ...over,
  }
  return buildBoard(base)
}

const byKey = (rows: ReturnType<typeof buildBoard>) =>
  Object.fromEntries(rows.map((r) => [r.playerKey, r]))

describe('buildBoard — VONA', () => {
  it('vona is value minus the expected best at that position at my next pick', () => {
    const r = byKey(build())
    expect(r.rb1.vona).toBe(50) // 300 - 250
    expect(r.rb2.vona).toBe(0) // 250 - 250
    expect(r.wr1.vona).toBe(0) // 290 - 290
  })

  it('a player no better than his replacement scores no VONA even with a high projection', () => {
    const r = byKey(build())
    expect(r.wr1.value).toBeGreaterThan(r.rb2.value)
    expect(r.wr1.vona).toBeLessThanOrEqual(r.rb1.vona)
  })
})

describe('buildBoard — points now, upside late', () => {
  it('with no starters filled the score is pure VONA', () => {
    const r = byKey(build({ filledStarterSlots: 0, totalStarterSlots: 8 }))
    expect(r.rb1.score).toBeCloseTo(r.rb1.vona)
  })

  it('with starters full the score is pure upside', () => {
    const r = byKey(build({ filledStarterSlots: 8, totalStarterSlots: 8 }))
    expect(r.rb1.score).toBeCloseTo(r.rb1.upside)
  })

  it('the blend shifts continuously as slots fill', () => {
    const half = byKey(build({ filledStarterSlots: 4, totalStarterSlots: 8 }))
    const row = half.rb1
    expect(row.score).toBeCloseTo(0.5 * row.vona + 0.5 * row.upside)
  })

  it('treats a zero-slot roster as unfilled rather than dividing by zero', () => {
    const r = byKey(build({ filledStarterSlots: 0, totalStarterSlots: 0 }))
    expect(Number.isFinite(r.rb1.score)).toBe(true)
  })
})

describe('buildBoard — upside proxy', () => {
  it('a player the market ranks higher than our projection has positive upside', () => {
    const r = byKey(build({ adpByKey: { rb1: 1, rb2: 5, rb3: 2, wr1: 30 } }))
    expect(r.rb3.upside).toBeGreaterThan(0)
    // Upside is one-sided: the market being LOWER on someone is just agreement
    // that he is worse, which VONA already prices in.
    expect(r.wr1.upside).toBe(0)
  })

  it('a player with no ADP gets no upside signal rather than a fabricated one', () => {
    const r = byKey(build({ adpByKey: { rb1: 1, rb2: 5, wr1: 2 } }))
    expect(r.rb3.adp).toBeNull()
    expect(r.rb3.upside).toBe(0)
  })
})

describe('buildBoard — tiers and flags', () => {
  it('a large value gap opens a new tier within the position', () => {
    const r = byKey(build())
    expect(r.rb1.tier).toBe(r.rb2.tier)
    expect(r.rb3.tier).toBeGreaterThan(r.rb2.tier)
  })

  it('flags a player still available well past his ADP as value', () => {
    // rb3 has ADP 30 and we are at pick 10 -> not a value yet.
    // Move the pick well past his ADP.
    const r = byKey(build({ currentOverallPick: 45 }))
    expect(r.rb3.flag).toBe('value')
  })

  it('flags taking a player well before his ADP as a reach', () => {
    const r = byKey(build({ currentOverallPick: 1, adpByKey: { rb1: 60, rb2: 5, rb3: 30, wr1: 2 } }))
    expect(r.rb1.flag).toBe('reach')
  })

  it('players without ADP carry no flag', () => {
    const r = byKey(build({ adpByKey: {} }))
    for (const row of Object.values(r)) expect(row.flag).toBe('')
  })

  it('returns rows sorted by score, best first', () => {
    const rows = build()
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].score).toBeGreaterThanOrEqual(rows[i].score)
    }
  })

  it('handles an empty pool', () => {
    expect(buildBoard({ ...({} as BoardInput), available: [], survival: {}, expectedBestAtPosition: {}, adpByKey: {}, currentOverallPick: 1, filledStarterSlots: 0, totalStarterSlots: 8 })).toEqual([])
  })
})

describe('buildBoard — tiers do not fragment', () => {
  // 200 players with a smooth decline: a threshold rule fragments this into
  // dozens of tiers because the median gap is tiny.
  // Real boards have cliffs; this one drops hard every 20 players.
  const many = Array.from({ length: 200 }, (_, i) => ({
    playerKey: `w${i}`, name: `W${i}`, position: 'WR',
    value: 300 - i - Math.floor(i / 20) * 25,
  }))

  it('caps tiers at a number a human can use', () => {
    const rows = buildBoard({
      available: many,
      survival: {},
      expectedBestAtPosition: { WR: 250 },
      adpByKey: {},
      currentOverallPick: 1,
      filledStarterSlots: 0,
      totalStarterSlots: 8,
    })
    const tiers = new Set(rows.map((r) => r.tier))
    expect(tiers.size).toBeLessThanOrEqual(8)
    expect(tiers.size).toBeGreaterThan(1)
  })

  it('assigns an overall tier across positions as well as a positional one', () => {
    const rows = buildBoard({
      available: [
        { playerKey: 'a', name: 'A', position: 'RB', value: 300 },
        { playerKey: 'b', name: 'B', position: 'WR', value: 100 },
      ],
      survival: {},
      expectedBestAtPosition: {},
      adpByKey: {},
      currentOverallPick: 1,
      filledStarterSlots: 0,
      totalStarterSlots: 8,
    })
    const a = rows.find((r) => r.playerKey === 'a')!
    const b = rows.find((r) => r.playerKey === 'b')!
    // Each is the only player at his position, so both are positional tier 1...
    expect(a.tier).toBe(1)
    expect(b.tier).toBe(1)
    // ...but overall they are clearly not the same tier.
    expect(b.overallTier).toBeGreaterThan(a.overallTier)
  })
})

describe('buildBoard — upside is denominated in points', () => {
  const players = [
    { playerKey: 'star', name: 'Star', position: 'RB', value: 300 },
    { playerKey: 'mid', name: 'Mid', position: 'RB', value: 200 },
    { playerKey: 'noproj', name: 'No Projection', position: 'WR', value: 0 },
  ]

  it('a zero-projection player never outranks a real one', () => {
    const rows = buildBoard({
      available: players,
      survival: {},
      expectedBestAtPosition: { RB: 200, WR: 0 },
      // The market likes the unprojected player — the old rank-delta upside made
      // this float him to #1.
      adpByKey: { star: 50, mid: 60, noproj: 1 },
      currentOverallPick: 1,
      filledStarterSlots: 4,
      totalStarterSlots: 8,
    })
    expect(rows[0].playerKey).not.toBe('noproj')
    expect(rows[rows.length - 1].playerKey).toBe('noproj')
  })

  it('upside stays on the same scale as points, not rank positions', () => {
    const rows = buildBoard({
      available: players,
      survival: {},
      expectedBestAtPosition: { RB: 200, WR: 0 },
      adpByKey: { star: 50, mid: 1, noproj: 60 },
      currentOverallPick: 1,
      filledStarterSlots: 0,
      totalStarterSlots: 8,
    })
    // 'mid' is our #2 but the market's #1, so upside = value(#1) - value(mid).
    const mid = rows.find((r) => r.playerKey === 'mid')!
    expect(mid.upside).toBe(100)
  })

  it('a player the market rates lower than us gets no upside credit', () => {
    const rows = buildBoard({
      available: players,
      survival: {},
      expectedBestAtPosition: { RB: 200, WR: 0 },
      adpByKey: { star: 99, mid: 1, noproj: 2 },
      currentOverallPick: 1,
      filledStarterSlots: 0,
      totalStarterSlots: 8,
    })
    expect(rows.find((r) => r.playerKey === 'star')!.upside).toBe(0)
  })
})
