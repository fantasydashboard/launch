/**
 * Position-aware drop eligibility for The Wire.
 *
 * A player is "expendable" if your remaining roster can still fill EVERY required
 * starting slot without them — so you can drop a catcher to add an outfielder
 * when you carry two catchers and start one, but never your only catcher. The
 * check is a bipartite matching (slots <-> players) so multi-position eligibility
 * (a 2B/SS/OF guy covering several slots) is handled correctly, not a naive
 * per-position count.
 */

export interface EligPlayer {
  playerKey: string
  eligiblePositions: string[] // upper-cased, e.g. ['1B','OF']
}

const HITTER_POS = new Set(['C', '1B', '2B', '3B', 'SS', 'OF', 'LF', 'CF', 'RF', 'DH'])
const FLEX_HIT = new Set(['UTIL', 'UT', 'U'])
const BENCH = new Set(['BN', 'BENCH', 'IL', 'IL+', 'IL60', 'NA', 'DL'])

/** Split a Yahoo/ESPN display position ("1B,OF" / "SP/RP") into eligible slots. */
export function parseEligible(position: string): string[] {
  return String(position || '')
    .split(/[,/]/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

const isHitter = (elig: string[]) => elig.some((p) => HITTER_POS.has(p))
const isPitcher = (elig: string[]) => elig.some((p) => p === 'SP' || p === 'RP' || p === 'P')

/** Can a player with these eligible positions fill this starting slot? */
export function playerFitsSlot(elig: string[], slot: string): boolean {
  const s = slot.toUpperCase()
  if (FLEX_HIT.has(s)) return isHitter(elig)
  if (s === 'P') return isPitcher(elig)
  if (s === 'MI') return elig.some((p) => p === '2B' || p === 'SS')
  if (s === 'CI') return elig.some((p) => p === '1B' || p === '3B')
  if (s === 'IF') return elig.some((p) => ['1B', '2B', '3B', 'SS'].includes(p))
  if (s === 'OF') return elig.some((p) => ['OF', 'LF', 'CF', 'RF'].includes(p))
  return elig.includes(s)
}

/** Flatten roster-slot counts into a list of required starting slots (no bench/IL). */
export function expandSlots(rosterSlots: Record<string, number>): string[] {
  const out: string[] = []
  for (const [pos, n] of Object.entries(rosterSlots)) {
    if (BENCH.has(pos.toUpperCase())) continue
    for (let i = 0; i < (n || 0); i++) out.push(pos)
  }
  return out
}

/** Max bipartite matching: can every starting slot be filled by a distinct player? */
export function canFillSlots(roster: EligPlayer[], slots: string[]): boolean {
  if (!slots.length) return true
  const slotOfPlayer = new Map<string, number>() // playerKey -> matched slot index
  const assign = (slotIdx: number, seen: Set<string>): boolean => {
    for (const p of roster) {
      if (seen.has(p.playerKey)) continue
      if (!playerFitsSlot(p.eligiblePositions, slots[slotIdx])) continue
      seen.add(p.playerKey)
      const cur = slotOfPlayer.get(p.playerKey)
      if (cur === undefined || assign(cur, seen)) {
        slotOfPlayer.set(p.playerKey, slotIdx)
        return true
      }
    }
    return false
  }
  let filled = 0
  for (let i = 0; i < slots.length; i++) if (assign(i, new Set())) filled++
  return filled === slots.length
}

/**
 * The set of player keys that can be dropped without breaking the lineup. If the
 * full roster can't even fill its slots (short roster / injuries), nothing is
 * blocked — every player is considered droppable so the page still works.
 */
export function expendableKeys(roster: EligPlayer[], rosterSlots: Record<string, number>): Set<string> {
  const slots = expandSlots(rosterSlots)
  if (!canFillSlots(roster, slots)) return new Set(roster.map((p) => p.playerKey))
  const out = new Set<string>()
  for (const p of roster) {
    const without = roster.filter((x) => x.playerKey !== p.playerKey)
    if (canFillSlots(without, slots)) out.add(p.playerKey)
  }
  return out
}
