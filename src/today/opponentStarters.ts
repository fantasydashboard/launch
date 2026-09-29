/**
 * The opponent's SET lineup, derived from the league-wide pool.
 *
 * WHAT THIS REPLACED, AND WHY IT MATTERED. useThisWeekOpponent filled `opponentStarters` for
 * Sleeper and hardcoded `[]` for ESPN and Yahoo, with a comment explaining that the set lineup
 * lives on a matchup roster "this composable does not make" a fetch for. So on every ESPN and
 * Yahoo league the opponent's side of the seat-by-seat panel was empty — and an empty seat
 * scores zero, so `edge` came out as the manager's own projection and the header reported
 * "10 up · 0 down tonight" against a team it had never read. A fabricated scoreline, and a
 * flattering one, on a panel whose entire job is to tell you where you stand.
 *
 * No fetch was ever needed. mapRostersToPool has carried `teamKey` and `lineupSlot` for EVERY
 * team since the daily page learned to show a manager his own lineup, and Yahoo's roster call
 * carries the same thing in `selected_position` — which the light per-team reader was dropping
 * on the floor. The opponent's lineup was in the pool the panel already had.
 */

/** Slots that hold a player without starting him. */
const BENCH_SLOTS = new Set(['BN', 'BE', 'BENCH', 'IR', 'IL', 'IL+', 'NA', 'DL', 'TAXI'])

/**
 * True for a slot that does not count as a start.
 *
 * An UNKNOWN slot is deliberately not a bench slot. Absence means we were not told where he
 * plays, and guessing "bench" would silently drop a started player out of the opponent's
 * lineup — the same absence-read-as-a-fact mistake this whole module exists to undo.
 */
export function isBenchSlot(slot: string | undefined | null): boolean {
  return BENCH_SLOTS.has(String(slot ?? '').trim().toUpperCase())
}

interface Seat { slot: string }
interface Poolish { playerKey: string; teamKey?: string; lineupSlot?: string }

/**
 * Their starter for each of my seats, in my seats' order.
 *
 * PAIRED BY SLOT, NOT BY INDEX. Sleeper publishes a positional array where the nth entry fills
 * the nth slot; a pool has no such order, so the seats are matched on the slot name and each
 * of their players is consumed at most once. An unfilled seat comes back '' rather than being
 * dropped, because dropping one shifts every seat after it up and silently reassigns their
 * whole lineup.
 *
 * Returns an EMPTY ARRAY when the pool tells us nothing about that team's lineup — no rows, or
 * rows with no slot on any of them. That is the signal the caller needs: "they have nobody
 * starting" and "we cannot see their lineup" are different claims, and only one of them can
 * honestly be scored.
 */
export function opponentStartersBySeat(
  seats: Seat[],
  pool: Poolish[],
  opponentKey: string,
): string[] {
  if (!opponentKey) return []
  const theirs = pool.filter((p) => p.teamKey === opponentKey)
  if (!theirs.length) return []

  const bySlot = new Map<string, string[]>()
  for (const p of theirs) {
    const slot = String(p.lineupSlot ?? '').trim().toUpperCase()
    if (!slot || isBenchSlot(slot)) continue
    const queue = bySlot.get(slot)
    if (queue) queue.push(p.playerKey)
    else bySlot.set(slot, [p.playerKey])
  }
  /* Rows but no slots on any of them: the platform did not publish this lineup to us. */
  if (!bySlot.size) return []

  return seats.map((seat) => {
    const queue = bySlot.get(String(seat.slot ?? '').trim().toUpperCase())
    return queue?.length ? queue.shift()! : ''
  })
}
