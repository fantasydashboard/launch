import { describe, it, expect } from 'vitest'
import { buildPointsTrades } from '@/myteam/pointsTrades'
import type { PointsPoolPlayer } from '@/myteam/pointsTeam'

/*
 * The blind spot that made the board read "No swap right now raises both lineups".
 *
 * One candidate list served both sides of the search — "players this team would plausibly
 * part with", meaning bench bodies and weakest starters. That is the right list for MY side
 * and the wrong one for theirs: it meant the engine could only ever offer me another
 * manager's worst startable player. On a twelve-team fixture their best man was worth 233
 * points and the most the search would hand me was 136.
 *
 * Consolidation died on that. A 2-for-1 is two useful pieces for one better one; pointed at
 * their bench it becomes two useful pieces for their worst starter, which cannot raise my
 * lineup — 885 of 890 consolidations were rejected for exactly that reason. The page then
 * reported scarcity in the league when what it had was a blind spot in the search.
 */

const SLOTS = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1 }

/** A league where every team is lopsided a different way, as real ones are. */
function league() {
  const pool: PointsPoolPlayer[] = []
  const val: Record<string, { total: number; games: number; perStat: Record<string, number>; weeklyCap: number }> = {}
  let n = 0
  const add = (teamKey: string, position: string, total: number) => {
    const key = `p${n++}`
    pool.push({ playerKey: key, teamKey, name: `${position}-${key}`, position, proTeam: 'X' } as PointsPoolPlayer)
    val[key] = { total, games: 17, perStat: {}, weeklyCap: 999 }
  }
  for (let t = 0; t < 12; t++) {
    const k = `T${t}`
    add(k, 'QB', 300 - t * 8); add(k, 'QB', 200 - t * 5)
    for (let i = 0; i < 5; i++) add(k, 'RB', 260 - t * 9 - i * 35)
    for (let i = 0; i < 6; i++) add(k, 'WR', 250 - t * 8 - i * 30)
    add(k, 'TE', 180 - t * 10); add(k, 'TE', 90 - t * 4)
  }
  const skew = ['RB', 'WR', 'TE', 'QB']
  for (let t = 0; t < 12; t++) {
    const strong = skew[t % 4]
    const weak = skew[(t + 2) % 4]
    for (const p of pool) if (p.teamKey === `T${t}`) {
      if (p.position === strong) val[p.playerKey].total += 55
      if (p.position === weak) val[p.playerKey].total -= 50
    }
  }
  return { pool, val }
}

describe('the search can ask for a player, not just be offered one', () => {
  it('reaches players well above the other roster’s castoffs', () => {
    const { pool, val } = league()
    const ideas = buildPointsTrades(pool, val as never, 'T5', SLOTS, {}, {}, {})
    expect(ideas.length).toBeGreaterThan(0)

    // The best thing acquired must beat what the old bench-only list could ever have reached:
    // roughly the median of an opponent's roster.
    const best = Math.max(...ideas.flatMap((i) => i.gets.map((g) => g.points)))
    const anyOpp = pool.filter((p) => p.teamKey === 'T3').map((p) => val[p.playerKey].total).sort((a, b) => b - a)
    expect(best).toBeGreaterThan(anyOpp[Math.floor(anyOpp.length / 2)])
  })

  it('produces consolidations where both lineups improve', () => {
    const { pool, val } = league()
    const ideas = buildPointsTrades(pool, val as never, 'T5', SLOTS, {}, {}, {})
    const consolidations = ideas.filter((i) => i.shape === '2for1' && i.kind === 'winWin')
    expect(consolidations.length).toBeGreaterThan(0)
    // Two out, one in — and the card has to say a seat came free.
    for (const c of consolidations) {
      expect(c.gives).toHaveLength(2)
      expect(c.gets).toHaveLength(1)
      expect(c.spots).toBe(1)
    }
  })

  it('offers the roster-neutral two-for-two as well', () => {
    const { pool, val } = league()
    const ideas = buildPointsTrades(pool, val as never, 'T5', SLOTS, {}, {}, {})
    const twos = ideas.filter((i) => i.shape === '2for2')
    expect(twos.length).toBeGreaterThan(0)
    for (const t of twos) expect(t.spots).toBe(0)
  })

  it('never proposes a deal nobody would send', () => {
    const { pool, val } = league()
    const ideas = buildPointsTrades(pool, val as never, 'T5', SLOTS, {}, {}, {})
    // MIN_SENDABLE_ODDS. The board once showed a 2% swap under a heading offering it as
    // something to send; printing a number that low is not honesty about a marginal deal.
    for (const i of ideas) expect(i.odds).toBeGreaterThanOrEqual(0.15)
  })

  it('ranks by what is worth pursuing, not by the biggest number', () => {
    const { pool, val } = league()
    const ideas = buildPointsTrades(pool, val as never, 'T5', SLOTS, {}, {}, {})
    const wins = ideas.filter((i) => i.kind === 'winWin')
    const asks = ideas.filter((i) => i.kind === 'ask')
    // Win-wins lead regardless of size: the pitch writes itself when the other manager can
    // check the claim against his own lineup.
    if (wins.length && asks.length) {
      expect(ideas.indexOf(wins[wins.length - 1])).toBeLessThan(ideas.indexOf(asks[0]))
    }
    // Within a kind, expected value orders the list — gain alone is how "costs them 90"
    // reached the top of a board nobody acted on.
    for (let i = 1; i < asks.length; i++) {
      expect(asks[i - 1].myGain * asks[i - 1].odds).toBeGreaterThanOrEqual(asks[i].myGain * asks[i].odds - 1e-9)
    }
  })
})

/*
 * A claim about their roster has to clear their roster.
 *
 * The board captioned a card "fills their TE hole — they're starting one below replacement"
 * while offering them a replacement-level tight end, directly above its own verdict of 25%
 * and a lineup solve saying they finish worse. Both halves were true — they had a hole, the
 * body on offer did not fill it — and the sentence joining them was not.
 */
describe('the reason a card gives has to survive the card', () => {
  const SLOTS = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1 }

  /** Me: deep at RB, two tight ends. Them: a real hole at TE. */
  const setup = (myTeVor: number) => {
    const rows = [
      { k: 'my_qb', pos: 'QB', p: 300, team: 'me', vor: 40 },
      { k: 'my_rb1', pos: 'RB', p: 290, team: 'me', vor: 120 },
      { k: 'my_rb2', pos: 'RB', p: 250, team: 'me', vor: 80 },
      { k: 'my_rb3', pos: 'RB', p: 240, team: 'me', vor: 70 },
      { k: 'my_wr1', pos: 'WR', p: 280, team: 'me', vor: 110 },
      { k: 'my_wr2', pos: 'WR', p: 230, team: 'me', vor: 60 },
      { k: 'my_te1', pos: 'TE', p: 200, team: 'me', vor: 60 },
      // The body on offer. Its VOR is the whole experiment.
      { k: 'my_te2', pos: 'TE', p: 140, team: 'me', vor: myTeVor },
      { k: 'op_qb', pos: 'QB', p: 300, team: 'op', vor: 40 },
      { k: 'op_rb1', pos: 'RB', p: 310, team: 'op', vor: 140 },
      { k: 'op_rb2', pos: 'RB', p: 240, team: 'op', vor: 70 },
      { k: 'op_wr1', pos: 'WR', p: 285, team: 'op', vor: 115 },
      { k: 'op_wr2', pos: 'WR', p: 235, team: 'op', vor: 65 },
      // Their tight end is below replacement — a genuine hole.
      { k: 'op_te1', pos: 'TE', p: 100, team: 'op', vor: -20 },
    ]
    const pool = rows.map((r) => ({
      playerKey: r.k, name: r.k, position: r.pos, teamKey: r.team, proTeam: 'X',
    })) as never
    const val = Object.fromEntries(rows.map((r) => [r.k, { total: r.p, games: 17, perStat: {}, weeklyCap: 999 }]))
    const vor = Object.fromEntries(rows.map((r) => [r.k, { vorRos: r.vor }]))
    return buildPointsTrades(pool, val as never, 'me', SLOTS, { me: 'Me', op: 'Them' }, vor, {})
  }

  it('does not claim a hole is filled by a body worse than what they start', () => {
    // Below the starter he would replace (-20). Sending him fills nothing.
    // A multi-player deal can fill a hole with its OTHER leg, so the assertion is about the
    // tight end specifically, not about the card having no reason at all.
    const ideas = setup(-35).filter((i) => i.gives.some((g) => g.playerKey === 'my_te2'))
    expect(ideas.length).toBeGreaterThan(0)
    for (const i of ideas) expect(i.fills?.position).not.toBe('TE')
  })

  it('still claims it for a marginal but real upgrade', () => {
    /*
     * The live board's case, which I first read as a bug and it is not: a replacement-level
     * tight end into a team starting one BELOW replacement is a genuine upgrade, just a small
     * one. The card was not lying. It was stating a true small benefit beside a true large
     * cost and leaving the reader to notice the second one.
     */
    const ideas = setup(0).filter((i) => i.gives.some((g) => g.playerKey === 'my_te2'))
    expect(ideas.some((i) => i.fills?.position === 'TE')).toBe(true)
  })

  it('still claims it when the body genuinely is an upgrade for them', () => {
    const ideas = setup(45).filter((i) => i.gives.some((g) => g.playerKey === 'my_te2'))
    expect(ideas.length).toBeGreaterThan(0)
    expect(ideas.some((i) => i.fills?.position === 'TE')).toBe(true)
  })
})
