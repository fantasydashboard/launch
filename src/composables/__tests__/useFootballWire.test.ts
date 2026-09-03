import { describe, it, expect } from 'vitest'
import { reseatRos } from '@/composables/useFootballWire'
import { buildFootballWire } from '@/football/footballWire'
import type { PlayerVor } from '@/football/footballVor'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'
import type { AvailablePlayer } from '@/players/types'

const vor = (key: string, position: string, vorRos: number): PlayerVor => ({
  playerKey: key, position, pointsRos: vorRos + 100, vorRos,
  pointsNextWeek: 0, vorWeek: 0, streamWeeks: 0, streamOf: 0,
  confidence: 'high', opportunity: '',
})

const slots = { QB: 1, RB: 2, FLEX: 1 }
const pool: PointsPoolPlayer[] = [
  { playerKey: 'qb1', name: 'My QB', position: 'QB', teamKey: 'me', proTeam: 'BUF' },
  { playerKey: 'rb1', name: 'My RB1', position: 'RB', teamKey: 'me', proTeam: 'KC' },
  { playerKey: 'rb2', name: 'My RB2', position: 'RB', teamKey: 'me', proTeam: 'SF' },
  { playerKey: 'rb3', name: 'My RB3', position: 'RB', teamKey: 'me', proTeam: 'DEN' },
]
const freeAgents: AvailablePlayer[] = [
  { playerKey: 'fa_a', name: 'FA Alpha', position: 'RB', team: 'LAR', percentOwned: 0, status: '', stats: {} },
  { playerKey: 'fa_b', name: 'FA Bravo', position: 'RB', team: 'NYJ', percentOwned: 0, status: '', stats: {} },
]

// Our own order: Alpha is the clear add, Bravo is not worth a roster spot.
const base: Record<string, PlayerVor> = {
  qb1: vor('qb1', 'QB', 150), rb1: vor('rb1', 'RB', 120), rb2: vor('rb2', 'RB', 80),
  rb3: vor('rb3', 'RB', 10), fa_a: vor('fa_a', 'RB', 95), fa_b: vor('fa_b', 'RB', 5),
}

describe('reseatRos', () => {
  it('keeps our value curve and hands it out in the list order', () => {
    // An analyst who flips the two free agents: Bravo first, Alpha last.
    const out = reseatRos(base, { fa_b: 1, fa_a: 2 })
    const before = Object.values(base).map((v) => v.pointsRos).sort((a, b) => b - a)
    const after = Object.values(out).map((v) => v.pointsRos).sort((a, b) => b - a)
    // Same numbers on the board — only who holds them changed.
    expect(after).toEqual(before)
    expect(out.fa_b.pointsRos).toBeGreaterThan(out.fa_a.pointsRos)
  })

  it('moves points, which is what the lineup math reads — not VOR alone', () => {
    const out = reseatRos(base, { fa_b: 1, fa_a: 2 })
    expect(out.fa_b.pointsRos).toBe(base.fa_a.pointsRos)
    // VOR follows from the same replacement level rather than being re-seated separately,
    // so the two fields cannot drift into disagreeing.
    expect(out.fa_b.pointsRos - out.fa_b.vorRos).toBe(base.fa_b.pointsRos - base.fa_b.vorRos)
  })

  it('is identity with no list and with an unmatched list', () => {
    expect(reseatRos(base, {})).toBe(base)
    expect(reseatRos({}, { fa_a: 1 })).toEqual({})
  })

  it('leaves every other field alone', () => {
    const out = reseatRos(base, { fa_b: 1, fa_a: 2 })
    expect(out.fa_a.position).toBe('RB')
    expect(out.fa_a.confidence).toBe('high')
    expect(out.fa_a.streamWeeks).toBe(base.fa_a.streamWeeks)
  })
})

/*
 * The point of re-seating at the source rather than re-sorting one card. Before this, an
 * analyst's list reordered Best Available and left the add/drop verdict on our own numbers —
 * so the page could tell you Bravo was the best free agent available and, six inches higher,
 * tell you to add Alpha.
 */
describe('an active ROS list reaches the add/drop verdict', () => {
  const ours = buildFootballWire({ freeAgents, vorByKey: base, pool, slots, myTeamKey: 'me' })
  const theirs = buildFootballWire({
    freeAgents, vorByKey: reseatRos(base, { fa_b: 1, fa_a: 2 }), pool, slots, myTeamKey: 'me',
  })

  it('changes who we tell you to add, not just how the list is sorted', () => {
    expect(ours.upgrades[0].add.player.name).toBe('FA Alpha')
    expect(theirs.upgrades[0].add.player.name).toBe('FA Bravo')
  })

  it('keeps the verdict and the board agreeing with each other', () => {
    for (const w of [ours, theirs]) {
      expect(w.upgrades[0].add.player.name).toBe(w.bestAvailable[0].player.name)
    }
  })
})
