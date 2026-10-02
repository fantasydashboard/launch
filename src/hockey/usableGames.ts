/**
 * USABLE GAMES: a game counts only as much as the chance you have a lineup spot for him that night.
 *
 * Measured on 2025-26 (1,312 games, a simulated 12-team league, one weekly streamer per manager):
 * picking by usable games banked +1.9 pts per manager-week at league level and +2.9 when
 * personalised, against raw game counts. Light nights are about 99% open and 11+ game nights
 * about 28%. On busy nights D slots stay open about 59% of the time to forwards' about 17%.
 * An opponent-defence factor was tested and made picks worse, so it is deliberately absent.
 */
export type SkaterPos = 'C' | 'LW' | 'RW' | 'D'
export interface Night { date: string; teams: Set<string> }
export interface UsableRosterPlayer { key: string; team: string; positions: SkaterPos[]; rate: number; out?: boolean }
export interface SkaterSlots { C: number; LW: number; RW: number; D: number; UTIL: number; F?: number }
export type OpenMap = Record<string, Record<SkaterPos, number>>

export const DEFAULT_SKATER_SLOTS: SkaterSlots = { C: 2, LW: 2, RW: 2, D: 4, UTIL: 1, F: 0 }
const POSITIONS: SkaterPos[] = ['C', 'LW', 'RW', 'D']

export function skaterPositions(raw: string | string[] | undefined): SkaterPos[] {
  const parts = Array.isArray(raw) ? raw : String(raw ?? '').split(/[,/|]/)
  const out: SkaterPos[] = []
  for (const r of parts) {
    const p = r.trim().toUpperCase()
    if ((POSITIONS as string[]).includes(p) && !out.includes(p as SkaterPos)) out.push(p as SkaterPos)
  }
  return out
}

/** One night: which positions still have a spot after this roster's players with a game are seated. */
const upTeam = (t: string | undefined) => String(t ?? '').trim().toUpperCase()

function openOn(roster: UsableRosterPlayer[], slots: SkaterSlots, teams: Set<string>): Record<SkaterPos, number> {
  const free: Record<SkaterPos | 'UTIL' | 'F', number> = { ...slots, F: slots.F ?? 0 }
  /* Single-position players seat first, so a C/LW does not take C when LW was free and push a
     pure C into UTIL. Within each group the best player seats first. */
  const playing = roster
    .filter((p) => !p.out && p.positions.length && teams.has(upTeam(p.team)))
    .sort((a, b) => (a.positions.length - b.positions.length) || (b.rate - a.rate))
  for (const p of playing) {
    const pos = p.positions.find((x) => free[x] > 0)
    if (pos) free[pos]--
    else if (free.F > 0 && p.positions.some((x) => x !== 'D')) free.F--
    else if (free.UTIL > 0) free.UTIL--
  }
  const out = {} as Record<SkaterPos, number>
  for (const pos of POSITIONS) {
    out[pos] = free[pos] > 0 || (pos !== 'D' && free.F > 0) || free.UTIL > 0 ? 1 : 0
  }
  return out
}

export function openNights(roster: UsableRosterPlayer[], slots: SkaterSlots, nights: Night[]): OpenMap {
  const out: OpenMap = {}
  for (const n of nights) out[n.date] = openOn(roster, slots, n.teams)
  return out
}

export function openShare(rosters: UsableRosterPlayer[][], slots: SkaterSlots, nights: Night[]): OpenMap {
  const out: OpenMap = {}
  for (const n of nights) {
    const sum: Record<SkaterPos, number> = { C: 0, LW: 0, RW: 0, D: 0 }
    for (const r of rosters) {
      const o = openOn(r, slots, n.teams)
      for (const pos of POSITIONS) sum[pos] += o[pos]
    }
    const k = Math.max(1, rosters.length)
    out[n.date] = { C: sum.C / k, LW: sum.LW / k, RW: sum.RW / k, D: sum.D / k }
  }
  return out
}

export function usableFor(
  player: { team: string; positions: SkaterPos[]; rate: number },
  nights: Night[],
  open: OpenMap,
) {
  let games = 0
  let usable = 0
  const byNight = nights.map((n) => {
    const plays = n.teams.has(upTeam(player.team))
    const o = plays ? Math.max(0, ...player.positions.map((p) => open[n.date]?.[p] ?? 0)) : 0
    if (plays) { games++; usable += o }
    return { date: n.date, plays, open: o }
  })
  return { games, usable, points: player.rate * usable, byNight }
}
