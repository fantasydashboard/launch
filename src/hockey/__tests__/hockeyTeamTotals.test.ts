import { describe, it, expect } from 'vitest'
import { hockeyCatSpecs, buildHockeyTeamTotals, hockeyProjectionCoverage } from '../hockeyTeamTotals'
import { ecwByTeam } from '@/trades/standings'
import type { HockeyProjection } from '@/hockey/hockeyValue'

const cats = hockeyCatSpecs([
  { key: 'G', statId: 13, reverse: false },
  { key: 'A', statId: 14, reverse: false },
  { key: 'SVPCT', statId: 11, reverse: false },
  { key: 'GAA', statId: 10, reverse: true },
])

const proj = (playerKey: string, position: string, stats: Record<string, number>): HockeyProjection =>
  ({ playerKey, position, stats })

describe('hockeyCatSpecs', () => {
  it('keys a column by the unified stat key, which is also the projection key', () => {
    expect(cats.map((c) => c.statId)).toEqual(['G', 'A', 'SVPCT', 'GAA'])
  })

  it('carries the league’s own direction — GAA is won by the smaller number', () => {
    expect(cats.find((c) => c.statId === 'GAA')!.lowerIsBetter).toBe(true)
    expect(cats.find((c) => c.statId === 'G')!.lowerIsBetter).toBe(false)
  })

  it('weights save percentage by shots faced and GAA by starts, not by ice time', () => {
    expect(cats.find((c) => c.statId === 'SVPCT')).toMatchObject({ isRatio: true, volumeStatId: 'SA' })
    expect(cats.find((c) => c.statId === 'GAA')).toMatchObject({ isRatio: true, volumeStatId: 'GP' })
  })

  it('counting columns are not ratios', () => {
    expect(cats.find((c) => c.statId === 'G')!.isRatio).toBe(false)
  })

  it('marks the goalie-only columns as such, and shared ones as skater', () => {
    expect(cats.find((c) => c.statId === 'SVPCT')!.side).toBe('goalie')
    expect(cats.find((c) => c.statId === 'G')!.side).toBe('skater')
  })

  it('drops a duplicated column rather than ranking it twice', () => {
    const dup = hockeyCatSpecs([
      { key: 'G', statId: 13, reverse: false },
      { key: 'G', statId: 13, reverse: false },
    ])
    expect(dup).toHaveLength(1)
  })
})

describe('buildHockeyTeamTotals', () => {
  const roster = [
    { playerKey: 'a1', teamKey: 'A', name: 'Skater A1' },
    { playerKey: 'a2', teamKey: 'A', name: 'Goalie A2' },
    { playerKey: 'b1', teamKey: 'B', name: 'Skater B1' },
    { playerKey: 'b2', teamKey: 'B', name: 'Goalie B2' },
  ]
  const projections: Record<string, HockeyProjection> = {
    a1: proj('a1', 'C', { G: 30, A: 40 }),
    // .920 on 1000 shots, 2.0 per start over 50 starts
    a2: proj('a2', 'G', { SVPCT: 0.92, SA: 1000, GAA: 2.0, GP: 50 }),
    b1: proj('b1', 'C', { G: 20, A: 25 }),
    // .900 on 500 shots, 3.0 per start over 25 starts
    b2: proj('b2', 'G', { SVPCT: 0.9, SA: 500, GAA: 3.0, GP: 25 }),
  }
  const build = (r = roster) =>
    buildHockeyTeamTotals({ roster: r, projectionFor: (p) => projections[p.playerKey] ?? null, cats })

  it('sums the counting columns over the whole roster', () => {
    const t = build().find((x) => x.teamId === 'A')!
    expect(t.cats.G.value).toBe(30)
    expect(t.cats.A.value).toBe(40)
  })

  it('computes team save percentage as saves over shots, not a mean of rates', () => {
    const a = build().find((x) => x.teamId === 'A')!
    expect(a.cats.SVPCT.value).toBeCloseTo(0.92, 6)
    expect(a.cats.SVPCT.den).toBe(1000)
  })

  it('weights two goalies by the shots each actually faced', () => {
    const mixed = buildHockeyTeamTotals({
      roster: [
        { playerKey: 'a2', teamKey: 'A' },
        { playerKey: 'b2', teamKey: 'A' },
      ],
      projectionFor: (p) => projections[p.playerKey] ?? null,
      cats,
    })
    // (.92*1000 + .90*500) / 1500 = .91333 — not the .91 an unweighted mean would give.
    expect(mixed[0].cats.SVPCT.value).toBeCloseTo(0.913333, 5)
  })

  it('computes team GAA as goals against over starts', () => {
    const b = build().find((x) => x.teamId === 'B')!
    expect(b.cats.GAA.value).toBeCloseTo(3.0, 6)
    expect(b.cats.GAA.den).toBe(25)
  })

  it('leaves a player nobody projected out instead of counting him as a zero', () => {
    const withGhost = build([...roster, { playerKey: 'ghost', teamKey: 'A', name: 'Unknown' }])
    expect(withGhost.find((x) => x.teamId === 'A')!.cats.G.value).toBe(30)
  })

  it('keeps a team whose whole roster is unpriced rather than dropping it from its league', () => {
    const t = buildHockeyTeamTotals({
      roster: [{ playerKey: 'z', teamKey: 'Z' }],
      projectionFor: () => null,
      cats,
    })
    expect(t.map((x) => x.teamId)).toEqual(['Z'])
  })

  it('feeds ECW, which separates the teams instead of tying them at zero', () => {
    const ecw = ecwByTeam(build(), cats)
    const a = ecw.find((e) => e.teamId === 'A')!.strength
    const b = ecw.find((e) => e.teamId === 'B')!.strength
    expect(a).toBeGreaterThan(b)
    expect(a).toBe(4) // wins all four columns against one opponent
    expect(b).toBe(0)
  })
})

describe('hockeyProjectionCoverage', () => {
  const projectionFor = (p: { playerKey: string }) =>
    p.playerKey === 'known' ? proj('known', 'C', { G: 1 }) : null

  it('reports the share of rostered players we could price', () => {
    expect(hockeyProjectionCoverage({
      roster: [{ playerKey: 'known', teamKey: 'A' }, { playerKey: 'other', teamKey: 'A' }],
      projectionFor,
    })).toBe(0.5)
  })

  it('ignores free agents, who are not on anybody’s totals', () => {
    expect(hockeyProjectionCoverage({
      roster: [{ playerKey: 'known', teamKey: 'A' }, { playerKey: 'other', teamKey: '' }],
      projectionFor,
    })).toBe(1)
  })

  it('is zero, not one, for an empty league', () => {
    expect(hockeyProjectionCoverage({ roster: [], projectionFor })).toBe(0)
  })
})
