import { describe, it, expect } from 'vitest'
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
