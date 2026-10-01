import { describe, it, expect } from 'vitest'
import { RATE_VOLUME } from '@/hockey/hockeyCategoryValue'
import { hockeyCategoryWeek, HOCKEY_RATIOS } from '../hockeyCategoryWeek'

const proj = (stats: Record<string, number>) => ({ stats })

const categories = [
  { key: 'G', statId: 1, reverse: false },
  { key: 'A', statId: 2, reverse: false },
  { key: 'GAA', statId: 26, reverse: true },
]

const pool = [
  { playerKey: 'y.1', name: 'Sniper Man', teamKey: 'me', proTeam: 'TB' },
  { playerKey: 'y.2', name: 'Grinder Guy', teamKey: 'me', proTeam: 'NYR' },
  { playerKey: 'y.9', name: 'Their Guy', teamKey: 'them', proTeam: 'TB' },
]
const byName: Record<string, { stats: Record<string, number> }> = {
  'Sniper Man': proj({ GP: 80, G: 40, A: 40 }),
  'Grinder Guy': proj({ GP: 80, G: 8, A: 12 }),
  'Their Guy': proj({ GP: 80, G: 24, A: 24 }),
}
const projectionFor = (p: { name?: string }) => byName[String(p?.name ?? '')] ?? null

const base = {
  categories,
  /* Live totals arrive keyed by the PLATFORM's stat ids, not by our projection keys. */
  myStats: { '1': 10, '2': 14, '26': 2.40 },
  oppStats: { '1': 10, '2': 4, '26': 3.10 },
  pool,
  projectionFor,
  myTeamKey: 'me',
  oppTeamKey: 'them',
  gamesByTeam: { TB: 2, NYR: 1 },
  days: 3,
  format: 'each' as const,
}

describe('hockeyCategoryWeek', () => {
  /*
   * The bridge this function exists for: the scoreboard is keyed by the platform's stat ids and
   * the projections by our own category keys. Getting that join wrong is the single most common
   * fault in this codebase, and it fails as silence — every column reads level.
   */
  it('joins the platform scoreboard to our projection keys', () => {
    const w = hockeyCategoryWeek(base)
    const g = w.cats.find((c) => c.key === 'G')!
    const a = w.cats.find((c) => c.key === 'A')!
    expect(g.mine).toBe(10)
    expect(g.theirs).toBe(10)
    expect(a.mine).toBe(14)
    expect(g.status).toBe('live')
    expect(a.status).toBe('safe')
  })

  it('reads a reverse column the right way round', () => {
    const w = hockeyCategoryWeek(base)
    /* A lower goals-against average is better, so 2.40 against 3.10 is winning. */
    expect(w.cats.find((c) => c.key === 'GAA')!.winPct).toBeGreaterThan(0.5)
  })

  it('knows which hockey columns are ratios and refuses to price them', () => {
    const w = hockeyCategoryWeek(base)
    const gaa = w.cats.find((c) => c.key === 'GAA')!
    expect(gaa.isRatio).toBe(true)
    expect(gaa.unitValue).toBe(0)
    expect(HOCKEY_RATIOS.SVPCT).toBeTruthy()
  })

  it('builds each side’s remaining production from its own roster and fixtures', () => {
    const w = hockeyCategoryWeek(base)
    /* Mine: 0.5 G x 2 games + 0.1 G x 1 game = 1.1. Theirs: 0.3 x 2 = 0.6. */
    const g = w.cats.find((c) => c.key === 'G')!
    expect(g.sigma).toBeGreaterThan(0)
    /* A quieter slate narrows the column. */
    const quiet = hockeyCategoryWeek({ ...base, gamesByTeam: { TB: 1 } })
    expect(quiet.cats.find((c) => c.key === 'G')!.sigma).toBeLessThan(g.sigma)
  })

  it('names what is worth chasing tonight', () => {
    const w = hockeyCategoryWeek(base)
    expect(w.worthChasing).toContain('G')
    expect(w.worthChasing).not.toContain('A')
  })

  it('survives an unknown player, an empty pool and no categories', () => {
    expect(() => hockeyCategoryWeek({ ...base, projectionFor: () => null })).not.toThrow()
    expect(hockeyCategoryWeek({ ...base, pool: [] }).cats).toHaveLength(3)
    expect(hockeyCategoryWeek({ ...base, categories: [] }).cats).toEqual([])
  })
})

describe('HOCKEY_RATIOS covers every rate the hockey module knows about', () => {
  /*
   * The regression this pins: HOCKEY_RATIOS was a second hand-written list naming SVPCT and
   * GAA only, while RATE_VOLUME already knew TOIG and WINPCT were rates. An ESPN league with
   * time-on-ice as a column had its per-game minutes summed across the roster and scored by
   * addition — a number that looks exactly like a correct one. If a rate is ever added to
   * RATE_VOLUME alone, this fails instead of the board quietly going wrong.
   */
  it('names every column RATE_VOLUME calls a rate', () => {
    expect(Object.keys(HOCKEY_RATIOS).sort()).toEqual(Object.keys(RATE_VOLUME).sort())
  })

  it('classes the PCT columns as proportions and the rest as rates', () => {
    expect(HOCKEY_RATIOS.SVPCT.kind).toBe('proportion')
    expect(HOCKEY_RATIOS.WINPCT.kind).toBe('proportion')
    expect(HOCKEY_RATIOS.GAA.kind).toBe('rate')
    expect(HOCKEY_RATIOS.TOIG.kind).toBe('rate')
  })

  /* GAA's natural denominator is time on ice; our projections carry appearances, and a
     denominator we do not have is worse than the one we do. */
  it('measures GAA over the exposure we actually project', () => {
    expect(RATE_VOLUME.GAA).toBe('TOI')
    expect(HOCKEY_RATIOS.GAA.volumeKey).toBe('GP')
  })

  it('takes RATE_VOLUME at its word where no substitution is needed', () => {
    expect(HOCKEY_RATIOS.SVPCT.volumeKey).toBe(RATE_VOLUME.SVPCT)
  })

  /* And the behaviour that matters: a rate column is reported but never priced by addition. */
  it('does not price a rate column as a counting stat', () => {
    const week = hockeyCategoryWeek({
      categories: [
        { key: 'G', statId: 1, reverse: false },
        { key: 'TOIG', statId: 2, reverse: false },
      ],
      myStats: { 1: 10, 2: 1156.7 },
      oppStats: { 1: 9, 2: 1156 },
      pool: [{ playerKey: 'a', name: 'A', teamKey: 'me', proTeam: 'TOR' }],
      projectionFor: () => ({ stats: { G: 30, TOIG: 19, GP: 82 } }),
      myTeamKey: 'me',
      oppTeamKey: 'them',
      gamesByTeam: { TOR: 3 },
      days: 3,
      format: 'each',
    })
    const toig = week.cats.find((c) => c.key === 'TOIG')!
    expect(toig.isRatio).toBe(true)
    expect(toig.unitValue).toBe(0)
  })
})
