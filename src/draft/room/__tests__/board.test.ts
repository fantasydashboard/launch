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

  it('holds at pure VONA through the starter rounds', () => {
    // Half the starting lineup filled is still starter territory — upside must
    // not be competing with real value there.
    const half = byKey(build({ filledStarterSlots: 4, totalStarterSlots: 8 }))
    expect(half.rb1.score).toBeCloseTo(half.rb1.vona)
  })

  it('engages upside only once the lineup is one slot from full', () => {
    const nearly = byKey(build({ filledStarterSlots: 7, totalStarterSlots: 8 }))
    expect(nearly.rb1.score).toBeCloseTo(nearly.rb1.vona)
    const full = byKey(build({ filledStarterSlots: 8, totalStarterSlots: 8 }))
    expect(full.rb1.score).toBeCloseTo(full.rb1.upside)
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
    // 'mid' is our #2 but the market's #1, so the raw disagreement is
    // value(#1) - value(mid) = 100 points, clamped to the 40-point ceiling.
    const mid = rows.find((r) => r.playerKey === 'mid')!
    expect(mid.upside).toBe(40)
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

describe('buildBoard — upside stays out of the starter rounds', () => {
  const two = [
    { playerKey: 'better', name: 'Better', position: 'RB', value: 206 },
    { playerKey: 'hyped', name: 'Hyped', position: 'RB', value: 170 },
  ]
  const base = {
    available: two,
    survival: {},
    expectedBestAtPosition: { RB: 170 },
    // The market is far higher on the weaker player.
    adpByKey: { hyped: 1, better: 90 },
    currentOverallPick: 60,
    totalStarterSlots: 9,
  }

  it('mid-draft, the genuinely better player still ranks first', () => {
    // Five of nine starting slots filled — round 6 territory.
    const rows = buildBoard({ ...base, filledStarterSlots: 5 })
    expect(rows[0].playerKey).toBe('better')
  })

  it('upside carries no weight until the lineup is nearly full', () => {
    const rows = buildBoard({ ...base, filledStarterSlots: 5 })
    const r = rows.find((x) => x.playerKey === 'hyped')!
    expect(r.score).toBeCloseTo(r.vona)
  })

  it('once starters are complete, upside takes over for bench picks', () => {
    const rows = buildBoard({ ...base, filledStarterSlots: 9 })
    const r = rows.find((x) => x.playerKey === 'hyped')!
    expect(r.score).toBeCloseTo(r.upside)
  })

  it('caps the upside term so one wild disagreement cannot dominate', () => {
    const rows = buildBoard({ ...base, filledStarterSlots: 9 })
    for (const r of rows) expect(r.upside).toBeLessThanOrEqual(40)
  })
})

describe('buildBoard — projection stays separate from the ranking value', () => {
  const base = {
    survival: {},
    expectedBestAtPosition: { WR: 200 },
    adpByKey: {},
    currentOverallPick: 1,
    filledStarterSlots: 0,
    totalStarterSlots: 9,
  }

  it('carries our projection through untouched when a list has re-seated value', () => {
    // A ranking list has moved this player up: value says 340, we project 250.
    const rows = buildBoard({
      ...base,
      available: [{ playerKey: 'a', name: 'A', position: 'WR', value: 340, projected: 250 }],
    })
    expect(rows[0].value).toBe(340)
    expect(rows[0].projected).toBe(250)
  })

  it('falls back to value when no separate projection is supplied', () => {
    const rows = buildBoard({
      ...base,
      available: [{ playerKey: 'a', name: 'A', position: 'WR', value: 250 }],
    })
    expect(rows[0].projected).toBe(250)
  })

  it('ranks on value, not on the projection', () => {
    const rows = buildBoard({
      ...base,
      available: [
        { playerKey: 'low', name: 'Low', position: 'WR', value: 340, projected: 100 },
        { playerKey: 'high', name: 'High', position: 'WR', value: 210, projected: 900 },
      ],
    })
    expect(rows[0].playerKey).toBe('low')
  })
})

describe('buildBoard — a player you cannot start is worth less to you', () => {
  const two = [
    { playerKey: 'rb', name: 'Back', position: 'RB', value: 300 },
    { playerKey: 'wr', name: 'Wideout', position: 'WR', value: 290 },
  ]
  const base = {
    available: two,
    survival: {},
    expectedBestAtPosition: { RB: 200, WR: 200 },
    adpByKey: {},
    currentOverallPick: 40,
    filledStarterSlots: 0,
    totalStarterSlots: 9,
  }

  it('leaves scores alone when nothing is saturated', () => {
    const rows = buildBoard({ ...base, needFactor: { RB: 1, WR: 1 } })
    expect(rows.find((r) => r.playerKey === 'rb')!.score).toBeCloseTo(100)
    expect(rows[0].playerKey).toBe('rb')
  })

  it('discounts a position that can no longer start, flipping the order', () => {
    // The back is better in isolation but has nowhere to play.
    const rows = buildBoard({ ...base, needFactor: { RB: 0.35, WR: 1 } })
    expect(rows[0].playerKey).toBe('wr')
    expect(rows.find((r) => r.playerKey === 'rb')!.score).toBeCloseTo(35)
  })

  it('records the factor on the row so the reason can explain itself', () => {
    const rows = buildBoard({ ...base, needFactor: { RB: 0.35, WR: 1 } })
    expect(rows.find((r) => r.playerKey === 'rb')!.needFactor).toBe(0.35)
  })

  it('defaults to no discount when the caller supplies nothing', () => {
    const rows = buildBoard(base)
    for (const r of rows) expect(r.needFactor).toBe(1)
  })
})

describe('buildBoard — printable numbers stay in points', () => {
  // An analyst list re-seats `value` to its own order, so a gap measured in
  // `value` is a real quantity in the wrong currency: the user checks it against
  // the PTS column and the arithmetic does not work.
  const input = {
    available: [
      { playerKey: 'love', name: 'Loveland', position: 'TE', value: 268, projected: 242 },
      { playerKey: 'warr', name: 'Warren', position: 'TE', value: 242, projected: 227 },
    ],
    survival: { love: 0.44, warr: 0.82 },
    expectedBestAtPosition: { TE: 246.8 },
    expectedBestProjectedAtPosition: { TE: 220.4 },
    adpByKey: { love: 42, warr: 51 },
    currentOverallPick: 47,
    filledStarterSlots: 4,
    totalStarterSlots: 9,
  }

  it('measures the printable edge against the points column', () => {
    const love = buildBoard(input).find((r) => r.playerKey === 'love')!
    expect(love.vonaPoints).toBeCloseTo(242 - 220.4, 5)
    // The ranking-scale figure is still there — it is what ordering uses.
    expect(love.vona).toBeCloseTo(268 - 246.8, 5)
    expect(love.vonaPoints).not.toBeCloseTo(love.vona, 1)
  })

  it('still ranks on the ranking scale, not the printed one', () => {
    const rows = buildBoard(input)
    expect(rows[0].playerKey).toBe('love')
    expect(rows[0].score).toBeCloseTo(rows[0].vona, 5)
  })

  it('falls back to the value figure when no points expectation is supplied', () => {
    const { expectedBestProjectedAtPosition, ...noPoints } = input
    const love = buildBoard(noPoints).find((r) => r.playerKey === 'love')!
    expect(love.vonaPoints).toBeCloseTo(love.vona, 5)
  })
})

describe('buildBoard — value is capped by what your lineup can use', () => {
  const base = {
    survival: { blocked: 0.5, useful: 0.5 },
    expectedBestAtPosition: { TE: 150, WR: 150 },
    adpByKey: {},
    currentOverallPick: 70,
    filledStarterSlots: 6,
    totalStarterSlots: 9,
  }

  it('ranks a player who cannot start behind one who can', () => {
    // The tight end has the bigger VONA and adds nothing: every slot he could
    // fill is held by somebody better. This is the 157-point mistake.
    const rows = buildBoard({
      ...base,
      available: [
        { playerKey: 'blocked', name: 'Blocked TE', position: 'TE', value: 205 },
        { playerKey: 'useful', name: 'Useful WR', position: 'WR', value: 190 },
      ],
      marginalByKey: { blocked: 0, useful: 35 },
    })
    expect(rows[0].playerKey).toBe('useful')
    expect(rows.find((r) => r.playerKey === 'blocked')!.marginal).toBe(0)
  })

  it('does not erase a blocked player — he is still depth', () => {
    const rows = buildBoard({
      ...base,
      available: [{ playerKey: 'blocked', name: 'Blocked TE', position: 'TE', value: 205 }],
      marginalByKey: { blocked: 0 },
    })
    const blocked = rows[0]
    expect(blocked.usable).toBeGreaterThan(0)
    // A little over a third of his timing edge — depth, not a starter.
    expect(blocked.usable).toBeCloseTo(0.35 * blocked.vona, 5)
  })

  it('never lets a lineup cap inflate a player above his own VONA', () => {
    const rows = buildBoard({
      ...base,
      available: [{ playerKey: 'useful', name: 'WR', position: 'WR', value: 190 }],
      marginalByKey: { useful: 999 },
    })
    expect(rows[0].usable).toBeCloseTo(rows[0].vona, 5)
  })

  it('behaves exactly as before when no lineup information is supplied', () => {
    const args = {
      ...base,
      available: [{ playerKey: 'useful', name: 'WR', position: 'WR', value: 190 }],
      needFactor: { WR: 1 },
    }
    const rows = buildBoard(args)
    expect(rows[0].usable).toBeCloseTo(rows[0].vona, 5)
    expect(rows[0].marginal).toBeCloseTo(rows[0].vona, 5)
  })
})
