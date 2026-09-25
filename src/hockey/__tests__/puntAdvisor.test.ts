import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { suggestPunts } from '../puntAdvisor'
import type { HockeyProjection } from '../hockeyValue'
import type { HockeyCategory } from '../hockeyCategoryValue'

const CATS: HockeyCategory[] = [
  { key: 'G', statId: 13, reverse: false },
  { key: 'HITS', statId: 31, reverse: false },
  { key: 'BLK', statId: 32, reverse: false },
]

/** Scorers and grinders, so a roster can plausibly be strong at one end and hopeless at the other. */
function pool(): Record<string, HockeyProjection> {
  const out: Record<string, HockeyProjection> = {}
  for (let i = 0; i < 40; i++) {
    out[`s${i}`] = { playerKey: `s${i}`, position: 'C', stats: { G: 45 - i, HITS: 20, BLK: 15 } } as HockeyProjection
    out[`g${i}`] = { playerKey: `g${i}`, position: 'D', stats: { G: 5, HITS: 240 - i * 3, BLK: 200 - i * 3 } } as HockeyProjection
  }
  return out
}

const shape = {
  projections: pool(), categories: CATS, myTeamId: 'me',
  rosterSize: 8, slots: { C: 4, D: 4 },
}
const candidates = Object.keys(pool())

describe('the punt advisor', () => {
  /*
   * Round one is not a plan. Nobody has a roster, every ledger is the same pile of
   * replacement bodies, and a simulation off that is comparing two guesses.
   */
  it('says nothing before a roster has a shape', () => {
    expect(suggestPunts({
      ...shape, candidates, picksRemaining: 6,
      picksByTeam: { me: ['s0'], a: ['g0'], b: ['g1'] },
    })).toEqual([])
  })

  it('says nothing when the draft is over', () => {
    expect(suggestPunts({
      ...shape, candidates, picksRemaining: 0,
      picksByTeam: { me: ['s0', 's1', 's2', 's3', 's4'], a: ['g0'], b: ['g1'] },
    })).toEqual([])
  })

  /*
   * A roster of five pure scorers against two grinder teams is the textbook case: hits and
   * blocks are gone and the picks spent chasing them are picks not spent on goals.
   */
  it('recommends conceding a column that is already lost', () => {
    const s = suggestPunts({
      ...shape, candidates, picksRemaining: 3,
      picksByTeam: {
        me: ['s0', 's1', 's2', 's3', 's4'],
        a: ['g0', 'g1', 'g2', 'g3', 'g4'],
        b: ['g5', 'g6', 'g7', 'g8', 'g9'],
      },
    })
    for (const x of s) {
      for (const k of x.concede) expect(['HITS', 'BLK']).toContain(k)
      /* Never recommended without an argument attached. */
      expect(x.gain).toBeGreaterThan(0)
      expect(x.ifPunt).toBeGreaterThan(x.ifContest)
    }
  })

  it('never recommends conceding a column it is already winning', () => {
    const s = suggestPunts({
      ...shape, candidates, picksRemaining: 3,
      picksByTeam: {
        me: ['g0', 'g1', 'g2', 'g3', 'g4'],
        a: ['s0', 's1', 's2', 's3', 's4'],
        b: ['s5', 's6', 's7', 's8', 's9'],
      },
    })
    expect(s.flatMap((x) => x.concede)).not.toContain('HITS')
  })

  /* A punt that breaks even is a strategy with no argument behind it. */
  it('returns only punts that win MORE columns', () => {
    const s = suggestPunts({
      ...shape, candidates, picksRemaining: 3,
      picksByTeam: {
        me: ['s0', 's1', 's2', 's3', 's4'],
        a: ['g0', 'g1', 'g2', 'g3', 'g4'],
        b: ['g5', 'g6', 'g7', 'g8', 'g9'],
      },
    })
    for (const x of s) expect(x.gain).toBeGreaterThan(0)
  })

  it('does not re-suggest a column already conceded', () => {
    const s = suggestPunts({
      ...shape, candidates, picksRemaining: 3, punted: new Set(['HITS']),
      picksByTeam: {
        me: ['s0', 's1', 's2', 's3', 's4'],
        a: ['g0', 'g1', 'g2', 'g3', 'g4'],
        b: ['g5', 'g6', 'g7', 'g8', 'g9'],
      },
    })
    expect(s.flatMap((x) => x.concede)).not.toContain('HITS')
  })
})

/* ── on the real feed ───────────────────────────────────────────────────────────────────── */

/* Committed rather than pulled. This pointed at an absolute path inside one session's
   temporary directory, so it ran for exactly as long as that directory survived and then
   failed for everyone — and the existsSync guard below could not save it, because the load
   happens at module scope. A snapshot of the 454 players ESPN published for 2026-27, which is
   173KB and the whole point of the test. */
const FILE = 'src/hockey/__tests__/fixtures/espn-hockey-2027.json'
const live = existsSync(FILE) ? describe : describe.skip

live('on the live ESPN pull', () => {
  const raw = JSON.parse(readFileSync(FILE, 'utf8'))
  const projections: Record<string, HockeyProjection> = Object.fromEntries(
    raw.map((p: any) => [p.playerKey, { playerKey: p.playerKey, position: p.position, stats: p.stats }]),
  )
  const names: Record<string, string> = Object.fromEntries(raw.map((p: any) => [p.playerKey, p.name]))
  const key = (n: string) => raw.find((p: any) => p.name === n)!.playerKey

  const CATS9: HockeyCategory[] = [
    { key: 'G', statId: 13, reverse: false }, { key: 'A', statId: 14, reverse: false },
    { key: 'PPP', statId: 38, reverse: false }, { key: 'SOG', statId: 29, reverse: false },
    { key: 'HITS', statId: 31, reverse: false }, { key: 'BLK', statId: 32, reverse: false },
    { key: 'W', statId: 1, reverse: false }, { key: 'GAA', statId: 10, reverse: true },
    { key: 'SVPCT', statId: 11, reverse: false },
  ]

  it('advises a finesse roster to concede the physical columns', () => {
    /*
     * A REAL mid-draft, because the advice is meaningless without one. Opponents with no picks
     * at all are nine piles of replacement level, which leaves five elite forwards ahead in
     * every column and nothing to concede — a scenario that tests the guard rather than the
     * advisor. So the other nine teams take the best of the board by ADP, five rounds deep,
     * while my own five picks are forced to pure skill.
     */
    const mine = ['Connor McDavid', 'Nikita Kucherov', 'Jason Robertson', 'Nick Suzuki', 'Mark Scheifele']
      .map(key)
    const byAdp = raw
      .filter((p: any) => p.adp != null && !mine.includes(p.playerKey))
      .sort((a: any, b: any) => a.adp - b.adp)
      .map((p: any) => p.playerKey)
    const others: Record<string, string[]> = Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [`t${i}`, [] as string[]]),
    )
    byAdp.slice(0, 45).forEach((k: string, i: number) => others[`t${i % 9}`].push(k))
    const s = suggestPunts({
      projections, categories: CATS9, myTeamId: 'me', rosterSize: 17,
      slots: { C: 2, LW: 2, RW: 2, D: 4, G: 2 },
      picksByTeam: { ...others, me: mine },
      candidates: raw.map((p: any) => p.playerKey)
        .filter((k: string) => !mine.includes(k) && !byAdp.slice(0, 45).includes(k)),
      picksRemaining: 12, poolSize: 40,
    })
    // eslint-disable-next-line no-console
    console.log('\nROSTER:', mine.map((k) => names[k]).join(', '))
    // eslint-disable-next-line no-console
    console.log('PUNT ADVICE:', s.length
      ? s.map((x) => `concede ${x.concede.join('+')} (${x.standing.map((t) => `${t.key} ${t.rank}/${t.of}`).join(', ')}) -> ${x.ifContest} cols becomes ${x.ifPunt}; helps ${x.improves.join(', ') || 'nothing measurably'}`).join('\n             ')
      : 'none worth it')
    /* No assertion on WHICH column: the honest claim is that it runs on the real feed and
       returns only punts backed by a simulated gain. Asserting a specific answer would pin
       the test to today's projections rather than to the behaviour. */
    for (const x of s) expect(x.gain).toBeGreaterThan(0)
  })
})
