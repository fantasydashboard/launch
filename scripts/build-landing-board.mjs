#!/usr/bin/env node
/**
 * Refresh the landing page's draft-board snapshot from live Sleeper data.
 *
 * The hero table compares our rank against Sleeper ADP. Hand-written, it was wrong within
 * days (ADP moves all preseason) and the first version was invented outright. Fetching it in
 * the browser is not an option either: the season-projection payload is ~8.6MB and the player
 * dictionary ~14MB, which is an absurd amount to load on a marketing page.
 *
 * So it runs at BUILD time. Every deploy refreshes the numbers; the page ships four rows of
 * JSON. If Sleeper is unreachable the existing committed snapshot is kept and the build
 * carries on — a stale board is bad, a failed deploy is worse.
 *
 * Method (matches src/draft/room/marketDisagreement.ts and the VOR engine's shape):
 *   ADP   Sleeper's own adp_half_ppr, converted to round.pick at 12 teams.
 *   Ours  pts_half_ppr + 0.5 x bonus_rec_te (Sleeper's own TE-premium key), ranked by
 *         value over replacement for a 12-team 1QB/2RB/3WR/1TE/1FLEX lineup.
 *   Flag  fires at one full round: rounds = (adpRank - ourRank) / teams.
 */
import { writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/landingBoard.json')
const TEAMS = 12
const REPLACEMENT = { QB: 12, RB: 30, WR: 42, TE: 12 }
const SEASON = String(new Date().getFullYear())

const roundPick = (overall) => {
  const o = Math.round(overall)
  return `${Math.floor((o - 1) / TEAMS) + 1}.${String(((o - 1) % TEAMS) + 1).padStart(2, '0')}`
}

async function getJson(url, ms = 45000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctl.signal })
    if (!res.ok) throw new Error(`${res.status} ${url}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

function build(proj, players) {
  const rows = []
  for (const entry of proj) {
    const stats = entry?.stats ?? {}
    const meta = players[String(entry?.player_id)] ?? {}
    const pos = meta.position
    if (!['QB', 'RB', 'WR', 'TE'].includes(pos) || !meta.full_name) continue
    if (meta.status && meta.status !== 'Active') continue
    const half = stats.pts_half_ppr
    if (typeof half !== 'number') continue
    const adp = typeof stats.adp_half_ppr === 'number' && stats.adp_half_ppr < 900 ? stats.adp_half_ppr : null
    rows.push({
      name: meta.full_name,
      pos,
      adp,
      // TE premium is applied with Sleeper's own TE-reception key, not a guess.
      points: half + 0.5 * (stats.bonus_rec_te ?? 0),
    })
  }

  // Value over replacement, per position.
  const byPos = {}
  for (const r of rows) (byPos[r.pos] ??= []).push(r)
  const replacementPoints = {}
  for (const [pos, list] of Object.entries(byPos)) {
    list.sort((a, b) => b.points - a.points)
    replacementPoints[pos] = list[Math.min(REPLACEMENT[pos], list.length) - 1]?.points ?? 0
  }
  for (const r of rows) r.vor = r.points - replacementPoints[r.pos]

  const ourOrder = [...rows].sort((a, b) => b.vor - a.vor)
  ourOrder.forEach((r, i) => (r.ourRank = i + 1))
  const adpOrder = rows.filter((r) => r.adp !== null).sort((a, b) => a.adp - b.adp)
  adpOrder.forEach((r, i) => (r.adpRank = i + 1))

  // Rounds 3-6 by ADP is where our order and the market actually diverge; the top of any
  // board is where they agree, which is the worst place to demonstrate a disagreement.
  const mid = adpOrder.filter((r) => r.adpRank >= 25 && r.adpRank <= 72)
  for (const r of mid) r.rounds = (r.adpRank - r.ourRank) / TEAMS

  /*
   * Pick believable and recognisable, not extreme.
   *
   * Sorting by the largest disagreement surfaces outliers — the first run produced Josh
   * Jacobs at MINUS 12.4 ROUNDS, which is a real number (his projection collapsed) but reads
   * as a broken table, and Parker Washington, whose name means nothing to a visitor. A
   * disagreement of one to three rounds is the interesting band: big enough to matter, small
   * enough to be an opinion rather than a data artifact. Within it, earliest ADP wins,
   * because ADP order is a decent proxy for who the reader has actually heard of.
   */
  const BAND = (r) => Math.abs(r.rounds) >= 1 && Math.abs(r.rounds) <= 3
  const byFame = (a, b) => a.adpRank - b.adpRank
  const values = mid.filter((r) => r.rounds >= 1 && BAND(r)).sort(byFame)
  const fades = mid.filter((r) => r.rounds <= -1 && BAND(r)).sort(byFame)
  const inline = mid
    .filter((r) => Math.abs(r.rounds) < 0.15)
    .sort(byFame)

  // Two values, one fade, one in-line. The in-line row is the point: the flag is rare, and a
  // board where every row is flagged carries as much information as one where none is.
  const picked = [...values.slice(0, 2), ...fades.slice(0, 1), ...inline.slice(0, 1)].filter(Boolean)
  if (picked.length < 4) throw new Error(`only ${picked.length} usable rows`)

  return {
    generatedAt: new Date().toISOString().slice(0, 10),
    season: SEASON,
    teams: TEAMS,
    rows: picked
      .sort((a, b) => a.adpRank - b.adpRank)
      .map((r) => ({
        name: r.name,
        pos: r.pos,
        adp: roundPick(r.adpRank),
        ours: roundPick(r.ourRank),
        rounds: Number(r.rounds.toFixed(1)),
        flag: r.rounds >= 1 ? 'value' : r.rounds <= -1 ? 'fade' : '',
      })),
  }
}

try {
  const [proj, players] = await Promise.all([
    getJson(`https://api.sleeper.app/projections/nfl/${SEASON}?season_type=regular`),
    getJson('https://api.sleeper.app/v1/players/nfl'),
  ])
  const out = build(proj, players)
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
  console.log(`[landing-board] ${SEASON} refreshed:`, out.rows.map((r) => `${r.name} ${r.flag || 'in line'}`).join(' | '))
} catch (err) {
  const msg = err?.message || String(err)
  if (existsSync(OUT)) {
    console.warn(`[landing-board] refresh failed (${msg}) — keeping the committed snapshot.`)
  } else {
    console.error(`[landing-board] refresh failed and no snapshot exists: ${msg}`)
    process.exit(1)
  }
}
