/*
 * One week of the NHL schedule, priced in USABLE games, as JSON for the Monday schedule card.
 *
 * A raw game count says a four-game team beats a three-game team. It does not say whether the
 * man you add has a lineup spot on those nights — and on an 11+ game night about seven in ten
 * managers have none for a forward. See src/hockey/usableGames.ts for the measurement.
 *
 * THE BOARD IS RUN, NOT COPIED. hockey-board-export.ts is a CLI that builds at top level and
 * writes stdout, so this runs it as a child process rather than refactor a file the social
 * cards depend on byte-for-byte. The environment passes through, so MODE/TEAMS/SLOTS/WEIGHTS/
 * CACHE_DIR/BASE mean here what they mean there. One model, one place.
 *
 * Usage:  WEIGHTS='{...}' SLOTS='{...}' [FROM=YYYY-MM-DD TO=YYYY-MM-DD] npx vite-node scripts/hockey-usable-week-export.ts
 * FROM/TO default to the current Monday through Sunday. Diagnostics go to stderr.
 */
import { execFileSync } from 'node:child_process'
import { parseNhlNights } from '@/services/nhlSchedule'
import { openShare, usableFor, skaterPositions, DEFAULT_SKATER_SLOTS } from '@/hockey/usableGames'
import type { UsableRosterPlayer, SkaterPos } from '@/hockey/usableGames'

const BASE = process.env.BASE ?? 'https://www.ultimatefantasydashboard.com'
const LEAGUE_TEAMS = 12
const ROSTER_SKATERS = 13
const MIN_AT: Record<SkaterPos, number> = { C: 3, LW: 3, RW: 3, D: 4 }
const BUSY_AT = 11
const LIGHT_AT = 4

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function currentWeek(): { from: string; to: string } {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const from = iso(d)
  d.setDate(d.getDate() + 6)
  return { from, to: iso(d) }
}
const wk = currentWeek()
const FROM = process.env.FROM ?? wk.from
const TO = process.env.TO ?? wk.to

const res = await fetch(`${BASE}/api/nhl-stats?schedule=${FROM}`)
if (!res.ok) throw new Error(`schedule fetch failed: HTTP ${res.status}`)
const payload: any = await res.json()
const nights = parseNhlNights(payload, FROM, TO)

/* One canonical abbreviation per club: the schedule's own spelling, not the variants
   parseNhlNights keys for matching. Only counting game types, so a preseason club is not listed. */
const clubs = new Set<string>()
for (const day of payload?.gameWeek ?? []) {
  if (day?.date < FROM || day?.date > TO) continue
  for (const g of day.games ?? []) {
    if (![2, 3].includes(Number(g?.gameType))) continue
    for (const side of [g?.homeTeam?.abbrev, g?.awayTeam?.abbrev]) if (side) clubs.add(String(side))
  }
}

const raw = execFileSync('npx', ['vite-node', 'scripts/hockey-board-export.ts'], {
  env: { ...process.env, MODE: process.env.MODE ?? 'points', TEAMS: process.env.TEAMS ?? String(LEAGUE_TEAMS) },
  maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'],
}).toString()
const rows: any[] = JSON.parse(raw)

/* The pool: skaters with a rate to trust, best first by the board's own order. */
const pool = rows
  .filter((r) => r.pos !== 'G' && r.team && (r.games ?? 0) >= 20 && skaterPositions(r.eligible).length)
  .sort((a, b) => b.value - a.value)
  .map((r) => ({ key: String(r.sid), team: String(r.team).toUpperCase(), positions: skaterPositions(r.eligible), rate: r.projected / r.games }) as UsableRosterPlayer)

/* Snake draft by value. A team that would otherwise be unable to meet the position minimums in
   its remaining picks must take a man at a position it still needs. */
const rosters: UsableRosterPlayer[][] = Array.from({ length: LEAGUE_TEAMS }, () => [])
const have = (r: UsableRosterPlayer[]) => {
  const c: Record<SkaterPos, number> = { C: 0, LW: 0, RW: 0, D: 0 }
  for (const p of r) c[p.positions[0]]++
  return c
}
const taken = new Set<string>()
for (let round = 0; round < ROSTER_SKATERS; round++) {
  for (let i = 0; i < LEAGUE_TEAMS; i++) {
    const t = round % 2 === 0 ? i : LEAGUE_TEAMS - 1 - i
    const c = have(rosters[t])
    const needs = (Object.keys(MIN_AT) as SkaterPos[]).filter((p) => c[p] < MIN_AT[p])
    const deficit = needs.reduce((s, p) => s + MIN_AT[p] - c[p], 0)
    const mustFill = deficit >= ROSTER_SKATERS - rosters[t].length
    const pick = pool.find((p) => !taken.has(p.key) && (!mustFill || needs.includes(p.positions[0])))
    if (!pick) throw new Error('pool exhausted before the reference league filled')
    taken.add(pick.key)
    rosters[t].push(pick)
  }
}

const open = openShare(rosters, DEFAULT_SKATER_SLOTS, nights)
const openF = (date: string) => Math.max(open[date].C, open[date].LW, open[date].RW)

const teams = [...clubs].sort().map((team) => {
  const f = usableFor({ team, positions: ['C', 'LW', 'RW'], rate: 1 }, nights, Object.fromEntries(nights.map((n) => [n.date, { ...open[n.date], C: openF(n.date), LW: openF(n.date), RW: openF(n.date) }])))
  const d = usableFor({ team, positions: ['D'], rate: 1 }, nights, open)
  return {
    team, games: f.games, usableF: f.usable, usableD: d.usable,
    byNight: f.byNight.map((b) => ({ date: b.date, plays: b.plays, openF: b.open })),
  }
})

const gamesOn = (date: string) => [...clubs].filter((c) => nights.find((n) => n.date === date)!.teams.has(c)).length / 2
const nightsOut = nights.map((n) => ({ date: n.date, games: gamesOn(n.date) }))
const avg = (pick: (date: string) => number, keep: (g: number) => boolean) => {
  const ds = nightsOut.filter((n) => keep(n.games)).map((n) => pick(n.date))
  return ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null
}
const busy = { F: avg(openF, (g) => g >= BUSY_AT), D: avg((d) => open[d].D, (g) => g >= BUSY_AT) }
const light = { F: avg(openF, (g) => g > 0 && g <= LIGHT_AT), D: avg((d) => open[d].D, (g) => g > 0 && g <= LIGHT_AT) }

process.stderr.write(`[usable-week] ${FROM}..${TO} nights=${nights.length} clubs=${clubs.size} pool=${pool.length}\n`)
process.stdout.write(JSON.stringify({ from: FROM, to: TO, nights: nightsOut, teams, busy, light }))
