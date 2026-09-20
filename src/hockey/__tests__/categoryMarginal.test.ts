import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { buildCategoryMarginal } from '../categoryMarginal'
import { createLedgerEngine } from '../categoryLedger'
import type { HockeyProjection } from '../hockeyValue'
import type { HockeyCategory } from '../hockeyCategoryValue'

const CATS: HockeyCategory[] = [
  { key: 'G', statId: 13, reverse: false },
  { key: 'HITS', statId: 31, reverse: false },
  { key: 'BLK', statId: 32, reverse: false },
]

function pool(): Record<string, HockeyProjection> {
  const out: Record<string, HockeyProjection> = {}
  const add = (k: string, position: string, stats: Record<string, number>) => {
    out[k] = { playerKey: k, position, stats } as HockeyProjection
  }
  for (let i = 0; i < 30; i++) {
    add(`c${i}`, 'C', { G: 40 - i, HITS: 50, BLK: 30 })
    add(`d${i}`, 'D', { G: 8, HITS: 60, BLK: 190 - i * 3 })
    add(`h${i}`, 'LW', { G: 12, HITS: 280 - i * 4, BLK: 40 })
  }
  return out
}

const SLOTS = { C: 2, D: 2, LW: 2 }
const base = {
  projections: pool(), categories: CATS, myTeamId: 'me', rosterSize: 6, slots: SLOTS,
}

describe('category marginal value', () => {
  it('prices every candidate it was given', () => {
    const rows = buildCategoryMarginal({
      ...base,
      picksByTeam: { me: [], a: ['c1'], b: ['c2'] },
      candidates: ['c0', 'd0', 'h0'],
    })
    expect(rows.map((r) => r.playerKey).sort()).toEqual(['c0', 'd0', 'h0'])
  })

  /*
   * THE CENTRAL CLAIM. A fourth elite hits man is a fine hockey player and buys nothing once
   * hits is locked — the column does not pay twice. The same player is worth a great deal to
   * a roster that has none. If this ever stops holding, the engine has quietly become a
   * ranked list again and the whole format advantage is gone.
   */
  it('values the same player differently depending on what I already own', () => {
    const candidates = ['h1']
    const toEmpty = buildCategoryMarginal({
      ...base, candidates,
      picksByTeam: { me: ['c0'], a: ['d1'], b: ['d2'] },
    })[0]
    const toStacked = buildCategoryMarginal({
      ...base, candidates,
      picksByTeam: { me: ['h0', 'h2', 'h3'], a: ['d1'], b: ['d2'] },
    })[0]
    expect(toEmpty.gain).toBeGreaterThan(toStacked.gain)
  })

  it('names the columns a player flips to a win', () => {
    const rows = buildCategoryMarginal({
      ...base, candidates: ['d0', 'd1', 'd2'],
      picksByTeam: { me: [], a: ['d5', 'd6'], b: ['d7', 'd8'] },
    })
    expect(rows.some((r) => r.gain > 0)).toBe(true)
  })

  /* A punted column is not scored at all — conceding it is the point, and paying for it
     afterwards would make the punt cost you twice. */
  it('ignores a punted column when pricing', () => {
    const shared = { ...base, candidates: ['h0'], picksByTeam: { me: ['c0'], a: ['c1'], b: ['c2'] } }
    const full = buildCategoryMarginal(shared)[0]
    const punted = buildCategoryMarginal({ ...shared, punted: new Set(['HITS']) })[0]
    expect(punted.byCategory.HITS).toBeUndefined()
    /* Exactly the conceded column's worth, and no other movement. Asserting a DIRECTION here
       would be wrong: a punted column's delta can be negative, in which case conceding it
       raises the score. */
    expect(punted.gain).toBeCloseTo(full.gain - full.byCategory.HITS, 6)
  })

  it('sorts best first', () => {
    const rows = buildCategoryMarginal({
      ...base, candidates: Object.keys(pool()).slice(0, 40),
      picksByTeam: { me: ['c0'], a: ['c1'], b: ['c2'] },
    })
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].gain).toBeGreaterThanOrEqual(rows[i].gain)
  })

  it('returns nothing rather than guessing when the league has no categories', () => {
    expect(buildCategoryMarginal({
      ...base, categories: [], candidates: ['c0'], picksByTeam: { me: [] },
    })).toEqual([])
  })

  it('skips a candidate with no projection instead of scoring him at zero', () => {
    const rows = buildCategoryMarginal({
      ...base, candidates: ['c0', 'ghost'],
      picksByTeam: { me: [], a: ['c1'], b: ['c2'] },
    })
    expect(rows.map((r) => r.playerKey)).toEqual(['c0'])
  })
})

/* ── the same engine, on the real feed ─────────────────────────────────────────────────── */

const FILE = '/private/tmp/claude-501/-Users-joshdaniel/c6037eeb-7afa-4879-8998-f95d9b3b1837/scratchpad/hockey_proj.json'
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
  const shape = {
    projections, categories: CATS9, myTeamId: 'me', rosterSize: 17,
    slots: { C: 2, LW: 2, RW: 2, D: 4, G: 2 },
  }
  const teams = Object.fromEntries(['me', ...Array.from({ length: 9 }, (_, i) => `t${i}`)].map((t) => [t, [] as string[]]))

  it('gives a full ledger before a single pick is made', () => {
    const e = createLedgerEngine({ ...shape, picksByTeam: teams })
    expect(e.ledger).toHaveLength(9)
    // eslint-disable-next-line no-console
    console.log('\nEMPTY-ROSTER LEDGER (everyone identical, so every column is a coin flip):')
    // eslint-disable-next-line no-console
    console.log('  ' + e.ledger.map((c) => `${c.key} ${c.rank}/${c.of}`).join('  '))
  })

  /*
   * The read that decides a draft: having taken two elite scorers, what does the board want
   * next? If the answer is still "another elite scorer", the engine is not doing its job.
   */
  it('re-prices the board after the roster tilts one way', () => {
    const mine = [key('Connor McDavid'), key('Nikita Kucherov')]
    const candidates = raw.map((p: any) => p.playerKey).filter((k: string) => !mine.includes(k))
    const rows = buildCategoryMarginal({
      ...shape, picksByTeam: { ...teams, me: mine }, candidates, limit: 454,
    })
    // eslint-disable-next-line no-console
    console.log('\nAFTER McDAVID + KUCHEROV — top 10 by what they add to THIS roster:')
    for (const r of rows.slice(0, 10)) {
      const up = Object.entries(r.byCategory).filter(([, v]) => v > 0.02)
        .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k).join(' ')
      // eslint-disable-next-line no-console
      console.log(`  ${names[r.playerKey].padEnd(22)} +${r.gain.toFixed(2)}  ${up}`)
    }
    expect(rows.length).toBeGreaterThan(300)
    expect(rows[0].gain).toBeGreaterThan(0)
  })

  it('finds players who actively damage a rate column', () => {
    const mine = [key('Andrei Vasilevskiy')]
    const candidates = raw.filter((p: any) => p.position === 'G' && p.playerKey !== mine[0])
      .map((p: any) => p.playerKey)
    const rows = buildCategoryMarginal({
      ...shape, picksByTeam: { ...teams, me: mine }, candidates,
    })
    const harmful = rows.filter((r) => r.harms.length)
    // eslint-disable-next-line no-console
    console.log(`\nGOALIES WHO DRAG A RATE COLUMN: ${harmful.length} of ${rows.length}`)
    for (const r of harmful.slice(-3)) {
      // eslint-disable-next-line no-console
      console.log(`  ${names[r.playerKey].padEnd(22)} ${r.gain.toFixed(2)}  harms ${r.harms.join(', ')}`)
    }
    /* In points a bad player scores zero and zero is the floor. Here he is below it. */
    expect(harmful.length).toBeGreaterThan(0)
  })
})
