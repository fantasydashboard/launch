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

  it('uses lastRankByPos to respect analyst opinion beyond matched players', () => {
    // Analyst ranked: A(1), B(2), Ghost(3, not in pool). Pool has A, B, C, D.
    // Without lastRankByPos: C unranked at slot 3 (after matched max 2) -> ladder[2] = 15
    // With lastRankByPos: C unranked at slot 4 (after analyst max 3) -> ladder[3] = 10
    const ladder = [
      { playerKey: 'a', value: 25, position: 'TE' },
      { playerKey: 'b', value: 20, position: 'TE' },
      { playerKey: 'c', value: 15, position: 'TE' },
      { playerKey: 'd', value: 10, position: 'TE' },
    ]
    const rankByKey = { a: 1, b: 2 }  // only matched players
    const lastRankByPos = { TE: 3 }   // analyst ranked up to 3, even though ghost didn't match
    const out = blendWithAnalyst(ladder, rankByKey, lastRankByPos)
    // C at slot 4 (3+1) -> ladder[min(4,4)-1] = ladder[3] = 10; avg(15,10) = 12.5
    expect(out.c).toBeCloseTo((15 + 10) / 2)
    // Without lastRankByPos it would be slot 3 -> ladder[2] = 15; avg(15,15) = 15
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
    // Swap QB order: Lamar Jr. at QB1, Allen at QB2; verify Lamar is matched at position 1
    const swappedWide = [
      '"QB Rank","QB Player","QB Team","QB Opponent","QB Tier","TE Rank","TE Player","TE Team","TE Opponent","TE Tier","FLEX Rank","FLEX Player","FLEX Team","FLEX Pos"',
      '"1","Lamar Jackson Jr.","BAL","TEN","1","1","Brock Bowers","LV","KC","1","1","Jahmyr Gibbs","DET","RB"',
      '"2","Josh Allen","BUF","NE","1","2","Trey McBride","ARI","NYG","1","2","Bijan Robinson","ATL","RB"',
    ].join('\n')
    const out = blendBoardWithList(entries, names, swappedWide)!
    // Lamar matched at QB1: ladder[0] = 23.1, avg with 21.9 = 22.5
    expect(out.lamar).toBeCloseTo((21.9 + 23.1) / 2)
  })

  it('returns null for text with no usable positions', () => {
    expect(blendBoardWithList(entries, names, 'nothing here')).toBeNull()
  })
})

import { detectListWeek } from '../weeklyBlend'

const games = {
  3: [{ home: 'NE', away: 'BUF' }, { home: 'KC', away: 'LV' }],
  4: [{ home: 'BUF', away: 'NE' }, { home: 'LV', away: 'KC' }, { home: 'CAR', away: 'DET' }],
}
const wk4 = [
  '"QB Rank","QB Player","QB Team","QB Opponent","TE Rank","TE Player","TE Team","TE Opponent"',
  '"1","Josh Allen","BUF","NE","1","Brock Bowers","LV","KC"',
  '"2","Jared Goff","DET","CAR","2","Sam LaPorta","DET","CAR"',
].join('\n')

describe('detectListWeek', () => {
  it('finds the week whose schedule the file matches', () => {
    expect(detectListWeek(wk4, games)?.week).toBe(4)
  })
  it('ignores home/away order and JAC/JAX spelling', () => {
    // wk4 lists BUF vs NE from the away side; the schedule has BUF at home. Same game.
    expect(detectListWeek(wk4, games)?.share).toBe(1)
    const jac = { 4: [{ home: 'JAX', away: 'CIN' }] }
    const t2 = '"QB Rank","QB Player","QB Team","QB Opponent","RB Rank","RB Player","RB Team","RB Opponent"\n"1","Trevor Lawrence","JAC","CIN","1","Chase Brown","CIN","JAC"'
    expect(detectListWeek(t2, jac)?.week).toBe(4)
  })
  it('refuses a file that matches no week at 80%', () => {
    expect(detectListWeek(wk4, { 3: games[3] })).toBeNull()
  })
})
