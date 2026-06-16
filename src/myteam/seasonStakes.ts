export type StakesMode = 'clinch' | 'maximize' | 'must-win' | 'coast'
export interface StakesInput {
  rank: number // 1 = first
  leagueSize: number
  weeksLeft: number // playoffWeekStart - currentWeek
  playoffSpots: number // teams that make the bracket
}
export interface Stakes {
  mode: StakesMode
  reasoning: string // always shown — never a black box
  // Why the coast: 'clinched' (safely in) vs 'eliminated' (out of reach). Set
  // only when mode === 'coast' so the path copy can stop telling an eliminated
  // team it's "set for the bracket". Undefined for the other modes and for a
  // manual coast override (no standings signal to infer from).
  coastKind?: 'clinched' | 'eliminated'
}

/**
 * Detect the season stakes mode from standings position + time left. Conservative and transparent:
 * defaults to 'clinch' when uncertain, never auto-asserts 'must-win' without a clear bubble signal,
 * and never returns 'maximize' (that needs seeding/total-cats rules we can't parse — it's override
 * only). The manual override in the view is the safety valve for league nuances.
 */
export function seasonStakes({ rank, leagueSize, weeksLeft, playoffSpots }: StakesInput): Stakes {
  const cushion = playoffSpots - rank // >0 inside the cut by N
  const deficit = rank - playoffSpots // >0 outside the cut by N
  // Ordinal that includes the number: 2 -> "2nd", 11 -> "11th", 21 -> "21st".
  const ord = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  // Locked in: cushion outlasts what the remaining weeks could plausibly swing.
  if (cushion >= weeksLeft + 2) {
    return { mode: 'coast', coastKind: 'clinched', reasoning: `${ord(rank)} of ${leagueSize} — locked into the bracket with ${weeksLeft} to play.` }
  }
  // Out of reach: can't make up the deficit even running the table.
  if (deficit > weeksLeft) {
    return { mode: 'coast', coastKind: 'eliminated', reasoning: `${ord(rank)} of ${leagueSize}, ${deficit} out with only ${weeksLeft} left — out of reach.` }
  }
  // Bubble, time short, still catchable.
  if (weeksLeft <= 2 && deficit >= 0 && deficit <= weeksLeft) {
    return { mode: 'must-win', reasoning: `${ord(rank)} of ${leagueSize}, on the bubble with ${weeksLeft} to play — you need this one.` }
  }
  return { mode: 'clinch', reasoning: `${ord(rank)} of ${leagueSize}, in good shape — take the week and conserve moves.` }
}
