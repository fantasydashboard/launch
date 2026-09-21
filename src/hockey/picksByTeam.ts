import { pickOwners, type DraftKind } from './hockeyDraftPlan'

/**
 * Whose picks are whose, in a draft being marked by hand.
 *
 * WHY THIS IS NOT JUST A LOOP. A live ESPN draft labels every pick with the team that made
 * it; a mock draft knows only the ORDER, so the seat has to be recovered from the pick
 * number — and in a snake that is not `i % teams`, because every even round runs backwards.
 * Getting it wrong does not throw and does not render blank: it files real players onto the
 * wrong rosters, and the column ledger built on top then reports a confident standing for a
 * team nobody is managing.
 *
 * The seat maths is `pickOwners`, which the draft plan already owns and tests. Repeating it
 * here would be a second implementation of the one rule in this file worth getting right —
 * the first version did exactly that and passed `{ kind }` to a helper whose field is
 * `type`, which silently made every snake draft linear.
 *
 * Kept out of the composable so it can be driven directly in a test rather than only by
 * mounting a draft room.
 */
export function picksByTeamFromOrder(
  order: readonly (string | null | undefined)[],
  teams: number,
  kind: DraftKind,
): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  if (!teams || teams < 1) return out
  for (let i = 1; i <= teams; i++) out[String(i)] = []
  if (!order.length) return out

  /* Enough rounds to cover everything marked so far, so a long mock is not truncated. */
  const rounds = Math.max(1, Math.ceil(order.length / teams))
  const owners = pickOwners(teams, rounds, kind)

  order.forEach((playerKey, i) => {
    /* An unfilled pick is a gap in the order, not a player. Skipping it rather than seating
       it keeps every later pick on the seat that actually made it. */
    if (!playerKey) return
    const slot = owners[i]
    if (!slot) return
    const id = String(slot)
    if (!out[id]) out[id] = []
    out[id].push(playerKey)
  })
  return out
}
