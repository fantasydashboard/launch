import { describe, it, expect } from 'vitest'
import { buildTradeFit, type TradeFitView } from '../tradeFit'

// 6 teams → top third = ranks 1-2 (strong/surplus), bottom third = ranks 5-6 (weak/need).
const teams = [
  { key: 'ME', name: 'Me', isMe: true },
  { key: 'A', name: 'Alpha', isMe: false },
  { key: 'B', name: 'Bravo', isMe: false },
  { key: 'C', name: 'Charlie', isMe: false },
  { key: 'D', name: 'Delta', isMe: false },
  { key: 'E', name: 'Echo', isMe: false },
]
// columns aligned to teams: [ME, A, B, C, D, E]
const view: TradeFitView = {
  teams,
  numTeams: 6,
  rows: [
    // ME strong (1); weak teams A(6), B(5) → ME could give SB to them
    { key: 'sb', label: 'SB', ranks: [1, 6, 5, 3, 4, 2] },
    // ME weak (6); strong teams A(1), E(2) → ME could get SV from them
    { key: 'sv', label: 'SV', ranks: [6, 1, 4, 3, 5, 2] },
  ],
}

describe('buildTradeFit', () => {
  it('returns only mutual fits (both sides have incentive)', () => {
    const partners = buildTradeFit(view, 'ME')
    // A: you get SV (A strong), they get SB (A weak) → mutual, included.
    // B: only weak in SB (they get SB) but not strong where ME is weak → one-way, excluded.
    // E: only strong in SV (you get SV) but not weak where ME is strong → one-way, excluded.
    expect(partners.map((p) => p.teamKey)).toEqual(['A'])
    const a = partners[0]
    expect(a.youGet.map((d) => d.key)).toEqual(['sv'])
    expect(a.theyGet.map((d) => d.key)).toEqual(['sb'])
  })

  it('returns [] when myTeamKey is absent', () => {
    expect(buildTradeFit(view, 'ZZ')).toEqual([])
  })

  it('ranks a partner with more two-way overlap first', () => {
    const t = [
      { key: 'ME', name: 'Me', isMe: true },
      { key: 'BIG', name: 'Big', isMe: false },
      { key: 'SMALL', name: 'Small', isMe: false },
      { key: 'X', name: 'X', isMe: false },
      { key: 'Y', name: 'Y', isMe: false },
      { key: 'Z', name: 'Z', isMe: false },
    ]
    // [ME, BIG, SMALL, X, Y, Z]
    const v: TradeFitView = {
      teams: t,
      numTeams: 6,
      rows: [
        { key: 'mS1', label: 'S1', ranks: [1, 6, 5, 2, 3, 4] }, // ME strong → BIG,SMALL weak
        { key: 'mS2', label: 'S2', ranks: [1, 5, 2, 6, 3, 4] }, // ME strong → BIG,X weak
        { key: 'mW1', label: 'W1', ranks: [6, 1, 5, 2, 3, 4] }, // ME weak → BIG,X strong
        { key: 'mW2', label: 'W2', ranks: [6, 2, 1, 5, 3, 4] }, // ME weak → BIG,SMALL strong
      ],
    }
    const partners = buildTradeFit(v, 'ME')
    expect(partners[0].teamKey).toBe('BIG')
    expect(partners[0].youGet).toHaveLength(2)
    expect(partners[0].theyGet).toHaveLength(2)
  })
})
