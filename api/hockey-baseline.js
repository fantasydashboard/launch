// api/hockey-baseline.js
//
// 5v5 Hockey's free rest-of-season projections, reduced to per-game rates for the hockey
// baseline blend (src/hockey/baselineBlend.ts). Both tables are embedded in their pages as
// `const tableData = [...]`. At most one pull per day reaches them (s-maxage=86400).
//
// Rates come from the FULL-SEASON columns divided by 84 games. Their rest-of-season columns
// zero out about 70 skaters and give the rest a flat 84 games, so they are not usable as totals.
// Anything that doesn't look like their real table is a 502, never a partial baseline.

const SKATERS_URL = 'https://5v5hockey.com/ros-projections-embedded/'
const GOALIES_URL = 'https://5v5hockey.com/goalie-ros-projections-embedded/'
const SEASON_GP = 84
const MIN_SKATERS = 300
const SKATER_KEYS = { goals: 'g', assists: 'a', plusMinus: 'plus_minus', penaltyMinutes: 'pim',
  ppPoints: 'ppp', shots: 'sog', hits: 'hit', blockedShots: 'blk' }

export function extractTableData(html) {
  const marker = 'const tableData = '
  const i = typeof html === 'string' ? html.indexOf(marker) : -1
  if (i < 0) return null
  const start = i + marker.length
  if (html[start] !== '[') return null
  // Scan to the bracket that closes the array, skipping over JSON strings so a "];" inside a
  // value cannot end it early.
  let depth = 0, inStr = false
  for (let p = start; p < html.length; p++) {
    const c = html[p]
    if (inStr) {
      if (c === '\\') p++
      else if (c === '"') inStr = false
    } else if (c === '"') inStr = true
    else if (c === '[') depth++
    else if (c === ']' && --depth === 0) {
      try {
        const rows = JSON.parse(html.slice(start, p + 1))
        return Array.isArray(rows) ? rows : null
      } catch { return null }
    }
  }
  return null
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export function toBaseline(skaterRows, goalieRows, fetchedAt) {
  const skaters = []
  const seen = new Set()
  for (const r of skaterRows ?? []) {
    const id = num(r?.player_nhl_id)
    if (id === null || seen.has(id)) continue
    const perGame = {}
    let ok = true, any = false
    for (const [cat, k] of Object.entries(SKATER_KEYS)) {
      const v = num(r[`${k}_season_proj`])
      if (v === null) { ok = false; break }
      if (v !== 0) any = true
      perGame[cat] = v / SEASON_GP
    }
    if (!ok || !any) continue
    seen.add(id)
    skaters.push({ playerId: id, name: String(r.player_name ?? ''), perGame })
  }
  const goalies = []
  const seenG = new Set()
  for (const g of goalieRows ?? []) {
    const id = num(g?.player_nhl_id), gs = num(g?.gs_season_proj)
    const w = num(g?.w_season_proj), so = num(g?.so_season_proj), sv = num(g?.sv_pct_season_proj)
    if (id === null || seenG.has(id) || !gs || gs <= 0 || w === null || so === null || sv === null) continue
    seenG.add(id)
    goalies.push({ playerId: id, name: String(g.player_name ?? ''), savePct: sv, winsPerStart: w / gs, shutoutsPerStart: so / gs })
  }
  return { fetchedAt, skaters, goalies }
}

async function page(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (UFD baseline; once daily)' } })
  if (!r.ok) throw new Error(`${url} -> ${r.status}`)
  return extractTableData(await r.text())
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  try {
    const [sk, gl] = await Promise.all([page(SKATERS_URL), page(GOALIES_URL)])
    if (!sk) return res.status(502).json({ error: 'skater table not found' })
    const baseline = toBaseline(sk, gl ?? [], new Date().toISOString())
    if (baseline.skaters.length < MIN_SKATERS) {
      return res.status(502).json({ error: `only ${baseline.skaters.length} usable skaters` })
    }
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=86400')
    return res.status(200).json(baseline)
  } catch (e) {
    return res.status(502).json({ error: String(e?.message ?? e) })
  }
}
