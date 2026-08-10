import { describe, it, expect } from 'vitest'
import { buildLineup, type LineupPlayer } from '../lineup'

const slots = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1, BN: 6 }

const p = (playerKey: string, position: string, overallPick: number): LineupPlayer => ({
  playerKey, position, name: playerKey.toUpperCase(), overallPick,
})

describe('buildLineup', () => {
  it('gives every starting slot its own row', () => {
    const { rows } = buildLineup({ slots, players: [] })
    expect(rows.map((r) => r.label)).toEqual(['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DEF'])
  })

  it('never lists bench, IR, or taxi as starting slots', () => {
    const { rows } = buildLineup({ slots: { QB: 1, BN: 6, IR: 2, TAXI: 1 }, players: [] })
    expect(rows.map((r) => r.slot)).toEqual(['QB'])
  })

  it('names the player in each slot instead of counting them', () => {
    const { rows } = buildLineup({ slots, players: [p('a', 'RB', 4), p('b', 'RB', 21)] })
    const rbs = rows.filter((r) => r.slot === 'RB')
    // The whole point: two backs, two named rows — not "RB 2/2".
    expect(rbs.map((r) => r.player?.playerKey)).toEqual(['a', 'b'])
  })

  it('numbers repeated slots in draft order', () => {
    const { rows } = buildLineup({ slots, players: [p('late', 'RB', 45), p('early', 'RB', 4)] })
    expect(rows.find((r) => r.label === 'RB1')!.player?.playerKey).toBe('early')
    expect(rows.find((r) => r.label === 'RB2')!.player?.playerKey).toBe('late')
  })

  it('leaves an unfilled slot empty rather than borrowing from elsewhere', () => {
    const { rows } = buildLineup({ slots, players: [p('a', 'RB', 4)] })
    expect(rows.find((r) => r.label === 'RB2')!.player).toBeNull()
    expect(rows.find((r) => r.label === 'QB')!.player).toBeNull()
  })

  it('spills the overflow into flex, not the dedicated slots', () => {
    const { rows, bench } = buildLineup({
      slots,
      players: [p('rb1', 'RB', 4), p('rb2', 'RB', 21), p('rb3', 'RB', 28)],
    })
    expect(rows.find((r) => r.slot === 'FLEX')!.player?.playerKey).toBe('rb3')
    expect(bench).toHaveLength(0)
  })

  it('fills dedicated slots before flex even when flex is listed first', () => {
    // A FLEX that claimed first would eat the only tight end and leave TE empty.
    const { rows } = buildLineup({
      slots: { FLEX: 1, TE: 1 },
      players: [p('te', 'TE', 9)],
    })
    expect(rows.find((r) => r.slot === 'TE')!.player?.playerKey).toBe('te')
    expect(rows.find((r) => r.slot === 'FLEX')!.player).toBeNull()
  })

  it('keeps a quarterback out of a standard flex but allows superflex', () => {
    const std = buildLineup({ slots: { FLEX: 1 }, players: [p('qb', 'QB', 3)] })
    expect(std.rows[0].player).toBeNull()
    expect(std.bench.map((b) => b.playerKey)).toEqual(['qb'])

    const sf = buildLineup({ slots: { SUPER_FLEX: 1 }, players: [p('qb', 'QB', 3)] })
    expect(sf.rows[0].player?.playerKey).toBe('qb')
  })

  it('shows leftovers as bench instead of dropping them', () => {
    const { bench } = buildLineup({
      slots: { RB: 1 },
      players: [p('a', 'RB', 4), p('b', 'RB', 21), p('c', 'WR', 28)],
    })
    expect(bench.map((b) => b.playerKey)).toEqual(['b', 'c'])
  })

  it('marks kicker and defense as late so they do not read as holes', () => {
    const { rows } = buildLineup({ slots, players: [] })
    expect(rows.find((r) => r.slot === 'K')!.late).toBe(true)
    expect(rows.find((r) => r.slot === 'QB')!.late).toBe(false)
  })

  it('handles a multi-position listing like RB/WR', () => {
    const { rows } = buildLineup({ slots: { RB: 1 }, players: [p('a', 'RB/WR', 4)] })
    expect(rows[0].player?.playerKey).toBe('a')
  })

  it('survives empty settings', () => {
    expect(buildLineup({ slots: {}, players: [] })).toEqual({ rows: [], bench: [] })
  })
})
