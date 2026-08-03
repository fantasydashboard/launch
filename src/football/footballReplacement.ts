import { FLEX_ELIGIBILITY } from '@/trades/rosterSlots'

/** A pool player reduced to what the replacement baseline needs. */
export interface RepPlayer {
  playerKey: string
  position: string
  points: number
}

/** position → replacement-level projected points. */
export type ReplacementLevels = Record<string, number>

export interface ReplacementDetail {
  levels: ReplacementLevels
  startable: Record<string, number>   // players at this position who start league-wide
  countByPos: Record<string, number>  // players available at this position
}

/** Positions filled by a dedicated (non-flex) slot. */
const DEDICATED = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
/** Flex slot keys, from the roster-slot parser. */
const FLEX_SLOTS = ['FLEX', 'SUPER_FLEX']

const normPos = (pos: string): string => (pos || '').toUpperCase().split(/[,/|]/)[0].trim()

/**
 * Standard value-based-drafting replacement level, calibrated to the league.
 *
 * startable[pos] = teams × dedicated slots, plus a share of the flex openings
 * allocated to the best flex-eligible leftovers (a leftover fills the most
 * restrictive open flex it qualifies for, so SUPER_FLEX capacity is preserved
 * for QBs). replacement[pos] = the points of the first player OFF that startable
 * list — the true waiver-level alternative. Deterministic and pure.
 */
export function computeReplacementDetail(
  players: RepPlayer[],
  slots: Record<string, number>,
  teams: number,
): ReplacementDetail {
  const t = Math.max(1, teams)

  // Points per position, sorted best-first.
  const byPos = new Map<string, number[]>()
  for (const p of players) {
    const pos = normPos(p.position)
    if (!pos) continue
    ;(byPos.get(pos) ?? byPos.set(pos, []).get(pos)!).push(p.points)
  }
  for (const arr of byPos.values()) arr.sort((a, b) => b - a)

  // 1) Base startable counts from dedicated slots.
  const startable: Record<string, number> = {}
  for (const p of DEDICATED) startable[p] = t * (slots[p] ?? 0)

  // 2) Flex allocation. Expand each flex opening (capacity 1) tagged with its
  //    eligibility set + restrictiveness (smaller set = fill first).
  const openings: { elig: Set<string>; restrict: number; filled: boolean }[] = []
  for (const fs of FLEX_SLOTS) {
    const count = t * (slots[fs] ?? 0)
    const elig = new Set((FLEX_ELIGIBILITY[fs] ?? []).map((x) => x.toUpperCase()))
    for (let i = 0; i < count; i++) openings.push({ elig, restrict: elig.size, filled: false })
  }
  if (openings.length) {
    // Leftovers = players beyond each position's base count, globally best-first.
    const leftovers: { pos: string; points: number }[] = []
    for (const [pos, arr] of byPos) {
      const base = startable[pos] ?? 0
      for (let i = base; i < arr.length; i++) leftovers.push({ pos, points: arr[i] })
    }
    leftovers.sort((a, b) => b.points - a.points)
    for (const lo of leftovers) {
      let best = -1
      for (let i = 0; i < openings.length; i++) {
        const o = openings[i]
        if (o.filled || !o.elig.has(lo.pos)) continue
        if (best < 0 || o.restrict < openings[best].restrict) best = i
      }
      if (best < 0) continue
      openings[best].filled = true
      startable[lo.pos] = (startable[lo.pos] ?? 0) + 1
    }
  }

  // 3) replacement = first player off the startable list; if everyone is startable
  //    (idx past the end), fall back to the worst available; empty pool → 0.
  const levels: ReplacementLevels = {}
  const allPos = new Set<string>([...DEDICATED, ...byPos.keys()])
  for (const pos of allPos) {
    const arr = byPos.get(pos) ?? []
    if (!arr.length) { levels[pos] = 0; continue }
    const idx = startable[pos] ?? 0
    levels[pos] = arr[idx] ?? arr[arr.length - 1]
  }

  const countByPos: Record<string, number> = {}
  for (const [pos, arr] of byPos) countByPos[pos] = arr.length
  return { levels, startable, countByPos }
}

/**
 * Standard value-based-drafting replacement level, calibrated to the league.
 * Thin wrapper over `computeReplacementDetail` — the levels only.
 */
export function computeReplacementLevels(
  players: RepPlayer[],
  slots: Record<string, number>,
  teams: number,
): ReplacementLevels {
  return computeReplacementDetail(players, slots, teams).levels
}
