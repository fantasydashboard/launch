import { describe, it, expect } from 'vitest'
import { analyzePointsTrade } from '../analyzePointsTrade'
import type { PointsPoolPlayer } from '../pointsTeam'
import type { ValueByKey } from '../playerValue'

/* Their roster shape: real starters, deep bench, thin at TE. */
const slots = { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 }

const P: [string, string, string, number][] = [
  // key, pos, team, rest-of-season points
  ['daniels', 'QB', 'A', 300],
  ['cmc', 'RB', 'A', 260], ['breece', 'RB', 'A', 230],
  ['skattebo', 'RB', 'A', 180], ['hubbard', 'RB', 'A', 150], ['brooks', 'RB', 'A', 90],
  ['araSB', 'WR', 'A', 250], ['olave', 'WR', 'A', 200], ['flowers', 'WR', 'A', 195],
  ['odunze', 'WR', 'A', 170], ['golden', 'WR', 'A', 140], ['diggs', 'WR', 'A', 130],
  ['kincaid', 'TE', 'A', 110], ['pitts', 'TE', 'A', 95],      // thin at TE — the whole point
  ['burrow', 'QB', 'B', 290], ['kyren', 'RB', 'B', 210], ['judkins', 'RB', 'B', 190],
  ['jsn', 'WR', 'B', 240], ['adams', 'WR', 'B', 205], ['reed', 'WR', 'B', 185],
  ['bowers', 'TE', 'B', 240], ['loveland', 'TE', 'B', 100],   // elite TE
  ['c1', 'QB', 'C', 280], ['c2', 'RB', 'C', 200], ['c3', 'RB', 'C', 190],
  ['c4', 'WR', 'C', 210], ['c5', 'WR', 'C', 200], ['c6', 'WR', 'C', 180],
  ['c7', 'TE', 'C', 150],
]
const pool: PointsPoolPlayer[] = P.map(([playerKey, position, teamKey]) => ({
  playerKey, name: playerKey, position, teamKey, eligiblePositions: [position], proTeam: 'KC',
}))
const valueByKey: ValueByKey = Object.fromEntries(
  P.map(([k, , , total]) => [k, { total, games: 17, perStat: {}, weeklyCap: 1 }]),
)

describe('two bench bodies for an elite TE', () => {
  it('reads as an upgrade — Bowers replaces Kincaid in the only TE seat', () => {
    const a = analyzePointsTrade({
      pool, valueByKey, slots,
      teamNames: { A: 'Mine', B: 'Theirs', C: 'Bystander' },
      myTeamKey: 'A', partnerKey: 'B',
      gives: [{ playerKey: 'hubbard' }, { playerKey: 'diggs' }],
      gets: [{ playerKey: 'bowers' }],
    })!
    expect(a.myGain).toBeGreaterThan(0)
  })

  /*
   * The shipped bug, end to end. Bowers carried Sleeper's "Out" tag; OUT bucketed with IL, so
   * he was halved AND barred from the lineup. The verdict came back "+0 · your starting lineup
   * does not improve" with no slot moves at all — internally consistent, and a false story
   * about a trade that upgrades the thinnest seat on the roster.
   */
  it('still upgrades the lineup when he is Out for the next game', () => {
    const outPool = pool.map((p) => (p.playerKey === 'bowers' ? { ...p, status: 'Out' } : p))
    const a = analyzePointsTrade({
      pool: outPool, valueByKey, slots,
      teamNames: { A: 'Mine', B: 'Theirs', C: 'Bystander' },
      myTeamKey: 'A', partnerKey: 'B',
      gives: [{ playerKey: 'hubbard' }, { playerKey: 'diggs' }],
      gets: [{ playerKey: 'bowers' }],
    })!
    expect(a.myGain).toBeGreaterThan(0)
    expect(a.klass).not.toBe('badForYou')
    // And the reader is told which seat moved, which is what was missing entirely.
    expect(a.helps.join(' ')).toMatch(/TE/)
    expect(a.warnings.join(' ')).not.toMatch(/does not improve/)
  })

  it('still refuses to seat a player who is genuinely on IR', () => {
    const irPool = pool.map((p) => (p.playerKey === 'bowers' ? { ...p, status: 'IR' } : p))
    const a = analyzePointsTrade({
      pool: irPool, valueByKey, slots,
      teamNames: { A: 'Mine', B: 'Theirs', C: 'Bystander' },
      myTeamKey: 'A', partnerKey: 'B',
      gives: [{ playerKey: 'hubbard' }, { playerKey: 'diggs' }],
      gets: [{ playerKey: 'bowers' }],
    })!
    expect(a.myGain).toBe(0)
  })
})

describe('the verdict shows its arithmetic', () => {
  const run = (mut: (p: any) => any = (p) => p) => analyzePointsTrade({
    pool: pool.map(mut), valueByKey, slots,
    teamNames: { A: 'Mine', B: 'Theirs', C: 'Bystander' },
    myTeamKey: 'A', partnerKey: 'B',
    gives: [{ playerKey: 'hubbard' }, { playerKey: 'diggs' }],
    gets: [{ playerKey: 'bowers' }],
  })!

  it('says which incoming player takes a seat and which outgoing one was on the bench', () => {
    const a = run()
    const inc = a.assets.find((x) => x.playerKey === 'bowers')!
    expect(inc.side).toBe('in')
    expect(inc.startedAfter).toBe(true)
    expect(inc.points).toBeGreaterThan(0)
    for (const k of ['hubbard', 'diggs']) {
      expect(a.assets.find((x) => x.playerKey === k)!.startedBefore).toBe(false)
    }
  })

  /*
   * A missing projection is a gap in our data, not a read on the player. Letting it read as
   * "worth zero" is how a verdict becomes confidently wrong, so it is called out by name.
   */
  it('separates "no projection" from "projected low"', () => {
    const a = analyzePointsTrade({
      pool, valueByKey: { ...valueByKey, bowers: undefined as any }, slots,
      teamNames: { A: 'Mine', B: 'Theirs', C: 'Bystander' },
      myTeamKey: 'A', partnerKey: 'B',
      gives: [{ playerKey: 'hubbard' }], gets: [{ playerKey: 'bowers' }],
    })!
    expect(a.assets.find((x) => x.playerKey === 'bowers')!.unprojected).toBe(true)
    expect(a.warnings.join(' ')).toMatch(/No projection/)
  })

  it('names a reserve-slot player as barred rather than merely outranked', () => {
    const a = run((p) => (p.playerKey === 'bowers' ? { ...p, onIL: true } : p))
    const inc = a.assets.find((x) => x.playerKey === 'bowers')!
    expect(inc.unavailable).toBe(true)
    expect(a.warnings.join(' ')).toMatch(/reserve/)
  })
})
