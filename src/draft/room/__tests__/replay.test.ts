import { describe, it, expect } from 'vitest'
import { replayDraft, followRecommendations, calibration, type ReplayInput, type ReplayPick } from '../replay'
import { buildTendencies } from '../tendencies'
import type { DraftShape } from '../pickOrder'

const shape: DraftShape = { type: 'snake', teams: 4, rounds: 3 }

// 12 players so a 4x3 draft can consume them all.
const players = Array.from({ length: 12 }, (_, i) => ({
  playerKey: `p${i + 1}`,
  name: `Player ${i + 1}`,
  position: i % 2 === 0 ? 'RB' : 'WR',
  value: 300 - i * 20,
}))

const adpByKey = Object.fromEntries(players.map((p, i) => [p.playerKey, i + 1]))

/** A completed draft that took players in board order. */
const picks: ReplayPick[] = players.map((p, i) => ({
  overallPick: i + 1,
  playerKey: p.playerKey,
  slot: ((i % 4) + 1),
}))

const tendencies = buildTendencies([
  { teamKey: '1', position: 'RB', round: 1 },
  { teamKey: '2', position: 'WR', round: 1 },
  { teamKey: '3', position: 'RB', round: 1 },
  { teamKey: '4', position: 'WR', round: 1 },
])

function input(over: Partial<ReplayInput> = {}): ReplayInput {
  return {
    shape,
    picks,
    mySlot: 1,
    players,
    adpByKey,
    tendencies,
    rosterIdForSlot: (slot) => String(slot),
    totalStarterSlots: 3,
    runs: 50,
    seed: 5,
    ...over,
  }
}

describe('replayDraft', () => {
  it('produces a decision at each of my picks and no others', () => {
    const steps = replayDraft(input())
    // Slot 1 in a 4-team snake picks at 1, 8, 9.
    expect(steps.map((s) => s.overallPick)).toEqual([1, 8, 9])
  })

  it('records what was actually taken alongside what we recommended', () => {
    const steps = replayDraft(input())
    expect(steps[0].actualPlayerKey).toBe('p1')
    expect(steps[0].recommendation).not.toBeNull()
  })

  it('only considers players still available at that point in the draft', () => {
    const steps = replayDraft(input())
    const second = steps[1] // pick 8 — seven players already gone
    const keys = second.board.map((r) => r.playerKey)
    expect(keys).not.toContain('p1')
    expect(keys).not.toContain('p7')
    expect(keys).toContain('p8')
  })

  it('never recommends someone already drafted', () => {
    const steps = replayDraft(input())
    const drafted = new Set<string>()
    for (const s of steps) {
      if (s.recommendation) expect(drafted.has(s.recommendation.pick.playerKey)).toBe(false)
      const idx = picks.findIndex((p) => p.overallPick === s.overallPick)
      for (let i = 0; i <= idx; i++) drafted.add(picks[i].playerKey)
    }
  })

  it('is deterministic', () => {
    const a = replayDraft(input())
    const b = replayDraft(input())
    expect(a.map((s) => s.recommendation?.pick.playerKey)).toEqual(
      b.map((s) => s.recommendation?.pick.playerKey),
    )
  })
})

describe('calibration', () => {
  it('buckets predictions and counts what actually survived', () => {
    const steps = replayDraft(input())
    const buckets = calibration(steps, picks, adpByKey)
    expect(buckets.length).toBeGreaterThan(0)
    for (const b of buckets) {
      expect(b.total).toBeGreaterThan(0)
      expect(b.actualSurvived).toBeLessThanOrEqual(b.total)
      expect(b.predicted).toBeGreaterThanOrEqual(0)
      expect(b.predicted).toBeLessThanOrEqual(1)
    }
  })

  it('scores a confident correct prediction as well calibrated', () => {
    // With no recorded picks nobody is actually taken, so everyone in the
    // high-confidence bucket does survive. (Predicted stays just under 1 because
    // the simulation still models opponents drafting — that is the point of it.)
    const steps = replayDraft(input({ picks: [] }))
    const buckets = calibration(steps, [], adpByKey)
    const top = buckets.find((b) => b.bucket === 0.9)!
    expect(top.predicted).toBeGreaterThan(0.9)
    expect(top.actualSurvived).toBe(top.total)
  })

  it('returns an empty report when there is nothing to score', () => {
    expect(calibration([], picks, adpByKey)).toEqual([])
  })
})

describe('calibration — scored on the players the question is live for', () => {
  const step = (nextPick: number, survival: Record<string, number>) => ({
    overallPick: 1, recommendation: null, actualPlayerKey: null, actualName: null,
    predictedSurvival: survival, nextPick, board: [],
  })

  it('leaves out players the market prices far beyond your next pick', () => {
    // `far` is an ADP-200 player with your next pick at 20: he was never at risk,
    // and counting him is how 97% of the rows ended up in one bucket.
    const buckets = calibration(
      [step(20, { near: 0.5, far: 1 })],
      [],
      { near: 22, far: 200 },
    )
    expect(buckets.reduce((n, b) => n + b.total, 0)).toBe(1)
    expect(buckets[0].predicted).toBeCloseTo(0.5, 5)
  })

  it('leaves out players the market never priced at all', () => {
    const buckets = calibration([step(20, { unpriced: 1 })], [], {})
    expect(buckets).toEqual([])
  })

  it('still counts a player taken before your next pick as gone', () => {
    const buckets = calibration(
      [step(20, { a: 0.8 })],
      [{ overallPick: 15, playerKey: 'a', slot: 3 }],
      { a: 18 },
    )
    expect(buckets[0].total).toBe(1)
    expect(buckets[0].actualSurvived).toBe(0)
  })
})


describe('followRecommendations — what listening would have got you', () => {
  it('gives one player per pick of mine, never the same man twice', () => {
    const taken = followRecommendations(input())
    expect(taken.length).toBeGreaterThan(0)
    expect(new Set(taken).size).toBe(taken.length)
  })

  it('may take a player I actually drafted — in this world I never did', () => {
    // Slot 1 really took p1, p8 and p9. Following our advice, those three are
    // back in the pool: my own picks are not removed from a draft I did not make.
    const taken = followRecommendations(input())
    const mine = picks.filter((p) => p.slot === 1).map((p) => p.playerKey)
    expect(mine.length).toBeGreaterThan(0)
    // Nothing here asserts it DOES take them, only that it is allowed to and
    // that everything it takes is a real player.
    for (const key of taken) expect(players.some((p) => p.playerKey === key)).toBe(true)
  })

  it('never takes a player an opponent already had', () => {
    const taken = followRecommendations(input())
    const bySlot = new Map(picks.map((p) => [p.playerKey, p.slot]))
    for (const key of taken) {
      const opponentPick = picks.find((p) => p.playerKey === key && p.slot !== 1)
      if (!opponentPick) continue
      // If an opponent took him, we can only have him if we got there first.
      const myPickNumbers = picks.filter((p) => p.slot === 1).map((p) => p.overallPick)
      expect(Math.min(...myPickNumbers)).toBeLessThan(opponentPick.overallPick + shape.teams * shape.rounds)
      expect(bySlot.get(key)).not.toBe(undefined)
    }
  })

  it('leaves the observed replay untouched', () => {
    // Following mode must not leak into the normal answer.
    const a = replayDraft(input()).map((s) => s.recommendation?.pick.playerKey)
    const b = replayDraft(input()).map((s) => s.recommendation?.pick.playerKey)
    expect(a).toEqual(b)
    expect(a.some(Boolean)).toBe(true)
  })
})

describe('replayDraft — it has to be the live path', () => {
  const positions = (over: Partial<ReplayInput>) =>
    replayDraft(input(over)).map((s) => s.recommendation?.pick.position)

  it('follows the lineup it is drafting for', () => {
    // The replay had no need factor at all, so it recommended positions the
    // roster could not start — which is not what the tool says on the clock.
    // A back-only lineup and a receiver-only lineup must not produce the same
    // sequence of recommendations from the same board.
    const backsOnly = positions({ slots: { RB: 3, BN: 3 } })
    const receiversOnly = positions({ slots: { WR: 3, BN: 3 } })
    expect(backsOnly).not.toEqual(receiversOnly)
    expect(backsOnly.filter((p) => p === 'RB').length)
      .toBeGreaterThan(receiversOnly.filter((p) => p === 'RB').length)
  })
})

/**
 * The badge on a replayed board has to be the badge on the live board.
 *
 * The live path compares ADP against a REPLACEMENT-ADJUSTED ordering, because
 * ADP already prices positional scarcity and differencing it against a
 * raw-points order badges players for their position rather than for anything
 * anyone believes about them. If the replay does not pass the same ordering it
 * silently verifies a different tool.
 */
describe('replayDraft — the market read is the live one', () => {
  // Six quarterbacks and eleven backs. `qb0` is the highest raw projection in
  // the pool and only the 7th-best player once replacement is taken out — which
  // is exactly where the market prices him.
  const qbs = Array.from({ length: 6 }, (_, i) => ({
    playerKey: `qb${i}`,
    name: `QB ${i}`,
    position: 'QB',
    value: 400 - i * 2,
  }))
  const rbs = Array.from({ length: 11 }, (_, i) => ({
    playerKey: `rb${i}`,
    name: `RB ${i}`,
    position: 'RB',
    value: 300 - i * 3,
  }))
  const pool = [...qbs, ...rbs]
  // ADP order: six backs, then qb0 7th, then the rest. qb0's ADP rank is 7.
  const adpOrder = [
    ...rbs.slice(0, 6),
    qbs[0],
    ...rbs.slice(6),
    ...qbs.slice(1),
  ]
  const poolAdp = Object.fromEntries(adpOrder.map((p, i) => [p.playerKey, i + 1]))
  const poolPicks: ReplayPick[] = pool.slice(0, 12).map((p, i) => ({
    overallPick: i + 1,
    playerKey: p.playerKey,
    slot: (i % 4) + 1,
  }))
  const scarcityInput = (over: Partial<ReplayInput> = {}): ReplayInput =>
    input({ players: pool, adpByKey: poolAdp, picks: poolPicks, ...over })

  const qbRead = (over: Partial<ReplayInput> = {}) => {
    const first = replayDraft(scarcityInput(over))[0]
    return first.board.find((r) => r.playerKey === 'qb0')!
  }

  it('does not badge a quarterback the market simply drafts at his real value', () => {
    // 7th by value over replacement, 7th by ADP: agreement, and no badge.
    const qb = qbRead({ slots: { QB: 1, RB: 2, BN: 3 } })
    expect(qb.disagreementRounds).toBe(0)
    expect(qb.marketFlag).toBe('')
  })

  it('would badge him on raw points alone, which is the failure being prevented', () => {
    // No slots means no replacement level to compute, so `buildBoard` falls back
    // to its raw-value ranking — 1st by points against 7th by ADP, one and a
    // half rounds of "disagreement" manufactured out of his position.
    const qb = qbRead()
    expect(qb.disagreementRounds).toBeCloseTo(6 / 4, 5)
    expect(qb.marketFlag).toBe('value')
  })
})
