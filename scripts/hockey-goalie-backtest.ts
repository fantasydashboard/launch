/*
 * Does the goalie model actually predict next season?
 *
 * WHY THIS EXISTS. Measured against an analyst baseline over the same projections, our goalie
 * board recovered 5 of the actual top ten and the baseline recovered 8 — the only position
 * where we are worse, and worse under BOTH points and category scoring, which rules out a
 * scoring mismatch as the explanation. The misses are specific and all one shape:
 *
 *     Hellebuyck   we said 3rd    actually 17th
 *     Bobrovsky    we said 10th   actually 31st
 *
 * Both are good teams' starters, and both were given too many starts.
 *
 * So: project a season from the three before it with the SHIPPED function, score the result
 * against what actually happened, and sweep the constants against that. Nothing here
 * re-implements the model — a sweep of a local copy measures something we do not ship.
 *
 * Run: npx vite-node scripts/hockey-goalie-backtest.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { projectGoalies, START_PERSISTENCE, SAVE_PCT_PERSISTENCE, SHOTS_PERSISTENCE, WIN_RATE_PERSISTENCE, type GoalieSeason } from '@/hockey/goalieProjection'

/* Production's relay, not localhost: the NHL rate-limits by IP and this machine has spent the
   day exporting boards. Vercel's egress has not. */
const RELAY = process.env.RELAY ?? 'https://www.ultimatefantasydashboard.com/api/nhl-stats'
const CACHE = '.cache/goalie-backtest'
mkdirSync(CACHE, { recursive: true })
const sid = (y: number) => `${y}${y + 1}`

async function season(year: number): Promise<GoalieSeason[]> {
  const f = `${CACHE}/goalie-${year}.json`
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'))
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(`${RELAY}?report=${encodeURIComponent('goalie/summary')}&seasonId=${sid(year)}`)
      const type = r.headers.get('content-type') ?? ''
      if (r.ok && /json/i.test(type)) {
        const j: any = await r.json()
        if (Array.isArray(j?.data) && j.data.length) {
          writeFileSync(f, JSON.stringify(j.data))
          return j.data
        }
      }
    } catch { /* retry */ }
    process.stderr.write(`    retry goalies ${year} (${i + 1})\n`)
    await new Promise((d) => setTimeout(d, 1500 * 2 ** i))
  }
  throw new Error(`no goalie data for ${year}`)
}

const YEARS = [2021, 2022, 2023, 2024, 2025]
const data = new Map<number, GoalieSeason[]>()
for (const y of YEARS) {
  data.set(y, await season(y))
  process.stderr.write(`  ${sid(y)}: ${data.get(y)!.length} goalies\n`)
}
for (const y of YEARS) if ((data.get(y)?.length ?? 0) < 60) throw new Error(`${sid(y)} short — refusing to report`)

/* The two currencies a goalie is actually judged in. */
const sitePoints = (g: { wins: number; saves: number; goalsAgainst: number; shutouts: number }) =>
  g.wins * 4 + g.saves * 0.2 - g.goalsAgainst + g.shutouts * 3
const baseCats = (g: { wins: number; saves: number; goalsAgainst: number; shutouts: number }) =>
  g.wins * 5 + g.shutouts * 5 + g.saves * 0.6 - g.goalsAgainst * 3

const actualOf = (r: GoalieSeason) => ({
  wins: Number(r.wins) || 0, saves: Number(r.saves) || 0,
  goalsAgainst: Number(r.goalsAgainst) || 0, shutouts: Number(r.shutouts) || 0,
})

function rank<T>(items: T[], score: (t: T) => number): Map<number, number> {
  const s = [...items].sort((a: any, b: any) => score(b) - score(a))
  return new Map(s.map((x: any, i) => [x.playerId, i + 1]))
}

function scoreOne(target: number, opts: any = {}, weights: number[] = [6, 3, 1]) {
  const priors = [target - 1, target - 2, target - 3].map((y) => data.get(y)!)
  const proj = projectGoalies(priors, weights, undefined, opts)
  /* Only goalies who actually started next season can be scored; one who never played is not a
     ranking error, he is absent from the question. */
  const actual = new Map((data.get(target)! as GoalieSeason[])
    .filter((r) => (Number(r.gamesStarted) || 0) >= 10)
    .map((r) => [r.playerId, actualOf(r)]))
  const scored = proj.filter((p) => actual.has(p.playerId))
  if (scored.length < 20) return null

  const out: Record<string, number> = { n: scored.length }
  for (const [label, fn] of [['points', sitePoints], ['cats', baseCats]] as const) {
    const ours = rank(scored, (p: any) => fn(p))
    const real = rank(scored, (p: any) => fn(actual.get(p.playerId)!))
    const ids = scored.map((p) => p.playerId)
    const n = ids.length
    const d2 = ids.reduce((s, id) => s + (ours.get(id)! - real.get(id)!) ** 2, 0)
    out[`rho_${label}`] = 1 - (6 * d2) / (n * (n * n - 1))
    const top = new Set(ids.filter((id) => ours.get(id)! <= 10))
    const realTop = new Set(ids.filter((id) => real.get(id)! <= 10))
    out[`top10_${label}`] = [...top].filter((id) => realTop.has(id)).length
    out[`mae_${label}`] = ids.reduce((s, id) => s + Math.abs(ours.get(id)! - real.get(id)!), 0) / n
  }
  return out
}

const TARGETS = [2024, 2025]
console.log('\n  CURRENT MODEL — projecting each season from the three before it\n')
console.log('  target   n    rho(pts)  top10(pts)  MAE(pts)   rho(cat)  top10(cat)  MAE(cat)')
const base: any[] = []
for (const t of TARGETS) {
  const r = scoreOne(t, {})
  if (!r) { console.log(`  ${t}: too few goalies`); continue }
  base.push(r)
  console.log(`  ${t}   ${String(r.n).padStart(3)}    ${r.rho_points.toFixed(3)}     ${String(r.top10_points).padStart(2)}/10     ${r.mae_points.toFixed(1).padStart(5)}      ${r.rho_cats.toFixed(3)}     ${String(r.top10_cats).padStart(2)}/10     ${r.mae_cats.toFixed(1).padStart(5)}`)
}
const mean = (k: string) => base.reduce((s, r) => s + r[k], 0) / base.length
console.log(`\n  mean: rho(pts) ${mean('rho_points').toFixed(3)}  top10(pts) ${mean('top10_points').toFixed(1)}/10  |  rho(cat) ${mean('rho_cats').toFixed(3)}  top10(cat) ${mean('top10_cats').toFixed(1)}/10`)
console.log(`\n  shipped constants: START ${START_PERSISTENCE}  SAVE% ${SAVE_PCT_PERSISTENCE}  SHOTS ${SHOTS_PERSISTENCE}  WIN ${WIN_RATE_PERSISTENCE}`)

/*
 * WHERE IS THE ERROR?
 *
 * A goalie's fantasy season is starts x per-start production. Those are two different claims
 * and only one of them can be the problem. Handing the model the starts he ACTUALLY made —
 * through the depth-chart seam it already has — isolates them: if the board snaps into place,
 * the rate model is fine and the job projection is the whole failure.
 */
function withPerfectStarts(target: number) {
  const priors = [target - 1, target - 2, target - 3].map((y) => data.get(y)!)
  const actualRows = (data.get(target)! as GoalieSeason[]).filter((r) => (Number(r.gamesStarted) || 0) >= 10)
  const perfect = new Map(actualRows.map((r) => [r.playerId, Number(r.gamesStarted) || 0]))
  const proj = projectGoalies(priors, [6, 3, 1], perfect)
  const actual = new Map(actualRows.map((r) => [r.playerId, actualOf(r)]))
  const scored = proj.filter((p) => actual.has(p.playerId) && perfect.has(p.playerId))
  const out: Record<string, number> = { n: scored.length }
  for (const [label, fn] of [['points', sitePoints], ['cats', baseCats]] as const) {
    const ours = rank(scored, (p: any) => fn(p))
    const real = rank(scored, (p: any) => fn(actual.get(p.playerId)!))
    const ids = scored.map((p) => p.playerId); const n = ids.length
    const d2 = ids.reduce((s, id) => s + (ours.get(id)! - real.get(id)!) ** 2, 0)
    out[`rho_${label}`] = 1 - (6 * d2) / (n * (n * n - 1))
    const top = new Set(ids.filter((id) => ours.get(id)! <= 10))
    const realTop = new Set(ids.filter((id) => real.get(id)! <= 10))
    out[`top10_${label}`] = [...top].filter((id) => realTop.has(id)).length
  }
  return out
}

console.log('\n  GIVEN THE STARTS HE ACTUALLY MADE, how good is the rest of the model?\n')
console.log('  target   rho(pts)  top10(pts)   rho(cat)  top10(cat)')
const perf: any[] = []
for (const t of TARGETS) {
  const r = withPerfectStarts(t); perf.push(r)
  console.log(`  ${t}    ${r.rho_points.toFixed(3)}     ${String(r.top10_points).padStart(2)}/10      ${r.rho_cats.toFixed(3)}     ${String(r.top10_cats).padStart(2)}/10`)
}
const pm = (k: string) => perf.reduce((s, r) => s + r[k], 0) / perf.length
console.log(`\n  mean with perfect starts: rho(pts) ${pm('rho_points').toFixed(3)}  top10 ${pm('top10_points').toFixed(1)}/10`)
console.log(`  mean as shipped:          rho(pts) ${mean('rho_points').toFixed(3)}  top10 ${mean('top10_points').toFixed(1)}/10`)

/* And how well do we predict the starts themselves? */
console.log('\n  STARTS, PREDICTED vs ACTUAL')
for (const t of TARGETS) {
  const priors = [t - 1, t - 2, t - 3].map((y) => data.get(y)!)
  const proj = projectGoalies(priors, [6, 3, 1])
  const actual = new Map((data.get(t)! as GoalieSeason[]).map((r) => [r.playerId, Number(r.gamesStarted) || 0]))
  const pairs = proj.filter((p) => (actual.get(p.playerId) ?? 0) >= 10)
    .map((p) => ({ p: p.starts, a: actual.get(p.playerId)! }))
  const mx = pairs.reduce((s, x) => s + x.p, 0) / pairs.length
  const my = pairs.reduce((s, x) => s + x.a, 0) / pairs.length
  const sxy = pairs.reduce((s, x) => s + (x.p - mx) * (x.a - my), 0)
  const sxx = pairs.reduce((s, x) => s + (x.p - mx) ** 2, 0)
  const syy = pairs.reduce((s, x) => s + (x.a - my) ** 2, 0)
  console.log(`  ${t}: n=${pairs.length}  r=${(sxy / Math.sqrt(sxx * syy)).toFixed(3)}  mean projected ${mx.toFixed(1)} vs actual ${my.toFixed(1)}`)
}


/*
 * THE SWEEP. Starts are the whole error, so these are the two knobs that set them: how much of
 * a goalie's own share of the net carries, and who counts as competing for it.
 */
function meanOver(opts: any, key: string) {
  const rs = TARGETS.map((t) => scoreOne(t, opts)).filter(Boolean) as any[]
  return rs.reduce((s, r) => s + r[key], 0) / rs.length
}
console.log('\n  SWEEP — rho(points), mean of both seasons\n')
const POOL = [0, 5, 10, 15, 20]
const START = [0.7, 0.8, 0.85, 0.9, 0.95, 1.0]
process.stdout.write('  minStarts \\ startP   ' + START.map((p) => p.toFixed(2).padStart(6)).join('') + '\n')
let best = { rho: -1, pool: 0, start: 0 }
for (const pool of POOL) {
  const cells: string[] = []
  for (const start of START) {
    const rho = meanOver({ minStartsForPool: pool, startPersistence: start }, 'rho_points')
    if (rho > best.rho) best = { rho, pool, start }
    cells.push(rho.toFixed(3).padStart(6))
  }
  process.stdout.write(`  ${String(pool).padStart(9)}          ${cells.join('')}\n`)
}
console.log(`\n  best: minStartsForPool=${best.pool}  startPersistence=${best.start}  rho ${best.rho.toFixed(3)}`)
console.log(`  shipped (0, 0.80): rho ${meanOver({ minStartsForPool: 0, startPersistence: 0.8 }, 'rho_points').toFixed(3)}`)
const b = { minStartsForPool: best.pool, startPersistence: best.start }
console.log(`  top10 at best: ${meanOver(b, 'top10_points').toFixed(1)}/10   (shipped ${meanOver({}, 'top10_points').toFixed(1)}/10)`)
console.log(`  rho(cats) at best: ${meanOver(b, 'rho_cats').toFixed(3)}   (shipped ${meanOver({}, 'rho_cats').toFixed(3)})`)


/*
 * HOW MUCH HISTORY SHOULD A JOB PROJECTION USE?
 *
 * The persistence constants turned out to be flat, so the lever is not how hard we regress — it
 * is what we regress FROM. A goalie's job is recent news: three seasons ago he may have been a
 * starter on another club, and blending that in describes a player who no longer exists. This
 * is the opposite of the skater prior, where more seasons is strictly better, because a skater's
 * talent persists and a goalie's employment does not.
 */
console.log('\n  HOW MUCH HISTORY — starts prediction and board quality\n')
const WEIGHT_SETS: Array<[string, number[]]> = [
  ['last season only      ', [1, 0, 0]],
  ['heavy recent  [9,2,1] ', [9, 2, 1]],
  ['shipped       [6,3,1] ', [6, 3, 1]],
  ['flat          [1,1,1] ', [1, 1, 1]],
  ['two seasons   [3,1,0] ', [3, 1, 0]],
]
console.log('  weights                 rho(pts)  top10(pts)  rho(cat)   starts r   mean starts')
for (const [label, w] of WEIGHT_SETS) {
  const rs = TARGETS.map((t) => scoreOne(t, {}, w)).filter(Boolean) as any[]
  const m = (k: string) => rs.reduce((s, r) => s + r[k], 0) / rs.length
  /* And how well those weights predict the starts themselves. */
  let rSum = 0, meanSum = 0
  for (const t of TARGETS) {
    const priors = [t - 1, t - 2, t - 3].map((y) => data.get(y)!)
    const proj = projectGoalies(priors, w)
    const actual = new Map((data.get(t)! as GoalieSeason[]).map((r) => [r.playerId, Number(r.gamesStarted) || 0]))
    const pairs = proj.filter((p) => (actual.get(p.playerId) ?? 0) >= 10).map((p) => ({ p: p.starts, a: actual.get(p.playerId)! }))
    const mx = pairs.reduce((s, x) => s + x.p, 0) / pairs.length
    const my = pairs.reduce((s, x) => s + x.a, 0) / pairs.length
    const sxy = pairs.reduce((s, x) => s + (x.p - mx) * (x.a - my), 0)
    const sxx = pairs.reduce((s, x) => s + (x.p - mx) ** 2, 0)
    const syy = pairs.reduce((s, x) => s + (x.a - my) ** 2, 0)
    rSum += sxy / Math.sqrt(sxx * syy); meanSum += mx
  }
  console.log(`  ${label}   ${m('rho_points').toFixed(3)}     ${m('top10_points').toFixed(1)}/10     ${m('rho_cats').toFixed(3)}     ${(rSum / TARGETS.length).toFixed(3)}      ${(meanSum / TARGETS.length).toFixed(1)}`)
}
console.log('  (actual mean starts for goalies with 10+: ~36.9)')
