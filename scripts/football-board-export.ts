/*
 * Our public rest-of-season football board, as CSV, for comparison against an analyst baseline.
 *
 * WHY IT READS THE PRODUCT AND NOT A REIMPLEMENTATION. The point of a critique is to find where
 * OUR board differs from somebody else's. A second model written in a script to stand in for
 * the first would make every difference ambiguous — is that the model disagreeing, or the copy
 * of it drifting? The hockey exporter exists for exactly this reason and has already caught
 * itself publishing ESPN's numbers under our name. This is the football equivalent.
 *
 * It builds the ANONYMOUS board — the one /rankings shows a logged-out visitor, on the default
 * half-PPR scoring — because that is the board a public critique should be about.
 *
 * Usage:  OUT=/tmp/ours.csv npx vite-node scripts/football-board-export.ts
 *
 * It writes to a FILE rather than stdout because the services it calls log their own progress
 * through console.log, and two "[Sleeper] Got projections…" lines landing in the middle of a
 * CSV is the kind of corruption that parses fine and means nothing.
 */
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

/* useFootballVor reaches a store for league context. There is no app here, so give Pinia an
   instance to attach to — the store's defaults are exactly what the anonymous board wants. */
setActivePinia(createPinia())

/* A localStorage that exists but forgets. Several services cache through it and degrade when
   the accessor throws, which here showed up as a board that never finished computing rather
   than as an error — the failure this script's own timeout was written to catch. In-memory is
   right for a one-shot export: no stale cache can survive into the next run and quietly
   produce a board from yesterday. */
if (typeof (globalThis as any).localStorage === 'undefined') {
  const mem = new Map<string, string>()
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => { mem.set(k, String(v)) },
    removeItem: (k: string) => { mem.delete(k) },
    clear: () => mem.clear(),
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() { return mem.size },
  }
}

const BASE = process.env.BASE ?? 'https://www.ultimatefantasydashboard.com'
const orig = globalThis.fetch
globalThis.fetch = ((i: any, init?: any) => {
  const u = typeof i === 'string' ? i : i.url
  return orig(u.startsWith('/') ? `${BASE}${u}` : u, init)
}) as any

const { sleeperService } = await import('@/services/sleeper')
const { publicNflPool, PUBLIC_POSITIONS } = await import('@/football/publicPool')
const { DEFAULT_NFL_SLOTS } = await import('@/trades/rosterSlots')
const { useFootballVor } = await import('@/composables/useFootballVor')
const { buildRankingsBoard } = await import('@/football/footballWire')
const { publicWeeksLeft, PUBLIC_TEAMS } = await import('@/composables/usePublicRankings')

const [state, players] = await Promise.all([
  sleeperService.getNflState(),
  sleeperService.getPlayers(),
])
const regular = String((state as any).season_type ?? 'regular') === 'regular'
const currentWeek = regular ? (Number((state as any).week) || 1) : 0
const pool = ref(publicNflPool(players as Record<string, any>))
process.stderr.write(`[export] pool=${pool.value.length} season=${(state as any).season} week=${currentWeek}\n`)
if (pool.value.length < 200) {
  throw new Error(`pool has only ${pool.value.length} players — upstream degraded, refusing to emit a board`)
}

const { vorByKey, loading } = useFootballVor({
  pool,
  freeAgents: ref([]),
  /* SLOTS is overridable so the replacement level can be experimented with WITHOUT shipping a
     change to it — the lineup shape decides replacement, and replacement decides the whole
     cross-position curve. */
  slots: ref(process.env.SLOTS ? JSON.parse(process.env.SLOTS) : { ...DEFAULT_NFL_SLOTS }),
  teams: ref(PUBLIC_TEAMS),
  season: ref(String((state as any).season ?? '')),
  enabled: ref(true),
  keysAreSleeperIds: ref(true),
  weeklyHorizon: 0,
})

/* The composable loads asynchronously and there is no promise to await, so poll the flag it
   publishes. Emitting mid-load would produce a short, plausible, wrong board. */
const deadline = Date.now() + 180_000
while ((loading.value || !Object.keys(vorByKey.value).length) && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 250))
}
if (!Object.keys(vorByKey.value).length) {
  throw new Error('no VOR after 180s — refusing to emit an empty board')
}

const entries = []
for (const p of pool.value) {
  const v = vorByKey.value[p.playerKey]
  if (!v) continue
  entries.push({
    playerKey: p.playerKey, name: p.name, position: p.position, team: p.proTeam,
    headshot: p.headshot, vorRos: v.vorRos, owned: false, free: false,
  })
}
const board = buildRankingsBoard({
  entries, positions: [...PUBLIC_POSITIONS], weeksLeft: publicWeeksLeft(currentWeek),
})
const all = board.ALL ?? []
process.stderr.write(`[export] priced=${entries.length} board=${all.length}\n`)

const lines = ['Overall,Player,Position,Team,VOR']
all.forEach((r: any, i: number) => {
  const nm = String(r.name).includes(',') ? `"${r.name}"` : r.name
  lines.push(`${i + 1},${nm},${r.position},${r.team ?? ''},${Number(r.vorRos).toFixed(2)}`)
})
const out = process.env.OUT ?? 'ours-ros.csv'
const { writeFileSync } = await import('node:fs')
writeFileSync(out, lines.join('\n') + '\n')
process.stderr.write(`[export] wrote ${all.length} players -> ${out}\n`)
