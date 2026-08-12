/**
 * Your starting lineup, one row per slot.
 *
 * "RB 2/2 · filled" answers how many, never who — and who is the question you
 * are actually asking mid-draft, because a lineup with two backs you like reads
 * nothing like one with a stud and a handcuff. So every slot gets its own row,
 * and each row names the player sitting in it.
 *
 * Assignment mirrors how a lineup actually fills: a player takes a slot at his
 * own position first, and only the overflow reaches a flex. Anything left over
 * is bench — shown, not hidden, because those picks are still yours.
 */

/** Which positions each flex slot will accept. */
export const FLEX_ELIGIBILITY: Record<string, string[]> = {
  FLEX: ['RB', 'WR', 'TE'],
  SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
  REC_FLEX: ['WR', 'TE'],
  WR_RB: ['RB', 'WR'],
  WR_TE: ['WR', 'TE'],
}

const NON_STARTING = new Set(['BN', 'IR', 'TAXI'])
const SLOT_ORDER = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'WR_RB', 'WR_TE', 'REC_FLEX', 'SUPER_FLEX', 'K', 'DEF']
/** Positions that sort last and read as late-round rather than as holes. */
export const LATE_SLOTS = new Set(['K', 'DEF'])

export interface LineupPlayer {
  playerKey: string
  name: string
  position: string
  /** Where he was taken, used only for ordering within a position. */
  overallPick?: number | null
  headshot?: string | null
}

export interface LineupRow {
  /** The raw slot name from league settings, e.g. `RB` or `FLEX`. */
  slot: string
  /** What the row is called on screen — `RB1`/`RB2` when a slot repeats. */
  label: string
  /** Positions this slot accepts. */
  eligible: string[]
  player: LineupPlayer | null
  late: boolean
}

export interface LineupResult {
  rows: LineupRow[]
  bench: LineupPlayer[]
}

const normPos = (p: string) => (p || '').toUpperCase().split(/[,/|]/)[0].trim()

function orderSlots(slots: Record<string, number>): [string, number][] {
  return Object.entries(slots ?? {})
    .filter(([k, n]) => Number(n) > 0 && !NON_STARTING.has(k.toUpperCase()))
    .sort((a, b) => {
      const ai = SLOT_ORDER.indexOf(a[0].toUpperCase())
      const bi = SLOT_ORDER.indexOf(b[0].toUpperCase())
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
    })
    .map(([k, n]) => [k, Math.floor(Number(n))])
}

export function buildLineup(input: {
  slots: Record<string, number>
  players: LineupPlayer[]
}): LineupResult {
  const ordered = orderSlots(input?.slots ?? {})

  // Earliest pick first, so the slot numbering follows draft order rather than
  // whatever order the API happened to return.
  const pool = [...(input?.players ?? [])].sort(
    (a, b) => (a.overallPick ?? Number.MAX_SAFE_INTEGER) - (b.overallPick ?? Number.MAX_SAFE_INTEGER),
  )
  const taken = new Set<string>()
  const claim = (eligible: string[]): LineupPlayer | null => {
    const hit = pool.find((p) => !taken.has(p.playerKey) && eligible.includes(normPos(p.position)))
    if (!hit) return null
    taken.add(hit.playerKey)
    return hit
  }

  const rows: LineupRow[] = []
  // Two passes: dedicated slots claim their own position before any flex does,
  // otherwise a single FLEX listed first would swallow your only tight end.
  const flexRows: { slot: string; label: string; eligible: string[]; index: number }[] = []
  for (const [slot, count] of ordered) {
    const key = slot.toUpperCase()
    const eligible = FLEX_ELIGIBILITY[key] ?? [key]
    const isFlex = Boolean(FLEX_ELIGIBILITY[key])
    for (let i = 1; i <= count; i++) {
      const label = count > 1 ? `${slot}${i}` : slot
      if (isFlex) {
        flexRows.push({ slot, label, eligible, index: rows.length })
        rows.push({ slot, label, eligible, player: null, late: LATE_SLOTS.has(key) })
      } else {
        rows.push({ slot, label, eligible, player: claim(eligible), late: LATE_SLOTS.has(key) })
      }
    }
  }
  for (const f of flexRows) rows[f.index].player = claim(f.eligible)

  const bench = pool.filter((p) => !taken.has(p.playerKey))
  return { rows, bench }
}
