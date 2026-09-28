import { nhlAbbrVariants } from '@/services/nhlSchedule'

/**
 * How many games each side has left this week — the lever football does not have.
 *
 * WHY IT DESERVES THE TOP OF THE PAGE. Football counts lineup SPOTS: nine seats, nine games,
 * everybody plays once. A daily league counts GAMES, and they are not distributed evenly —
 * one roster can draw twenty-eight skater games in a week and its opponent twenty-two, and
 * that six-game head start is worth more than any single start/sit call on the page. It is
 * the reason streaming an off-night defenceman works at all.
 *
 * The daily board expressed this only as a complaint — "17 of your seats have no game
 * tonight". That is the same fact with the sign flipped and the horizon wrong: it tells a
 * manager what he has lost tonight instead of what he has left this week.
 *
 * WHO COUNTS. Players who could actually take the ice: anyone on IL, or ruled out, cannot be
 * started, and counting his fixtures would inflate a number a manager is about to act on.
 * Everyone else counts once per scheduled game — bench included, because in a daily league a
 * bench skater with four games is a startable asset, not depth.
 */
export interface GamesSide {
  /** Total scheduled games across startable players. */
  games: number
  /** How many players contributed at least one. */
  players: number
}

function startable(p: { onIL?: boolean; status?: string }): boolean {
  if (p.onIL) return false
  const s = String(p.status ?? '').toUpperCase()
  /* Day-to-day still counts: he is far more likely to play than not, and excluding him
     understates a week a manager is planning around. Only the definite absences come out. */
  return !(s.startsWith('IL') || s === 'OUT' || s === 'O' || s === 'NA' || s === 'SUSP')
}

export function gamesRemaining(
  pool: { teamKey?: string; proTeam?: string; onIL?: boolean; status?: string }[],
  teamKey: string,
  gamesByTeam: Record<string, number>,
): GamesSide {
  if (!teamKey) return { games: 0, players: 0 }
  let games = 0
  let players = 0
  for (const p of pool) {
    if (String(p.teamKey ?? '') !== String(teamKey)) continue
    if (!startable(p)) continue
    /* Sources disagree on five clubs' abbreviations — LA/LAK, NJ/NJD and the rest — and a
       miss here reads as "he has no games", which is exactly the silent failure the schedule
       service documents. Try every spelling and take the first that resolves. */
    const abbr = String(p.proTeam ?? '').trim().toUpperCase()
    if (!abbr) continue
    let n = 0
    for (const v of nhlAbbrVariants(abbr)) {
      n = gamesByTeam[v] ?? 0
      if (n) break
    }
    if (n > 0) players += 1
    games += n
  }
  return { games, players }
}
