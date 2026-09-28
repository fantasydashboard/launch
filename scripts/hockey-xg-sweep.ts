/*
 * How much of a skater's goal total should come from expected goals?
 *
 * WHY THIS IS NOT THE ANALYST SWEEP. scripts/hockey-prior-sweep.ts measures agreement with a
 * published baseline, which is the right tool for finding where our board is eccentric. It is
 * the wrong tool here: the analyst's ranking is a consensus, not an outcome, and a blend that
 * moved us toward the truth and away from him would score as a regression. So this measures
 * against what actually happened next — the only judge that cannot be argued with.
 *
 * WHY IT RUNS THE PIPELINE. The blend is applied to a raw season and then passes through the
 * three-season weighting, the aging curve, the rate model's shrinkage and the shooting
 * regression before it reaches a rank. Every one of those damps it, and shootingRegression
 * attacks the same finishing noise xG does — so a weight measured on goals alone is a weight
 * measured on a model we do not ship. Both of the two constants that had to be recalibrated
 * this month (plus-minus, save percentage) were measured exactly that way.
 *
 * WHAT IT REPORTS. Correlation between the pre-season projected per-game rate and the rate the
 * player actually posted, weighted by the games he played in the season being predicted — an
 * unweighted r lets a man with four games count like a man with eighty.
 *
 * Run: npx vite-node scripts/hockey-xg-sweep.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { rateSkaters } from '@/hockey/nhlRates'
import { blendSeasons, PRIOR_WEIGHTS } from '@/hockey/blendSeasons'
import { ageFactor, ageAtSeason } from '@/hockey/agingCurve'
import { regressShooting } from '@/hockey/shootingRegression'
import { blendExpectedGoals, type ExpectedGoals } from '@/hockey/expectedGoals'

const RELAY = process.env.RELAY ?? 'http://localhost:5173/api/nhl-stats'
const MP = process.env.MP ?? 'http://localhost:5173/api/moneypuck'
const CACHE = '.cache/xg-sweep'
const YEARS = [2021, 2022, 2023, 2024, 2025]
const sid = (y: number) => `${y}${y + 1}`

mkdirSync(CACHE, { recursive: true })

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const f = `${CACHE}/${key}.json`
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'))
  const v = await load()
  writeFileSync(f, JSON.stringify(v))
  return v
}

async function page(report: string, season: string): Promise<any[]> {
  return cached(`${report.replace(/\//g, '-')}-${season}`, async () => {
    for (let i = 0; i < 6; i++) {
      try {
        const r = await fetch(`${RELAY}?report=${encodeURIComponent(report)}&seasonId=${season}`)
        const type = r.headers.get('content-type') ?? ''
        if (r.ok && /json/i.test(type)) {
          const j: any = await r.json()
          if (Array.isArray(j?.data) && j.data.length) return j.data
        }
      } catch { /* retry */ }
      process.stderr.write(`    retry ${report} ${season} (${i + 1})\n`)
      await new Promise((res) => setTimeout(res, 2000 * 2 ** i))
    }
    throw new Error(`relay gave no data for ${report} ${season}`)
  })
}

async function xgFor(year: number): Promise<Map<number, ExpectedGoals>> {
  const rows: any[] = await cached(`moneypuck-${year}`, async () => {
    const r = await fetch(`${MP}?season=${year}`)
    const type = r.headers.get('content-type') ?? ''
    if (!r.ok || !/json/i.test(type)) throw new Error(`moneypuck ${year}: HTTP ${r.status} ${type}`)
    const j: any = await r.json()
    if (!Array.isArray(j?.players) || !j.players.length) throw new Error(`moneypuck ${year}: no players`)
    return j.players
  })
  return new Map(rows.map((p) => [p.playerId, { xGoals: p.xGoals, gamesPlayed: p.gamesPlayed }]))
}

/* Every season, merged exactly as the loader merges them. */
async function season(y: number, withIce: boolean) {
  /* Sequential. Three concurrent reports per season is enough to get the relay's upstream to
     answer with a throttle page instead of a status code, which costs the whole run. */
  const sum = await page('skater/summary', sid(y))
  const rt = await page('skater/realtime', sid(y))
  const ice = withIce ? await page('skater/timeonice', sid(y)) : []
  const by = new Map(rt.map((r: any) => [r.playerId, r]))
  return {
    year: y,
    ice,
    full: sum.map((r: any) => ({
      ...r,
      hits: by.get(r.playerId)?.hits ?? 0,
      blockedShots: by.get(r.playerId)?.blockedShots ?? 0,
    })),
  }
}

const seasons = new Map<number, Awaited<ReturnType<typeof season>>>()
for (const y of YEARS) {
  /* Ice time only for the seasons a projection is actually built from — the loader fetches it
     for one season and reuses it, because power-play minutes are the most stable thing about a
     player across a summer. */
  seasons.set(y, await season(y, y === 2023 || y === 2024))
  process.stderr.write(`  ${sid(y)}: ${seasons.get(y)!.full.length} skaters\n`)
}

const xg = new Map<number, Map<number, ExpectedGoals>>()
for (const y of YEARS) {
  xg.set(y, await xgFor(y))
  process.stderr.write(`  moneypuck ${y}: ${xg.get(y)!.size} skaters\n`)
}

const bios = await page('skater/bios', sid(2024))
const bornById = new Map<number, string>()
for (const b of bios as any[]) if (b.birthDate) bornById.set(b.playerId, b.birthDate)
process.stderr.write(`  birth dates: ${bornById.size}\n`)

/* EVERY LAYER MUST BE PRESENT OR THE RUN IS A LIE. Each of these has degraded silently at
   least once this month and produced a confident no-op: a sweep showing "no effect at any
   setting" because the thing being swept was never applied. */
if (bornById.size < 500) throw new Error(`only ${bornById.size} birth dates — aging would be skipped`)
for (const y of YEARS) {
  if ((xg.get(y)?.size ?? 0) < 500) throw new Error(`moneypuck ${y} has ${xg.get(y)?.size} rows — blend would be a no-op`)
  if (seasons.get(y)!.full.length < 700) throw new Error(`${sid(y)} has ${seasons.get(y)!.full.length} skaters — feed is short`)
}

const AGED = ['goals', 'assists', 'points', 'plusMinus', 'penaltyMinutes', 'ppPoints',
              'shots', 'hits', 'blockedShots', 'ppGoals', 'shGoals', 'shPoints']
const COUNTERS = AGED

function agedForSeason(rows: any[], from: number, to: number) {
  return rows.map((p) => {
    const was = ageAtSeason(bornById.get(p.playerId), from)
    if (was == null) return p
    const f = ageFactor(was, was + (to - from))
    if (f === 1) return p
    const out: any = { ...p }
    for (const k of AGED) if (typeof out[k] === 'number') out[k] = out[k] * f
    return out
  })
}

/** Weighted Pearson r. */
function wr(pairs: { x: number; y: number; w: number }[]) {
  const W = pairs.reduce((s, p) => s + p.w, 0)
  const mx = pairs.reduce((s, p) => s + p.w * p.x, 0) / W
  const my = pairs.reduce((s, p) => s + p.w * p.y, 0) / W
  let sxy = 0, sxx = 0, syy = 0
  for (const p of pairs) {
    sxy += p.w * (p.x - mx) * (p.y - my)
    sxx += p.w * (p.x - mx) ** 2
    syy += p.w * (p.y - my) ** 2
  }
  return sxy / Math.sqrt(sxx * syy)
}

/**
 * Project season `target` from the three before it, at one xG weight, and score it against
 * what happened.
 */
function run(target: number, weight: number, ablate: { oneSeason?: boolean; noShootingRegression?: boolean } = {}) {
  const years = ablate.oneSeason ? [target - 1] : [target - 1, target - 2, target - 3]
  const priors = years.map((y) => {
    const s = seasons.get(y)!
    /* Blended BEFORE aging and weighting, which is where the loader does it. */
    return agedForSeason(blendExpectedGoals(s.full as any, xg.get(y)!, weight) as any, y, target)
  })

  const blended = blendSeasons(priors as any, PRIOR_WEIGHTS.slice(0, priors.length)) as any[]
  /* The roster is the most recent prior season's, as the loader does — older seasons inform a
     rate and never add a player who is no longer in the league. */
  const active = new Set(seasons.get(target - 1)!.full.map((r: any) => r.playerId))
  const prior = blended.filter((r: any) => active.has(r.playerId))

  /* Pre-season: no games yet, so the rate IS the prior. This is opening night. */
  const zeroed = prior.map((r: any) => ({
    ...r, ...Object.fromEntries(COUNTERS.map((c) => [c, 0])), gamesPlayed: 0,
  }))
  const rated = rateSkaters(zeroed as any, seasons.get(target - 1)!.ice as any, prior as any)
  /* persistence 1 IS no regression: the finishing rate is left exactly as the prior had it. */
  const rates = regressShooting(rated, ablate.noShootingRegression ? 1 : undefined)

  const actual = new Map(seasons.get(target)!.full.map((r: any) => [r.playerId, r]))
  const goals: { x: number; y: number; w: number }[] = []
  const points: { x: number; y: number; w: number }[] = []
  for (const r of rates as any[]) {
    const a: any = actual.get(r.playerId)
    if (!a || !(a.gamesPlayed >= 20)) continue
    goals.push({ x: r.perGame.goals, y: a.goals / a.gamesPlayed, w: a.gamesPlayed })
    points.push({ x: r.perGame.points, y: a.points / a.gamesPlayed, w: a.gamesPlayed })
  }
  return { n: goals.length, goals: wr(goals), points: wr(points) }
}

const TARGETS = [2024, 2025]
const WEIGHTS = [0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1]

process.stdout.write('\n  weight   ' + TARGETS.map((t) => `G ${t}   P ${t} `).join('  ') + '   mean G   mean P\n')
const table: { w: number; g: number; p: number }[] = []
for (const w of WEIGHTS) {
  const rs = TARGETS.map((t) => run(t, w))
  const g = rs.reduce((s, r) => s + r.goals, 0) / rs.length
  const p = rs.reduce((s, r) => s + r.points, 0) / rs.length
  table.push({ w, g, p })
  process.stdout.write(
    `   ${w.toFixed(2)}    ` +
    rs.map((r) => `${r.goals.toFixed(3)}  ${r.points.toFixed(3)}`).join('  ') +
    `    ${g.toFixed(3)}    ${p.toFixed(3)}\n`,
  )
}
const bestG = table.reduce((a, b) => (b.g > a.g ? b : a))
const bestP = table.reduce((a, b) => (b.p > a.p ? b : a))
process.stdout.write(`\n  n = ${run(2025, 0).n} skaters with 20+ games in the predicted season\n`)
process.stdout.write(`  best for goals: ${bestG.w} (${bestG.g.toFixed(3)} vs ${table[0].g.toFixed(3)} at zero)\n`)
process.stdout.write(`  best for points: ${bestP.w} (${bestP.p.toFixed(3)} vs ${table[0].p.toFixed(3)} at zero)\n`)


/*
 * WHICH LAYER ABSORBS IT.
 *
 * The blend measured a real gain on a single season's goals and almost none through the
 * shipped pipeline. That is either redundancy — the machinery already removes the noise xG
 * removes — or a wiring fault making the blend weaker than it looks. These four rows tell them
 * apart: if the gain reappears once the three-season blend and the shooting regression are
 * taken out, the blend works and the pipeline had already done its job.
 */
const ABLATIONS: { label: string; a: { oneSeason?: boolean; noShootingRegression?: boolean } }[] = [
  { label: 'shipped (3 seasons + regression)', a: {} },
  { label: 'one season, regression on     ', a: { oneSeason: true } },
  { label: '3 seasons, no regression      ', a: { noShootingRegression: true } },
  { label: 'one season, no regression     ', a: { oneSeason: true, noShootingRegression: true } },
]
process.stdout.write('\n  ablation                            G at 0   G at 0.5    gain\n')
for (const { label, a } of ABLATIONS) {
  const at = (w: number) =>
    TARGETS.map((t) => run(t, w, a).goals).reduce((s, v) => s + v, 0) / TARGETS.length
  const z = at(0), h = at(0.5)
  process.stdout.write(`  ${label}      ${z.toFixed(3)}     ${h.toFixed(3)}   ${(h - z >= 0 ? '+' : '')}${(h - z).toFixed(3)}\n`)
}


/*
 * THE VARIANT THE ABLATION LEAVES OPEN.
 *
 * Above, the xG blend and the shooting regression turn out to be substitutes: each removes the
 * same finishing noise, and running both buys nothing over running either. That is what you
 * would expect, because they are two ways of answering one question — how much of this man's
 * shooting percentage is real?
 *
 * The regression answers it by pulling him toward his POSITION's mean. xG can answer it by
 * pulling him toward HIS OWN chance quality, which is strictly more information: two forwards
 * who both shot 18% get the same haircut from a positional mean and very different ones from
 * their own expected goals per shot, because one of them was shooting from the slot. So this
 * does not blend at all — it swaps the shrinkage target and re-sweeps the persistence, since a
 * better target changes how far it is right to pull.
 */
function runXgTarget(target: number, persistence: number) {
  const years = [target - 1, target - 2, target - 3]
  const priors = years.map((y) => agedForSeason(seasons.get(y)!.full as any, y, target))
  const blended = blendSeasons(priors as any, PRIOR_WEIGHTS) as any[]
  const active = new Set(seasons.get(target - 1)!.full.map((r: any) => r.playerId))
  const prior = blended.filter((r: any) => active.has(r.playerId))

  /* Expected goals per shot, weighted over the same seasons at the same weights the prior uses
     — so the target describes the same span of a career the rate does. */
  const xgPerShot = new Map<number, number>()
  {
    const acc = new Map<number, { xg: number; sh: number }>()
    years.forEach((y, i) => {
      const w = PRIOR_WEIGHTS[i]
      const shotsBy = new Map(seasons.get(y)!.full.map((r: any) => [r.playerId, r.shots ?? 0]))
      for (const [id, mp] of xg.get(y)!) {
        const sh = Number(shotsBy.get(id) ?? 0)
        if (!(sh > 0) || !(mp.xGoals >= 0)) continue
        const a = acc.get(id) ?? { xg: 0, sh: 0 }
        a.xg += mp.xGoals * w; a.sh += sh * w
        acc.set(id, a)
      }
    })
    for (const [id, a] of acc) if (a.sh > 0) xgPerShot.set(id, a.xg / a.sh)
  }

  const zeroed = prior.map((r: any) => ({
    ...r, ...Object.fromEntries(COUNTERS.map((c) => [c, 0])), gamesPlayed: 0,
  }))
  const rated = rateSkaters(zeroed as any, seasons.get(target - 1)!.ice as any, prior as any)

  /* Pooled positional means, for the players xG cannot supply a target for. */
  const pooled = new Map<string, { g: number; s: number }>()
  for (const r of rated as any[]) {
    const k = String(r.position ?? '').toUpperCase() === 'D' ? 'D' : 'F'
    const t = pooled.get(k) ?? { g: 0, s: 0 }
    t.g += r.perGame.goals; t.s += r.perGame.shots
    pooled.set(k, t)
  }

  const rates = (rated as any[]).map((r) => {
    const shots = r.perGame?.shots ?? 0
    if (!(shots >= 0.5)) return r
    const k = String(r.position ?? '').toUpperCase() === 'D' ? 'D' : 'F'
    const pool = pooled.get(k)!
    const own = r.perGame.goals / shots
    /* His own chance quality where we have it, his position's mean where we do not. */
    const aim = xgPerShot.get(r.playerId) ?? pool.g / pool.s
    return { ...r, perGame: { ...r.perGame, goals: shots * (aim + (own - aim) * persistence) } }
  })

  const actual = new Map(seasons.get(target)!.full.map((r: any) => [r.playerId, r]))
  const goals: { x: number; y: number; w: number }[] = []
  const points: { x: number; y: number; w: number }[] = []
  for (const r of rates) {
    const a: any = actual.get(r.playerId)
    if (!a || !(a.gamesPlayed >= 20)) continue
    goals.push({ x: r.perGame.goals, y: a.goals / a.gamesPlayed, w: a.gamesPlayed })
    points.push({ x: r.perGame.points, y: a.points / a.gamesPlayed, w: a.gamesPlayed })
  }
  return { goals: wr(goals), points: wr(points), targets: xgPerShot.size }
}

process.stdout.write('\n  xG as the shrinkage target, by how much of his own finishing survives\n')
process.stdout.write('  persistence   G 2024   G 2025   mean G   mean P\n')
for (const pr of [0.3, 0.4, 0.5, 0.64, 0.8]) {
  const rs = TARGETS.map((t) => runXgTarget(t, pr))
  const g = rs.reduce((s, r) => s + r.goals, 0) / rs.length
  const p = rs.reduce((s, r) => s + r.points, 0) / rs.length
  process.stdout.write(`     ${pr.toFixed(2)}        ` +
    rs.map((r) => r.goals.toFixed(3)).join('    ') + `    ${g.toFixed(3)}    ${p.toFixed(3)}\n`)
}
process.stdout.write(`\n  players with an xG target: ${runXgTarget(2025, 0.5).targets}\n`)
process.stdout.write(`  shipped board, for comparison: G ${(TARGETS.map((t) => run(t, 0).goals).reduce((s, v) => s + v, 0) / 2).toFixed(3)}   P ${(TARGETS.map((t) => run(t, 0).points).reduce((s, v) => s + v, 0) / 2).toFixed(3)}\n`)
