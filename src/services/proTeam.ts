/**
 * One spelling for each NFL team.
 *
 * WHY THIS EXISTS. Two feeds disagree about exactly one team. ESPN writes Washington as WSH;
 * Sleeper writes WAS. Thirty-one of thirty-two teams match, which is what made this expensive:
 * everything worked, so nothing looked broken, and only Washington players quietly fell out of
 * every join between the two sources — schedule difficulty, bye week, implied total, game
 * state. A blank cell reads as "no data yet" rather than "we spelled it differently".
 *
 * Normalizing at the boundary, on the way in from ESPN, means the rest of the app only ever
 * sees Sleeper's spelling — which is the one player records carry, and therefore the one every
 * lookup is keyed by.
 */

/** ESPN's spelling -> Sleeper's. Only teams the two feeds actually disagree about. */
const ALIASES: Record<string, string> = {
  WSH: 'WAS',
}

/** The canonical abbreviation for a pro team. Safe on empty input. */
export function normalizeProTeam(abbr: string | null | undefined): string {
  const up = String(abbr ?? '').trim().toUpperCase()
  return ALIASES[up] ?? up
}
