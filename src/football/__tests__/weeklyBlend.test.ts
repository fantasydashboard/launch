import { describe, it, expect } from 'vitest'
import { blendWithAnalyst, blendBoardWithList } from '../weeklyBlend'

const te = [
  { playerKey: 'mcb', value: 13.8, position: 'TE' },
  { playerKey: 'bow', value: 12.2, position: 'TE' },
  { playerKey: 'fan', value: 10.0, position: 'TE' },
  { playerKey: 'kit', value: 9.7, position: 'TE' },
]

describe('blendWithAnalyst', () => {
  it('maps an analyst rank onto the ladder and averages', () => {
    // analyst: bow 1, mcb 2, kit 3, fan 4
    const out = blendWithAnalyst(te, { bow: 1, mcb: 2, kit: 3, fan: 4 })
    expect(out.mcb).toBeCloseTo((13.8 + 12.2) / 2)
    expect(out.bow).toBeCloseTo((12.2 + 13.8) / 2)
    expect(out.fan).toBeCloseTo((10.0 + 9.7) / 2)   // his TE4 = ladder[3]
    expect(out.kit).toBeCloseTo((9.7 + 10.0) / 2)
  })

  it('places an unranked player one slot past the last rank', () => {
    const out = blendWithAnalyst(te, { mcb: 1, bow: 2 })   // lastRank 2 -> slot 3
    expect(out.fan).toBeCloseTo((10.0 + 10.0) / 2)
    expect(out.kit).toBeCloseTo((9.7 + 10.0) / 2)
  })

  it('clamps a rank deeper than the pool to the last slot', () => {
    const out = blendWithAnalyst(te, { kit: 40 })
    expect(out.kit).toBeCloseTo((9.7 + 9.7) / 2)
  })

  it('leaves a position the list says nothing about unchanged', () => {
    const qb = [{ playerKey: 'allen', value: 23.1, position: 'QB' }]
    const out = blendWithAnalyst([...te, ...qb], { mcb: 1 })
    expect(out.allen).toBe(23.1)
  })

  it('matches the graphics script on the week-4 TE example', () => {
    // position-tiers.py: Fannin Sleeper TE3 (10.0), analyst TE10 -> blended ~9.4 with a deeper ladder
    const ladder = [13.8, 12.2, 10.0, 9.8, 9.7, 9.7, 9.6, 9.5, 9.3, 8.6].map((v, i) => ({
      playerKey: `t${i}`, value: v, position: 'TE',
    }))
    const out = blendWithAnalyst(ladder, { t2: 10 })
    expect(out.t2).toBeCloseTo((10.0 + 8.6) / 2)
  })
})

const WIDE = [
  '"QB Rank","QB Player","QB Team","QB Opponent","QB Tier","TE Rank","TE Player","TE Team","TE Opponent","TE Tier","FLEX Rank","FLEX Player","FLEX Team","FLEX Pos"',
  '"1","Josh Allen","BUF","NE","1","1","Brock Bowers","LV","KC","1","1","Jahmyr Gibbs","DET","RB"',
  '"2","Lamar Jackson","BAL","TEN","1","2","Trey McBride","ARI","NYG","1","2","Bijan Robinson","ATL","RB"',
].join('\n')

describe('blendBoardWithList', () => {
  const names = [
    { playerKey: 'allen', name: 'Josh Allen', position: 'QB' },
    { playerKey: 'lamar', name: 'Lamar Jackson', position: 'QB' },
    { playerKey: 'mcb', name: 'Trey McBride', position: 'TE' },
    { playerKey: 'bow', name: 'Brock Bowers', position: 'TE' },
  ]
  const entries = [
    { playerKey: 'allen', value: 23.1, position: 'QB' },
    { playerKey: 'lamar', value: 21.9, position: 'QB' },
    { playerKey: 'mcb', value: 13.8, position: 'TE' },
    { playerKey: 'bow', value: 12.2, position: 'TE' },
  ]

  it('parses a wide sheet, ignores FLEX, and blends per position', () => {
    const out = blendBoardWithList(entries, names, WIDE)!
    expect(out.bow).toBeCloseTo((12.2 + 13.8) / 2)
    expect(out.allen).toBeCloseTo(23.1)
  })

  it('matches across a generational suffix', () => {
    const text = WIDE.replace('Lamar Jackson', 'Lamar Jackson Jr.')
    const out = blendBoardWithList(entries, names, text)!
    expect(out.lamar).toBeCloseTo(21.9)   // still matched at QB2, not pushed past the end
  })

  it('returns null for text with no usable positions', () => {
    expect(blendBoardWithList(entries, names, 'nothing here')).toBeNull()
  })
})
